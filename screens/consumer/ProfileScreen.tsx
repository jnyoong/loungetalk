import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, StatusBar, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../contexts/AuthContext';
import { Colors, Spacing, BorderRadius, Typography } from '../../constants/theme';
import type { RootStackParamList } from '../../types';

export default function ProfileScreen() {
  const { profile, signOut } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  function handleSignOut() {
    Alert.alert('로그아웃', '정말 로그아웃 하시겠어요?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: signOut },
    ]);
  }

  if (!profile) return null;

  const initial = profile.nickname?.[0]?.toUpperCase() ?? '?';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── 프로필 헤더 ────────────────────────────────── */}
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.nickname}>{profile.nickname}</Text>
            <Text style={styles.email}>{profile.email}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* ── 예약 관리 ─────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>예약</Text>
          <MenuItem
            label="예약 내역"
            onPress={() => navigation.navigate('MyReservations')}
          />
        </View>

        {/* ── 설정 ──────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>설정</Text>
          <MenuItem label="프로필 수정" onPress={() => {}} />
          <MenuItem label="알림 설정" onPress={() => {}} />
          <MenuItem label="언어 (한국어 / English)" onPress={() => {}} />
        </View>

        {/* ── 지원 ──────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>지원</Text>
          <MenuItem label="도움말" onPress={() => {}} />
          <MenuItem label="이용약관" onPress={() => {}} />
          <MenuItem label="개인정보처리방침" onPress={() => {}} />
        </View>

        {/* ── 로그아웃 ──────────────────────────────────── */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>로그아웃</Text>
        </TouchableOpacity>

        <Text style={styles.version}>LOUNGETALK v1.0.0</Text>
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuItem({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.65}>
      <Text style={styles.menuLabel}>{label}</Text>
      <Text style={styles.menuArrow}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },

  // ── 프로필
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.accentSoft,
    borderWidth: 1,
    borderColor: Colors.accentMid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.accent,
  },
  profileInfo: { flex: 1, gap: 3 },
  nickname: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.2,
  },
  email: { ...Typography.bodySmall, color: Colors.textMuted },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },

  // ── 섹션
  section: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '400',
    color: Colors.textPrimary,
  },
  menuArrow: {
    fontSize: 18,
    color: Colors.textMuted,
    fontWeight: '300',
  },

  // ── 로그아웃
  signOutBtn: {
    marginHorizontal: Spacing.lg,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.error + '44',
    marginBottom: Spacing.md,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.error,
  },

  version: {
    textAlign: 'center',
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: Spacing.md,
  },
});
