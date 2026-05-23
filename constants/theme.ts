// ─── 라운지톡 디자인 시스템 ───────────────────────────────────────────────────
// 스타일: Clean Dark · Zero decoration · 단일 포인트 컬러

export const Colors = {
  // ── 배경 계층 ──────────────────────────────────────────────────────────────
  bg:              '#000000',   // 최하단 배경 (pure black)
  surface:         '#0C0C0C',   // 카드·시트 기본
  surfaceHigh:     '#141414',   // 카드 위에 올라오는 요소
  surfaceHigher:   '#1C1C1C',   // 3단계 elevated

  // ── 텍스트 ─────────────────────────────────────────────────────────────────
  textPrimary:     '#FFFFFF',
  textSecondary:   'rgba(255,255,255,0.55)',
  textMuted:       'rgba(255,255,255,0.30)',

  // ── 선 · 구분자 ─────────────────────────────────────────────────────────────
  border:          'rgba(255,255,255,0.08)',
  borderActive:    'rgba(255,255,255,0.20)',

  // ── 포인트 컬러 (단 하나) ──────────────────────────────────────────────────
  accent:          '#7B61FF',          // 보라 — 버튼·활성 상태
  accentSoft:      'rgba(123,97,255,0.12)',
  accentMid:       'rgba(123,97,255,0.25)',

  // ── 시스템 ─────────────────────────────────────────────────────────────────
  success:         '#34D399',
  error:           '#F87171',
  warning:         '#FBBF24',

  // ── 레거시 호환 (일부 컴포넌트 참조) ──────────────────────────────────────
  background:      '#000000',
  card:            '#0C0C0C',
  cardBorder:      'rgba(255,255,255,0.08)',
  white:           '#FFFFFF',
  gold:            '#7B61FF',   // 기존 gold 참조 → accent로 리매핑
  goldDim:         'rgba(123,97,255,0.25)',
  goldLight:       '#9D85FF',
  accentSoftLegacy:'rgba(123,97,255,0.12)',
  tabBar:          '#000000',
  tabBarBorder:    'rgba(255,255,255,0.06)',
  surfaceElevated: '#141414',
  overlay:         'rgba(0,0,0,0.72)',
  overlayLight:    'rgba(0,0,0,0.45)',

  // ── 카테고리 컬러 (칩 전용, 절제된 사용) ───────────────────────────────────
  categoryEDM:     '#A78BFA',
  categoryHiphop:  '#FBBF24',
  categoryLounge:  '#7B61FF',
  categoryRooftop: '#38BDF8',
  categoryJazz:    '#F472B6',
  categoryTechno:  '#34D399',
  categoryLatin:   '#FB923C',
  categoryKpop:    '#E879F9',
};

export const Spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
};

export const BorderRadius = {
  sm:   6,
  md:   12,
  lg:   18,
  xl:   24,
  full: 999,
};

export const Typography = {
  // 대형 헤드라인 (홈 화면 상단)
  display: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
    lineHeight: 38,
  },
  h1: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  h2: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
    letterSpacing: -0.2,
  },
  h3: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
  },
  h4: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
  },
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  bodySmall: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  caption: {
    fontSize: 11,
    fontWeight: '400' as const,
    color: Colors.textMuted,
    lineHeight: 15,
  },
  label: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
    letterSpacing: 0.3,
  },
  // 탭 레이블
  tabLabel: {
    fontSize: 10,
    fontWeight: '500' as const,
  },
};
