import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, TextInput, RefreshControl, Modal,
  TouchableWithoutFeedback, FlatList, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Colors, Spacing, BorderRadius, Typography } from '../../constants/theme';
import { REGIONS, CATEGORIES } from '../../constants/regions';
import VenueCard from '../../components/VenueCard';
import type { Venue, RootStackParamList } from '../../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [regionModalVisible, setRegionModalVisible] = useState(false);

  useEffect(() => { fetchVenues(); }, []);

  async function fetchVenues() {
    setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, 'venues'), where('is_active', '==', true))
      );
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Venue));
      list.sort((a, b) => {
        if (a.is_verified !== b.is_verified) return a.is_verified ? -1 : 1;
        const at = (a.created_at as any)?.seconds ?? 0;
        const bt = (b.created_at as any)?.seconds ?? 0;
        return bt - at;
      });
      setVenues(list);
    } catch (e) {
      console.error('venues fetch error:', e);
    }
    setLoading(false);
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchVenues();
    setRefreshing(false);
  }, []);

  const filtered = venues.filter(v => {
    if (selectedRegion && v.region !== selectedRegion) return false;
    if (selectedCategory && !v.categories?.includes(selectedCategory as any)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !v.name.toLowerCase().includes(q) &&
        !(v.name_en?.toLowerCase().includes(q)) &&
        !v.address.toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });

  const selectedRegionLabel = REGIONS.find(r => r.id === selectedRegion)?.label ?? '서울 전체';

  const REGION_LIST = [
    { id: null, label: '서울 전체' },
    ...REGIONS.map(r => ({ id: r.id as string | null, label: r.label })),
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} translucent={false} />

      {/* ── 헤더 ──────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.regionBtn}
          onPress={() => setRegionModalVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.regionBtnText} allowFontScaling={false}>
            {selectedRegionLabel}
          </Text>
          <Ionicons
            name="chevron-down"
            size={Platform.OS === 'android' ? 19 : 20}
            color={Colors.textPrimary}
            style={styles.regionChevron}
          />
        </TouchableOpacity>
        <Text style={styles.headerWordmark} allowFontScaling={false}>LOUNGETALK</Text>
      </View>

      {/* ── 지역 선택 모달 ────────────────────────────────────── */}
      <Modal
        visible={regionModalVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
      >
        <TouchableWithoutFeedback onPress={() => setRegionModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.regionSheet, { paddingBottom: Math.max(insets.bottom, 24) }]}>
                {/* 핸들 */}
                <View style={styles.sheetHandle} />
                <Text style={styles.sheetTitle} allowFontScaling={false}>지역</Text>

                <FlatList
                  data={REGION_LIST}
                  keyExtractor={item => item.id ?? 'all'}
                  bounces={false}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => {
                    const active = item.id === selectedRegion;
                    return (
                      <TouchableOpacity
                        style={styles.regionItem}
                        onPress={() => {
                          setSelectedRegion(item.id);
                          setRegionModalVisible(false);
                        }}
                        activeOpacity={0.6}
                      >
                        <Text
                          style={[styles.regionItemText, active && styles.regionItemTextActive]}
                          allowFontScaling={false}
                        >
                          {item.label}
                        </Text>
                        {active && (
                          <Ionicons name="checkmark" size={18} color={Colors.accent} />
                        )}
                      </TouchableOpacity>
                    );
                  }}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
        }
        stickyHeaderIndices={[0]}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── 검색바 (sticky) ──────────────────────────────────── */}
        <View style={styles.searchWrap}>
          <View style={[styles.searchBar, searchFocused && styles.searchBarFocused]}>
            <Feather name="search" size={15} color={Colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="업장명, 지역 검색"
              placeholderTextColor={Colors.textMuted}
              returnKeyType="search"
              allowFontScaling={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── 카테고리 필터 ─────────────────────────────────────── */}
        <View style={styles.categorySection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipScroll}
          >
            <Chip label="전체" active={!selectedCategory} onPress={() => setSelectedCategory(null)} />
            {CATEGORIES.map(c => (
              <Chip
                key={c.id}
                label={c.label}
                active={selectedCategory === c.id}
                color={c.color}
                onPress={() => setSelectedCategory(selectedCategory === c.id ? null : c.id)}
              />
            ))}
          </ScrollView>
        </View>

        {/* ── 결과 헤더 ─────────────────────────────────────────── */}
        <View style={styles.resultHeader}>
          <Text style={styles.resultTitle} allowFontScaling={false}>
            {selectedRegion
              ? REGIONS.find(r => r.id === selectedRegion)?.label
              : selectedCategory
              ? CATEGORIES.find(c => c.id === selectedCategory)?.label
              : '전체'}
            {!loading && (
              <Text style={styles.resultCount}> {filtered.length}</Text>
            )}
          </Text>
          {(selectedRegion || selectedCategory) && (
            <TouchableOpacity
              onPress={() => { setSelectedRegion(null); setSelectedCategory(null); }}
            >
              <Text style={styles.clearFilter} allowFontScaling={false}>초기화</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── 업장 목록 ─────────────────────────────────────────── */}
        {loading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText} allowFontScaling={false}>불러오는 중...</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyBig} allowFontScaling={false}>검색 결과 없음</Text>
            <Text style={styles.emptyText} allowFontScaling={false}>다른 필터를 선택해보세요</Text>
          </View>
        ) : (
          <View style={styles.venueList}>
            {filtered.map(venue => (
              <VenueCard
                key={venue.id}
                venue={venue}
                onPress={() => navigation.navigate('VenueDetail', { venueId: venue.id })}
              />
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

function Chip({
  label, active, onPress, color,
}: {
  label: string; active: boolean; onPress: () => void; color?: string;
}) {
  const activeColor = color ?? Colors.accent;
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        active && { backgroundColor: activeColor + '20', borderColor: activeColor + '70' },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text
        style={[styles.chipText, active && { color: activeColor, fontWeight: '600' }]}
        allowFontScaling={false}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },

  // ── 헤더
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.bg,
  },
  regionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  regionBtnText: {
    fontSize: Platform.OS === 'android' ? 22 : 24,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  regionChevron: {
    marginTop: Platform.OS === 'android' ? 2 : 3,
  },
  headerWordmark: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 3,
  },

  // ── 지역 모달
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  regionSheet: {
    backgroundColor: '#111111',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '65%',
    paddingTop: 12,
  },
  sheetHandle: {
    width: 32,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 8,
  },
  regionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingVertical: 18,
  },
  regionItemText: {
    fontSize: 17,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: -0.2,
  },
  regionItemTextActive: {
    color: Colors.textPrimary,
    fontWeight: '700',
  },

  // ── 검색바
  searchWrap: {
    paddingHorizontal: Spacing.lg,
    paddingTop: 4,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.bg,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    gap: 10,
    height: Platform.OS === 'android' ? 44 : 46,
  },
  searchBarFocused: { borderColor: 'rgba(255,255,255,0.18)' },
  searchInput: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: Platform.OS === 'android' ? 14 : 15,
    includeFontPadding: false,
  },

  // ── 카테고리
  categorySection: { marginTop: 4 },
  chipScroll: {
    paddingHorizontal: Spacing.lg,
    gap: 6,
    paddingBottom: 2,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'android' ? 6 : 7,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipText: {
    fontSize: Platform.OS === 'android' ? 12 : 13,
    fontWeight: '400',
    color: Colors.textMuted,
  },

  // ── 결과
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  resultTitle: {
    fontSize: Platform.OS === 'android' ? 15 : 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  resultCount: { color: Colors.textMuted, fontWeight: '400' },
  clearFilter: { fontSize: 13, color: Colors.accent },

  // ── 목록
  venueList: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  emptyState: { alignItems: 'center', paddingVertical: 80, gap: Spacing.sm },
  emptyBig: { fontSize: 17, fontWeight: '700', color: Colors.textSecondary },
  emptyText: { ...Typography.bodySmall, color: Colors.textMuted },
});
