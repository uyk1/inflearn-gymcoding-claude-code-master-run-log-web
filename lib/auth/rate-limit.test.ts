import test from "node:test";
import assert from "node:assert/strict";
import { checkRateLimit, recordFailure, clearFailures, MAX_FAILURES, WINDOW_MS } from "./rate-limit.ts";

test("4회 실패까지 허용, 5회째부터 차단", () => {
  const t = 1_000_000;
  for (let i = 0; i < MAX_FAILURES - 1; i++) recordFailure("a", t + i);
  assert.equal(checkRateLimit("a", t + 10).blocked, false);
  recordFailure("a", t + 10);
  const s = checkRateLimit("a", t + 20);
  assert.equal(s.blocked, true);
  if (s.blocked) assert.ok(s.retryAfterSeconds > 0 && s.retryAfterSeconds <= WINDOW_MS / 1000);
});
test("다른 키는 영향 없음", () => assert.equal(checkRateLimit("b", 1_000_000).blocked, false));
test("윈도우가 지나면 해제", () => {
  assert.equal(checkRateLimit("a", 1_000_000 + WINDOW_MS + 100).blocked, false);
});
test("성공 시 기록 삭제", () => {
  for (let i = 0; i < MAX_FAILURES; i++) recordFailure("c", 5_000_000 + i);
  assert.equal(checkRateLimit("c", 5_000_100).blocked, true);
  clearFailures("c");
  assert.equal(checkRateLimit("c", 5_000_100).blocked, false);
});
test("키 상한 초과 시 오래된 키부터 버림(메모리 상한)", () => {
  for (let i = 0; i < 1100; i++) recordFailure("k" + i, 9_000_000);
  for (let i = 0; i < MAX_FAILURES; i++) recordFailure("k0", 9_000_001); // 이미 버려진 키 재등록
  assert.equal(checkRateLimit("k0", 9_000_002).blocked, true);
});
