import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, StatusBar, Animated, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import type { AuthStackParamList } from '../../types';

type Nav = NativeStackNavigationProp<AuthStackParamList>;

export default function OnboardingScreen() {
  const navigation = useNavigation<Nav>();

  // 로고 페이드인 애니메이션
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />
      <SafeAreaView style={styles.safe}>

        {/* ── 로고 영역 ─────────────────────────────────────────── */}
        <Animated.View
          style={[
            styles.logoArea,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* 로고 마크 */}
          <View style={styles.logoMark}>
            <Text style={styles.logoMarkText} allowFontScaling={false}>LT</Text>
          </View>

          {/* 워드마크 */}
          <Text style={styles.wordmark} allowFontScaling={false}>LOUNGETALK</Text>

          {/* 서비스 소개 */}
          <Text style={styles.headline} allowFontScaling={false}>
            서울 나이트라이프{'\n'}가이드
          </Text>
          <Text style={styles.tagline} allowFontScaling={false}>
            클럽 · 라운지바 · 루프탑바 · 재즈바
          </Text>
        </Animated.View>

        {/* ── 키워드 칩 영역 ────────────────────────────────────── */}
        <Animated.View style={[styles.keywordArea, { opacity: fadeAnim }]}>
          <KeywordRow items={['강남', '이태원', '홍대', '청담', '신촌']} />
          <KeywordRow items={['EDM', 'Hip-Hop', 'Techno', 'Jazz', 'K-Pop']} dim />
          <KeywordRow items={['오늘의 라인업', '이벤트', '예약', '즐겨찾기']} />
        </Animated.View>

        {/* ── 버튼 영역 ─────────────────────────────────────────── */}
        <View style={styles.buttons}>
          {/* 시작하기 */}
          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={() => navigation.navigate('Signup', { role: 'consumer' })}
            activeOpacity={0.82}
          >
            <Text style={styles.btnPrimaryText} allowFontScaling={false}>시작하기</Text>
          </TouchableOpacity>

          {/* 로그인 */}
          <TouchableOpacity
            style={styles.btnSecondary}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.7}
          >
            <Text style={styles.btnSecondaryText} allowFontScaling={false}>로그인</Text>
          </TouchableOpacity>

          {/* 구분선 */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText} allowFontScaling={false}>사업주이신가요?</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* 업장 등록 */}
          <TouchableOpacity
            style={styles.btnVenue}
            onPress={() => navigation.navigate('Signup', { role: 'venue_owner' })}
            activeOpacity={0.7}
          >
            <Text style={styles.btnVenueText} allowFontScaling={false}>업장 등록 신청</Text>
          </TouchableOpacity>
        </View>

      </SafeAreaView>
    </View>
  );
}

function KeywordRow({ items, dim }: { items: string[]; dim?: boolean }) {
  return (
    <View style={styles.kwRow}>
      {items.map((kw, i) => (
        <View key={i} style={[styles.kwChip, dim && styles.kwChipDim]}>
          <Text
            style={[styles.kwText, dim && styles.kwTextDim]}
            allowFontScaling={false}
          >
            {kw}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  safe: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },

  // ── 로고 ──────────────────────────────────────────────────────
  logoArea: {
    flex: 1.2,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Spacing.xl,
  },
  logoMark: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    // 글로우 효과 (iOS 전용)
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  logoMarkText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  wordmark: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 6,
    marginBottom: Spacing.lg,
  },
  headline: {
    fontSize: Platform.OS === 'android' ? 34 : 38,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -1,
    lineHeight: Platform.OS === 'android' ? 42 : 46,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  tagline: {
    fontSize: 13,
    color: Colors.textMuted,
    letterSpacing: 0.5,
    textAlign: 'center',
  },

  // ── 키워드 ─────────────────────────────────────────────────────
  keywordArea: {
    flex: 0.9,
    justifyContent: 'center',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  kwRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  kwChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.borderActive,
  },
  kwChipDim: {
    borderColor: Colors.border,
  },
  kwText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  kwTextDim: {
    color: Colors.textMuted,
  },

  // ── 버튼 ──────────────────────────────────────────────────────
  buttons: {
    gap: Spacing.sm,
    paddingBottom: Spacing.xl,
  },
  btnPrimary: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.md,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  btnPrimaryText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  btnSecondary: {
    borderRadius: BorderRadius.md,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderActive,
  },
  btnSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
  },

  // 구분선
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginVertical: Spacing.xs,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
  },
  dividerText: {
    fontSize: 12,
    color: Colors.textMuted,
  },

  btnVenue: {
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  btnVenueText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '500',
    textDecorationLine: 'underline',
    textDecorationColor: Colors.textMuted,
  },
});
