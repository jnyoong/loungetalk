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
    getStoredUser().then(async (stored) => {
      if (stored) {
        setUser(stored);
        await fetchProfile(stored.uid);
      }
      setLoading(false);
    });
  }, []);

  async function fetchProfile(uid: string) {
    try {
      const snap = await getDoc(doc(db, 'profiles', uid));
      setProfile(snap.exists() ? (snap.data() as UserProfile) : null);
    } catch {
      setProfile(null);
    }
  }

  async function login(email: string, password: string) {
    const fbUser = await fbSignIn(email, password);
    setUser(fbUser);
    await fetchProfile(fbUser.uid);
    // 푸시 토큰 등록 (비차단 — 실패해도 로그인에 영향 없음)
    registerPushToken(fbUser.uid).catch(() => {});
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
