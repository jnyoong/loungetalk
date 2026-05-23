import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, StatusBar, Image, RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  collection, query, where, getDocs, doc, getDoc,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Colors, Spacing, BorderRadius, Typography } from '../../constants/theme';
import type { VenueEvent, RootStackParamList } from '../../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const FILTERS = [
  { id: 'today',    label: '오늘' },
  { id: 'tomorrow', label: '내일' },
  { id: 'week',     label: '이번 주' },
  { id: 'month',    label: '이번 달' },
];

export default function EventsScreen() {
  const navigation = useNavigation<Nav>();
  const [events, setEvents] = useState<(VenueEvent & { venue?: any })[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('today');

  useEffect(() => { fetchEvents(); }, [filter]);

  function getDateRange() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    if (filter === 'tomorrow') { start.setDate(start.getDate() + 1); end.setDate(end.getDate() + 1); }
    else if (filter === 'week')  end.setDate(end.getDate() + 7);
    else if (filter === 'month') end.setDate(end.getDate() + 30);
    return {
      start: start.toISOString().split('T')[0],
      end:   end.toISOString().split('T')[0],
    };
  }

  async function fetchEvents() {
    setLoading(true);
    const { start, end } = getDateRange();
    const snap = await getDocs(query(
      collection(db, 'venue_events'),
      where('is_published', '==', true),
    ));
    const rawEvents = snap.docs
      .map(d => ({ id: d.id, ...d.data() } as VenueEvent))
      .filter(e => e.event_date >= start && e.event_date <= end)
      .sort((a, b) => a.event_date.localeCompare(b.event_date));

    const venueIds = [...new Set(rawEvents.map(e => e.venue_id))];
    const venueMap: Record<string, any> = {};
    await Promise.all(venueIds.map(async id => {
      const vSnap = await getDoc(doc(db, 'venues', id));
      if (vSnap.exists()) venueMap[id] = { id: vSnap.id, ...vSnap.data() };
    }));
    setEvents(rawEvents.map(e => ({ ...e, venue: venueMap[e.venue_id] })));
    setLoading(false);
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <Text style={styles.title}>이벤트</Text>
        <Text style={styles.subtitle}>공연 · 파티 · 라인업</Text>
      </View>

      {/* 필터 탭 */}
      <View style={styles.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.id}
            style={[styles.filterBtn, filter === f.id && styles.filterBtnActive]}
            onPress={() => setFilter(f.id)}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterText, filter === f.id && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => { setRefreshing(true); await fetchEvents(); setRefreshing(false); }}
            tintColor={Colors.accent}
          />
        }
      >
        {loading ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>불러오는 중</Text>
          </View>
        ) : events.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyBig}>이벤트 없음</Text>
            <Text style={styles.emptyText}>다른 날짜를 선택해보세요</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {events.map(event => (
              <EventCard
                key={event.id}
                event={event}
                onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}
                onVenuePress={() => event.venue_id && navigation.navigate('VenueDetail', { venueId: event.venue_id })}
              />
            ))}
          </View>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function EventCard({ event, onPress, onVenuePress }: {
  event: VenueEvent & { venue?: any };
  onPress: () => void;
  onVenuePress: () => void;
}) {
  const d = new Date(event.event_date);
  const dayName = d.toLocaleDateString('ko-KR', { weekday: 'short' });
  const dateStr = `${d.getMonth() + 1}/${d.getDate()} (${dayName})`;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {/* 포스터 */}
      <View style={styles.posterWrap}>
        {event.poster_image_url ? (
          <Image source={{ uri: event.poster_image_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.posterFallback]}>
            <Text style={styles.posterFallbackText}>{event.title?.[0] ?? 'E'}</Text>
          </View>
        )}
      </View>

      {/* 텍스트 정보 */}
      <View style={styles.cardInfo}>
        <View style={styles.cardTopRow}>
          <Text style={styles.cardDate}>{dateStr}</Text>
          {event.start_time && <Text style={styles.cardTime}>{event.start_time}</Text>}
        </View>

        <Text style={styles.cardTitle} numberOfLines={2}>{event.title}</Text>

        {event.lineup?.length > 0 && (
          <Text style={styles.cardLineup} numberOfLines={1}>
            {event.lineup.slice(0, 3).join(' · ')}
          </Text>
        )}

        <View style={styles.cardBottomRow}>
          {event.venue?.name && (
            <TouchableOpacity onPress={onVenuePress} hitSlop={{ top: 8, bottom: 8, left: 0, right: 0 }}>
              <Text style={styles.cardVenue}>{event.venue.name}</Text>
            </TouchableOpacity>
          )}
          {event.entrance_fee != null && (
            <Text style={styles.cardFee}>{(event.entrance_fee / 1000).toFixed(0)}K</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },

  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    ...Typography.caption,
    marginTop: 3,
  },

  // ── 필터
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  filterBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterBtnActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  filterTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // ── 카드
  list: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  posterWrap: {
    width: 90,
    height: 110,
    backgroundColor: Colors.surfaceHigh,
  },
  posterFallback: {
    backgroundColor: Colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  posterFallbackText: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.border,
  },
  cardInfo: {
    flex: 1,
    padding: Spacing.md,
    gap: 5,
    justifyContent: 'space-between',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardDate: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.accent,
    letterSpacing: 0.3,
  },
  cardTime: {
    ...Typography.caption,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  cardLineup: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardVenue: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textMuted,
    textDecorationLine: 'underline',
    textDecorationColor: Colors.textMuted,
  },
  cardFee: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
  },

  // ── 빈 상태
  empty: { alignItems: 'center', paddingVertical: 80, gap: 6 },
  emptyBig: { fontSize: 18, fontWeight: '700', color: Colors.textSecondary },
  emptyText: { ...Typography.bodySmall, color: Colors.textMuted },
});
