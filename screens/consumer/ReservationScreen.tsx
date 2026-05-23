import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, TextInput, Alert, KeyboardAvoidingView,
  Platform, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { sendPushNotification, getProfilePushToken } from '../../lib/notifications';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { REGIONS } from '../../constants/regions';
import DropdownModal, { type DropdownItem } from '../../components/DropdownModal';
import type { Venue, RootStackParamList } from '../../types';
import KeyboardDoneBar, { KEYBOARD_DONE_ID } from '../../components/KeyboardDoneBar';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'Reservation'>;

// ── 전화번호 유틸 ──────────────────────────────────────────────────────────
function validatePhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-]/g, '');
  return /^(010|011|016|017|018|019)\d{7,8}$/.test(cleaned);
}

function formatPhone(raw: string): string {
  const nums = raw.replace(/[^\d]/g, '');
  if (nums.length <= 3) return nums;
  if (nums.length <= 7) return nums.slice(0, 3) + '-' + nums.slice(3);
  return nums.slice(0, 3) + '-' + nums.slice(3, 7) + '-' + nums.slice(7, 11);
}

// ── 날짜 목록 ──────────────────────────────────────────────────────────────
function generateDateItems(): DropdownItem[] {
  const DAY = ['일', '월', '화', '수', '목', '금', '토'];
  const items: DropdownItem[] = [];
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const value = `${y}-${m}-${day}`;
    const dayName = DAY[d.getDay()];
    const label =
      i === 0 ? `오늘, ${d.getMonth() + 1}월 ${d.getDate()}일 ${dayName}요일` :
      i === 1 ? `내일, ${d.getMonth() + 1}월 ${d.getDate()}일 ${dayName}요일` :
                `${d.getMonth() + 1}월 ${d.getDate()}일 ${dayName}요일`;
    items.push({ value, label });
  }
  return items;
}

const DATE_ITEMS = generateDateItems();
const PARTY_ITEMS: DropdownItem[] = Array.from({ length: 20 }, (_, i) => ({
  value: String(i + 1),
  label: `${i + 1}명`,
}));

export default function ReservationScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { user, profile } = useAuth();

  const [venue, setVenue] = useState<Venue | null>(null);
  const [date, setDate] = useState(DATE_ITEMS[0].value);
  const [partySize, setPartySize] = useState('2');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [requests, setRequests] = useState('');
  const [loading, setLoading] = useState(false);
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [sizeModalVisible, setSizeModalVisible] = useState(false);

  useEffect(() => {
    getDoc(doc(db, 'venues', route.params.venueId)).then(snap => {
      if (snap.exists()) setVenue({ id: snap.id, ...snap.data() } as Venue);
    });
  }, [route.params.venueId]);

  useEffect(() => {
    if (profile?.nickname && !name) setName(profile.nickname);
  }, [profile]);

  function handlePhoneChange(text: string) {
    const formatted = formatPhone(text);
    setPhone(formatted);
    if (formatted.replace(/\-/g, '').length >= 10 && !validatePhone(formatted)) {
      setPhoneError('올바른 휴대폰 번호를 입력해주세요');
    } else {
      setPhoneError('');
    }
  }

  async function handleReservation() {
    if (!user || !profile) { Alert.alert('로그인 필요'); return; }
    if (!date || !name || !phone) {
      Alert.alert('입력 확인', '날짜, 이름, 연락처를 모두 입력해주세요.');
      return;
    }
    if (!validatePhone(phone)) {
      Alert.alert('연락처 오류', '올바른 휴대폰 번호를 입력해주세요.\n예: 010-1234-5678');
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, 'reservations'), {
        venue_id: route.params.venueId,
        user_id: user.uid,
        reservation_date: date,
        party_size: parseInt(partySize),
        contact_name: name,
        contact_phone: phone,
        special_requests: requests || null,
        status: 'pending',
        created_at: serverTimestamp(),
      });

      // 업주에게 앱 푸시 알림 전송 (비차단)
      if (venue?.owner_id) {
        getProfilePushToken(venue.owner_id).then(token => {
          if (token) {
            sendPushNotification({
              to: token,
              title: '새 예약 신청이 들어왔습니다 🔔',
              body: `${name} (${partySize}명) · ${date}`,
              data: { type: 'new_reservation', venueId: venue.id },
            }).catch(() => {});
          }
        }).catch(() => {});
      }

      Alert.alert(
        '예약 완료',
        `${venue?.name}에 ${partySize}명 예약이 접수됐습니다.\n업장에서 확인 후 연락드립니다.`,
        [{ text: '확인', onPress: () => navigation.goBack() }]
      );
    } catch (e: any) {
      Alert.alert('예약 실패', e.message);
    }
    setLoading(false);
  }

  const selectedDateLabel = DATE_ITEMS.find(d => d.value === date)?.label ?? date;

  // 업장 지역명
  const regionLabel = venue?.region
    ? REGIONS.find(r => r.id === venue.region)?.label
    : null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />
      <KeyboardDoneBar />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── 헤더 ──────────────────────────────────────────── */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
            <View style={styles.headerInfo}>
              {/* 업장명 + 지역 */}
              <View style={styles.venueRow}>
                {venue?.name ? (
                  <>
                    <Text style={styles.headerVenue} allowFontScaling={false} numberOfLines={1}>
                      {venue.name}
                    </Text>
                    {regionLabel && (
                      <>
                        <Text style={styles.venueSep} allowFontScaling={false}>,</Text>
                        <Text style={styles.headerRegion} allowFontScaling={false}>
                          {regionLabel}
                        </Text>
                      </>
                    )}
                  </>
                ) : null}
              </View>
              <Text style={styles.headerTitle} allowFontScaling={false}>예약</Text>
            </View>
          </View>

          {/* ── 무보증금 안내 ─────────────────────────────────── */}
          <View style={styles.noticeBadge}>
            <Ionicons name="shield-checkmark-outline" size={13} color={Colors.accent} />
            <Text style={styles.noticeBadgeText} allowFontScaling={false}>
              무보증금 · 결제 없음
            </Text>
          </View>

          {/* ── 폼 ────────────────────────────────────────────── */}
          <View style={styles.form}>

            {/* 방문 날짜 */}
            <TouchableOpacity
              style={styles.fieldRow}
              onPress={() => setDateModalVisible(true)}
              activeOpacity={0.65}
            >
              <View style={styles.fieldLeft}>
                <Text style={styles.fieldLabel} allowFontScaling={false}>방문 날짜</Text>
                <Text style={styles.fieldValue} allowFontScaling={false}>
                  {selectedDateLabel}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
            <View style={styles.separator} />

            {/* 방문 인원 */}
            <TouchableOpacity
              style={styles.fieldRow}
              onPress={() => setSizeModalVisible(true)}
              activeOpacity={0.65}
            >
              <View style={styles.fieldLeft}>
                <Text style={styles.fieldLabel} allowFontScaling={false}>방문 인원</Text>
                <Text style={styles.fieldValue} allowFontScaling={false}>{partySize}명</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
            <View style={styles.separator} />

            {/* 예약자 이름 */}
            <View style={styles.fieldRow}>
              <View style={styles.fieldLeft}>
                <Text style={styles.fieldLabel} allowFontScaling={false}>예약자 이름</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={name}
                  onChangeText={setName}
                  placeholder="홍길동"
                  placeholderTextColor={Colors.textMuted}
                  returnKeyType="next"
                  inputAccessoryViewID={KEYBOARD_DONE_ID}
                  allowFontScaling={false}
                />
              </View>
            </View>
            <View style={styles.separator} />

            {/* 연락처 + 검증 */}
            <View style={[styles.fieldRow, { paddingBottom: phoneError ? 8 : 18 }]}>
              <View style={styles.fieldLeft}>
                <Text style={styles.fieldLabel} allowFontScaling={false}>연락처</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={phone}
                  onChangeText={handlePhoneChange}
                  placeholder="010-0000-0000"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="phone-pad"
                  maxLength={13}
                  returnKeyType="done"
                  inputAccessoryViewID={KEYBOARD_DONE_ID}
                  allowFontScaling={false}
                />
                {phoneError ? (
                  <Text style={styles.phoneError} allowFontScaling={false}>{phoneError}</Text>
                ) : phone.length >= 12 && validatePhone(phone) ? (
                  <Text style={styles.phoneOk} allowFontScaling={false}>✓ 확인됨</Text>
                ) : null}
              </View>
            </View>
            <View style={styles.separator} />

            {/* 요청사항 (선택) */}
            <View style={[styles.fieldRow, styles.fieldRowMulti]}>
              <View style={styles.fieldLeft}>
                <Text style={styles.fieldLabel} allowFontScaling={false}>요청사항 (선택)</Text>
                <TextInput
                  style={styles.fieldInputMulti}
                  value={requests}
                  onChangeText={setRequests}
                  placeholder="요청사항이 있으면 적어주세요"
                  placeholderTextColor={Colors.textMuted}
                  multiline
                  textAlignVertical="top"
                  allowFontScaling={false}
                />
              </View>
            </View>
            <View style={styles.separator} />
          </View>

          {/* ── 안내 ─────────────────────────────────────────── */}
          <View style={styles.hints}>
            <Text style={styles.hintText} allowFontScaling={false}>
              · 예약 확정은 업장에서 직접 연락드립니다
            </Text>
            <Text style={styles.hintText} allowFontScaling={false}>
              · 노쇼는 다음 예약에 불이익이 생길 수 있습니다
            </Text>
          </View>

          {/* ── 예약 버튼 ─────────────────────────────────────── */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && { opacity: 0.5 }]}
            onPress={handleReservation}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={styles.submitBtnText} allowFontScaling={false}>
              {loading ? '처리 중...' : `${partySize}명 예약 접수`}
            </Text>
          </TouchableOpacity>

          <View style={{ height: 60 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <DropdownModal
        visible={dateModalVisible}
        title="방문 날짜"
        items={DATE_ITEMS}
        selectedValue={date}
        onSelect={v => setDate(v)}
        onClose={() => setDateModalVisible(false)}
      />
      <DropdownModal
        visible={sizeModalVisible}
        title="방문 인원"
        items={PARTY_ITEMS}
        selectedValue={partySize}
        onSelect={v => setPartySize(v)}
        onClose={() => setSizeModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    gap: Spacing.md,
  },
  backBtn: {
    width: 36, height: 36,
    alignItems: 'center', justifyContent: 'center',
  },
  headerInfo: { flex: 1 },
  venueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
    flexWrap: 'nowrap',
  },
  headerVenue: {
    fontSize: 12,
    color: Colors.accent,
    fontWeight: '600',
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  venueSep: {
    fontSize: 12,
    color: Colors.accent,
    fontWeight: '400',
  },
  headerRegion: {
    fontSize: 12,
    color: Colors.accent,
    fontWeight: '400',
    opacity: 0.75,
  },
  headerTitle: {
    fontSize: Platform.OS === 'android' ? 26 : 28,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },

  noticeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  noticeBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.accent,
  },

  form: { paddingHorizontal: Spacing.lg },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    minHeight: 64,
  },
  fieldRowMulti: {
    alignItems: 'flex-start',
    minHeight: 88,
  },
  fieldLeft: { flex: 1, gap: 5 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  fieldValue: {
    fontSize: Platform.OS === 'android' ? 16 : 17,
    fontWeight: '500',
    color: Colors.textPrimary,
    letterSpacing: -0.2,
  },
  fieldInput: {
    fontSize: Platform.OS === 'android' ? 16 : 17,
    fontWeight: '500',
    color: Colors.textPrimary,
    padding: 0,
    includeFontPadding: false,
  },
  fieldInputMulti: {
    fontSize: Platform.OS === 'android' ? 15 : 16,
    fontWeight: '400',
    color: Colors.textPrimary,
    padding: 0,
    includeFontPadding: false,
    minHeight: 60,
  },
  phoneError: {
    fontSize: 11,
    color: Colors.error,
    marginTop: 3,
  },
  phoneOk: {
    fontSize: 11,
    color: Colors.success,
    marginTop: 3,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },

  hints: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    gap: 6,
    marginBottom: Spacing.xl,
  },
  hintText: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 18,
  },

  submitBtn: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.md,
    marginHorizontal: Spacing.lg,
    paddingVertical: Platform.OS === 'android' ? 15 : 16,
    alignItems: 'center',
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
});
