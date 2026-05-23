/**
 * VisitTimePickerModal.tsx
 * 업장 영업시간 범위 내 방문 시각 선택 (1시간 단위)
 * "익일 HH:00" 형태의 새벽 시간도 표시
 */
import React, { useRef, useState, useLayoutEffect, useCallback } from 'react';
import {
  Modal, View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius } from '../constants/theme';
import { getVenueVisitHours } from '../lib/nightlifeDate';

const ITEM_H  = 56;
const VISIBLE = 5;
const PAD     = ITEM_H * Math.floor(VISIBLE / 2);

// ── 스크롤 휠 ──────────────────────────────────────────────────────
function WheelColumn({
  items, initialIndex, onSettle,
}: {
  items: string[]; initialIndex: number; onSettle: (i: number) => void;
}) {
  const ref = useRef<ScrollView>(null);
  const [cur, setCur] = useState(initialIndex);

  useLayoutEffect(() => {
    const t = setTimeout(() => {
      ref.current?.scrollTo({ y: initialIndex * ITEM_H, animated: false });
    }, 80);
    return () => clearTimeout(t);
  }, [initialIndex]);

  const snapTo = useCallback((raw: number) => {
    const idx = Math.max(0, Math.min(Math.round(raw / ITEM_H), items.length - 1));
    ref.current?.scrollTo({ y: idx * ITEM_H, animated: true });
    setCur(idx);
    onSettle(idx);
  }, [items.length, onSettle]);

  return (
    <View style={styles.column}>
      <View style={styles.selectionBar} pointerEvents="none" />
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate={Platform.OS === 'android' ? 0.9 : 'fast'}
        contentContainerStyle={{ paddingVertical: PAD }}
        scrollEventThrottle={16}
        onMomentumScrollEnd={e => snapTo(e.nativeEvent.contentOffset.y)}
        onScrollEndDrag={e => snapTo(e.nativeEvent.contentOffset.y)}
      >
        {items.map((val, i) => {
          const isSelected = i === cur;
          const dist    = Math.abs(i - cur);
          const opacity = dist === 0 ? 1 : dist === 1 ? 0.45 : 0.18;
          return (
            <TouchableOpacity
              key={i}
              style={styles.item}
              activeOpacity={0.7}
              onPress={() => { ref.current?.scrollTo({ y: i * ITEM_H, animated: true }); setCur(i); onSettle(i); }}
            >
              <Text
                style={[
                  styles.itemText,
                  { opacity, fontSize: isSelected ? 24 : 19, fontWeight: isSelected ? '700' : '400' },
                  // 익일 시간은 연한 퍼플로 강조
                  val.startsWith('익일') && { color: Colors.accent },
                ]}
                allowFontScaling={false}
              >
                {val}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ── 메인 모달 ──────────────────────────────────────────────────────
interface Props {
  visible:   boolean;
  value:     string | null;          // "HH:00"
  openTime:  string | null;
  closeTime: string | null;
  onConfirm: (time: string) => void;
  onClose:   () => void;
}

export default function VisitTimePickerModal({
  visible, value, openTime, closeTime, onConfirm, onClose,
}: Props) {
  const insets  = useSafeAreaInsets();
  const hours   = getVenueVisitHours(openTime, closeTime);
  const labels  = hours.map(h => h.label);   // ["22:00", "23:00", "익일 01:00", ...]
  const values  = hours.map(h => h.value);   // ["22:00", "23:00", "01:00", ...]

  // 현재 value로 초기 인덱스 결정
  function initialIdx() {
    if (!value) return 0;
    const idx = values.findIndex(v => v === value);
    return idx >= 0 ? idx : 0;
  }

  const [selIdx, setSelIdx] = useState(initialIdx);

  React.useEffect(() => {
    if (visible) setSelIdx(initialIdx());
  }, [visible, value]);

  if (hours.length === 0) {
    return (
      <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.handle} />
          <Text style={[styles.title, { marginBottom: 24 }]} allowFontScaling={false}>
            업장 영업시간이 등록되지 않았습니다
          </Text>
          <TouchableOpacity style={styles.confirmBtn} onPress={onClose}>
            <Text style={styles.confirmBtnText} allowFontScaling={false}>닫기</Text>
          </TouchableOpacity>
          <View style={{ height: 16 }} />
        </View>
      </Modal>
    );
  }

  function handleConfirm() {
    onConfirm(values[selIdx]);
    onClose();
  }

  const selectedLabel = labels[selIdx] ?? '';

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.handle} />
        <Text style={styles.title} allowFontScaling={false}>방문 시각 선택</Text>

        {/* 익일 안내 */}
        <Text style={styles.subNote} allowFontScaling={false}>
          · 익일은 예약일 다음날 새벽 방문입니다
        </Text>

        <View style={styles.pickerRow}>
          <WheelColumn
            key={`vt-${visible}-${initialIdx()}`}
            items={labels}
            initialIndex={initialIdx()}
            onSettle={setSelIdx}
          />
        </View>

        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelBtnText} allowFontScaling={false}>취소</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
            <Text style={styles.confirmBtnText} allowFontScaling={false}>
              {selectedLabel} 선택
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    backgroundColor: '#111111',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 12, paddingHorizontal: Spacing.xl,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center', marginBottom: 18,
  },
  title: {
    fontSize: 15, fontWeight: '600', color: Colors.textPrimary,
    textAlign: 'center', marginBottom: 4,
  },
  subNote: {
    fontSize: 11, color: Colors.textMuted,
    textAlign: 'center', marginBottom: 12,
  },
  pickerRow: {
    alignItems: 'center',
    justifyContent: 'center',
    height: ITEM_H * VISIBLE,
    marginBottom: 20,
  },
  column: {
    width: 160, height: ITEM_H * VISIBLE, overflow: 'hidden',
  },
  selectionBar: {
    position: 'absolute', left: 0, right: 0,
    top: ITEM_H * Math.floor(VISIBLE / 2), height: ITEM_H,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.15)',
    zIndex: 10,
  },
  item: { height: ITEM_H, alignItems: 'center', justifyContent: 'center' },
  itemText: { color: Colors.textPrimary, letterSpacing: 1 },

  btnRow:    { flexDirection: 'row', gap: Spacing.sm },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border, alignItems: 'center',
  },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  confirmBtn: {
    flex: 2, paddingVertical: 14, borderRadius: BorderRadius.md,
    backgroundColor: Colors.accent, alignItems: 'center',
  },
  confirmBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
