import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, StatusBar, Animated, Easing, Platform,
  LogBox,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import type { AuthStackParamList } from '../../types';

// 개발 중 불필요한 경고 억제
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'Require cycle:',
  'new NativeEventEmitter',
]);

type Nav = NativeStackNavigationProp<AuthStackParamList>;

// ── 마퀴 데이터 ────────────────────────────────────────────────────
const ROW1 = ['강남', '이태원', '홍대', '청담', '신사', '성수', '한남', '신촌', '압구정', '종로'];
const ROW2 = ['EDM', 'Hip-Hop', 'Techno', 'House', 'Jazz', 'K-Pop', 'R&B', 'Afrobeats', 'Drum&Bass'];
const ROW3 = ['예약', '오늘의 라인업', '이벤트', '즐겨찾기', '입장료', '드레스코드', '루프탑바', '재즈바', '클럽', '라운지'];

// ── 무한 스크롤 마퀴 컴포넌트 ──────────────────────────────────────
function MarqueeRow({
  items,
  speed = 45,
  dim = false,
  reverse = false,
}: {
  items: string[];
  speed?: number;
  dim?: boolean;
  reverse?: boolean;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const [singleWidth, setSingleWidth] = useState(0);

  // 아이템을 3배 복제해서 seamless loop 구현
  const tripled = [...items, ...items, ...items];

  function startAnim(w: number) {
    if (w === 0) return;
    translateX.stopAnimation();
    // reverse면 오른쪽→왼쪽 반대 방향
    const from = reverse ? -w : 0;
    const to   = reverse ? 0  : -w;
    translateX.setValue(from);
    Animated.loop(
      Animated.timing(translateX, {
        toValue: to,
        duration: w * speed,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
  }

  function onLayout(e: any) {
    const totalW = e.nativeEvent.layout.width;
    const w = totalW / 3; // 1세트 너비
    setSingleWidth(w);
    startAnim(w);
  }

  return (
    <View style={styles.marqueeClip} pointerEvents="none">
      <Animated.View
        style={[styles.marqueeInner, { transform: [{ translateX }] }]}
        onLayout={onLayout}
      >
        {tripled.map((item, i) => (
          <View
            key={i}
            style={[styles.kwChip, dim && styles.kwChipDim]}
          >
            <Text
              style={[styles.kwText, dim && styles.kwTextDim]}
              allowFontScaling={false}
            >
              {item}
            </Text>
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

// ── 메인 화면 ──────────────────────────────────────────────────────
export default function OnboardingScreen() {
  const navigation = useNavigation<Nav>();

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 700, useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0, duration: 700, useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />
      <SafeAreaView style={styles.safe}>

        {/* ── 로고 영역 ───────────────────────────────────────── */}
        <Animated.View
          style={[
            styles.logoArea,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* 로고 마크 */}
          <View style={styles.logoMark}>
            <Text style={styles.logoMarkText} allowFontScaling={false}>LT</Text>
          </View>

          {/* 한글 이름 — 로고마크 바로 아래 */}
          <Text style={styles.koreanName} allowFontScaling={false}>라운지톡</Text>

          {/* 영문 워드마크 */}
          <Text style={styles.wordmark} allowFontScaling={false}>LOUNGETALK</Text>
        </Animated.View>

        {/* ── 무한 마퀴 ───────────────────────────────────────── */}
        <Animated.View style={[styles.marqueeArea, { opacity: fadeAnim }]}>
          <MarqueeRow items={ROW1} speed={50} />
          <MarqueeRow items={ROW2} speed={65} dim reverse />
          <MarqueeRow items={ROW3} speed={45} />
        </Animated.View>

        {/* ── 버튼 영역 ───────────────────────────────────────── */}
        <View style={styles.buttons}>
          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={() => navigation.navigate('Signup', { role: 'consumer' })}
            activeOpacity={0.82}
          >
            <Text style={styles.btnPrimaryText} allowFontScaling={false}>시작하기</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnSecondary}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.7}
          >
            <Text style={styles.btnSecondaryText} allowFontScaling={false}>로그인</Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText} allowFontScaling={false}>사업주이신가요?</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.btnVenue}
            onPress={() => navigation.navigate('Signup', { role: 'venue_owner' })}
            activeOpacity={0.7}
          >
            <Text style={styles.btnVenueText} allowFontScaling={false}>업장 등록 신청</Text>
          </TouchableOpacity>
        </View>

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  safe: { flex: 1 },

  // ── 로고 ────────────────────────────────────────────────────────
  logoArea: {
    flex: 1.1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Spacing.xl,
  },
  logoMark: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  logoMarkText: {
    fontSize: 26, fontWeight: '800', color: '#FFFFFF', letterSpacing: 2,
  },
  // 로고마크 바로 아래 한글 이름
  koreanName: {
    fontSize: Platform.OS === 'android' ? 32 : 36,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  // 영문 소자 워드마크
  wordmark: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 5,
  },

  // ── 마퀴 ────────────────────────────────────────────────────────
  marqueeArea: {
    flex: 0.85,
    justifyContent: 'center',
    gap: 10,
    overflow: 'hidden',
  },
  marqueeClip: {
    overflow: 'hidden',
    width: '100%',
  },
  marqueeInner: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 4,
  },
  kwChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.borderActive,
    flexShrink: 0,
  },
  kwChipDim: {
    borderColor: Colors.border,
  },
  kwText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  kwTextDim: {
    color: Colors.textMuted,
  },

  // ── 버튼 ────────────────────────────────────────────────────────
  buttons: {
    gap: Spacing.sm,
    paddingBottom: Platform.OS === 'android' ? Spacing.xl : Spacing.lg,
    paddingHorizontal: Spacing.xl + 8,   // 좌우 여백 충분히
  },
  btnPrimary: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.md,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  btnPrimaryText: {
    fontSize: 16, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.3,
  },
  btnSecondary: {
    borderRadius: BorderRadius.md,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderActive,
  },
  btnSecondaryText: {
    fontSize: 16, fontWeight: '600', color: Colors.textSecondary,
  },

  // 구분선
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginVertical: 2,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
  },
  dividerText: { fontSize: 12, color: Colors.textMuted },

  btnVenue: { paddingVertical: Spacing.xs, alignItems: 'center' },
  btnVenueText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '500',
    textDecorationLine: 'underline',
    textDecorationColor: Colors.textMuted,
  },
});
