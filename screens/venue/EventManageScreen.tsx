import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, StatusBar, TextInput, Alert, Modal,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import {
  collection, query, where, getDocs, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Colors, Spacing, BorderRadius, Typography } from '../../constants/theme';

export default function EventManageScreen() {
  const { profile } = useAuth();
  const [venueId, setVenueId] = useState<string | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [lineup, setLineup] = useState('');
  const [fee, setFee] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchVenueAndEvents(); }, [profile]);

  async function fetchVenueAndEvents() {
    if (!profile) return;
    const venueSnap = await getDocs(
      query(collection(db, 'venues'), where('owner_id', '==', profile.id))
    );
    if (venueSnap.empty) return;
    const vid = venueSnap.docs[0].id;
    setVenueId(vid);

    const evtSnap = await getDocs(
      query(collection(db, 'venue_events'), where('venue_id', '==', vid))
    );
    const sorted = evtSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a: any, b: any) => b.event_date.localeCompare(a.event_date));
    setEvents(sorted);
  }

  function resetForm() {
    setTitle(''); setTitleEn(''); setEventDate('');
    setStartTime(''); setLineup(''); setFee(''); setDescription('');
  }

  async function handleSave() {
    if (!venueId || !title || !eventDate) {
      Alert.alert('입력 확인', '이벤트명과 날짜는 필수입니다.');
      return;
    }
    setSaving(true);
    await addDoc(collection(db, 'venue_events'), {
      venue_id: venueId,
      title,
      title_en: titleEn || null,
      event_date: eventDate,
      start_time: startTime || null,
      lineup: lineup ? lineup.split(',').map(s => s.trim()).filter(Boolean) : [],
      entrance_fee: fee ? parseInt(fee) : null,
      description: description || null,
      is_published: true,
      created_at: serverTimestamp(),
    });
    setSaving(false);
    setShowModal(false);
    resetForm();
    fetchVenueAndEvents();
  }

  async function togglePublish(event: any) {
    await updateDoc(doc(db, 'venue_events', event.id), { is_published: !event.is_published });
    fetchVenueAndEvents();
  }

  async function deleteEvent(id: string) {
    Alert.alert('삭제 확인', '이벤트를 삭제하시겠어요?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => {
        await deleteDoc(doc(db, 'venue_events', id));
        fetchVenueAndEvents();
      }},
    ]);
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <Text style={styles.title}>이벤트</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
          <Text style={styles.addBtnText}>+ 등록</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.list}>
        {events.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyBig}>등록된 이벤트 없음</Text>
            <Text style={styles.emptyText}>오른쪽 상단 버튼으로 이벤트를 등록하세요</Text>
          </View>
        ) : (
          events.map(e => (
            <View key={e.id} style={styles.eventCard}>
              <View style={styles.eventInfo}>
                <Text style={styles.eventDate}>{e.event_date}</Text>
                <Text style={styles.eventTitle} numberOfLines={1}>{e.title}</Text>
                {e.lineup?.length > 0 && (
                  <Text style={styles.eventLineup} numberOfLines={1}>{e.lineup.join(' · ')}</Text>
                )}
              </View>
              <View style={styles.eventActions}>
                <TouchableOpacity
                  style={[
                    styles.publishBtn,
                    {
                      backgroundColor: e.is_published ? Colors.success + '18' : Colors.error + '18',
                      borderColor: e.is_published ? Colors.success + '40' : Colors.error + '40',
                    },
                  ]}
                  onPress={() => togglePublish(e)}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: e.is_published ? Colors.success : Colors.error }}>
                    {e.is_published ? '공개' : '비공개'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteEvent(e.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.deleteBtn}>×</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── 등록 모달 ──────────────────────────────────── */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>이벤트 등록</Text>
                <TouchableOpacity
                  onPress={() => { setShowModal(false); resetForm(); }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.modalClose}>×</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.form}>
                <MField label="이벤트명" required value={title} onChangeText={setTitle} placeholder="New Year Party" />
                <MField label="영문명" value={titleEn} onChangeText={setTitleEn} placeholder="New Year Party" />
                <MField label="날짜 (YYYY-MM-DD)" required value={eventDate} onChangeText={setEventDate} placeholder="2026-12-31" />
                <MField label="시작 시간" value={startTime} onChangeText={setStartTime} placeholder="23:00" />
                <MField label="라인업 (쉼표 구분)" value={lineup} onChangeText={setLineup} placeholder="DJ A, DJ B, Artist C" />
                <MField label="이벤트 입장료 (원)" value={fee} onChangeText={setFee} placeholder="30000" keyboardType="numeric" />
                <View style={styles.inputGroup}>
                  <Text style={styles.mLabel}>이벤트 설명</Text>
                  <TextInput
                    style={[styles.mInput, styles.mInputMultiline]}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="이벤트 정보를 입력하세요"
                    placeholderTextColor={Colors.textMuted}
                    multiline
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.85}
              >
                <Text style={styles.saveBtnText}>{saving ? '저장 중...' : '이벤트 등록'}</Text>
              </TouchableOpacity>
              <View style={{ height: 60 }} />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function MField({ label, value, onChangeText, placeholder, keyboardType, required }: any) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.mLabel}>{label}{required && <Text style={{ color: Colors.accent }}> *</Text>}</Text>
      <TextInput
        style={styles.mInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        keyboardType={keyboardType ?? 'default'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  addBtn: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  addBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  list: { paddingHorizontal: Spacing.lg },
  empty: { alignItems: 'center', paddingVertical: 80, gap: 6 },
  emptyBig: { fontSize: 18, fontWeight: '700', color: Colors.textSecondary },
  emptyText: { ...Typography.bodySmall, color: Colors.textMuted, textAlign: 'center' },

  eventCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.xs,
    alignItems: 'center',
    gap: Spacing.md,
  },
  eventInfo: { flex: 1, gap: 3 },
  eventDate: { fontSize: 11, fontWeight: '600', color: Colors.accent, letterSpacing: 0.3 },
  eventTitle: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  eventLineup: { ...Typography.caption },
  eventActions: { alignItems: 'flex-end', gap: Spacing.sm },
  publishBtn: {
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  deleteBtn: { fontSize: 22, color: Colors.textMuted, fontWeight: '300' },

  // ── 모달
  modal: { flex: 1, backgroundColor: Colors.bg },
  modalScroll: { flex: 1, paddingHorizontal: Spacing.lg },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  modalClose: { fontSize: 28, color: Colors.textSecondary, fontWeight: '300' },

  form: { gap: Spacing.md },
  inputGroup: { gap: 6 },
  mLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  mInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    color: Colors.textPrimary,
    fontSize: 15,
  },
  mInputMultiline: { height: 88, textAlignVertical: 'top' },

  saveBtn: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.3 },
});
