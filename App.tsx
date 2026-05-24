import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './contexts/AuthContext';
import RootNavigator from './navigation/RootNavigator';
import { initNotificationHandler } from './lib/notifications';

// ── 에러 바운더리 ─────────────────────────────────────────────────
// 렌더링 중 크래시 발생 시 까만 화면 대신 에러 메시지 표시
interface EBState { hasError: boolean; error?: string }
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, EBState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error): EBState {
    return { hasError: true, error: error?.message ?? String(error) };
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errBox}>
          <Text style={styles.errTitle}>앱 오류</Text>
          <Text style={styles.errMsg}>{this.state.error}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

// ── 앱 진입점 ──────────────────────────────────────────────────────
export default function App() {
  useEffect(() => {
    // 포그라운드 알림 핸들러 등록 (try-catch 내장, 실패해도 앱 계속 실행)
    initNotificationHandler();
  }, []);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <AuthProvider>
            <StatusBar style="light" backgroundColor="#0A0A0A" />
            <RootNavigator />
          </AuthProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  errBox: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F87171',
    marginBottom: 12,
  },
  errMsg: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 20,
  },
});
