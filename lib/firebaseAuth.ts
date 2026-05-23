import AsyncStorage from '@react-native-async-storage/async-storage';
import { FIREBASE_API_KEY } from './firebase';

const BASE = 'https://identitytoolkit.googleapis.com/v1/accounts';
const AUTH_KEY = 'loungetalk_auth';

export interface FirebaseUser {
  uid: string;
  email: string;
  idToken: string;
  refreshToken: string;
}

export async function signUp(email: string, password: string): Promise<FirebaseUser> {
  const res = await fetch(`${BASE}:signUp?key=${FIREBASE_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? '회원가입 실패');
  const user = { uid: data.localId, email: data.email, idToken: data.idToken, refreshToken: data.refreshToken };
  await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(user));
  return user;
}

export async function signIn(email: string, password: string): Promise<FirebaseUser> {
  const res = await fetch(`${BASE}:signInWithPassword?key=${FIREBASE_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const data = await res.json();
  if (!res.ok) {
    const code = data.error?.message ?? '';
    if (code.includes('EMAIL_NOT_FOUND') || code.includes('INVALID_LOGIN_CREDENTIALS'))
      throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
    if (code.includes('INVALID_EMAIL')) throw new Error('유효하지 않은 이메일입니다.');
    throw new Error(code);
  }
  const user = { uid: data.localId, email: data.email, idToken: data.idToken, refreshToken: data.refreshToken };
  await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(user));
  return user;
}

export async function signOut(): Promise<void> {
  await AsyncStorage.removeItem(AUTH_KEY);
}

export async function getStoredUser(): Promise<FirebaseUser | null> {
  const raw = await AsyncStorage.getItem(AUTH_KEY);
  return raw ? JSON.parse(raw) : null;
}
