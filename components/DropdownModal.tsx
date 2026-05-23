import React from 'react';
import {
  Modal, View, Text, TouchableOpacity, FlatList,
  StyleSheet, TouchableWithoutFeedback, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius } from '../constants/theme';

export interface DropdownItem {
  value: string;
  label: string;
  sublabel?: string;
}

interface Props {
  visible: boolean;
  items: DropdownItem[];
  selectedValue: string | null;
  onSelect: (value: string) => void;
  onClose: () => void;
  title?: string;
}

export default function DropdownModal({
  visible, items, selectedValue, onSelect, onClose, title,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 24) }]}>
              {/* 핸들 */}
              <View style={styles.handle} />

              {/* 타이틀 */}
              {title && (
                <View style={styles.titleRow}>
                  <Text style={styles.title} allowFontScaling={false}>{title}</Text>
                  <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close" size={20} color={Colors.textMuted} />
                  </TouchableOpacity>
                </View>
              )}

              <FlatList
                data={items}
                keyExtractor={item => item.value}
                showsVerticalScrollIndicator={false}
                bounces={false}
                renderItem={({ item }) => {
                  const active = item.value === selectedValue;
                  return (
                    <TouchableOpacity
                      style={styles.item}
                      onPress={() => { onSelect(item.value); onClose(); }}
                      activeOpacity={0.6}
                    >
                      <View style={styles.itemContent}>
                        <Text
                          style={[styles.itemLabel, active && styles.itemLabelActive]}
                          allowFontScaling={false}
                        >
                          {item.label}
                        </Text>
                        {item.sublabel && (
                          <Text style={styles.itemSublabel} allowFontScaling={false}>
                            {item.sublabel}
                          </Text>
                        )}
                      </View>
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
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#111111',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '72%',
    paddingTop: 12,
  },
  handle: {
    width: 32,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center',
    marginBottom: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.2,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 17,
  },
  itemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  itemLabel: {
    fontSize: Platform.OS === 'android' ? 16 : 17,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: -0.2,
  },
  itemLabelActive: {
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  itemSublabel: {
    fontSize: 12,
    color: Colors.textMuted,
  },
});
