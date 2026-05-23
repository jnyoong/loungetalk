/**
 * lib/nightlifeDate.ts
 * ──────────────────────────────────────────────────────────────────────
 *  나이트라이프 영업일(業業日) 유틸리티
 *
 *  ┌─────────────────────────────────────────────────────────────────┐
 *  │  영업일 정의                                                     │
 *  │  하나의 영업일 = 당일 오전 08:00 ~ 익일 오전 07:59              │
 *  │                                                                  │
 *  │  예시: "5월 24일 영업일"                                         │
 *  │    5/24 08:00 ~ 5/25 07:59                                       │
 *  │                                                                  │
 *  │  따라서 5/25 01:00에 방문 예약한 손님은                          │
 *  │  달력 기준 5/25이지만 영업일 기준 5/24 방문자 ← 오늘 방문자     │
 *  └─────────────────────────────────────────────────────────────────┘
 *
 *  ⚠️  "오늘"을 판단할 때 반드시 이 파일의 함수를 사용할 것
 *      new Date().toISOString().split('T')[0] 직접 사용 금지
 */

/** 영업일 전환 기준 시각 (08:00) — 이 시각 이전은 전날 영업일 */
export const NIGHTLIFE_CUTOFF_HOUR = 8;

// ── 내부 유틸 ────────────────────────────────────────────────────────
function toDateStr(d: Date): string {
  const y  = d.getFullYear();
  const m  = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

// ── 공개 API ─────────────────────────────────────────────────────────

/**
 * 현재 시각 기준 나이트라이프 영업일(YYYY-MM-DD) 반환
 *
 * - 00:00~07:59 → 전날 날짜  (아직 어젯밤 영업 중)
 * - 08:00~23:59 → 오늘 날짜  (오늘 영업 시작)
 */
export function getNightlifeDate(now: Date = new Date()): string {
  const d = new Date(now);
  if (d.getHours() < NIGHTLIFE_CUTOFF_HOUR) {
    d.setDate(d.getDate() - 1);
  }
  return toDateStr(d);
}

/**
 * 특정 예약의 나이트라이프 영업일 반환
 *
 * @param reservationDate  Firestore에 저장된 날짜 "YYYY-MM-DD"
 * @param visitTime        방문 시각 "HH:00" (없으면 reservation_date 그대로)
 *
 * 예) reservation_date="2025-05-25", visit_time="01:00" → "2025-05-24"
 *     (새벽 1시 방문 = 5/24 영업일에 귀속)
 */
export function getReservationBusinessDate(
  reservationDate: string,
  visitTime?: string | null,
): string {
  if (!visitTime) return reservationDate;
  const hour = parseInt(visitTime.split(':')[0], 10);
  if (isNaN(hour)) return reservationDate;

  // 08시 미만 → 전날 영업일에 귀속
  if (hour < NIGHTLIFE_CUTOFF_HOUR) {
    const [y, m, d] = reservationDate.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() - 1);
    return toDateStr(dt);
  }
  return reservationDate;
}

/**
 * 업장 영업시간을 파싱하여 방문 시각 선택 목록 반환
 *
 * @returns [{ value: "22:00", label: "22:00", nextDay: false }, ...]
 *          새벽 시간(00:00~07:59)은 label에 "익일" 접두어 추가
 */
export function getVenueVisitHours(
  openTime: string | null,
  closeTime: string | null,
): Array<{ value: string; label: string; nextDay: boolean }> {
  if (!openTime) return [];

  const openHour = parseInt(openTime.split(':')[0], 10);
  if (isNaN(openHour)) return [];

  // close_time 파싱 — "다음날 06:00" / "익일 06:00" / "06:00" 모두 처리
  let closeHourAbsolute = openHour + 6; // 기본 fallback
  if (closeTime) {
    const isNextDayLabel =
      closeTime.includes('다음날') || closeTime.includes('익일');
    const timeOnly = closeTime.replace(/다음날|익일/g, '').trim();
    const parsed   = parseInt(timeOnly.split(':')[0], 10);
    if (!isNaN(parsed)) {
      // 숫자가 openHour보다 작으면 자동으로 익일로 판단
      const isNextDay = isNextDayLabel || parsed < openHour;
      closeHourAbsolute = isNextDay ? parsed + 24 : parsed;
    }
  }

  const result: Array<{ value: string; label: string; nextDay: boolean }> = [];
  for (let h = openHour; h <= closeHourAbsolute; h++) {
    const actual  = h % 24;
    const nextDay = h >= 24;
    const value   = String(actual).padStart(2, '0') + ':00';
    const label   = nextDay ? `익일 ${value}` : value;
    result.push({ value, label, nextDay });
  }
  return result;
}

/**
 * 예약 카드 표시용 날짜+시각 문자열 반환
 *
 * - 당일 방문(08:00~23:59): "5/24 22:00"
 * - 새벽 방문(00:00~07:59): "익일(5/25) 01:00"  ← 업주가 헷갈리지 않도록 명시
 * - 시각 없음: "5/24"
 */
export function formatVisitDateTime(
  reservationDate: string,
  visitTime?: string | null,
): string {
  const [y, m, d] = reservationDate.split('-').map(Number);
  const dateLabel  = `${m}/${d}`;

  if (!visitTime) return dateLabel;

  const hour    = parseInt(visitTime.split(':')[0], 10);
  const nextDay = !isNaN(hour) && hour < NIGHTLIFE_CUTOFF_HOUR;

  if (nextDay) {
    // 실제 달력 날짜는 reservation_date이므로 표시
    return `익일(${dateLabel}) ${visitTime}`;
  }
  return `${dateLabel} ${visitTime}`;
}

/**
 * 오늘/내일 레이블 반환 (영업일 기준)
 *
 * @param businessDate  영업일 "YYYY-MM-DD"
 * @returns "오늘", "내일", 또는 "5/25 (토)"
 */
export function getBusinessDayLabel(businessDate: string): string {
  const today    = getNightlifeDate();
  const tomorrowDt = new Date(today + 'T12:00:00'); // 정오 기준 내일
  tomorrowDt.setDate(tomorrowDt.getDate() + 1);
  const tomorrow = toDateStr(tomorrowDt);

  if (businessDate === today)    return '오늘';
  if (businessDate === tomorrow) return '내일';

  const [, m, d] = businessDate.split('-').map(Number);
  const dt  = new Date(businessDate + 'T12:00:00');
  const dow = ['일', '월', '화', '수', '목', '금', '토'][dt.getDay()];
  return `${m}/${d} (${dow})`;
}
