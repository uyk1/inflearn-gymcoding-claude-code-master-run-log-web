// 노션 날짜는 "YYYY-MM-DD" 문자열입니다. 기간 계산도 같은 형식의 문자열로 비교합니다
export type RunPeriod = "week" | "month" | "all";

export type DateRange = {
  start: string;
  end: string;
};

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

// 기준 날짜는 한국 시간으로 잡습니다. 서버 시간대와 상관없이 같은 날짜가 나옵니다
export function getTodayInKorea(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(now);
}

function parseDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// "YYYY-MM-DD"에 일수를 더합니다. 음수도 됩니다 (days는 정수여야 합니다)
export function addDays(date: string, days: number): string {
  const base = parseDate(date);
  base.setUTCDate(base.getUTCDate() + days);
  return toDateString(base);
}

// 날짜가 속한 달의 첫날에 개월 수를 더해 그 달의 첫날을 구합니다. 음수도 됩니다 (months는 정수여야 하고, 인자가 1일이 아니어도 그 달의 1일로 맞춥니다)
export function addMonths(monthStart: string, months: number): string {
  const base = parseDate(monthStart);
  return toDateString(new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + months, 1)));
}

// 이번 주(월요일 시작)나 이번 달의 시작과 끝을 구합니다. 전체 기간이면 null을 반환합니다
export function getPeriodRange(period: "week" | "month", today: string): DateRange;
export function getPeriodRange(period: RunPeriod, today: string): DateRange | null;
export function getPeriodRange(period: RunPeriod, today: string): DateRange | null {
  if (period === "all") return null;

  const base = parseDate(today);

  if (period === "week") {
    // 일요일(0)은 6, 월요일(1)은 0으로 맞춰 월요일 시작 기준의 오프셋을 구합니다
    const offset = (base.getUTCDay() + 6) % 7;
    const start = new Date(base);
    start.setUTCDate(base.getUTCDate() - offset);
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 6);
    return { start: toDateString(start), end: toDateString(end) };
  }

  const year = base.getUTCFullYear();
  const month = base.getUTCMonth();
  const start = new Date(Date.UTC(year, month, 1));
  // 다음 달의 0일은 이번 달의 마지막 날입니다
  const end = new Date(Date.UTC(year, month + 1, 0));
  return { start: toDateString(start), end: toDateString(end) };
}

export function isInRange(date: string, range: DateRange | null): boolean {
  if (!range) return true;
  return date >= range.start && date <= range.end;
}

// 주소의 period 값을 허용된 값으로 좁힙니다. 없거나 잘못되면 전체를 보여 줍니다
export function parsePeriod(value: string | undefined): RunPeriod {
  if (value === "week" || value === "month") return value;
  return "all";
}

// "2026-10-10" → "2026.10.10 (토)"
export function formatKoreanDate(value: string): string {
  const date = parseDate(value);
  const label = WEEKDAY_LABELS[date.getUTCDay()];
  return `${value.replace(/-/g, ".")} (${label})`;
}
