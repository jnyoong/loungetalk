import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  SafeAreaView, StatusBar, KeyboardAvoidingView, Platform,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../contexts/AuthContext';
import { Colors, Spacing, BorderRadius, Typography } from '../../constants/theme';
import type { AuthStackParamList } from '../../types';

type Nav = NativeStackNavigationProp<AuthStackParamList>;
type Route = RouteProp<AuthStackParamList, 'Signup'>;

export default function SignupScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { register } = useAuth();
  const role = route.params?.role ?? 'consumer';
  const isVenueOwner = role === 'venue_owner';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);

  async function handleSignup() {
    if (!nickname.trim()) { Alert.alert('입력 확인', isVenueOwner ? '업체명을 입력해주세요.' : '닉네임을 입력해주세요.'); return; }
    if (!email.trim()) { Alert.alert('입력 확인', '이메일을 입력해주세요.'); return; }
    if (!password) { Alert.alert('입력 확인', '비밀번호를 입력해주세요.'); return; }
    if (password.length < 6) { Alert.alert('비밀번호', '비밀번호는 6자 이상이어야 합니다.'); return; }
    if (!ageConfirmed) { Alert.alert('연령 확인', '만 19세 이상만 이용 가능합니다.'); return; }
    if (!agreed) { Alert.alert('약관 동의', '이용약관에 동의해주세요.'); return; }

    setLoading(true);
    try {
      await register(email.trim(), password, nickname.trim(), role);
    } catch (e: any) {
      const msg = e.message ?? '';
      if (msg.includes('EMAIL_EXISTS') || msg.includes('email-already-in-use')) {
        Alert.alert('가입 실패', '이미 사용 중인 이메일입니다.');
      } else if (msg.includes('INVALID_EMAIL') || msg.includes('invalid-email')) {
        Alert.alert('가입 실패', '이메일 형식이 올바르지 않습니다.');
      } else {
        Alert.alert('가입 실패', msg || '다시 시도해주세요.');
      }
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.rolePill}>
              <Text style={styles.rolePillText}>
                {isVenueOwner ? '사업주' : '일반'}
              </Text>
            </View>
            <Text style={styles.title}>회원가입</Text>
            <Text style={styles.subtitle}>
              {isVenueOwner ? '업장을 등록하고 고객과 연결하세요' : '서울 나이트라이프를 한눈에'}
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{isVenueOwner ? '업체명 / 담당자' : '닉네임'}</Text>
              <TextInput
                style={styles.input}
                value={nickname}
                onChangeText={setNickname}
                placeholder={isVenueOwner ? '라운지ABC / 홍길동' : '닉네임'}
                placeholderTextColor={Colors.textMuted}
                maxLength={20}
                editable={!loading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>이메일</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="hello@example.com"
                placeholderTextColor={Colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>비밀번호</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="6자 이상"
                placeholderTextColor={Colors.textMuted}
                secureTextEntry
                editable={!loading}
              />
            </View>

            {/* 체크박스 */}
            <TouchableOpacity style={styles.checkRow} onPress={() => setAgeConfirmed(!ageConfirmed)}>
              <View style={[styles.check, ageConfirmed && styles.checkOn]}>
                {ageConfirmed && <Text style={styles.checkMark}>✓</Text>}
              </View>
              <Text style={styles.checkText}>만 19세 이상입니다 <Text style={styles.required}>(필수)</Text></Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.checkRow} onPress={() => setAgreed(!agreed)}>
              <View style={[styles.check, agreed && styles.checkOn]}>
                {agreed && <Text style={styles.checkMark}>✓</Text>}
              </View>
              <Text style={styles.checkText}>이용약관 및 개인정보처리방침 동의 <Text style={styles.required}>(필수)</Text></Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleSignup}
              disabled={loading}
              activeOpacity={0.82}
            >
              {loading
                ? <ActivityIndicator color="#FFFFFF" />
                : <Text style={styles.btnText}>가입하기</Text>
              }
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>이미 계정이 있으신가요? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.footerLink}>로그인</Text>
            </TouchableOpacity>
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1, paddingHorizontal: Spacing.lg },
  back: { paddingTop: Spacing.md, paddingBottom: Spacing.lg },
  backText: { fontSize: 22, color: Colors.textSecondary },

  header: { marginBottom: Spacing.xl },
  rolePill: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.accentSoft,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.accentMid,
  },
  rolePillText: { fontSize: 12, fontWeight: '600', color: Colors.accent },
  title: { ...Typography.display, marginBottom: Spacing.xs },
  subtitle: { ...Typography.bodySmall, color: Colors.textMuted },

  form: { gap: Spacing.md },
  inputGroup: { gap: 6 },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 15,
    color: Colors.textPrimary,
    fontSize: 15,
  },

  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  check: {
    width: 20, height: 20, borderRadius: 5,
    borderWidth: 1.5, borderColor: Colors.borderActive,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 1, flexShrink: 0,
  },
  checkOn: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  checkMark: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  checkText: { ...Typography.bodySmall, flex: 1, lineHeight: 20 },
  required: { color: Colors.accent },

  btn: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: Spacing.sm,
    minHeight: 54,
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.3 },

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  footerText: { ...Typography.bodySmall },
  footerLink: { fontSize: 13, color: Colors.accent, fontWeight: '600' },
});
