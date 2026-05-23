/**
 * screens/venue/VenuePendingScreen.tsx
 * 사업주 회원가입 후 관리자 승인 대기 화면
 */
import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, StatusBar, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { Colors, Spacing, BorderRadius, Typography } from '../../constants/theme';

export default function VenuePendingScreen() {
  const { profile, signOut } = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />

      <View style={styles.content}>
        {/* 아이콘 */}
        <View style={styles.iconWrap}>
          <Ionicons name="time-outline" size={48} color={Colors.accent} />
        </View>

        {/* 메시지 */}
        <Text style={styles.title} allowFontScaling={false}>승인 심사 중</Text>
        <Text style={styles.subtitle} allowFontScaling={false}>
          {profile?.nickname ?? '사업주'}님의 업장 등록 신청을 검토 중입니다.
        </Text>

        <View style={styles.infoBox}>
          <InfoRow
            icon="checkmark-circle-outline"
            text="회원가입이 완료되었습니다."
          />
          <InfoRow
            icon="shield-checkmark-outline"
            text="관리자가 업장 정보를 확인한 후 승인합니다."
          />
          <InfoRow
            icon="notifications-outline"
            text="승인 완료 시 앱에서 바로 이용 가능합니다."
          />
          <InfoRow
            icon="time-outline"
            text="보통 1~2 영업일 내 처리됩니다."
          />
        </View>

        <Text style={styles.hint} allowFontScaling={false}>
          문의: kahn201130@gmail.com
        </Text>
      </View>

      {/* 로그아웃 */}
      <TouchableOpacity
        style={styles.signOutBtn}
        onPress={() => Alert.alert('로그아웃', '로그아웃 하시겠어요?', [
          { text: '취소', style: 'cancel' },
          { text: '로그아웃', style: 'destructive', onPress: signOut },
        ])}
      >
        <Text style={styles.signOutText} allowFontScaling={false}>로그아웃</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function InfoRow({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color={Colors.accent} />
      <Text style={styles.infoText} allowFontScaling={false}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.accentSoft,
    borderWidth: 1,
    borderColor: Colors.accentMid,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    ...Typography.display,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  infoBox: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  hint: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
  },
  signOutBtn: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.25)',
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.error,
  },
});
