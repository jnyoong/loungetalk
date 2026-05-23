/**
 * TimePickerModal.tsx
 * iOS 알람 시간 설정처럼 스크롤 휠로 시간 선택
 * 시(00~23) + 분(00, 05, 10 ... 55) 두 컬럼
 */
import React, { useRef, useState, useLayoutEffect, useCallback } from 'react';
import {
  Modal, View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius } from '../constants/theme';

const ITEM_H   = 52;          // 아이템 하나의 높이
const VISIBLE  = 5;           // 화면에 보이는 아이템 수 (홀수여야 중앙 강조 가능)
const PAD      = ITEM_H * Math.floor(VISIBLE / 2); // 상하 패딩

const HOURS   = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

// ── 단일 스크롤 휠 컬럼 ──────────────────────────────────────────────────────
interface WheelProps {
  items:        string[];
  initialIndex: number;
  onSettle:     (index: number) => void;
}

function WheelColumn({ items, initialIndex, onSettle }: WheelProps) {
  const ref  = useRef<ScrollView>(null);
  const [cur, setCur] = useState(initialIndex);
  const settling = useRef(false);

  // 마운트 시 선택된 항목으로 스크롤
  useLayoutEffect(() => {
    const t = setTimeout(() => {
      ref.current?.scrollTo({ y: initialIndex * ITEM_H, animated: false });
    }, 80);
    return () => clearTimeout(t);
  }, [initialIndex]);

  const snapTo = useCallback((raw: number) => {
    const idx = Math.max(0, Math.min(Math.round(raw / ITEM_H), items.length - 1));
    if (!settling.current) {
      settling.current = true;
      ref.current?.scrollTo({ y: idx * ITEM_H, animated: true });
      setTimeout(() => { settling.current = false; }, 300);
    }
    setCur(idx);
    onSettle(idx);
    return idx;
  }, [items.length, onSettle]);

  return (
    <View style={styles.column}>
      {/* 중앙 선택 영역 표시 줄 */}
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
          const dist = Math.abs(i - cur);
          const opacity = dist === 0 ? 1 : dist === 1 ? 0.45 : 0.18;
          const fontSize = isSelected ? 28 : 22;
          return (
            <TouchableOpacity
              key={val}
              style={styles.item}
              activeOpacity={0.7}
              onPress={() => {
                ref.current?.scrollTo({ y: i * ITEM_H, animated: true });
                setCur(i);
                onSettle(i);
              }}
            >
              <Text
                style={[styles.itemText, { opacity, fontSize, fontWeight: isSelected ? '700' : '400' }]}
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

// ── 메인 모달 ────────────────────────────────────────────────────────────────
interface Props {
  visible:   boolean;
  title?:    string;
  /** "HH:MM" 형식. null이면 기본값 사용 */
  value:     string | null;
  onConfirm: (time: string) => void;
  onClose:   () => void;
}

export default function TimePickerModal({ visible, title, value, onConfirm, onClose }: Props) {
  const insets = useSafeAreaInsets();

  // value "HH:MM" 파싱
  const parseTime = (v: string | null) => {
    if (!v) return { h: 22, m: 0 };
    const [hh, mm] = v.split(':').map(Number);
    const hIdx = isNaN(hh) ? 22 : Math.max(0, Math.min(hh, 23));
    const mIdx = isNaN(mm) ? 0  : Math.max(0, Math.min(Math.round(mm / 5), 11));
    return { h: hIdx, m: mIdx };
  };

  const init = parseTime(value);
  const [hourIdx,   setHourIdx]   = useState(init.h);
  const [minuteIdx, setMinuteIdx] = useState(init.m);

  // visible이 열릴 때마다 value 동기화
  React.useEffect(() => {
    if (visible) {
      const p = parseTime(value);
      setHourIdx(p.h);
      setMinuteIdx(p.m);
    }
  }, [visible, value]);

  function handleConfirm() {
    const hh = HOURS[hourIdx];
    const mm = MINUTES[minuteIdx];
    onConfirm(`${hh}:${mm}`);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        {/* 드래그 핸들 */}
        <View style={styles.handle} />

        {/* 타이틀 */}
        {title ? (
          <Text style={styles.title} allowFontScaling={false}>{title}</Text>
        ) : null}

        {/* 휠 영역 */}
        <View style={styles.pickerRow}>
          <WheelColumn
            key={`h-${visible}-${init.h}`}
            items={HOURS}
            initialIndex={init.h}
            onSettle={setHourIdx}
          />
          <Text style={styles.colon} allowFontScaling={false}>:</Text>
          <WheelColumn
            key={`m-${visible}-${init.m}`}
            items={MINUTES}
            initialIndex={init.m}
            onSettle={setMinuteIdx}
          />
        </View>

        {/* 버튼 */}
        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelBtnText} allowFontScaling={false}>취소</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
            <Text style={styles.confirmBtnText} allowFontScaling={false}>
              {HOURS[hourIdx]}:{MINUTES[minuteIdx]} 선택
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── 스타일 ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    backgroundColor: '#111111',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingHorizontal: Spacing.xl,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 16,
  },

  // ── 휠 영역
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: ITEM_H * VISIBLE,
    marginBottom: 20,
  },
  column: {
    width: 90,
    height: ITEM_H * VISIBLE,
    overflow: 'hidden',
  },
  selectionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: ITEM_H * Math.floor(VISIBLE / 2),
    height: ITEM_H,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.15)',
    zIndex: 10,
  },
  item: {
    height: ITEM_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    color: Colors.textPrimary,
    letterSpacing: 1,
  },
  colon: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginHorizontal: 8,
    marginBottom: 4,
  },

  // ── 버튼
  btnRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  confirmBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.accent,
    alignItems: 'center',
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
