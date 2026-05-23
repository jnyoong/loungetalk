import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, StatusBar, Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Spacing, BorderRadius, Typography } from '../../constants/theme';
import type { AuthStackParamList } from '../../types';

const { height } = Dimensions.get('window');
type Nav = NativeStackNavigationProp<AuthStackParamList>;

export default function OnboardingScreen() {
  const navigation = useNavigation<Nav>();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />
      <SafeAreaView style={styles.safe}>

        {/* 로고 */}
        <View style={styles.logoArea}>
          <View style={styles.logoMark}>
            <Text style={styles.logoMarkText}>LT</Text>
          </View>
          <Text style={styles.wordmark}>LOUNGETALK</Text>
          <Text style={styles.tagline}>서울의 밤</Text>
        </View>

        {/* 키워드 */}
        <View style={styles.keywordArea}>
          <KeywordRow items={['강남', '이태원', '홍대', '청담']} />
          <KeywordRow items={['EDM', 'Hip-Hop', 'Techno', 'Jazz']} dim />
          <KeywordRow items={['오늘 밤', '공연', '라인업', '예약']} />
        </View>

        {/* 버튼 */}
        <View style={styles.buttons}>
          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={() => navigation.navigate('Signup', { role: 'consumer' })}
            activeOpacity={0.82}
          >
            <Text style={styles.btnPrimaryText}>시작하기</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnSecondary}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.7}
          >
            <Text style={styles.btnSecondaryText}>로그인</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnVenue}
            onPress={() => navigation.navigate('Signup', { role: 'venue_owner' })}
            activeOpacity={0.7}
          >
            <Text style={styles.btnVenueText}>업장 등록 (사업주)</Text>
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
          <Text style={[styles.kwText, dim && styles.kwTextDim]}>{kw}</Text>
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingTop: Spacing.xl,
  },
  logoMark: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  logoMarkText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  wordmark: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 5,
    marginBottom: Spacing.sm,
  },
  tagline: {
    fontSize: 42,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -1,
    lineHeight: 48,
  },

  // ── 키워드 ─────────────────────────────────────────────────────
  keywordArea: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  kwRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
  kwChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.borderActive,
  },
  kwChipDim: {
    borderColor: Colors.border,
  },
  kwText: {
    fontSize: 14,
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
  btnVenue: {
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  btnVenueText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '500',
  },
});
