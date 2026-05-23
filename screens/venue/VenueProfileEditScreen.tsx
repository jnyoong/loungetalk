import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, StatusBar, TextInput, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  collection, query, where, getDocs, doc, addDoc, updateDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Colors, Spacing, BorderRadius, Typography } from '../../constants/theme';
import { REGIONS, CATEGORIES } from '../../constants/regions';
import AddressSearchModal, { type AddressResult } from '../../components/AddressSearchModal';
import TimePickerModal from '../../components/TimePickerModal';
import KeyboardDoneBar, { KEYBOARD_DONE_ID } from '../../components/KeyboardDoneBar';

// ── 전화번호 유틸 ──────────────────────────────────────────────────────────
function validatePhone(phone: string): boolean {
  const c = phone.replace(/[\s\-]/g, '');
  return /^(010|011|016|017|018|019)\d{7,8}$|^02\d{7,8}$|^0[3-9]\d{8,9}$/.test(c);
}
function formatPhone(raw: string): string {
  const n = raw.replace(/[^\d]/g, '');
  if (n.startsWith('02')) {
    if (n.length <= 2) return n;
    if (n.length <= 5) return n.slice(0, 2) + '-' + n.slice(2);
    if (n.length <= 9) return n.slice(0, 2) + '-' + n.slice(2, 5) + '-' + n.slice(5);
    return n.slice(0, 2) + '-' + n.slice(2, 6) + '-' + n.slice(6, 10);
  }
  if (n.length <= 3) return n;
  if (n.length <= 7) return n.slice(0, 3) + '-' + n.slice(3);
  return n.slice(0, 3) + '-' + n.slice(3, 7) + '-' + n.slice(7, 11);
}

const MAX_DESC = 300;
const DAYS = ['월', '화', '수', '목', '금', '토', '일'];

export default function VenueProfileEditScreen() {
  const { profile } = useAuth();
  const [venueId, setVenueId] = useState<string | null>(null);

  // 기본 정보
  const [name, setName] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [address, setAddress] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [instagram, setInstagram] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');

  // 입장료
  const [feeWeekday, setFeeWeekday] = useState('');
  const [feeWeekend, setFeeWeekend] = useState('');

  // 운영 정보
  const [selectedRegion, setSelectedRegion] = useState('gangnam');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [openDays, setOpenDays] = useState<string[]>([]);
  const [openTime, setOpenTime] = useState('');
  const [closeTime, setCloseTime] = useState('');

  // 상세 정보
  const [dressCode, setDressCode] = useState('');
  const [ageRestriction, setAgeRestriction] = useState('19');
  const [capacity, setCapacity] = useState('');
  const [musicGenres, setMusicGenres] = useState<string[]>([]);
  const [genreInput, setGenreInput] = useState('');

  // 소개
  const [description, setDescription] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');

  const [saving, setSaving] = useState(false);
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [openTimePickerVisible, setOpenTimePickerVisible]   = useState(false);
  const [closeTimePickerVisible, setCloseTimePickerVisible] = useState(false);

  // 키보드 포커스 체인용 ref
  const nameEnRef   = useRef<TextInput>(null);
  const addressDetailRef = useRef<TextInput>(null);
  const phoneRef    = useRef<TextInput>(null);
  const instagramRef = useRef<TextInput>(null);
  const websiteRef  = useRef<TextInput>(null);
  const feeWeekdayRef = useRef<TextInput>(null);
  const feeWeekendRef = useRef<TextInput>(null);
  const dressCodeRef = useRef<TextInput>(null);
  const ageRef      = useRef<TextInput>(null);
  const capacityRef = useRef<TextInput>(null);

  useEffect(() => { fetchVenue(); }, [profile]);

  async function fetchVenue() {
    if (!profile) return;
    const snap = await getDocs(
      query(collection(db, 'venues'), where('owner_id', '==', profile.id))
    );
    if (!snap.empty) {
      const d = snap.docs[0];
      const v = d.data();
      setVenueId(d.id);
      setName(v.name ?? '');
      setNameEn(v.name_en ?? '');
      setAddress(v.address ?? '');
      setAddressDetail(v.address_detail ?? '');
      setPhone(v.phone ?? '');
      setInstagram(v.instagram_handle ?? '');
      setWebsiteUrl(v.website_url ?? '');
      setFeeWeekday(v.entrance_fee_weekday?.toString() ?? '');
      setFeeWeekend(v.entrance_fee_weekend?.toString() ?? '');
      setSelectedRegion(v.region ?? 'gangnam');
      setSelectedCategories(v.categories ?? []);
      setOpenDays(v.open_days ?? []);
      setOpenTime(v.open_time ?? '');
      setCloseTime(v.close_time ?? '');
      setDressCode(v.dress_code ?? '');
      setAgeRestriction(v.age_restriction?.toString() ?? '19');
      setCapacity(v.capacity?.toString() ?? '');
      setMusicGenres(v.music_genres ?? []);
      setDescription(v.description ?? '');
      setDescriptionEn(v.description_en ?? '');
    }
  }

  function handleAddressSelect(result: AddressResult) {
    setAddress(result.address);
    setAddressDetail('');
  }

  function handlePhoneChange(text: string) {
    const formatted = formatPhone(text);
    setPhone(formatted);
    if (formatted.replace(/\-/g, '').length >= 9 && !validatePhone(formatted)) {
      setPhoneError('올바른 전화번호 형식이 아닙니다');
    } else {
      setPhoneError('');
    }
  }

  function toggleDay(day: string) {
    setOpenDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  }

  function toggleCategory(id: string) {
    setSelectedCategories(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  }

  function addGenre() {
    const g = genreInput.trim();
    if (!g || musicGenres.includes(g)) return;
    setMusicGenres([...musicGenres, g]);
    setGenreInput('');
  }

  async function handleSave() {
    if (!profile || !name || !address) {
      Alert.alert('입력 확인', '업장명과 주소는 필수입니다.');
      return;
    }
    if (phone && !validatePhone(phone)) {
      Alert.alert('전화번호 오류', '올바른 전화번호를 입력해주세요.');
      return;
    }
    if (description.length > MAX_DESC) {
      Alert.alert('소개 초과', `소개란은 ${MAX_DESC}자 이내로 작성해주세요.`);
      return;
    }
    setSaving(true);
    const payload: any = {
      owner_id: profile.id,
      name,
      name_en: nameEn || null,
      address,
      address_detail: addressDetail || null,
      phone: phone || null,
      instagram_handle: instagram || null,
      website_url: websiteUrl || null,
      entrance_fee_weekday: feeWeekday ? parseInt(feeWeekday) : null,
      entrance_fee_weekend: feeWeekend ? parseInt(feeWeekend) : null,
      region: selectedRegion,
      categories: selectedCategories,
      open_days: openDays,
      open_time: openTime || null,
      close_time: closeTime || null,
      dress_code: dressCode || null,
      age_restriction: ageRestriction ? parseInt(ageRestriction) : 19,
      capacity: capacity ? parseInt(capacity) : null,
      music_genres: musicGenres,
      description: description || null,
      description_en: descriptionEn || null,
      is_active: true,
      updated_at: serverTimestamp(),
    };
    try {
      if (venueId) {
        await updateDoc(doc(db, 'venues', venueId), payload);
      } else {
        const newDoc = await addDoc(collection(db, 'venues'), {
          ...payload,
          slug: name.replace(/\s+/g, '-').toLowerCase() + '-' + Date.now(),
          images: [],
          is_verified: false,
          instagram_connected: false,
          created_at: serverTimestamp(),
        });
        setVenueId(newDoc.id);
      }
      Alert.alert('저장 완료', '업장 정보가 저장되었습니다.');
    } catch (e: any) {
      Alert.alert('저장 실패', e.message);
    }
    setSaving(false);
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.pageHeader}>
            <Text style={styles.pageTitle} allowFontScaling={false}>업장 정보</Text>
            <Text style={styles.pageSubtitle} allowFontScaling={false}>고객에게 보여질 정보를 입력하세요</Text>
          </View>

          {/* ════════ 기본 정보 ════════════════════════════════ */}
          <SectionHeader title="기본 정보" />
          <View style={styles.block}>
            <Field
              label="업장명" required value={name} onChangeText={setName} placeholder="라운지 ABC"
              onSubmitEditing={() => nameEnRef.current?.focus()}
            />
            <Divider />
            <Field
              label="영문명 (외국인용)" value={nameEn} onChangeText={setNameEn} placeholder="Lounge ABC"
              inputRef={nameEnRef} onSubmitEditing={() => phoneRef.current?.focus()}
            />
            <Divider />

            {/* 주소 검색 */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label} allowFontScaling={false}>
                주소 <Text style={{ color: Colors.accent }}>*</Text>
              </Text>
              <TouchableOpacity
                style={styles.addressBtn}
                onPress={() => setAddressModalVisible(true)}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.addressBtnText, !address && styles.placeholder]}
                  allowFontScaling={false}
                  numberOfLines={1}
                >
                  {address || '주소를 검색하세요'}
                </Text>
                <Ionicons name="search-outline" size={15} color={Colors.textMuted} />
              </TouchableOpacity>
              {address ? (
                <TextInput
                  ref={addressDetailRef}
                  style={styles.input}
                  value={addressDetail}
                  onChangeText={setAddressDetail}
                  placeholder="상세주소 (층, 호수 등)"
                  placeholderTextColor={Colors.textMuted}
                  returnKeyType="next"
                  onSubmitEditing={() => phoneRef.current?.focus()}
                  inputAccessoryViewID={KEYBOARD_DONE_ID}
                  allowFontScaling={false}
                />
              ) : null}
            </View>
            <Divider />

            {/* 전화번호 */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label} allowFontScaling={false}>전화번호</Text>
              <TextInput
                ref={phoneRef}
                style={[styles.input, phoneError ? styles.inputError : null]}
                value={phone}
                onChangeText={handlePhoneChange}
                placeholder="02-1234-5678"
                placeholderTextColor={Colors.textMuted}
                keyboardType="phone-pad"
                maxLength={14}
                returnKeyType="next"
                onSubmitEditing={() => instagramRef.current?.focus()}
                inputAccessoryViewID={KEYBOARD_DONE_ID}
                allowFontScaling={false}
              />
              {phoneError ? (
                <Text style={styles.errorText} allowFontScaling={false}>{phoneError}</Text>
              ) : phone && validatePhone(phone) ? (
                <Text style={styles.successText} allowFontScaling={false}>✓ 올바른 형식</Text>
              ) : null}
            </View>
            <Divider />

            <Field
              label="인스타그램 (@제외)" value={instagram} onChangeText={setInstagram} placeholder="lounge_abc"
              inputRef={instagramRef} onSubmitEditing={() => websiteRef.current?.focus()}
            />
            <Divider />
            <Field
              label="웹사이트 URL" value={websiteUrl} onChangeText={setWebsiteUrl} placeholder="https://..." keyboardType="url"
              inputRef={websiteRef} returnKeyType="done"
            />
          </View>

          {/* ════════ 운영 정보 ════════════════════════════════ */}
          <SectionHeader title="운영 정보" />
          <View style={styles.block}>

            {/* 지역 */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label} allowFontScaling={false}>지역</Text>
              <View style={styles.chipRow}>
                {REGIONS.filter(r => r.id !== 'other').map(r => (
                  <TouchableOpacity
                    key={r.id}
                    style={[styles.chip, selectedRegion === r.id && styles.chipActive]}
                    onPress={() => setSelectedRegion(r.id)}
                  >
                    <Text style={[styles.chipText, selectedRegion === r.id && styles.chipTextActive]} allowFontScaling={false}>
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <Divider />

            {/* 카테고리 */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label} allowFontScaling={false}>카테고리 (복수 선택)</Text>
              <View style={styles.chipRow}>
                {CATEGORIES.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      styles.chip,
                      selectedCategories.includes(c.id) && {
                        backgroundColor: c.color + '18',
                        borderColor: c.color + '55',
                      },
                    ]}
                    onPress={() => toggleCategory(c.id)}
                  >
                    <Text
                      style={[styles.chipText, selectedCategories.includes(c.id) && { color: c.color, fontWeight: '600' }]}
                      allowFontScaling={false}
                    >
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <Divider />

            {/* 영업일 */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label} allowFontScaling={false}>영업일</Text>
              <View style={styles.chipRow}>
                {DAYS.map(d => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.chip, styles.chipDay, openDays.includes(d) && styles.chipDayActive]}
                    onPress={() => toggleDay(d)}
                  >
                    <Text style={[styles.chipText, openDays.includes(d) && styles.chipTextActive]} allowFontScaling={false}>
                      {d}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <Divider />

            {/* 영업시간 */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label} allowFontScaling={false}>영업시간</Text>
              <View style={styles.timeRow}>
                {/* 오픈 시간 */}
                <TouchableOpacity
                  style={styles.timePicker}
                  onPress={() => setOpenTimePickerVisible(true)}
                  activeOpacity={0.75}
                >
                  <Ionicons name="time-outline" size={14} color={Colors.textMuted} />
                  <Text
                    style={[styles.timePickerText, !openTime && { color: Colors.textMuted }]}
                    allowFontScaling={false}
                  >
                    {openTime || '오픈 시간'}
                  </Text>
                </TouchableOpacity>

                <Text style={styles.timeSep} allowFontScaling={false}>—</Text>

                {/* 마감 시간 */}
                <TouchableOpacity
                  style={styles.timePicker}
                  onPress={() => setCloseTimePickerVisible(true)}
                  activeOpacity={0.75}
                >
                  <Ionicons name="time-outline" size={14} color={Colors.textMuted} />
                  <Text
                    style={[styles.timePickerText, !closeTime && { color: Colors.textMuted }]}
                    allowFontScaling={false}
                  >
                    {closeTime || '마감 시간'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            <Divider />

            {/* 입장료 */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label} allowFontScaling={false}>입장료 (원)</Text>
              <View style={styles.row2}>
                <View style={styles.flex1}>
                  <Text style={styles.subLabel} allowFontScaling={false}>평일</Text>
                  <TextInput
                    ref={feeWeekdayRef}
                    style={styles.input}
                    value={feeWeekday}
                    onChangeText={setFeeWeekday}
                    placeholder="20000"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="numeric"
                    returnKeyType="next"
                    onSubmitEditing={() => feeWeekendRef.current?.focus()}
                    inputAccessoryViewID={KEYBOARD_DONE_ID}
                    allowFontScaling={false}
                  />
                </View>
                <View style={styles.flex1}>
                  <Text style={styles.subLabel} allowFontScaling={false}>주말</Text>
                  <TextInput
                    ref={feeWeekendRef}
                    style={styles.input}
                    value={feeWeekend}
                    onChangeText={setFeeWeekend}
                    placeholder="30000"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="numeric"
                    returnKeyType="done"
                    inputAccessoryViewID={KEYBOARD_DONE_ID}
                    allowFontScaling={false}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* ════════ 상세 정보 ════════════════════════════════ */}
          <SectionHeader title="상세 정보" />
          <View style={styles.block}>
            <Field
              label="드레스코드" value={dressCode} onChangeText={setDressCode} placeholder="스마트 캐주얼"
              inputRef={dressCodeRef} onSubmitEditing={() => ageRef.current?.focus()}
            />
            <Divider />

            <View style={styles.fieldGroup}>
              <Text style={styles.label} allowFontScaling={false}>연령 제한</Text>
              <View style={styles.row2}>
                <View style={{ width: 100 }}>
                  <TextInput
                    ref={ageRef}
                    style={styles.input}
                    value={ageRestriction}
                    onChangeText={setAgeRestriction}
                    placeholder="19"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="numeric"
                    maxLength={2}
                    returnKeyType="next"
                    onSubmitEditing={() => capacityRef.current?.focus()}
                    inputAccessoryViewID={KEYBOARD_DONE_ID}
                    allowFontScaling={false}
                  />
                </View>
                <Text style={styles.ageUnit} allowFontScaling={false}>세 이상</Text>
              </View>
            </View>
            <Divider />

            <View style={styles.fieldGroup}>
              <Text style={styles.label} allowFontScaling={false}>수용 인원</Text>
              <View style={styles.row2}>
                <View style={{ width: 100 }}>
                  <TextInput
                    ref={capacityRef}
                    style={styles.input}
                    value={capacity}
                    onChangeText={setCapacity}
                    placeholder="200"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="numeric"
                    returnKeyType="done"
                    inputAccessoryViewID={KEYBOARD_DONE_ID}
                    allowFontScaling={false}
                  />
                </View>
                <Text style={styles.ageUnit} allowFontScaling={false}>명</Text>
              </View>
            </View>
            <Divider />

            {/* 음악 장르 */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label} allowFontScaling={false}>음악 장르</Text>
              <View style={styles.genreInputRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={genreInput}
                  onChangeText={setGenreInput}
                  placeholder="Hip-Hop, R&B, House..."
                  placeholderTextColor={Colors.textMuted}
                  onSubmitEditing={addGenre}
                  returnKeyType="done"
                  inputAccessoryViewID={KEYBOARD_DONE_ID}
                  allowFontScaling={false}
                />
                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={addGenre}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={18} color="#FFF" />
                </TouchableOpacity>
              </View>
              {musicGenres.length > 0 && (
                <View style={styles.chipRow}>
                  {musicGenres.map(g => (
                    <TouchableOpacity
                      key={g}
                      style={styles.genreChip}
                      onPress={() => setMusicGenres(musicGenres.filter(x => x !== g))}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.genreChipText} allowFontScaling={false}>{g}</Text>
                      <Ionicons name="close" size={12} color={Colors.textMuted} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* ════════ 소개 ════════════════════════════════════ */}
          <SectionHeader title="소개" />
          <View style={styles.block}>
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label} allowFontScaling={false}>한국어 소개</Text>
                <Text
                  style={[styles.charCount, description.length > MAX_DESC && styles.charCountOver]}
                  allowFontScaling={false}
                >
                  {description.length}/{MAX_DESC}
                </Text>
              </View>
              <TextInput
                style={[styles.input, styles.inputMulti]}
                value={description}
                onChangeText={t => { if (t.length <= MAX_DESC) setDescription(t); }}
                placeholder="업장 분위기와 특징을 소개해주세요"
                placeholderTextColor={Colors.textMuted}
                multiline
                maxLength={MAX_DESC}
                inputAccessoryViewID={KEYBOARD_DONE_ID}
                allowFontScaling={false}
              />
            </View>
            <Divider />
            <View style={styles.fieldGroup}>
              <Text style={styles.label} allowFontScaling={false}>영문 소개 (English)</Text>
              <TextInput
                style={[styles.input, styles.inputMulti]}
                value={descriptionEn}
                onChangeText={setDescriptionEn}
                placeholder="Describe your venue in English"
                placeholderTextColor={Colors.textMuted}
                multiline
                inputAccessoryViewID={KEYBOARD_DONE_ID}
                allowFontScaling={false}
              />
            </View>
          </View>

          {/* 저장 버튼 */}
          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            <Text style={styles.saveBtnText} allowFontScaling={false}>
              {saving ? '저장 중...' : '저장하기'}
            </Text>
          </TouchableOpacity>

          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <KeyboardDoneBar />

      <AddressSearchModal
        visible={addressModalVisible}
        onSelect={handleAddressSelect}
        onClose={() => setAddressModalVisible(false)}
      />

      {/* 오픈 시간 피커 */}
      <TimePickerModal
        visible={openTimePickerVisible}
        title="오픈 시간"
        value={openTime || null}
        onConfirm={t => setOpenTime(t)}
        onClose={() => setOpenTimePickerVisible(false)}
      />

      {/* 마감 시간 피커 */}
      <TimePickerModal
        visible={closeTimePickerVisible}
        title="마감 시간"
        value={closeTime || null}
        onConfirm={t => setCloseTime(t)}
        onClose={() => setCloseTimePickerVisible(false)}
      />
    </SafeAreaView>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText} allowFontScaling={false}>{title}</Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function Field({ label, value, onChangeText, placeholder, keyboardType, required, returnKeyType, onSubmitEditing, inputRef }: {
  label: string; value: string; onChangeText: (t: string) => void;
  placeholder?: string; keyboardType?: any; required?: boolean;
  returnKeyType?: any; onSubmitEditing?: () => void;
  inputRef?: React.RefObject<TextInput | null>;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label} allowFontScaling={false}>
        {label}{required && <Text style={{ color: Colors.accent }}> *</Text>}
      </Text>
      <TextInput
        ref={inputRef}
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        keyboardType={keyboardType ?? 'default'}
        returnKeyType={returnKeyType ?? 'next'}
        onSubmitEditing={onSubmitEditing}
        inputAccessoryViewID={KEYBOARD_DONE_ID}
        allowFontScaling={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1 },

  pageHeader: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  pageTitle: {
    fontSize: 28, fontWeight: '800', color: Colors.textPrimary,
    letterSpacing: -0.3, marginBottom: 4,
  },
  pageSubtitle: { ...Typography.bodySmall, color: Colors.textMuted },

  // 섹션 헤더
  sectionHeader: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
  sectionHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },

  // 블록 (카드 형태)
  block: {
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    overflow: 'hidden',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginVertical: 2,
  },

  // 필드
  fieldGroup: { paddingVertical: 12, gap: 7 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: {
    fontSize: 11, fontWeight: '600', color: Colors.textMuted,
    letterSpacing: 0.8, textTransform: 'uppercase',
  },
  subLabel: {
    fontSize: 10, fontWeight: '500', color: Colors.textMuted,
    marginBottom: 4,
  },
  charCount: { fontSize: 11, color: Colors.textMuted },
  charCountOver: { color: Colors.error },
  errorText: { fontSize: 11, color: Colors.error, marginTop: 2 },
  successText: { fontSize: 11, color: Colors.success, marginTop: 2 },

  input: {
    backgroundColor: Colors.surfaceHigh,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'android' ? 10 : 12,
    color: Colors.textPrimary,
    fontSize: Platform.OS === 'android' ? 14 : 15,
  },
  inputError: { borderColor: Colors.error + '80' },
  inputMulti: { height: 88, textAlignVertical: 'top', paddingTop: 11 },

  // 주소
  addressBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surfaceHigh,
    borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm,
    paddingHorizontal: 12, paddingVertical: Platform.OS === 'android' ? 10 : 12,
    gap: 8,
  },
  addressBtnText: { flex: 1, color: Colors.textPrimary, fontSize: Platform.OS === 'android' ? 14 : 15 },
  placeholder: { color: Colors.textMuted },

  // 칩
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  chip: {
    paddingHorizontal: 11, paddingVertical: 6,
    borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border,
  },
  chipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  chipDay: { minWidth: 38, alignItems: 'center' },
  chipDayActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  chipText: { fontSize: 12, fontWeight: '500', color: Colors.textSecondary },
  chipTextActive: { color: '#FFFFFF', fontWeight: '700' },

  // 시간
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeInput: { flex: 1 },
  timeSep: { fontSize: 14, color: Colors.textMuted, fontWeight: '300' },
  timePicker: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surfaceHigh,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 13,
  },
  timePickerText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },

  // 입장료
  row2: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  flex1: { flex: 1 },
  ageUnit: { fontSize: 14, color: Colors.textSecondary, alignSelf: 'center', paddingTop: 4 },

  // 음악 장르
  genreInputRow: { flexDirection: 'row', gap: 8 },
  addBtn: {
    width: 42, height: 42,
    backgroundColor: Colors.accent, borderRadius: BorderRadius.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  genreChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.borderActive,
    backgroundColor: Colors.surfaceHigher,
  },
  genreChipText: { fontSize: 12, color: Colors.textSecondary },

  // 저장
  saveBtn: {
    backgroundColor: Colors.accent, borderRadius: BorderRadius.md,
    paddingVertical: 16, alignItems: 'center',
    marginHorizontal: Spacing.lg, marginTop: Spacing.xl,
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.3 },
});
