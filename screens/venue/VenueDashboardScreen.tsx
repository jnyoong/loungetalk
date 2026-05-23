import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, StatusBar, RefreshControl, Alert,
} from 'react-native';
import {
  collection, query, where, getDocs, doc, updateDoc,
} from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Colors, Spacing, BorderRadius, Typography } from '../../constants/theme';
import { sendPushNotification, getProfilePushToken } from '../../lib/notifications';
import type { RootStackParamList } from '../../types';

export default function VenueDashboardScreen() {
  const { profile, signOut } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [venue, setVenue] = useState<any>(null);
  const [reservations, setReservations] = useState<any[]>([]);
  const [todayConfirmed, setTodayConfirmed] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchData(); }, [profile]);

  async function fetchData() {
    if (!profile) return;
    setLoading(true);

    const venueSnap = await getDocs(
      query(collection(db, 'venues'), where('owner_id', '==', profile.id))
    );
    const venueDoc = venueSnap.docs[0] ?? null;
    const venueData = venueDoc ? { id: venueDoc.id, ...venueDoc.data() } : null;
    setVenue(venueData);

    if (venueData) {
      const today = new Date().toISOString().split('T')[0];
      const resSnap = await getDocs(query(
        collection(db, 'reservations'),
        where('venue_id', '==', venueData.id),
      ));
      const allRes = resSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // 대기 예약 (최신순)
      const pendingRes = allRes
        .filter((r: any) => r.status === 'pending')
        .sort((a: any, b: any) => (b.created_at?.seconds ?? 0) - (a.created_at?.seconds ?? 0));

      // 오늘 방문 확정 예약 (이름순)
      const todayRes = allRes
        .filter((r: any) => r.status === 'confirmed' && r.reservation_date === today)
        .sort((a: any, b: any) => (a.contact_name ?? '').localeCompare(b.contact_name ?? ''));

      setReservations(pendingRes);
      setTodayConfirmed(todayRes);
    }
    setLoading(false);
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => { setRefreshing(true); await fetchData(); setRefreshing(false); }}
            tintColor={Colors.accent}
          />
        }
      >
        {/* ── 헤더 ─────────────────────────────────────── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>안녕하세요, {profile?.nickname}</Text>
            <Text style={styles.venueName}>{venue?.name ?? '업장 미등록'}</Text>
          </View>
          {venue && (
            <View style={[styles.statusPill, { backgroundColor: venue.is_active ? Colors.success + '18' : Colors.error + '18' }]}>
              <View style={[styles.statusDot, { backgroundColor: venue.is_active ? Colors.success : Colors.error }]} />
              <Text style={[styles.statusText, { color: venue.is_active ? Colors.success : Colors.error }]}>
                {venue.is_active ? '영업 중' : '휴업'}
              </Text>
            </View>
          )}
        </View>

        {/* 업장 미등록 */}
        {!venue && !loading && (
          <View style={styles.noVenueCard}>
            <Text style={styles.noVenueText}>업장정보 탭에서 업장을 등록하세요</Text>
          </View>
        )}

        {venue && (
          <>
            {/* ── 통계 ─────────────────────────────────── */}
            <View style={styles.statsRow}>
              <StatCard label="대기 예약" value={reservations.length} accent={reservations.length > 0} />
              <StatCard
                label="오늘 방문 예정"
                value={todayConfirmed.reduce((s: number, r: any) => s + (r.party_size ?? 1), 0)}
                accent={todayConfirmed.length > 0}
                unit="명"
              />
            </View>

            {/* ── 대기 예약 ─────────────────────────────── */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionLabel}>대기 예약</Text>
                <TouchableOpacity
                  style={styles.manageBtn}
                  onPress={() => navigation.navigate('VenueReservations')}
                >
                  <Text style={styles.manageBtnText}>전체 예약 관리</Text>
                  <Ionicons name="chevron-forward" size={13} color={Colors.accent} />
                </TouchableOpacity>
              </View>
              {reservations.length === 0 ? (
                <View style={styles.noReservation}>
                  <Text style={styles.noReservationText}>대기 중인 예약이 없습니다</Text>
                </View>
              ) : (
                reservations.slice(0, 5).map(r => (
                  <ReservationRow key={r.id} reservation={r} onAction={fetchData} venue={venue} />
                ))
              )}
            </View>

            {/* ── 오늘 방문 예정자 ──────────────────────── */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionLabel}>오늘 방문 예정</Text>
                {todayConfirmed.length > 0 && (
                  <Text style={styles.sectionCount}>
                    {todayConfirmed.length}팀 ·{' '}
                    {todayConfirmed.reduce((s: number, r: any) => s + (r.party_size ?? 1), 0)}명
                  </Text>
                )}
              </View>
              {todayConfirmed.length === 0 ? (
                <View style={styles.noReservation}>
                  <Text style={styles.noReservationText}>오늘 방문 예정 예약이 없습니다</Text>
                </View>
              ) : (
                todayConfirmed.map((r: any) => (
                  <View key={r.id} style={styles.todayRow}>
                    <View style={styles.todayPartyBox}>
                      <Text style={styles.todayPartyNum}>{r.party_size}</Text>
                      <Text style={styles.todayPartyUnit}>명</Text>
                    </View>
                    <View style={styles.todayInfo}>
                      <Text style={styles.todayName}>{r.contact_name}</Text>
                      <Text style={styles.todayPhone}>{r.contact_phone}</Text>
                      {r.special_requests ? (
                        <Text style={styles.todayReq} numberOfLines={1}>{r.special_requests}</Text>
                      ) : null}
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        )}

        {/* ── 로그아웃 ──────────────────────────────────── */}
        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={() => Alert.alert('로그아웃', '로그아웃 하시겠어요?', [
            { text: '취소', style: 'cancel' },
            { text: '로그아웃', style: 'destructive', onPress: signOut },
          ])}
        >
          <Text style={styles.signOutText}>로그아웃</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ label, value, accent, unit }: { label: string; value: number; accent?: boolean; unit?: string }) {
  return (
    <View style={[styles.statCard, accent && value > 0 && styles.statCardAccent]}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
        <Text style={[styles.statValue, accent && value > 0 && { color: Colors.accent }]}>{value}</Text>
        {unit && <Text style={[styles.statUnit, accent && value > 0 && { color: Colors.accent }]}>{unit}</Text>}
      </View>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ReservationRow({
  reservation,
  onAction,
  venue,
}: {
  reservation: any;
  onAction: () => void;
  venue: any;
}) {
  async function handleConfirm() {
    await updateDoc(doc(db, 'reservations', reservation.id), { status: 'confirmed' });
    // 고객 앱 푸시 알림
    try {
      const token = await getProfilePushToken(reservation.user_id);
      if (token) {
        await sendPushNotification({
          to: token,
          title: '예약이 확정되었습니다 ✓',
          body: `${venue?.name ?? ''} · ${reservation.reservation_date} · ${reservation.party_size}명`,
          data: { type: 'reservation_confirmed', reservationId: reservation.id },
        });
      }
    } catch {}
    onAction();
  }

  async function handleReject() {
    await updateDoc(doc(db, 'reservations', reservation.id), { status: 'cancelled' });
    // 고객 앱 푸시 알림
    try {
      const token = await getProfilePushToken(reservation.user_id);
      if (token) {
        await sendPushNotification({
          to: token,
          title: '예약이 취소되었습니다',
          body: `${venue?.name ?? ''} ${reservation.reservation_date} 예약이 업장 측 사정으로 취소되었습니다.`,
          data: { type: 'reservation_cancelled', reservationId: reservation.id },
        });
      }
    } catch {}
    onAction();
  }

  return (
    <View style={styles.resRow}>
      <View style={styles.resInfo}>
        <Text style={styles.resName}>{reservation.contact_name} · {reservation.party_size}명</Text>
        <Text style={styles.resMeta}>{reservation.reservation_date} · {reservation.contact_phone}</Text>
        {reservation.special_requests && (
          <Text style={styles.resReq} numberOfLines={1}>{reservation.special_requests}</Text>
        )}
      </View>
      <View style={styles.resActions}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: Colors.success + '15', borderColor: Colors.success + '40' }]}
          onPress={handleConfirm}
        >
          <Text style={[styles.actionBtnText, { color: Colors.success }]}>확정</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: Colors.error + '15', borderColor: Colors.error + '40' }]}
          onPress={handleReject}
        >
          <Text style={[styles.actionBtnText, { color: Colors.error }]}>거절</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  greeting: { ...Typography.caption, marginBottom: 4 },
  venueName: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: '600' },

  noVenueCard: {
    margin: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  noVenueText: { ...Typography.bodySmall, color: Colors.textSecondary, textAlign: 'center' },

  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: 5,
  },
  statCardAccent: { borderColor: Colors.accentMid, backgroundColor: Colors.accentSoft },
  statValue: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  statUnit: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  statLabel: { ...Typography.caption },
  sectionCount: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.accent,
  },
  todayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.xs,
  },
  todayPartyBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
    backgroundColor: Colors.accentSoft,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 52,
    justifyContent: 'center',
  },
  todayPartyNum: { fontSize: 20, fontWeight: '800', color: Colors.accent },
  todayPartyUnit: { fontSize: 11, fontWeight: '600', color: Colors.accent },
  todayInfo: { flex: 1, gap: 3 },
  todayName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  todayPhone: { fontSize: 12, color: Colors.textSecondary },
  todayReq: { fontSize: 11, color: Colors.textMuted, fontStyle: 'italic' },

  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.xl },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  manageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  manageBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.accent,
  },
  noReservation: {
    paddingVertical: 20,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  noReservationText: { ...Typography.caption },

  resRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.xs,
    gap: Spacing.md,
    alignItems: 'center',
  },
  resInfo: { flex: 1, gap: 3 },
  resName: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  resMeta: { ...Typography.caption },
  resReq: { ...Typography.caption, color: Colors.textMuted },
  resActions: { gap: Spacing.xs },
  actionBtn: {
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  actionBtnText: { fontSize: 12, fontWeight: '700' },

  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  eventDateBox: {
    width: 40,
    alignItems: 'center',
    backgroundColor: Colors.accentSoft,
    borderRadius: BorderRadius.sm,
    paddingVertical: 5,
  },
  eventDateText: { fontSize: 18, fontWeight: '800', color: Colors.accent },
  eventMonthText: { fontSize: 9, fontWeight: '600', color: Colors.accent, letterSpacing: 0.5 },
  eventTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.textPrimary },

  signOutBtn: {
    marginHorizontal: Spacing.lg,
    paddingVertical: 13,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  signOutText: { ...Typography.bodySmall, color: Colors.textSecondary },
});
