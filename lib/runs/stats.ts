import type { RunRecordDto } from "@/lib/notion/dto";
import { calcPaceSecondsPerKm } from "@/lib/notion/duration";
import { addDays, addMonths, getPeriodRange, type RunPeriod } from "@/lib/runs/date";

// 통계 화면의 추이 차트가 쓰는 기간 단위입니다. 주는 월요일 시작, 달은 1일 시작이며 한국 시간 기준입니다
export type StatsGranularity = Exclude<RunPeriod, "all">;

// 한 기간(한 주 또는 한 달)의 집계 결과입니다. 표시용 문자열은 만들지 않고 숫자만 돌려줍니다
export type PeriodStatsDto = {
  start: string; // 기간 첫날 "YYYY-MM-DD"
  end: string; // 기간 마지막 날 "YYYY-MM-DD"
  runCount: number; // 합산에 들어간 기록 수입니다. 노션 행 수와 다를 수 있습니다(거리 0 이하 기록은 제외)
  totalDistanceKm: number;
  totalDurationSeconds: number;
  avgPaceSecondsPerKm: number | null; // 총 시간 ÷ 총 거리. 합산 거리가 0이거나 허용 범위(paceRange)를 벗어나면 null
};

// 평균 페이스의 허용 범위(km당 초)입니다. 범위 밖이면 입력 실수로 보고 그 기간의 페이스만 표시하지 않습니다
export type PaceRange = { minSecondsPerKm: number; maxSecondsPerKm: number };

// 통계 화면이 쓰는 허용 범위입니다. 스프린트 훈련도 있을 수 있어 아래쪽을 넉넉하게 잡았습니다
// - 1:00/km보다 빠른 값은 100m 스프린트(약 1:40/km)보다도 빠른 값이라 입력 실수로 봅니다
// - 30:00/km보다 느린 값은 걷기(약 12~15분/km)보다 훨씬 느려 0.001km처럼 거리를 잘못 쓴 경우로 봅니다
export const PLAUSIBLE_PACE_RANGE: PaceRange = { minSecondsPerKm: 60, maxSecondsPerKm: 1800 };

// 한 번에 만들 수 있는 최대 기간 수입니다. 잘못된 입력으로 배열이 과하게 커지는 것을 막습니다
// (주간 120주는 약 2년 3개월, 월간 120개월은 10년)
export const MAX_PERIOD_COUNT = 120;

// 거리 합의 부동소수 오차(29.029999...)를 없애려고 소수 셋째 자리에서 반올림합니다
function roundDistance(distanceKm: number): number {
  return Math.round(distanceKm * 1000) / 1000;
}

// 오늘이 속한 기간까지 최근 periodCount개 기간(오래된 것부터)의 집계를 만듭니다
// - periodCount가 정수가 아니거나(NaN, Infinity, 소수) 1 미만이면 빈 배열을, MAX_PERIOD_COUNT보다 크면 그 값으로 줄여 돌려줍니다
// - 기록이 없는 기간도 0으로 채워서 차트에 빈 구간이 보이게 합니다
// - 평균 페이스는 기록별 페이스의 평균이 아니라 "기간 총 시간 ÷ 기간 총 거리"입니다 (거리가 긴 기록의 비중이 맞게 반영됨)
// - 거리가 0 이하이거나 유한한 숫자가 아닌 기록은 총 거리와 총 시간 양쪽에서 제외해 페이스를 왜곡하지 않게 합니다
// - paceRange를 주면 평균 페이스가 그 범위(양 끝 포함)를 벗어난 기간은 페이스만 null로 둡니다. 총 거리, 총 시간, 기록 수는 그대로입니다
// - 기록의 date는 mapper가 "YYYY-MM-DD"로 정규화한 값이어야 합니다
export function buildPeriodStats(
  records: RunRecordDto[],
  granularity: StatsGranularity,
  today: string,
  periodCount: number,
  paceRange?: PaceRange,
): PeriodStatsDto[] {
  if (!Number.isInteger(periodCount) || periodCount < 1) return [];
  const count = Math.min(periodCount, MAX_PERIOD_COUNT);

  const currentStart = getPeriodRange(granularity, today).start;

  // 오래된 기간부터 차례로 담습니다
  const buckets = [];
  for (let back = count - 1; back >= 0; back -= 1) {
    const start = granularity === "week" ? addDays(currentStart, -7 * back) : addMonths(currentStart, -back);
    buckets.push({ start, end: getPeriodRange(granularity, start).end, runCount: 0, distanceKm: 0, durationSeconds: 0 });
  }
  const bucketByStart = new Map(buckets.map((bucket) => [bucket.start, bucket]));

  for (const record of records) {
    if (!Number.isFinite(record.distanceKm) || record.distanceKm <= 0) continue;

    // 표시 범위 밖의 기록(오래된 기록과 오늘 이후 날짜의 기록)은 건너뜁니다
    const bucket = bucketByStart.get(getPeriodRange(granularity, record.date).start);
    if (!bucket) continue;

    bucket.runCount += 1;
    bucket.distanceKm += record.distanceKm;
    bucket.durationSeconds += record.durationSeconds;
  }

  return buckets.map((bucket) => {
    const pace = calcPaceSecondsPerKm(bucket.durationSeconds, bucket.distanceKm);
    const isPlausible =
      pace !== null &&
      (!paceRange || (pace >= paceRange.minSecondsPerKm && pace <= paceRange.maxSecondsPerKm));

    return {
      start: bucket.start,
      end: bucket.end,
      runCount: bucket.runCount,
      totalDistanceKm: roundDistance(bucket.distanceKm),
      totalDurationSeconds: bucket.durationSeconds,
      avgPaceSecondsPerKm: isPlausible ? pace : null,
    };
  });
}
