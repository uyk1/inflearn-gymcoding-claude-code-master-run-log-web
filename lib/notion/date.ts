const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
// 날짜 + 시각 + (선택) 오프셋. 노션의 "시간 포함" 날짜가 이 형태로 옵니다
const DATE_TIME =
  /^(\d{4}-\d{2}-\d{2})T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?(Z|[+-]\d{2}:\d{2})?$/;

// lib/runs/date.ts의 getTodayInKorea와 같은 방식입니다. 한쪽을 고치면 다른 쪽도 함께 확인하세요
const KOREA_DATE_FORMAT = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" });

// "2026-02-30"처럼 형식은 맞지만 달력에 없는 날짜를 걸러냅니다
function isRealDate(value: string): boolean {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

// 노션 날짜의 시작 값을 한국 시간 기준 "YYYY-MM-DD"로 바꿉니다. 형식이 맞지 않으면 null을 반환합니다
// - 날짜만 있으면 그대로 씁니다
// - 시각과 오프셋(Z, +09:00 등)이 있으면 그 순간을 한국 시간의 날짜로 바꿉니다 (예: 2026-11-07T23:00:00Z → 2026-11-08)
// - 시각만 있고 오프셋이 없으면 적힌 날짜 부분을 그대로 씁니다
export function normalizeNotionDate(start: string): string | null {
  const value = start.trim();

  if (DATE_ONLY.test(value)) return isRealDate(value) ? value : null;

  const match = DATE_TIME.exec(value);
  if (!match) return null;

  // Date는 "2026-02-30T..."를 3월 2일로 넘겨 버리므로, 변환 전에 달력에 있는 날짜인지 먼저 확인합니다
  const [, datePart, offset] = match;
  if (!isRealDate(datePart)) return null;
  if (offset === undefined) return datePart;

  const instant = new Date(value);
  if (Number.isNaN(instant.getTime())) return null;
  return KOREA_DATE_FORMAT.format(instant);
}
