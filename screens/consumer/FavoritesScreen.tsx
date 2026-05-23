import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  StatusBar, RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  collection, query, where, getDocs, doc, getDoc,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Colors, Spacing, Typography } from '../../constants/theme';
import VenueCard from '../../components/VenueCard';
import type { Venue, RootStackParamList } from '../../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function FavoritesScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => { fetchFavorites(); }, [user]));

  async function fetchFavorites() {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const snap = await getDocs(
      query(collection(db, 'favorites'), where('user_id', '==', user.uid))
    );
    const venueIds = snap.docs.map(d => d.data().venue_id as string);
    const venueList: Venue[] = [];
    await Promise.all(venueIds.map(async id => {
      const vSnap = await getDoc(doc(db, 'venues', id));
      if (vSnap.exists()) venueList.push({ id: vSnap.id, ...vSnap.data() } as Venue);
    }));
    setVenues(venueList);
    setLoading(false);
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <Text style={styles.title}>저장</Text>
        {venues.length > 0 && (
          <Text style={styles.count}>{venues.length}개</Text>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => { setRefreshing(true); await fetchFavorites(); setRefreshing(false); }}
            tintColor={Colors.accent}
          />
        }
      >
        {!user ? (
          <View style={styles.empty}>
            <Text style={styles.emptyBig}>로그인 필요</Text>
            <Text style={styles.emptyText}>로그인 후 즐겨찾기를 사용하세요</Text>
          </View>
        ) : loading ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>불러오는 중</Text>
          </View>
        ) : venues.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyBig}>저장된 업장 없음</Text>
            <Text style={styles.emptyText}>업장 상세에서 하트를 눌러 저장하세요</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {venues.map(v => (
              <VenueCard
                key={v.id}
                venue={v}
                onPress={() => navigation.navigate('VenueDetail', { venueId: v.id })}
              />
            ))}
          </View>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  count: {
    ...Typography.bodySmall,
    color: Colors.textMuted,
  },
  list: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  empty: { alignItems: 'center', paddingVertical: 80, gap: 6 },
  emptyBig: { fontSize: 18, fontWeight: '700', color: Colors.textSecondary },
  emptyText: { ...Typography.bodySmall, color: Colors.textMuted },
});
