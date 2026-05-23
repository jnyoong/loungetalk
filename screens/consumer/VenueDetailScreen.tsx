import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Image, Linking, Alert, Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  doc, getDoc, collection, query, where,
  getDocs, setDoc, deleteDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Colors, Spacing, BorderRadius, Typography } from '../../constants/theme';
import { CATEGORIES, REGIONS } from '../../constants/regions';
import type { Venue, VenueEvent, RootStackParamList } from '../../types';
import {
  trackVenueView, trackFavorite, trackInstagramClick, trackPhoneClick,
} from '../../lib/analytics';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'VenueDetail'>;

export default function VenueDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { user, profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [events, setEvents] = useState<VenueEvent[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const venueId = route.params.venueId;

  useEffect(() => {
    fetchVenue();
    checkFavorite();
  }, [venueId]);

  async function fetchVenue() {
    const snap = await getDoc(doc(db, 'venues', venueId));
    const venueData = snap.exists() ? { id: snap.id, ...snap.data() } as Venue : null;
    setVenue(venueData);

    // 업장 조회 추적
    if (venueData) {
      trackVenueView(venueId, {
        region:     venueData.region,
        categories: venueData.categories,
        userId:     user?.uid,
      });
    }

    const today = new Date().toISOString().split('T')[0];
    const evtSnap = await getDocs(query(
      collection(db, 'venue_events'),
      where('venue_id', '==', venueId),
      where('is_published', '==', true),
    ));
    const upcoming = evtSnap.docs
      .map(d => ({ id: d.id, ...d.data() } as VenueEvent))
      .filter(e => e.event_date >= today)
      .sort((a, b) => a.event_date.localeCompare(b.event_date))
      .slice(0, 10);
    setEvents(upcoming);
    setLoading(false);
  }

  async function checkFavorite() {
    if (!user) return;
    const favSnap = await getDoc(doc(db, 'favorites', `${user.uid}_${venueId}`));
    setIsFavorite(favSnap.exists());
  }

  async function toggleFavorite() {
    if (!user) { Alert.alert('로그인 필요', '즐겨찾기는 로그인 후 이용 가능합니다.'); return; }
    const favRef = doc(db, 'favorites', `${user.uid}_${venueId}`);
    if (isFavorite) {
      await deleteDoc(favRef);
      setIsFavorite(false);
      trackFavorite(venueId, false, user.uid);
    } else {
      await setDoc(favRef, { user_id: user.uid, venue_id: venueId, created_at: serverTimestamp() });
      setIsFavorite(true);
      trackFavorite(venueId, true, user.uid);
    }
  }

  if (loading || !venue) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}><Text style={styles.loadingText}>불러오는 중</Text></View>
      </SafeAreaView>
    );
  }

  const region = REGIONS.find(r => r.id === venue.region);
  const categories = CATEGORIES.filter(c => venue.categories?.includes(c.id));

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── 상단 버튼 (스크롤 고정, 항상 화면 최상단) ──────── */}
      <View
        style={[styles.topBar, { top: insets.top + (Platform.OS === 'android' ? 8 : 6) }]}
        pointerEvents="box-none"
      >
        <TouchableOpacity style={styles.circleBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.circleBtn} onPress={toggleFavorite} activeOpacity={0.8}>
          <Ionicons
            name={isFavorite ? 'heart' : 'heart-outline'}
            size={18}
            color={isFavorite ? '#FF4D6A' : '#FFFFFF'}
          />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── 커버 이미지 ──────────────────────────────── */}
        <View style={styles.coverContainer}>
          {venue.cover_image_url ? (
            <Image source={{ uri: venue.cover_image_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.coverFallback]}>
              <Text style={styles.coverFallbackText}>{venue.name?.[0] ?? '?'}</Text>
            </View>
          )}
          <View style={styles.coverOverlay} />

          {/* 하단 정보 */}
          <View style={styles.coverBottom}>
            {venue.is_verified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>인증</Text>
              </View>
            )}
            <Text style={styles.coverName}>{venue.name}</Text>
            {venue.name_en && <Text style={styles.coverNameEn}>{venue.name_en}</Text>}
            <View style={styles.catRow}>
              {categories.map(c => (
                <Text key={c.id} style={[styles.catChip, { color: c.color }]}>{c.label}</Text>
              ))}
            </View>
          </View>
        </View>

        {/* ── 본문 ─────────────────────────────────────── */}
        <View style={styles.body}>

          {/* 핵심 정보 인라인 */}
          <View style={styles.quickInfoRow}>
            <QuickInfo label={region?.label ?? venue.region} sub="지역" />
            {venue.entrance_fee_weekend != null && (
              <QuickInfo label={`${(venue.entrance_fee_weekend / 1000).toFixed(0)}K`} sub="주말 입장료" />
            )}
            {venue.open_time && (
              <QuickInfo label={venue.open_time} sub="오픈" />
            )}
            {venue.age_restriction != null && (
              <QuickInfo label={`${venue.age_restriction}+`} sub="연령" />
            )}
          </View>

          <View style={styles.divider} />

          {/* 소개 */}
          {venue.description && (
            <View style={styles.section}>
              <Text style={styles.desc}>{venue.description}</Text>
              {venue.description_en && (
                <Text style={styles.descEn}>{venue.description_en}</Text>
              )}
            </View>
          )}

          {/* 상세 정보 */}
          <View style={styles.infoBlock}>
            <InfoRow label="주소" value={venue.address} />
            {venue.entrance_fee_weekday != null && (
              <InfoRow label="평일 입장료" value={`${venue.entrance_fee_weekday.toLocaleString()}원`} />
            )}
            {venue.entrance_fee_weekend != null && (
              <InfoRow label="주말 입장료" value={`${venue.entrance_fee_weekend.toLocaleString()}원`} />
            )}
            {venue.open_days?.length > 0 && (
              <InfoRow label="영업일" value={venue.open_days.join(' · ')} />
            )}
            {venue.open_time && venue.close_time && (
              <InfoRow label="영업시간" value={`${venue.open_time} — ${venue.close_time}`} />
            )}
            {venue.dress_code && (
              <InfoRow label="드레스코드" value={venue.dress_code} />
            )}
            {venue.capacity != null && (
              <InfoRow label="수용 인원" value={`${venue.capacity}명`} />
            )}
          </View>

          {/* 음악 장르 */}
          {venue.music_genres?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>GENRE</Text>
              <View style={styles.genreRow}>
                {venue.music_genres.map((g, i) => (
                  <View key={i} style={styles.genreChip}>
                    <Text style={styles.genreText}>{g}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* 예정 이벤트 */}
          {events.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>EVENTS</Text>
              {events.map(event => (
                <TouchableOpacity
                  key={event.id}
                  style={styles.eventRow}
                  onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}
                  activeOpacity={0.75}
                >
                  <View style={styles.eventDateBox}>
                    <Text style={styles.eventMonth}>
                      {new Date(event.event_date).toLocaleDateString('ko-KR', { month: 'short' })}
                    </Text>
                    <Text style={styles.eventDay}>
                      {new Date(event.event_date).getDate()}
                    </Text>
                  </View>
                  <View style={styles.eventInfo}>
                    <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
                    {event.lineup?.length > 0 && (
                      <Text style={styles.eventLineup} numberOfLines={1}>
                        {event.lineup.slice(0, 2).join(' · ')}
                      </Text>
                    )}
                  </View>
                  {event.entrance_fee != null && (
                    <Text style={styles.eventFee}>{(event.entrance_fee / 1000).toFixed(0)}K</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* 링크 버튼 */}
          {(venue.instagram_handle || venue.phone || venue.website_url) && (
            <View style={styles.linkRow}>
              {venue.instagram_handle && (
                <TouchableOpacity
                  style={[styles.linkBtn, styles.linkBtnInsta]}
                  onPress={() => {
                    trackInstagramClick(venueId);
                    Linking.openURL(`https://instagram.com/${venue.instagram_handle}`);
                  }}
                  activeOpacity={0.75}
                >
                  <Ionicons name="logo-instagram" size={15} color="#E1306C" />
                  <Text style={[styles.linkBtnText, { color: '#E1306C' }]}>Instagram</Text>
                </TouchableOpacity>
              )}
              {venue.phone && (
                <TouchableOpacity
                  style={[styles.linkBtn, styles.linkBtnPhone]}
                  onPress={() => {
                    trackPhoneClick(venueId);
                    Linking.openURL(`tel:${venue.phone}`);
                  }}
                  activeOpacity={0.75}
                >
                  <Ionicons name="call" size={14} color={Colors.success} />
                  <Text style={[styles.linkBtnText, { color: Colors.success }]}>전화하기</Text>
                </TouchableOpacity>
              )}
              {venue.website_url && (
                <TouchableOpacity
                  style={[styles.linkBtn, styles.linkBtnWeb]}
                  onPress={() => Linking.openURL(venue.website_url!)}
                  activeOpacity={0.75}
                >
                  <Ionicons name="globe-outline" size={14} color={Colors.textSecondary} />
                  <Text style={[styles.linkBtnText, { color: Colors.textSecondary }]}>웹사이트</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* 예약 버튼 */}
          {profile?.role === 'consumer' && (
            <TouchableOpacity
              style={styles.reserveBtn}
              onPress={() => navigation.navigate('Reservation', { venueId: venue.id })}
              activeOpacity={0.85}
            >
              <Text style={styles.reserveBtnText}>예약하기</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function QuickInfo({ label, sub }: { label: string; sub: string }) {
  return (
    <View style={styles.quickInfo}>
      <Text style={styles.quickInfoLabel}>{label}</Text>
      <Text style={styles.quickInfoSub}>{sub}</Text>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { ...Typography.bodySmall, color: Colors.textMuted },

  // ── 커버
  coverContainer: { height: 300, position: 'relative' },
  coverFallback: {
    backgroundColor: Colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverFallbackText: { fontSize: 64, fontWeight: '800', color: Colors.border },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  // ── 상단 고정 버튼 (ScrollView 밖에서 absolute로 화면에 고정)
  topBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
  },
  circleBtn: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: BorderRadius.full,
    width: 42, height: 42,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  coverBottom: {
    position: 'absolute',
    bottom: Spacing.lg,
    left: Spacing.lg,
    right: Spacing.lg,
  },
  verifiedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: Spacing.xs,
  },
  verifiedText: { fontSize: 10, fontWeight: '600', color: '#FFFFFF' },
  coverName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  coverNameEn: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
    marginBottom: Spacing.xs,
  },
  catRow: { flexDirection: 'row', gap: Spacing.xs, marginTop: Spacing.xs },
  catChip: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // ── 본문
  body: { padding: Spacing.lg },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginVertical: Spacing.lg,
  },

  // ── 퀵 인포
  quickInfoRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
    paddingTop: Spacing.md,
  },
  quickInfo: { alignItems: 'center', gap: 3 },
  quickInfoLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  quickInfoSub: {
    fontSize: 10,
    fontWeight: '500',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ── 설명
  section: { marginBottom: Spacing.xl },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 2,
    marginBottom: Spacing.sm,
  },
  desc: {
    ...Typography.body,
    color: Colors.textSecondary,
    lineHeight: 24,
    marginBottom: Spacing.sm,
  },
  descEn: {
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 20,
    fontStyle: 'italic',
  },

  // ── 상세 정보
  infoBlock: {
    marginBottom: Spacing.xl,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 13,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    gap: Spacing.md,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textMuted,
    flexShrink: 0,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
    textAlign: 'right',
    flex: 1,
  },

  // ── 장르 칩
  genreRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  genreChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.borderActive,
  },
  genreText: { fontSize: 12, fontWeight: '500', color: Colors.textSecondary },

  // ── 이벤트 행
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  eventDateBox: {
    width: 42,
    alignItems: 'center',
    backgroundColor: Colors.accentSoft,
    borderRadius: BorderRadius.sm,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: Colors.accentMid,
  },
  eventMonth: { fontSize: 9, fontWeight: '600', color: Colors.accent, letterSpacing: 0.5 },
  eventDay: { fontSize: 18, fontWeight: '800', color: Colors.accent, lineHeight: 22 },
  eventInfo: { flex: 1 },
  eventTitle: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  eventLineup: { ...Typography.caption, marginTop: 2 },
  eventFee: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },

  // ── 링크
  linkRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  linkBtnInsta: {
    backgroundColor: '#E1306C12',
    borderColor: '#E1306C44',
  },
  linkBtnPhone: {
    backgroundColor: Colors.success + '12',
    borderColor: Colors.success + '44',
  },
  linkBtnWeb: {
    backgroundColor: Colors.surfaceHigher,
    borderColor: Colors.borderActive,
  },
  linkBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // ── 예약 버튼
  reserveBtn: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.md,
    paddingVertical: 16,
    alignItems: 'center',
  },
  reserveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
