import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, StatusBar, Alert, TextInput, Linking,
  ActivityIndicator, Platform, Modal,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import {
  collection, query, where, getDocs,
  doc, updateDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Colors, Spacing, BorderRadius, Typography } from '../../constants/theme';
import KeyboardDoneBar, { KEYBOARD_DONE_ID } from '../../components/KeyboardDoneBar';

// ── Instagram URL 유틸 ─────────────────────────────────────────────────────
function extractInstagramShortcode(url: string): string | null {
  const m = url.match(/instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_\-]+)/);
  return m ? m[1] : null;
}

async function fetchOEmbed(url: string, accessToken?: string) {
  if (!accessToken) return null;
  try {
    const ep = `https://graph.facebook.com/v19.0/instagram_oembed?url=${encodeURIComponent(url)}&access_token=${accessToken}&omitscript=1`;
    const res = await fetch(ep);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export default function VenueSettingsScreen() {
  const { profile, signOut } = useAuth();

  // 업장 정보
  const [venueId, setVenueId] = useState<string | null>(null);
  const [instaHandle, setInstaHandle] = useState('');
  const [instaPostUrl, setInstaPostUrl] = useState('');
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingVenue, setLoadingVenue] = useState(true);

  const initial = profile?.nickname?.[0]?.toUpperCase() ?? '?';

  // ── 업장 데이터 로드 (인스타 URL 포함) ──────────────────────────────────
  useEffect(() => {
    if (!profile) return;
    setLoadingVenue(true);
    getDocs(query(collection(db, 'venues'), where('owner_id', '==', profile.id)))
      .then(snap => {
        if (!snap.empty) {
          const d = snap.docs[0];
          const data = d.data();
          setVenueId(d.id);
          setInstaHandle(data.instagram_handle ?? '');
          setInstaPostUrl(data.instagram_post_url ?? '');
        }
      })
      .finally(() => setLoadingVenue(false));
  }, [profile]);

  // ── 인스타그램 정보 저장 (핸들 + 게시물 URL 동시) ─────────────────────
  async function handleSaveInstagram() {
    if (!venueId) {
      Alert.alert('업장 미등록', '먼저 업장정보 탭에서 업장을 등록해주세요.');
      return;
    }
    if (instaPostUrl && !extractInstagramShortcode(instaPostUrl)) {
      Alert.alert(
        '잘못된 URL',
        '올바른 인스타그램 게시물 URL을 입력해주세요.\n예: https://www.instagram.com/p/Cxxxxxx/'
      );
      return;
    }
    setSaving(true);
    try {
      await updateDoc(doc(db, 'venues', venueId), {
        instagram_handle: instaHandle.replace('@', '').trim() || null,
        instagram_post_url: instaPostUrl.trim() || null,
        updated_at: serverTimestamp(),
      });
      Alert.alert('저장 완료', '인스타그램 정보가 저장되었습니다.');
    } catch (e: any) {
      Alert.alert('저장 실패', e.message);
    }
    setSaving(false);
  }

  // ── 게시물 미리보기 (WebView 모달) ───────────────────────────────────────
  function handlePreviewOEmbed() {
    if (!instaPostUrl.trim()) {
      Alert.alert('URL 입력', '인스타그램 게시물 URL을 먼저 입력해주세요.');
      return;
    }
    const sc = extractInstagramShortcode(instaPostUrl);
    if (!sc) {
      Alert.alert('잘못된 URL', 'instagram.com/p/... 또는 /reel/... 형식이어야 합니다.');
      return;
    }
    setPreviewModalVisible(true);
  }

  // ── 인스타 앱 또는 웹 열기 ────────────────────────────────────────────────
  function openInInstagram() {
    const shortcode = extractInstagramShortcode(instaPostUrl);
    if (!shortcode) return;
    const webUrl = `https://www.instagram.com/p/${shortcode}/`;
    Linking.openURL(webUrl).catch(() =>
      Alert.alert('오류', '인스타그램을 열 수 없습니다.')
    );
  }

  const shortcode = extractInstagramShortcode(instaPostUrl);

  const previewShortcode = extractInstagramShortcode(instaPostUrl);
  const embedUrl = previewShortcode
    ? `https://www.instagram.com/p/${previewShortcode}/embed/`
    : '';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />
      <KeyboardDoneBar />

      {/* ── 인스타그램 게시물 미리보기 모달 ─────────────────────── */}
      <Modal
        visible={previewModalVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
      >
        <View style={styles.previewOverlay}>
          <View style={styles.previewSheet}>
            {/* 헤더 */}
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle} allowFontScaling={false}>게시물 미리보기</Text>
              <TouchableOpacity
                onPress={() => setPreviewModalVisible(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close" size={22} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            {/* WebView */}
            <WebView
              source={{ uri: embedUrl }}
              style={styles.previewWebView}
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState
              renderLoading={() => (
                <View style={styles.webViewLoading}>
                  <ActivityIndicator size="large" color={Colors.accent} />
                </View>
              )}
            />
            {/* 인스타에서 열기 */}
            <TouchableOpacity
              style={styles.previewOpenBtn}
              onPress={() => {
                setPreviewModalVisible(false);
                openInInstagram();
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="logo-instagram" size={16} color={Colors.textPrimary} />
              <Text style={styles.previewOpenText} allowFontScaling={false}>Instagram에서 전체 보기</Text>
              <Ionicons name="open-outline" size={14} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── 프로필 헤더 ──────────────────────────────────────── */}
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.name} allowFontScaling={false}>{profile?.nickname}</Text>
            <Text style={styles.email} allowFontScaling={false}>{profile?.email}</Text>
            <View style={styles.rolePill}>
              <Text style={styles.rolePillText} allowFontScaling={false}>사업주</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* ── 계정 ──────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>계정</Text>
          <MenuItem label="이메일 변경" onPress={() => {}} />
          <MenuItem label="비밀번호 변경" onPress={() => {}} />
        </View>

        {/* ── 인스타그램 연동 ────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>인스타그램 연동</Text>

          {loadingVenue ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={Colors.accent} />
            </View>
          ) : (
            <>
              {/* 계정 핸들 */}
              <View style={styles.instaBlock}>
                <Text style={styles.instaFieldLabel} allowFontScaling={false}>인스타그램 계정 핸들</Text>
                <View style={styles.instaInputRow}>
                  <Text style={styles.atSign}>@</Text>
                  <TextInput
                    style={[styles.instaInput, { flex: 1 }]}
                    value={instaHandle}
                    onChangeText={setInstaHandle}
                    placeholder="loungeabc"
                    placeholderTextColor={Colors.textMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    blurOnSubmit
                    inputAccessoryViewID={KEYBOARD_DONE_ID}
                    allowFontScaling={false}
                  />
                </View>
              </View>

              {/* 게시물 URL */}
              <View style={styles.instaBlock}>
                <View style={styles.labelRowBadge}>
                  <Text style={styles.instaFieldLabel} allowFontScaling={false}>대표 게시물 URL</Text>
                  <View style={styles.methodBadge}>
                    <Text style={styles.methodBadgeText} allowFontScaling={false}>oEmbed</Text>
                  </View>
                </View>
                <TextInput
                  style={styles.instaInput}
                  value={instaPostUrl}
                  onChangeText={v => { setInstaPostUrl(v); }}
                  placeholder="https://www.instagram.com/p/..."
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  returnKeyType="done"
                  blurOnSubmit
                  inputAccessoryViewID={KEYBOARD_DONE_ID}
                  allowFontScaling={false}
                />
                <Text style={styles.instaHint} allowFontScaling={false}>
                  인스타그램 앱에서 게시물 → 공유 → 링크 복사
                </Text>

                {/* 미리보기 / 열기 버튼 */}
                <View style={styles.instaActions}>
                  <TouchableOpacity
                    style={styles.previewBtn}
                    onPress={handlePreviewOEmbed}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="eye-outline" size={14} color={Colors.accent} />
                    <Text style={styles.previewBtnText} allowFontScaling={false}>미리보기</Text>
                  </TouchableOpacity>
                  {shortcode && (
                    <TouchableOpacity
                      style={styles.openBtn}
                      onPress={openInInstagram}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.openBtnText} allowFontScaling={false}>앱에서 열기</Text>
                      <Ionicons name="open-outline" size={13} color={Colors.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* 안내 박스 */}
                {instaPostUrl.trim() && shortcode && (
                  <View style={styles.fallbackBox}>
                    <Ionicons name="information-circle-outline" size={14} color={Colors.accent} />
                    <Text style={styles.fallbackText} allowFontScaling={false}>
                      저장 후 업장 상세 화면에서 "인스타그램 보기" 링크로 표시됩니다.
                    </Text>
                  </View>
                )}
              </View>

              {/* 저장 버튼 */}
              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleSaveInstagram}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving
                  ? <ActivityIndicator size="small" color="#FFF" />
                  : <Text style={styles.saveBtnText} allowFontScaling={false}>저장하기</Text>
                }
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* ── 지원 ──────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>지원</Text>
          <MenuItem label="도움말" onPress={() => {}} />
          <MenuItem label="이용약관" onPress={() => {}} />
          <MenuItem label="개인정보처리방침" onPress={() => {}} />
          <MenuItem label="1:1 문의" onPress={() => {}} />
        </View>

        {/* ── 로그아웃 ──────────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={() => Alert.alert('로그아웃', '로그아웃 하시겠어요?', [
            { text: '취소', style: 'cancel' },
            { text: '로그아웃', style: 'destructive', onPress: signOut },
          ])}
        >
          <Text style={styles.signOutText} allowFontScaling={false}>로그아웃</Text>
        </TouchableOpacity>

        <Text style={styles.version} allowFontScaling={false}>LOUNGETALK v1.0.0</Text>
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuItem({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.65}>
      <Text style={styles.menuLabel} allowFontScaling={false}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },

  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  avatar: {
    width: 58, height: 58,
    borderRadius: 29,
    backgroundColor: Colors.accentSoft,
    borderWidth: 1,
    borderColor: Colors.accentMid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 22, fontWeight: '700', color: Colors.accent },
  profileInfo: { flex: 1, gap: 3 },
  name: {
    fontSize: Platform.OS === 'android' ? 18 : 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.2,
  },
  email: { ...Typography.bodySmall, color: Colors.textMuted },
  rolePill: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.accentSoft,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.accentMid,
    marginTop: 4,
  },
  rolePillText: { fontSize: 11, fontWeight: '600', color: Colors.accent },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },

  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.xl },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  menuLabel: { fontSize: 15, fontWeight: '400', color: Colors.textPrimary },

  loadingRow: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },

  // 인스타그램 블록
  instaBlock: {
    gap: 8,
    marginBottom: Spacing.md,
  },
  instaFieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  labelRowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  methodBadge: {
    backgroundColor: Colors.accentSoft,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: Colors.accentMid,
  },
  methodBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.accent,
    letterSpacing: 0.5,
  },
  instaInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'android' ? 11 : 13,
  },
  atSign: {
    fontSize: 15,
    color: Colors.textMuted,
    marginRight: 4,
  },
  instaInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'android' ? 11 : 13,
    color: Colors.textPrimary,
    fontSize: Platform.OS === 'android' ? 13 : 14,
  },
  instaHint: {
    fontSize: 11,
    color: Colors.textMuted,
    lineHeight: 16,
    marginTop: -2,
  },
  instaActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  previewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.accentSoft,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: Colors.accentMid,
    minWidth: 80,
  },
  previewBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.accent,
  },

  // 미리보기 모달
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  previewSheet: {
    backgroundColor: '#111111',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '80%',
    overflow: 'hidden',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  previewTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  previewWebView: {
    flex: 1,
    backgroundColor: '#000',
  },
  webViewLoading: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111111',
  },
  previewOpenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  previewOpenText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  openBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 9,
  },
  openBtnText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  resultBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.success + '12',
    borderRadius: BorderRadius.sm,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.success + '30',
  },
  resultText: {
    fontSize: 12,
    color: Colors.success,
    fontWeight: '500',
  },
  fallbackBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: Colors.warning + '10',
    borderRadius: BorderRadius.sm,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.warning + '25',
  },
  fallbackText: {
    flex: 1,
    fontSize: 11,
    color: Colors.textMuted,
    lineHeight: 17,
  },

  saveBtn: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.md,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  signOutBtn: {
    marginHorizontal: Spacing.lg,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.error + '44',
    marginBottom: Spacing.md,
  },
  signOutText: { fontSize: 15, fontWeight: '500', color: Colors.error },
  version: {
    textAlign: 'center',
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: Spacing.md,
  },
});
