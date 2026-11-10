import assert from "node:assert/strict";
import test, { mock } from "node:test";

import { computeVersion } from "./edit-version.ts";
import { emptyRunFormValues, type RunFormValues } from "./run-form.ts";

function values(over: Partial<RunFormValues> = {}): RunFormValues {
  return { ...emptyRunFormValues("2026-11-10"), title: "한강 아침 러닝", distance: "5", duration: "25:00", ...over };
}

test("같은 내용이면 항상 같은 버전이고, 32자 16진수다", () => {
  const a = computeVersion(values());
  assert.equal(a, computeVersion(values()));
  assert.match(a, /^[0-9a-f]{32}$/);
});

test("서버가 같은 기록으로 보는 표기 차이는 같은 버전이다", () => {
  const base = computeVersion(values({ tags: "a, b" }));
  assert.equal(computeVersion(values({ tags: " a ,b ,, ", title: "  한강 아침 러닝 " })), base);
  assert.equal(computeVersion(values({ tags: "a, b", distance: "5.0", duration: " 25:00 " })), base);
  assert.equal(computeVersion(values({ tags: "a, b, a", place: "   ", memo: "" })), base);
});

test("입력 필드 8개 중 하나라도 바뀌면 다른 버전이다", () => {
  const base = computeVersion(values());
  for (const over of [
    { title: "다른 제목" },
    { date: "2026-11-09" },
    { distance: "5.1" },
    { duration: "25:01" },
    { place: "한강" },
    { memo: "메모" },
    { intensity: "HARD" },
    { tags: "a" },
  ] as Partial<RunFormValues>[]) {
    assert.notEqual(computeVersion(values(over)), base, JSON.stringify(over));
  }
});

test("버전은 해시라서 입력 내용(메모 등)이 그대로 드러나지 않는다", () => {
  const version = computeVersion(values({ memo: "SECRET-MEMO-내용", title: "SECRET-TITLE" }));
  assert.ok(!version.includes("SECRET") && !/[가-힣]/.test(version));
});

test("버전은 시각에 의존하지 않는다(시간이 흘러도 같은 내용이면 같은 값)", () => {
  mock.timers.enable({ apis: ["Date"], now: new Date("2026-11-10T07:15:00.000Z") });
  try {
    const before = computeVersion(values({ memo: "메모" }));
    mock.timers.tick(61_000); // 분이 바뀐다
    const afterMinute = computeVersion(values({ memo: "메모" }));
    mock.timers.tick(3 * 60 * 60 * 1000); // 시간이 바뀐다
    const afterHours = computeVersion(values({ memo: "메모" }));
    assert.equal(afterMinute, before);
    assert.equal(afterHours, before);
  } finally {
    mock.timers.reset();
  }
});
