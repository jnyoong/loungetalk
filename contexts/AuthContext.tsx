import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  getStoredUser,
  signIn as fbSignIn,
  signUp as fbSignUp,
  signOut as fbSignOut,
  type FirebaseUser,
} from '../lib/firebaseAuth';
import { registerPushToken } from '../lib/notifications';
import { trackAppOpen } from '../lib/analytics';
import * as Notifications from 'expo-notifications';
import type { UserProfile, UserRole } from '../types';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, nickname: string, role: UserRole) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // 앱 시작 시 저장된 로그인 정보 복원
  useEffect(() => {
    getStoredUser()
      .then(async (stored) => {
        if (stored) {
          setUser(stored);
          await fetchProfile(stored.uid);
        }
      })
      .catch(() => {
        // AsyncStorage 또는 Firebase 오류 시에도 반드시 로딩 해제
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  async function fetchProfile(uid: string): Promise<UserProfile | null> {
    try {
      const snap = await getDoc(doc(db, 'profiles', uid));
      const p = snap.exists() ? (snap.data() as UserProfile) : null;
      setProfile(p);
      return p;
    } catch {
      setProfile(null);
      return null;
    }
  }

  /** 사업주 전용: 매일 오후 15시 방문 예정자 확인 알림 등록 */
  async function scheduleVenueOwnerDailyReminder() {
    try {
      // 기존 예약된 알림 전부 취소 후 재등록 (중복 방지)
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      const existing  = scheduled.find(n => n.content.data?.type === 'daily_visitors_reminder');
      if (existing) return; // 이미 등록됨

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '오늘의 방문 예정자 📋',
          body: '오늘 영업일 방문 확정 예약을 확인하세요',
          data: { type: 'daily_visitors_reminder' },
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: 15,
          minute: 0,
        },
      });
      console.log('[알림] ✅ 매일 15:00 방문자 리마인더 등록 완료');
    } catch (e) {
      console.warn('[알림] 일일 리마인더 등록 실패:', e);
    }
  }

  async function login(email: string, password: string) {
    const fbUser = await fbSignIn(email, password);
    setUser(fbUser);
    const fetchedProfile = await fetchProfile(fbUser.uid);
    // 푸시 토큰 등록 (비차단)
    registerPushToken(fbUser.uid).catch(() => {});
    // 앱 오픈 추적 (DAU 측정)
    trackAppOpen(fbUser.uid);
    // 사업주이면 매일 오후 15시 방문자 리마인더 알림 등록
    if (fetchedProfile?.role === 'venue_owner') {
      scheduleVenueOwnerDailyReminder().catch(() => {});
    }
  }

  async function register(email: string, password: string, nickname: string, role: UserRole) {
    const fbUser = await fbSignUp(email, password);
    const profileData: UserProfile = {
      id: fbUser.uid,
      email,
      nickname,
      role,
      // 사업주는 관리자 승인 전까지 'pending' 상태
      ...(role === 'venue_owner' ? { status: 'pending' as const } : {}),
      preferred_regions: [],
      preferred_categories: [],
      created_at: new Date().toISOString(),
    };
    await setDoc(doc(db, 'profiles', fbUser.uid), {
      ...profileData,
      created_at: serverTimestamp(),
    });
    setUser(fbUser);
    setProfile(profileData);
    // 푸시 토큰 등록
    registerPushToken(fbUser.uid).catch(() => {});
  }

  async function signOut() {
    await fbSignOut();
    setUser(null);
    setProfile(null);
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, register, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
