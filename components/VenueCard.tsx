import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, BorderRadius, Typography, Spacing } from '../constants/theme';
import { CATEGORIES, REGIONS } from '../constants/regions';
import type { Venue } from '../types';

// 카테고리별 기본 플레이스홀더 이미지
const PLACEHOLDER_IMAGES: Record<string, any> = {
  edm:    require('../assets/placeholders/edm.jpg'),
  hiphop: require('../assets/placeholders/hiphop.jpg'),
  lounge: require('../assets/placeholders/lounge.jpg'),
  rooftop:require('../assets/placeholders/rooftop.jpg'),
  jazz:   require('../assets/placeholders/jazz.jpg'),
  techno: require('../assets/placeholders/techno.jpg'),
  latin:  require('../assets/placeholders/latin.jpg'),
  kpop:   require('../assets/placeholders/kpop.jpg'),
};

interface Props {
  venue: Venue;
  onPress: () => void;
  compact?: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  edm:     Colors.categoryEDM,
  hiphop:  Colors.categoryHiphop,
  lounge:  Colors.categoryLounge,
  rooftop: Colors.categoryRooftop,
  jazz:    Colors.categoryJazz,
  techno:  Colors.categoryTechno,
  latin:   Colors.categoryLatin,
  kpop:    Colors.categoryKpop,
};

export default function VenueCard({ venue, onPress, compact }: Props) {
  const region = REGIONS.find(r => r.id === venue.region);
  const primaryCat = CATEGORIES.find(c => venue.categories?.includes(c.id));
  const catColor = primaryCat ? (CATEGORY_COLORS[primaryCat.id] ?? Colors.accent) : Colors.accent;

  // 커버 이미지 없을 때 카테고리 기본 이미지 사용
  const placeholderImg = primaryCat ? PLACEHOLDER_IMAGES[primaryCat.id] : null;
  const isPlaceholder = !venue.cover_image_url;

  const feeText = (() => {
    if (venue.entrance_fee_weekend) return `주말 ${(venue.entrance_fee_weekend / 1000).toFixed(0)}K`;
    if (venue.entrance_fee_weekday) return `평일 ${(venue.entrance_fee_weekday / 1000).toFixed(0)}K`;
    return null;
  })();

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.88}>
      {/* ── 이미지 영역 ────────────────────────────── */}
      <View style={[styles.imageWrap, compact && styles.imageWrapCompact]}>
        {venue.cover_image_url ? (
          <Image source={{ uri: venue.cover_image_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : placeholderImg ? (
          <Image source={placeholderImg} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.imageFallback]}>
            <Text style={styles.fallbackLetter}>
              {venue.name?.[0] ?? '?'}
            </Text>
          </View>
        )}

        {/* 하단 그라디언트 */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.85)']}
          style={styles.gradient}
          pointerEvents="none"
        />

        {/* 기본 이미지 라벨 */}
        {isPlaceholder && (
          <View style={styles.placeholderBadge}>
            <Text style={styles.placeholderText} allowFontScaling={false}>기본 이미지</Text>
          </View>
        )}

        {/* 카테고리 도트 + 이름 */}
        <View style={styles.overlay}>
          {/* 상단: 카테고리 칩 */}
          <View style={styles.topRow}>
            {primaryCat && (
              <View style={[styles.catChip, { backgroundColor: catColor + '22', borderColor: catColor + '55' }]}>
                <View style={[styles.catDot, { backgroundColor: catColor }]} />
                <Text style={[styles.catLabel, { color: catColor }]}>{primaryCat.label}</Text>
              </View>
            )}
            {venue.is_verified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>인증</Text>
              </View>
            )}
          </View>

          {/* 하단: 업장 이름 + 메타 */}
          <View style={styles.bottomInfo}>
            <Text style={styles.name} numberOfLines={1}>{venue.name}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>{region?.label ?? venue.region}</Text>
              {feeText && (
                <>
                  <Text style={styles.metaDot}>·</Text>
                  <Text style={styles.metaText}>{feeText}</Text>
                </>
              )}
              {venue.open_days?.length > 0 && (
                <>
                  <Text style={styles.metaDot}>·</Text>
                  <Text style={styles.metaText}>{venue.open_days.slice(0, 3).join(' ')}</Text>
                </>
              )}
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
  },
  imageWrap: {
    height: 220,
    position: 'relative',
  },
  imageWrapCompact: {
    height: 170,
  },
  imageFallback: {
    backgroundColor: Colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackLetter: {
    fontSize: 52,
    fontWeight: '800',
    color: Colors.border,
  },
  placeholderBadge: {
    position: 'absolute',
    bottom: 44,
    right: Spacing.md,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  placeholderText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '400',
    letterSpacing: 0.3,
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '70%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: Spacing.md,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    alignItems: 'center',
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  catDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  catLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  verifiedBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  bottomInfo: {
    gap: 4,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    ...Typography.caption,
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 14,
  },
  metaDot: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 10,
  },
});
