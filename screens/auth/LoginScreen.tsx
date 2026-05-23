import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  SafeAreaView, StatusBar, KeyboardAvoidingView, Platform,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../contexts/AuthContext';
import { Colors, Spacing, BorderRadius, Typography } from '../../constants/theme';
import type { AuthStackParamList } from '../../types';
import KeyboardDoneBar, { KEYBOARD_DONE_ID } from '../../components/KeyboardDoneBar';

type Nav = NativeStackNavigationProp<AuthStackParamList>;

export default function LoginScreen() {
  const navigation = useNavigation<Nav>();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert('입력 확인', '이메일과 비밀번호를 입력해주세요.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (e: any) {
      const msg = e.message ?? '';
      if (msg.includes('USER_NOT_FOUND') || msg.includes('INVALID_PASSWORD') || msg.includes('invalid-credential')) {
        Alert.alert('로그인 실패', '이메일 또는 비밀번호가 올바르지 않습니다.');
      } else {
        Alert.alert('로그인 실패', '다시 시도해주세요.');
      }
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <KeyboardDoneBar />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>로그인</Text>
            <Text style={styles.subtitle}>계속하려면 로그인하세요</Text>
          </View>

          <View style={styles.form}>
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
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                inputAccessoryViewID={KEYBOARD_DONE_ID}
                editable={!loading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>비밀번호</Text>
              <TextInput
                ref={passwordRef}
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="비밀번호 입력"
                placeholderTextColor={Colors.textMuted}
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                inputAccessoryViewID={KEYBOARD_DONE_ID}
                editable={!loading}
              />
            </View>

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.82}
            >
              {loading
                ? <ActivityIndicator color="#FFFFFF" />
                : <Text style={styles.btnText}>로그인</Text>
              }
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>아직 계정이 없으신가요? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup', { role: 'consumer' })}>
              <Text style={styles.footerLink}>가입하기</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1, paddingHorizontal: Spacing.lg },
  back: { paddingTop: Spacing.md, paddingBottom: Spacing.xl },
  backText: { fontSize: 22, color: Colors.textSecondary },

  header: { marginBottom: Spacing.xl },
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
