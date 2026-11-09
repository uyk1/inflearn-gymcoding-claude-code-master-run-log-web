// 로그인 실패 횟수 제한입니다. 어떤 모듈도 import하지 않는 순수 모듈이라 단위 테스트가 가능합니다.
//
// 한계(중요): 실패 기록을 서버 프로세스 메모리(Map)에 둡니다.
// - Vercel 같은 서버리스 환경에서는 인스턴스마다 메모리가 따로이고 재시작·확장 때 사라지므로,
//   공격자가 인스턴스를 바꿔 가며 시도하면 실제 허용 횟수는 이 값보다 많아질 수 있습니다.
// - 그래서 이 제한은 "단순한 무차별 대입을 늦추는 1차 방어"일 뿐이며, 비밀번호는 길고 추측하기 어렵게 써야 합니다.
// - 더 확실히 막으려면 Redis 같은 공유 저장소가 필요합니다(새 서비스가 필요해 v2 범위 밖).

// 윈도우 안에서 허용하는 실패 횟수
export const MAX_FAILURES = 5;
// 실패를 세는 시간 창이자 차단 시간(15분)
export const WINDOW_MS = 15 * 60 * 1000;
// 기억하는 키(클라이언트) 수 상한. 넘으면 가장 오래된 키부터 버려 메모리가 무한히 늘지 않게 합니다
const MAX_KEYS = 1000;

// 키별 실패 시각(epoch ms) 목록. Map은 삽입 순서를 유지합니다
const failures = new Map<string, number[]>();

// 윈도우를 벗어난 기록을 지운 현재 목록을 돌려줍니다
function recentFailures(key: string, now: number): number[] {
  const list = (failures.get(key) ?? []).filter((time) => now - time < WINDOW_MS);
  if (list.length > 0) failures.set(key, list);
  else failures.delete(key);
  return list;
}

export type RateLimitState = { blocked: false } | { blocked: true; retryAfterSeconds: number };

// 이 키가 지금 차단 상태인지 확인합니다
export function checkRateLimit(key: string, now: number = Date.now()): RateLimitState {
  const list = recentFailures(key, now);
  if (list.length < MAX_FAILURES) return { blocked: false };
  // 가장 오래된 실패가 윈도우를 벗어나면 다시 시도할 수 있습니다
  const retryAfterMs = list[0] + WINDOW_MS - now;
  return { blocked: true, retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
}

// 로그인 실패를 기록합니다
export function recordFailure(key: string, now: number = Date.now()): void {
  const list = recentFailures(key, now);
  list.push(now);
  // 갱신된 키를 맨 뒤로 보내 오래된 키가 먼저 버려지게 합니다
  failures.delete(key);
  failures.set(key, list);
  while (failures.size > MAX_KEYS) {
    const oldest = failures.keys().next().value;
    if (oldest === undefined) break;
    failures.delete(oldest);
  }
}

// 로그인에 성공하면 실패 기록을 지웁니다
export function clearFailures(key: string): void {
  failures.delete(key);
}
