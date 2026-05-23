import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SectionList, TouchableOpacity,
  StatusBar, RefreshControl, Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  collection, query, where, getDocs, doc, updateDoc,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Colors, Spacing, BorderRadius, Typography } from '../../constants/theme';
import { sendPushNotification, getProfilePushToken } from '../../lib/notifications';
import { sendReservationConfirmedAlimtalk, sendReservationCancelledAlimtalk } from '../../lib/solapi';
import {
  getNightlifeDate, getReservationBusinessDate,
  getBusinessDayLabel, formatVisitDateTime,
} from '../../lib/nightlifeDate';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'VenueReservations'>;

// ── 유틸 ─────────────────────────────────────────────────────────
function formatDate(dateStr: string, withDow = true) {
  const d = new Date(dateStr);
  const dow = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
  if (!withDow) return `${d.getMonth() + 1}월 ${d.getDate()}일`;
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${dow})`;
}

function getNightlifeTomorrowStr() {
  // 영업일 기준 "내일" = 오늘 영업일 + 1
  const today = getNightlifeDate();
  const d = new Date(today + 'T12:00:00');
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function formatCreatedAt(ts: any) {
  if (!ts?.seconds) return '';
  const d = new Date(ts.seconds * 1000);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} 신청`;
}

const STATUS_COLOR: Record<string, string> = {
  pending:   Colors.accent,
  confirmed: '#10B981',
  cancelled: '#6B7280',
};

// ── 예약 카드 ─────────────────────────────────────────────────────
function ResCard({
  item,
  isProcessing,
  onConfirm,
  onReject,
  showActions = true,
}: {
  item: any;
  isProcessing: boolean;
  onConfirm: (r: any) => void;
  onReject:  (r: any) => void;
  showActions?: boolean;
}) {
  const status = item.status as 'pending' | 'confirmed' | 'cancelled';
  const color  = STATUS_COLOR[status] ?? Colors.textMuted;

  return (
    <View style={styles.card}>
      <View style={styles.cardTopRow}>
        <View style={[styles.statusBadge, { backgroundColor: color + '18' }]}>
          <View style={[styles.dot, { backgroundColor: color }]} />
          <Text style={[styles.statusText, { color }]} allowFontScaling={false}>
            {{ pending: '대기 중', confirmed: '확정', cancelled: '취소' }[status]}
          </Text>
        </View>
        <Text style={styles.createdAt} allowFontScaling={false}>{formatCreatedAt(item.created_at)}</Text>
      </View>

      <View style={styles.guestRow}>
        <Text style={styles.guestName} allowFontScaling={false}>{item.contact_name}</Text>
        <Text style={styles.partySz}  allowFontScaling={false}>{item.party_size}명</Text>
      </View>

      <View style={styles.detailBox}>
        {/* 날짜+시각 항상 명시 표시 — "익일(5/25) 01:00" 처럼 보여 혼동 방지 */}
        <DRow icon="calendar-outline"  label="방문 일시"  value={formatVisitDateTime(item.reservation_date, item.visit_time)} />
        <DRow icon="call-outline"      label="연락처"    value={item.contact_phone} />
        {item.special_requests ? (
          <DRow icon="chatbubble-outline" label="요청사항" value={item.special_requests} />
        ) : null}
      </View>

      {showActions && status === 'pending' && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.rejectBtn} onPress={() => onReject(item)} disabled={isProcessing}>
            <Text style={styles.rejectTxt} allowFontScaling={false}>거절</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.confirmBtn} onPress={() => onConfirm(item)} disabled={isProcessing}>
            {isProcessing
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.confirmTxt} allowFontScaling={false}>예약 확정</Text>}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function DRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.dRow}>
      <Ionicons name={icon} size={13} color={Colors.textMuted} style={{ marginTop: 2 }} />
      <Text style={styles.dLabel} allowFontScaling={false}>{label}</Text>
      <Text style={styles.dValue} allowFontScaling={false} numberOfLines={2}>{value}</Text>
    </View>
  );
}

// ── SectionList 섹션 헤더 ─────────────────────────────────────────
function SectionHeader({ title, count, people }: { title: string; count: number; people?: number }) {
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.sectionHeadTitle} allowFontScaling={false}>{title}</Text>
      <Text style={styles.sectionHeadBadge} allowFontScaling={false}>
        {count}건{people !== undefined ? ` · ${people}명` : ''}
      </Text>
    </View>
  );
}

// ── 메인 ─────────────────────────────────────────────────────────
export default function VenueReservationsScreen({ navigation }: Props) {
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();

  const [venue,      setVenue]      = useState<any>(null);
  const [all,        setAll]        = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);

  // ⚠️ 나이트라이프 영업일 기준 (00:00~07:59 = 전날 영업일)
  const today    = getNightlifeDate();
  const tomorrow = getNightlifeTomorrowStr();

  const fetchData = useCallback(async () => {
    if (!profile) return;
    const vSnap = await getDocs(
      query(collection(db, 'venues'), where('owner_id', '==', profile.id))
    );
    const vDoc = vSnap.docs[0];
    if (!vDoc) { setLoading(false); return; }
    const vData = { id: vDoc.id, ...vDoc.data() };
    setVenue(vData);

    const rSnap = await getDocs(
      query(collection(db, 'reservations'), where('venue_id', '==', vData.id))
    );
    setAll(rSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoading(false);
  }, [profile]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── 섹션 데이터 빌드 ───────────────────────────────────────────
  const sections = React.useMemo(() => {
    const pending   = all.filter(r => r.status === 'pending')
                         .sort((a, b) => (b.created_at?.seconds ?? 0) - (a.created_at?.seconds ?? 0));
    const confirmed = all.filter(r => r.status === 'confirmed');
    const cancelled = all.filter(r => r.status === 'cancelled')
                         .sort((a, b) => (b.created_at?.seconds ?? 0) - (a.created_at?.seconds ?? 0));

    // ── 영업일 기준 오늘 / 내일 / 이후 분류 ──────────────────────
    // getReservationBusinessDate: 새벽(00~07:59) 방문 예약을 전날 영업일로 귀속
    const sortByVisitTime = (a: any, b: any) => {
      const ta = a.visit_time ?? '99:99';
      const tb = b.visit_time ?? '99:99';
      return ta.localeCompare(tb);
    };
    const todayList    = confirmed
      .filter(r => getReservationBusinessDate(r.reservation_date, r.visit_time) === today)
      .sort(sortByVisitTime);
    const tomorrowList = confirmed
      .filter(r => getReservationBusinessDate(r.reservation_date, r.visit_time) === tomorrow)
      .sort(sortByVisitTime);
    const futureConf   = confirmed
      .filter(r => {
        const bd = getReservationBusinessDate(r.reservation_date, r.visit_time);
        return bd > tomorrow;
      })
      .sort((a, b) => {
        const ba = getReservationBusinessDate(a.reservation_date, a.visit_time);
        const bb = getReservationBusinessDate(b.reservation_date, b.visit_time);
        return ba.localeCompare(bb) || (a.visit_time ?? '').localeCompare(b.visit_time ?? '');
      });

    // 이후 확정 예약: 영업일별 그룹화
    const byDate: Record<string, any[]> = {};
    futureConf.forEach(r => {
      const bd = getReservationBusinessDate(r.reservation_date, r.visit_time);
      (byDate[bd] ??= []).push(r);
    });

    const result: { key: string; title: string; count: number; people?: number; data: any[]; showActions?: boolean }[] = [];

    if (pending.length > 0) {
      result.push({
        key: 'pending',
        title: '대기 중 예약',
        count: pending.length,
        data: pending,
        showActions: true,
      });
    }
    if (todayList.length > 0) {
      result.push({
        key: 'today',
        title: `오늘 방문 예정  ${formatDate(today, false)}  (영업일 기준)`,
        count: todayList.length,
        people: todayList.reduce((s, r) => s + (r.party_size ?? 1), 0),
        data: todayList,
        showActions: false,
      });
    }
    if (tomorrowList.length > 0) {
      result.push({
        key: 'tomorrow',
        title: `내일 방문 예정  ${formatDate(tomorrow, false)}  (영업일 기준)`,
        count: tomorrowList.length,
        people: tomorrowList.reduce((s, r) => s + (r.party_size ?? 1), 0),
        data: tomorrowList,
        showActions: false,
      });
    }
    // 영업일별 그룹 섹션
    Object.entries(byDate).forEach(([bizDate, items]) => {
      result.push({
        key: `conf_${bizDate}`,
        title: `${getBusinessDayLabel(bizDate)}  ${formatDate(bizDate, false)}`,
        count: items.length,
        people: items.reduce((s, r) => s + (r.party_size ?? 1), 0),
        data: items,
        showActions: false,
      });
    });
    if (cancelled.length > 0) {
      result.push({
        key: 'cancelled',
        title: '취소된 예약',
        count: cancelled.length,
        data: cancelled,
        showActions: false,
      });
    }

    return result;
  }, [all, today, tomorrow]);

  // ── 요약 카드 ─────────────────────────────────────────────────
  const pending     = all.filter(r => r.status === 'pending').length;
  const todayCnt    = all.filter(r =>
    r.status === 'confirmed' &&
    getReservationBusinessDate(r.reservation_date, r.visit_time) === today
  );
  const tomorrowCnt = all.filter(r =>
    r.status === 'confirmed' &&
    getReservationBusinessDate(r.reservation_date, r.visit_time) === tomorrow
  );

  // ── 확정 처리 ────────────────────────────────────────────────
  function handleConfirm(item: any) {
    Alert.alert(
      '예약 확정',
      `${item.contact_name} (${item.party_size}명)\n${formatDate(item.reservation_date)}\n\n확정하시겠어요?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '확정',
          onPress: async () => {
            setProcessing(item.id);
            try {
              await updateDoc(doc(db, 'reservations', item.id), { status: 'confirmed' });
              const token = await getProfilePushToken(item.user_id);
              if (token) {
                await sendPushNotification({
                  to: token,
                  title: '예약이 확정되었습니다 ✓',
                  body: `${venue?.name ?? ''} · ${formatDate(item.reservation_date)} · ${item.party_size}명`,
                  data: { type: 'reservation_confirmed', reservationId: item.id },
                });
              }
              await sendReservationConfirmedAlimtalk({
                to: item.contact_phone,
                guestName: item.contact_name,
                venueName: venue?.name ?? '',
                date: item.reservation_date,
                partySize: item.party_size,
              });
              await fetchData();
            } finally { setProcessing(null); }
          },
        },
      ]
    );
  }

  function handleReject(item: any) {
    Alert.alert(
      '예약 거절',
      `${item.contact_name}님 예약을 거절하시겠어요?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '거절', style: 'destructive',
          onPress: async () => {
            setProcessing(item.id);
            try {
              await updateDoc(doc(db, 'reservations', item.id), { status: 'cancelled' });
              const token = await getProfilePushToken(item.user_id);
              if (token) {
                await sendPushNotification({
                  to: token,
                  title: '예약이 취소되었습니다',
                  body: `${venue?.name ?? ''} ${formatDate(item.reservation_date)} 예약이 취소되었습니다.`,
                  data: { type: 'reservation_cancelled', reservationId: item.id },
                });
              }
              await sendReservationCancelledAlimtalk({
                to: item.contact_phone,
                guestName: item.contact_name,
                venueName: venue?.name ?? '',
                date: item.reservation_date,
              });
              await fetchData();
            } finally { setProcessing(null); }
          },
        },
      ]
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" translucent />

      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} allowFontScaling={false}>예약 관리</Text>
          {venue?.name ? (
            <Text style={styles.headerSub} allowFontScaling={false} numberOfLines={1}>{venue.name}</Text>
          ) : null}
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* 요약 카드 */}
      {!loading && (
        <View style={styles.summaryRow}>
          <SummaryCard label="대기" value={pending} color={Colors.accent} />
          <SummaryCard
            label="오늘"
            value={todayCnt.reduce((s, r) => s + (r.party_size ?? 1), 0)}
            unit="명"
            color="#10B981"
          />
          <SummaryCard
            label="내일"
            value={tomorrowCnt.reduce((s, r) => s + (r.party_size ?? 1), 0)}
            unit="명"
            color="#06B6D4"
          />
        </View>
      )}

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={Colors.accent} />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => { setRefreshing(true); await fetchData(); setRefreshing(false); }}
              tintColor={Colors.accent}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="calendar-outline" size={40} color={Colors.textMuted} />
              <Text style={styles.emptyText} allowFontScaling={false}>예약 내역이 없습니다</Text>
            </View>
          }
          renderSectionHeader={({ section }) => (
            <SectionHeader
              title={section.title}
              count={section.count}
              people={section.people}
            />
          )}
          renderItem={({ item, section }) => (
            <ResCard
              item={item}
              isProcessing={processing === item.id}
              onConfirm={handleConfirm}
              onReject={handleReject}
              showActions={section.showActions}
            />
          )}
          SectionSeparatorComponent={() => <View style={{ height: 20 }} />}
        />
      )}
    </View>
  );
}

// ── 요약 카드 ─────────────────────────────────────────────────────
function SummaryCard({ label, value, unit, color }: {
  label: string; value: number; unit?: string; color: string;
}) {
  return (
    <View style={[styles.sumCard, { borderColor: color + '30' }]}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
        <Text style={[styles.sumValue, { color }]} allowFontScaling={false}>{value}</Text>
        {unit && <Text style={[styles.sumUnit, { color }]} allowFontScaling={false}>{unit}</Text>}
      </View>
      <Text style={styles.sumLabel} allowFontScaling={false}>{label}</Text>
    </View>
  );
}

// ── 스타일 ─────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  backBtn:     { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerCenter:{ flex: 1, alignItems: 'center', gap: 2 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  headerSub:   { fontSize: 12, color: Colors.textMuted },

  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    gap: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  sumCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  sumValue: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  sumUnit:  { fontSize: 12, fontWeight: '600' },
  sumLabel: { fontSize: 11, color: Colors.textMuted, fontWeight: '500' },

  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: Spacing.lg, paddingBottom: 120, gap: Spacing.xs },

  emptyBox:  { alignItems: 'center', gap: 12, paddingTop: 80 },
  emptyText: { ...Typography.bodySmall, color: Colors.textMuted },

  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    paddingTop: 4,
  },
  sectionHeadTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  sectionHeadBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.accent,
  },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: 12,
    marginBottom: Spacing.xs,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  dot:        { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: '700' },
  createdAt:  { ...Typography.caption },

  guestRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  guestName: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.3 },
  partySz:   { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },

  detailBox: {
    backgroundColor: Colors.surfaceHigh,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: 7,
  },
  dRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  dLabel: { ...Typography.caption, width: 60, flexShrink: 0, lineHeight: 18 },
  dValue: { flex: 1, fontSize: 13, fontWeight: '500', color: Colors.textPrimary, lineHeight: 18 },

  actions: { flexDirection: 'row', gap: Spacing.sm },
  rejectBtn: {
    flex: 0.35, paddingVertical: 12, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', backgroundColor: Colors.surfaceHigh,
  },
  rejectTxt:  { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  confirmBtn: { flex: 0.65, paddingVertical: 12, borderRadius: BorderRadius.md, alignItems: 'center', backgroundColor: Colors.accent },
  confirmTxt: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});
