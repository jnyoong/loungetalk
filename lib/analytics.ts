/**
 * lib/analytics.ts
 * 라운지톡 앱 행동 데이터 수집 라이브러리
 *
 * ── 수집 이유 ────────────────────────────────────────────────────────────────
 *  1. 인기 업장·지역·카테고리 파악 → 프리미엄 노출 상품 근거
 *  2. 예약 전환율 → 수수료 협상 및 업주 설득 데이터
 *  3. 검색어 로그 → 아직 등록 안 된 업장 수요 발견
 *  4. 피크 시간대 → 이벤트 광고 최적 타이밍
 *  5. 일간/월간 활성 사용자(DAU/MAU) → 투자·영업 자료
 *  6. 인스타 링크 클릭 → 인스타 연동 광고 상품 가치 증명
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Firestore 컬렉션:
 *   analytics_events/{auto}  — 원시 이벤트 로그
 *   venues/{id}.view_count   — 실시간 조회수 카운터
 *   venues/{id}.reservation_count — 예약 완료 카운터
 *   venues/{id}.favorite_count    — 즐겨찾기 카운터
 */

import {
  addDoc, collection, doc, increment,
  serverTimestamp, updateDoc,
} from 'firebase/firestore';
import { Platform } from 'react-native';
import { db } from './firebase';

// ── 이벤트 타입 정의 ──────────────────────────────────────────────────────
export type AnalyticsEventType =
  | 'venue_view'           // 업장 상세 진입
  | 'search'               // 검색어 입력 + 결과
  | 'filter_region'        // 지역 필터 변경
  | 'filter_category'      // 카테고리 필터 변경
  | 'reservation_start'    // 예약 화면 진입
  | 'reservation_complete' // 예약 완료
  | 'favorite_add'         // 즐겨찾기 추가
  | 'favorite_remove'      // 즐겨찾기 제거
  | 'instagram_click'      // 인스타 링크 클릭
  | 'phone_click'          // 전화 버튼 클릭
  | 'event_view'           // 이벤트 상세 진입
  | 'app_open';            // 앱 실행 (DAU 측정)

interface EventMeta {
  venue_id?:    string;
  user_id?:     string;
  region?:      string;
  categories?:  string[];
  query?:       string;
  result_count?: number;
  event_id?:    string;
  hour?:        number;   // 0~23 (시간대 분석)
  [key: string]: any;
}

// ── 내부 헬퍼 ────────────────────────────────────────────────────────────
function now(): number { return new Date().getHours(); }

/** 원시 이벤트 Firestore에 저장 (fire-and-forget — 실패해도 앱 영향 없음) */
function log(type: AnalyticsEventType, meta: EventMeta = {}): void {
  addDoc(collection(db, 'analytics_events'), {
    type,
    platform: Platform.OS,
    hour: now(),
    ...meta,
    created_at: serverTimestamp(),
  }).catch(() => {});
}

// ── 공개 API ──────────────────────────────────────────────────────────────

/**
 * 업장 상세 조회
 * venues/{id}.view_count 도 증가 → 리더보드용
 */
export function trackVenueView(
  venueId: string,
  opts: { region?: string; categories?: string[]; userId?: string } = {}
): void {
  log('venue_view', {
    venue_id:   venueId,
    user_id:    opts.userId,
    region:     opts.region,
    categories: opts.categories,
  });
  // 업장 문서 카운터 증가
  updateDoc(doc(db, 'venues', venueId), {
    view_count: increment(1),
  }).catch(() => {});
}

/**
 * 검색어 입력 (300ms debounce 후 호출 권장)
 */
export function trackSearch(
  query: string,
  resultCount: number,
  userId?: string
): void {
  if (!query.trim() || query.trim().length < 2) return;
  log('search', { query: query.trim(), result_count: resultCount, user_id: userId });
}

/** 지역 필터 변경 */
export function trackFilterRegion(region: string | null): void {
  if (!region) return;
  log('filter_region', { region });
}

/** 카테고리 필터 변경 */
export function trackFilterCategory(category: string | null): void {
  if (!category) return;
  log('filter_category', { categories: [category] });
}

/**
 * 예약 시작/완료
 * 완료 시 venues/{id}.reservation_count 증가
 */
export function trackReservation(
  phase: 'start' | 'complete',
  venueId: string,
  userId?: string
): void {
  log(phase === 'start' ? 'reservation_start' : 'reservation_complete', {
    venue_id: venueId,
    user_id:  userId,
  });
  if (phase === 'complete') {
    updateDoc(doc(db, 'venues', venueId), {
      reservation_count: increment(1),
    }).catch(() => {});
  }
}

/**
 * 즐겨찾기 토글
 * venues/{id}.favorite_count 증가/감소
 */
export function trackFavorite(
  venueId: string,
  added: boolean,
  userId?: string
): void {
  log(added ? 'favorite_add' : 'favorite_remove', {
    venue_id: venueId,
    user_id:  userId,
  });
  updateDoc(doc(db, 'venues', venueId), {
    favorite_count: increment(added ? 1 : -1),
  }).catch(() => {});
}

/** 인스타그램 링크 클릭 */
export function trackInstagramClick(venueId: string): void {
  log('instagram_click', { venue_id: venueId });
}

/** 전화 버튼 클릭 */
export function trackPhoneClick(venueId: string): void {
  log('phone_click', { venue_id: venueId });
}

/** 이벤트 상세 조회 */
export function trackEventView(eventId: string, venueId: string): void {
  log('event_view', { event_id: eventId, venue_id: venueId });
}

/** 앱 오픈 (AuthContext 로그인 직후 1회 호출) */
export function trackAppOpen(userId?: string): void {
  log('app_open', { user_id: userId });
}
