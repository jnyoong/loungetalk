import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, StatusBar, Image, Linking,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Colors, Spacing, BorderRadius, Typography } from '../../constants/theme';
import type { VenueEvent, Venue, RootStackParamList } from '../../types';
import { trackEventView } from '../../lib/analytics';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'EventDetail'>;

export default function EventDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const [event, setEvent] = useState<VenueEvent | null>(null);
  const [venue, setVenue] = useState<Venue | null>(null);

  useEffect(() => {
    getDoc(doc(db, 'venue_events', route.params.eventId)).then(async snap => {
      if (!snap.exists()) return;
      const e = { id: snap.id, ...snap.data() } as VenueEvent;
      setEvent(e);
      // 이벤트 조회 추적
      trackEventView(route.params.eventId, e.venue_id);
      if (e.venue_id) {
        const vSnap = await getDoc(doc(db, 'venues', e.venue_id));
        if (vSnap.exists()) setVenue({ id: vSnap.id, ...vSnap.data() } as Venue);
      }
    });
  }, []);

  if (!event) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}><Text style={styles.loadingText}>불러오는 중</Text></View>
      </SafeAreaView>
    );
  }

  const d = new Date(event.event_date);
  const dateStr = d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* 포스터 */}
        <View style={styles.posterContainer}>
          {event.poster_image_url ? (
            <Image source={{ uri: event.poster_image_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.posterFallback]}>
              <Text style={styles.posterFallbackText}>{event.title?.[0] ?? 'E'}</Text>
            </View>
          )}
          <View style={styles.posterOverlay} />
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
        </View>

        {/* 본문 */}
        <View style={styles.body}>

          {/* 날짜·시간 */}
          <Text style={styles.dateText}>{dateStr}</Text>
          {event.start_time && (
            <Text style={styles.timeText}>
              {event.start_time}{event.end_time ? ` — ${event.end_time}` : ''}
            </Text>
          )}

          {/* 제목 */}
          <Text style={styles.titleText}>{event.title}</Text>
          {event.title_en && <Text style={styles.titleEn}>{event.title_en}</Text>}

          {/* 구분선 */}
          <View style={styles.divider} />

          {/* 라인업 */}
          {event.lineup?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>LINEUP</Text>
              {event.lineup.map((artist, i) => (
                <View key={i} style={styles.artistRow}>
                  <Text style={styles.artistNum}>{String(i + 1).padStart(2, '0')}</Text>
                  <Text style={styles.artistName}>{artist}</Text>
                </View>
              ))}
            </View>
          )}

          {/* 이벤트 정보 */}
          {event.description && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>INFO</Text>
              <Text style={styles.description}>{event.description}</Text>
            </View>
          )}

          {/* 메타 */}
          <View style={styles.metaCard}>
            {event.entrance_fee != null && (
              <MetaRow label="입장료" value={`${event.entrance_fee.toLocaleString()}원`} />
            )}
            {venue && (
              <TouchableOpacity onPress={() => navigation.navigate('VenueDetail', { venueId: venue.id })}>
                <MetaRow label="장소" value={`${venue.name} →`} highlight />
              </TouchableOpacity>
            )}
          </View>

          {/* 액션 버튼 */}
          <View style={styles.actions}>
            {event.ticket_url && (
              <TouchableOpacity
                style={styles.btnOutline}
                onPress={() => Linking.openURL(event.ticket_url!)}
              >
                <Text style={styles.btnOutlineText}>티켓 구매</Text>
              </TouchableOpacity>
            )}
            {venue && (
              <TouchableOpacity
                style={styles.btnPrimary}
                onPress={() => navigation.navigate('Reservation', { venueId: venue.id })}
                activeOpacity={0.85}
              >
                <Text style={styles.btnPrimaryText}>예약하기</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MetaRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={[styles.metaValue, highlight && { color: Colors.accent }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { ...Typography.bodySmall, color: Colors.textMuted },

  // ── 포스터
  posterContainer: { height: 340, position: 'relative' },
  posterFallback: {
    backgroundColor: Colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  posterFallbackText: { fontSize: 80, fontWeight: '800', color: Colors.border },
  posterOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  backBtn: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: BorderRadius.full,
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  backText: { fontSize: 20, color: '#FFFFFF' },

  // ── 본문
  body: { padding: Spacing.lg, gap: Spacing.md },
  dateText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.accent,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  timeText: { ...Typography.caption, marginTop: -6 },
  titleText: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  titleEn: { ...Typography.bodySmall, color: Colors.textMuted, marginTop: -6 },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginVertical: Spacing.sm,
  },

  // ── 섹션
  section: { gap: Spacing.sm },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 2,
  },
  artistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  artistNum: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
    width: 22,
  },
  artistName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  description: {
    ...Typography.body,
    color: Colors.textSecondary,
    lineHeight: 24,
  },

  // ── 메타 카드
  metaCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  metaLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textMuted,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },

  // ── 버튼
  actions: { gap: Spacing.sm, marginTop: Spacing.sm },
  btnOutline: {
    borderRadius: BorderRadius.md,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderActive,
  },
  btnOutlineText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
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
});
