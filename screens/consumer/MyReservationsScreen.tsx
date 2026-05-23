import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  StatusBar, RefreshControl, Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  collection, query, where, getDocs, doc, updateDoc, getDoc,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Colors, Spacing, BorderRadius, Typography } from '../../constants/theme';
import { REGIONS } from '../../constants/regions';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'MyReservations'>;
type StatusFilter = 'all' | 'pending' | 'confirmed' | 'cancelled';

const FILTER_LABELS: Record<StatusFilter, string> = {
  all: '전체', pending: '대기', confirmed: '확정', cancelled: '취소',
};
const STATUS_COLORS = {
  pending:   Colors.accent,
  confirmed: '#10B981',
  cancelled: '#6B7280',
};
const STATUS_LABEL_KO: Record<string, string> = {
  pending: '대기 중', confirmed: '예약 확정', cancelled: '취소됨',
};

function formatVisitDate(dateStr: string) {
  const d = new Date(dateStr);
  const dow = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${dow})`;
}

function formatCreatedAt(ts: any) {
  if (!ts?.seconds) return '';
  const d = new Date(ts.seconds * 1000);
  return `${d.getMonth() + 1}/${d.getDate()} 신청`;
}

// ── 예약 항목 카드 ────────────────────────────────────────────────
function ReservationItem({
  item,
  onCancel,
  onNavigateVenue,
}: {
  item: any;
  onCancel: (r: any) => void;
  onNavigateVenue: (venueId: string) => void;
}) {
  const status = item.status as 'pending' | 'confirmed' | 'cancelled';
  const statusColor = STATUS_COLORS[status] ?? Colors.textMuted;
  const region = REGIONS.find(r => r.id === item.venue?.region);
  const canCancel = status === 'pending' || status === 'confirmed';

  return (
    <View style={styles.card}>
      {/* 업장 정보 행 */}
      <TouchableOpacity
        style={styles.venueRow}
        onPress={() => item.venue_id && onNavigateVenue(item.venue_id)}
        activeOpacity={0.7}
      >
        <View style={styles.venueInfo}>
          <Text style={styles.venueName} numberOfLines={1} allowFontScaling={false}>
            {item.venue?.name ?? '알 수 없는 업장'}
          </Text>
          {region && (
            <Text style={styles.venueRegion} allowFontScaling={false}>{region.label}</Text>
          )}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '18' }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]} allowFontScaling={false}>
            {STATUS_LABEL_KO[status] ?? status}
          </Text>
        </View>
      </TouchableOpacity>

      {/* 구분선 */}
      <View style={styles.divider} />

      {/* 예약 상세 정보 */}
      <View style={styles.infoGrid}>
        <InfoRow label="방문 예정일" value={formatVisitDate(item.reservation_date)} />
        <InfoRow label="인원"        value={`${item.party_size}명`} />
        <InfoRow label="예약자"      value={item.contact_name} />
        <InfoRow label="연락처"      value={item.contact_phone} />
        {item.special_requests ? (
          <InfoRow label="요청사항" value={item.special_requests} />
        ) : null}
        <InfoRow label="신청일" value={formatCreatedAt(item.created_at)} />
      </View>

      {/* 취소 버튼 */}
      {canCancel && (
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => onCancel(item)}
          activeOpacity={0.75}
        >
          <Text style={styles.cancelBtnText} allowFontScaling={false}>예약 취소</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel} allowFontScaling={false}>{label}</Text>
      <Text style={styles.infoValue} allowFontScaling={false} numberOfLines={3}>{value}</Text>
    </View>
  );
}

// ── 메인 화면 ──────────────────────────────────────────────────────
export default function MyReservationsScreen({ navigation }: Props) {
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();

  const [reservations, setReservations] = useState<any[]>([]);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);

    const resSnap = await getDocs(
      query(collection(db, 'reservations'), where('user_id', '==', profile.id))
    );

    // 예약마다 업장 정보 병렬 조회
    const items = await Promise.all(
      resSnap.docs.map(async d => {
        const r = { id: d.id, ...d.data() } as any;
        try {
          const venueSnap = await getDoc(doc(db, 'venues', r.venue_id));
          r.venue = venueSnap.exists() ? { id: venueSnap.id, ...venueSnap.data() } : null;
        } catch {
          r.venue = null;
        }
        return r;
      })
    );

    items.sort((a, b) => (b.created_at?.seconds ?? 0) - (a.created_at?.seconds ?? 0));
    setReservations(items);
    setLoading(false);
  }, [profile]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = filter === 'all'
    ? reservations
    : reservations.filter((r: any) => r.status === filter);

  const counts: Record<StatusFilter, number> = {
    all: reservations.length,
    pending:   reservations.filter((r: any) => r.status === 'pending').length,
    confirmed: reservations.filter((r: any) => r.status === 'confirmed').length,
    cancelled: reservations.filter((r: any) => r.status === 'cancelled').length,
  };

  function handleCancel(item: any) {
    Alert.alert(
      '예약 취소',
      `${item.venue?.name ?? '해당 업장'}\n${formatVisitDate(item.reservation_date)} · ${item.party_size}명\n\n정말 취소하시겠어요?`,
      [
        { text: '아니오', style: 'cancel' },
        {
          text: '취소하기',
          style: 'destructive',
          onPress: async () => {
            await updateDoc(doc(db, 'reservations', item.id), { status: 'cancelled' });
            await fetchData();
          },
        },
      ]
    );
  }

  function handleNavigateVenue(venueId: string) {
    navigation.navigate('VenueDetail', { venueId });
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" translucent />

      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} allowFontScaling={false}>예약 내역</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* 필터 탭 */}
      <View style={styles.filterRow}>
        {(['all', 'pending', 'confirmed', 'cancelled'] as StatusFilter[]).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => setFilter(f)}
          >
            <Text
              style={[styles.filterTabText, filter === f && styles.filterTabTextActive]}
              allowFontScaling={false}
            >
              {FILTER_LABELS[f]}
              {counts[f] > 0 ? ` ${counts[f]}` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={Colors.accent} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await fetchData();
                setRefreshing(false);
              }}
              tintColor={Colors.accent}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="receipt-outline" size={44} color={Colors.textMuted} />
              <Text style={styles.emptyTitle} allowFontScaling={false}>예약 내역이 없습니다</Text>
              <Text style={styles.emptyDesc} allowFontScaling={false}>
                {filter === 'all'
                  ? '업장 상세 페이지에서 예약해 보세요'
                  : `${FILTER_LABELS[filter]} 상태의 예약이 없습니다`}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <ReservationItem
              item={item}
              onCancel={handleCancel}
              onNavigateVenue={handleNavigateVenue}
            />
          )}
        />
      )}
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
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },

  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    gap: Spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    alignItems: 'center',
  },
  filterTabActive: { backgroundColor: Colors.accentSoft },
  filterTabText: { fontSize: 12, fontWeight: '500', color: Colors.textMuted },
  filterTabTextActive: { color: Colors.accent, fontWeight: '700' },

  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  listContent: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 120 },

  emptyBox: { alignItems: 'center', gap: 10, paddingTop: 80 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: Colors.textSecondary },
  emptyDesc: { ...Typography.caption, textAlign: 'center', lineHeight: 18 },

  // ── 카드
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.md,
  },

  venueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  venueInfo: { flex: 1, gap: 3, marginRight: 8 },
  venueName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.2,
  },
  venueRegion: { ...Typography.caption },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    flexShrink: 0,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
  },

  infoGrid: { gap: 8 },
  infoRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  infoLabel: {
    ...Typography.caption,
    width: 68,
    flexShrink: 0,
    lineHeight: 18,
  },
  infoValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textPrimary,
    lineHeight: 18,
  },

  cancelBtn: {
    paddingVertical: 11,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.error + '44',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.error,
  },
});
