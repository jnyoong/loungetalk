/**
 * lib/solapi.ts
 * Solapi 카카오 알림톡 헬퍼
 *
 * 사용 전 준비 사항:
 * 1. Solapi 가입 → https://solapi.com
 * 2. 카카오 채널 등록 → PF ID 발급
 * 3. 알림톡 템플릿 등록 및 승인
 * 4. .env에 아래 환경변수 추가:
 *    EXPO_PUBLIC_SOLAPI_API_KEY=xxxxx
 *    EXPO_PUBLIC_SOLAPI_API_SECRET=xxxxx
 *    EXPO_PUBLIC_SOLAPI_FROM=01012345678   (발신번호, 하이픈 없이)
 *    EXPO_PUBLIC_SOLAPI_PFID=KA01PF...     (카카오 채널 PF ID)
 *
 * HMAC-SHA256 서명 구현:
 *   현재는 미구현 상태 (템플릿 승인 후 expo-crypto로 구현 예정)
 *   템플릿 준비 완료 시 TODO 주석 부분 완성
 */

const SOLAPI_API_KEY    = process.env.EXPO_PUBLIC_SOLAPI_API_KEY    ?? '';
const SOLAPI_API_SECRET = process.env.EXPO_PUBLIC_SOLAPI_API_SECRET ?? '';
const SOLAPI_FROM       = process.env.EXPO_PUBLIC_SOLAPI_FROM       ?? '';
const SOLAPI_PFID       = process.env.EXPO_PUBLIC_SOLAPI_PFID       ?? '';

/** 알림톡 템플릿 ID (Solapi 콘솔에서 승인 후 입력) */
export const ALIMTALK_TEMPLATES = {
  /** 예약 확정 안내 — 변수: #{이름}, #{업장명}, #{날짜}, #{인원} */
  RESERVATION_CONFIRMED: '',   // TODO: 등록 후 ID 입력
  /** 예약 취소 안내 — 변수: #{이름}, #{업장명}, #{날짜} */
  RESERVATION_CANCELLED: '',   // TODO: 등록 후 ID 입력
};

/** Solapi HMAC-SHA256 인증 헤더 생성 */
async function makeAuthHeader(): Promise<string> {
  const date = new Date().toISOString();
  const salt = Math.random().toString(36).substring(2, 17);

  // TODO: expo-crypto로 HMAC-SHA256(date + salt, SOLAPI_API_SECRET) 구현
  // import * as Crypto from 'expo-crypto';
  // const signature = await Crypto.digestStringAsync(
  //   Crypto.CryptoDigestAlgorithm.SHA256,
  //   date + salt,
  //   { encoding: Crypto.CryptoEncoding.HEX }
  // );
  const signature = 'TODO_IMPLEMENT_HMAC';

  return `HMAC-SHA256 apiKey=${SOLAPI_API_KEY}, date=${date}, salt=${salt}, signature=${signature}`;
}

interface AlimtalkParams {
  /** 수신 번호 (010-xxxx-xxxx 또는 01012345678) */
  to: string;
  /** Solapi 알림톡 템플릿 ID */
  templateId: string;
  /** 템플릿 변수 맵 (예: { '#{이름}': '홍길동' }) */
  variables: Record<string, string>;
}

/** 알림톡 1건 전송 */
export async function sendAlimtalk(params: AlimtalkParams): Promise<void> {
  if (!SOLAPI_API_KEY || !SOLAPI_PFID) {
    console.log('[Solapi] 환경변수 미설정 — 알림톡 건너뜀');
    return;
  }
  if (!params.templateId) {
    console.log('[Solapi] 템플릿 ID 없음 — 알림톡 건너뜀 (템플릿 등록 후 ALIMTALK_TEMPLATES 채워주세요)');
    return;
  }

  try {
    const authHeader = await makeAuthHeader();
    const body = {
      message: {
        to: params.to.replace(/-/g, ''),
        from: SOLAPI_FROM.replace(/-/g, ''),
        kakaoOptions: {
          pfId: SOLAPI_PFID,
          templateId: params.templateId,
          variables: params.variables,
        },
      },
    };

    const res = await fetch('https://rest.solapi.com/messages/v4/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      console.log('[Solapi] 전송 실패:', err);
    } else {
      console.log('[Solapi] 알림톡 전송 완료 →', params.to);
    }
  } catch (e) {
    console.log('[Solapi] 오류:', e);
  }
}

/** 예약 확정 알림톡 전송 */
export async function sendReservationConfirmedAlimtalk(params: {
  to: string;
  guestName: string;
  venueName: string;
  date: string;
  partySize: number;
}): Promise<void> {
  await sendAlimtalk({
    to: params.to,
    templateId: ALIMTALK_TEMPLATES.RESERVATION_CONFIRMED,
    variables: {
      '#{이름}':  params.guestName,
      '#{업장명}': params.venueName,
      '#{날짜}':  params.date,
      '#{인원}':  `${params.partySize}명`,
    },
  });
}

/** 예약 취소 알림톡 전송 */
export async function sendReservationCancelledAlimtalk(params: {
  to: string;
  guestName: string;
  venueName: string;
  date: string;
}): Promise<void> {
  await sendAlimtalk({
    to: params.to,
    templateId: ALIMTALK_TEMPLATES.RESERVATION_CANCELLED,
    variables: {
      '#{이름}':  params.guestName,
      '#{업장명}': params.venueName,
      '#{날짜}':  params.date,
    },
  });
}
