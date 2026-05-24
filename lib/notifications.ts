/**
 * lib/notifications.ts
 * Expo 푸시 알림 헬퍼
 *
 * ── 알림이 안 올 때 체크리스트 ──────────────────────────────────────
 *  1. Expo 계정 로그인:  npx expo login
 *  2. EAS 프로젝트 초기화:  npx eas-cli init
 *     → app.json extra.eas.projectId 가 채워지면 자동 작동
 *  3. Android: google-services.json 존재 확인
 *  4. iOS:     Info.plist에 push 권한 추가 (Xcode)
 * ─────────────────────────────────────────────────────────────────────
 */
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

// ── 포그라운드 알림 핸들러 ────────────────────────────────────────
// 앱 시작 시 App.tsx에서 호출 (모듈 최상단 실행 금지 — 신규 아키텍처 호환 문제)
export function initNotificationHandler() {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert:  true,
        shouldPlaySound:  true,
        shouldSetBadge:   true,
        shouldShowBanner: true,
        shouldShowList:   true,
      }),
    });
  } catch (e) {
    console.warn('[알림] 핸들러 등록 실패 (무시):', e);
  }
}

/** EAS Project ID 가져오기 */
function getProjectId(): string | undefined {
  return (
    Constants.easConfig?.projectId ||
    Constants.expoConfig?.extra?.eas?.projectId ||
    undefined
  );
}

/** 앱 실행 시 호출 — 푸시 토큰 발급 및 Firestore 저장 */
export async function registerPushToken(userId: string): Promise<string | null> {
  // Android 알림 채널 설정
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: '라운지톡 알림',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#7B61FF',
      sound: 'default',
    });
  }

  // 알림 권한 요청
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    console.log('[알림] 권한 거부됨');
    return null;
  }

  // Expo Push Token 발급 ─────────────────────────────────────────
  const projectId = getProjectId();
  if (!projectId) {
    console.warn(
      '[알림] ⚠️  EAS projectId 없음 — 푸시 알림 비활성화\n' +
      '  해결: npx expo login → npx eas-cli init\n' +
      '  app.json extra.eas.projectId 에 발급된 ID를 입력하세요'
    );
    return null;
  }

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    console.log('[알림] ✅ 토큰 등록 성공:', token.slice(0, 40) + '…');
    await updateDoc(doc(db, 'profiles', userId), { push_token: token });
    return token;
  } catch (e: any) {
    console.error('[알림] ❌ 토큰 발급 실패:', e?.message ?? e);
    return null;
  }
}

/** Firestore에서 사용자 푸시 토큰 조회 */
export async function getProfilePushToken(userId: string): Promise<string | null> {
  try {
    const snap = await getDoc(doc(db, 'profiles', userId));
    return snap.exists() ? (snap.data()?.push_token ?? null) : null;
  } catch {
    return null;
  }
}

interface PushPayload {
  to:    string;
  title: string;
  body:  string;
  data?: Record<string, any>;
}

/** Expo 공개 API를 통해 푸시 알림 전송 */
export async function sendPushNotification(params: PushPayload): Promise<void> {
  if (!params.to) {
    console.log('[알림] 토큰 없음 — 전송 건너뜀 (EAS 설정 필요)');
    return;
  }
  if (!params.to.startsWith('ExponentPushToken')) {
    console.warn('[알림] 유효하지 않은 토큰 형식:', params.to.slice(0, 30));
    return;
  }

  try {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to:        params.to,
        sound:     'default',
        title:     params.title,
        body:      params.body,
        data:      params.data ?? {},
        channelId: 'default',
        priority:  'high',
      }),
    });
    const result = await res.json();
    if (result?.data?.status === 'error') {
      console.error('[알림] Expo API 오류:', result.data.message);
    } else {
      console.log('[알림] ✅ 전송 완료 →', params.title);
    }
  } catch (e) {
    console.error('[알림] 전송 실패:', e);
  }
}
