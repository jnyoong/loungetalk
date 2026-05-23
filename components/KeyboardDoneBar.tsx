/**
 * components/KeyboardDoneBar.tsx
 *
 * iOS: 키보드 상단에 "완료" 바를 표시 (InputAccessoryView)
 * Android: returnKeyType="done" 으로 처리 (이 컴포넌트는 null 반환)
 *
 * 사용법:
 *   1. 화면 render 최상단에 <KeyboardDoneBar /> 추가
 *   2. 각 TextInput에 inputAccessoryViewID={KEYBOARD_DONE_ID} 추가
 *   3. Android 입력필드는 returnKeyType="done" + blurOnSubmit 추가
 */
import React from 'react';
import {
  InputAccessoryView, TouchableOpacity, Text,
  View, StyleSheet, Keyboard, Platform,
} from 'react-native';
import { Colors } from '../constants/theme';

export const KEYBOARD_DONE_ID = 'loungetalk-keyboard-done';

export default function KeyboardDoneBar() {
  if (Platform.OS !== 'ios') return null;
  return (
    <InputAccessoryView nativeID={KEYBOARD_DONE_ID}>
      <View style={styles.bar}>
        <TouchableOpacity onPress={Keyboard.dismiss} activeOpacity={0.7} style={styles.btn}>
          <Text style={styles.btnText} allowFontScaling={false}>완료</Text>
        </TouchableOpacity>
      </View>
    </InputAccessoryView>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: '#1C1C1E',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.10)',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  btn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  btnText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.accent,
  },
});
