import assert from "node:assert/strict";
import test, { mock } from "node:test";

import { baseProps, prop } from "../test-pages.ts";
import { computePageVersion, computeVersion } from "./edit-version.ts";
import { pageToRunFormValues } from "./page-to-form.ts";
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

const pageOf = (over: Record<string, unknown> = {}) => ({ properties: baseProps(over) as never });

test("골든: 정상 기록의 버전은 Phase 4 구현(main)과 정확히 같다", () => {
  // 이 값이 바뀌면 열려 있던 모든 수정 화면이 한 번씩 409가 됩니다. 서명 형식을 바꿀 때는 의도한 것인지 확인하세요
  assert.equal(computePageVersion(pageOf()), "234103a44ad5958fe6ddcf490e2a670d");
  assert.equal(computeVersion(pageToRunFormValues(pageOf())), "234103a44ad5958fe6ddcf490e2a670d");
});

test("정상 값의 변형(시간 포함 날짜, 강도 없음, 태그 없음)도 computeVersion과 같다", () => {
  for (const over of [
    { 날짜: prop.date("2026-11-07T23:00:00.000Z") },
    { 강도: prop.select(null), 태그: prop.multi([]) },
    { 소요시간: prop.rich("1:05:03"), "거리(Km)": prop.num(5.25) },
  ]) {
    assert.equal(computePageVersion(pageOf(over)), computeVersion(pageToRunFormValues(pageOf(over))), JSON.stringify(over).slice(0, 60));
  }
});

test("서로 다른 형식 오류 날짜는 다른 버전이고, 없는 날짜와도 다르다", () => {
  const a = computePageVersion(pageOf({ 날짜: prop.date("2026-13-45") }));
  const b = computePageVersion(pageOf({ 날짜: prop.date("2026-99-99") }));
  const none = computePageVersion(pageOf({ 날짜: prop.date(null) }));
  assert.equal(new Set([a, b, none]).size, 3);
  assert.equal(a, computePageVersion(pageOf({ 날짜: prop.date("2026-13-45") })));
});

test("서로 다른 잘못된 거리(음수, 너무 작은 값)와 거리 없음은 다른 버전이다", () => {
  const versions = [prop.num(-3), prop.num(-5), prop.num(1e-7), prop.num(null)].map((distance) => computePageVersion(pageOf({ "거리(Km)": distance })));
  assert.equal(new Set(versions).size, 4);
});

test("폼이 모르는 강도 값끼리도 다른 버전이고, 강도 없음과도 다르다", () => {
  const versions = [prop.select("몹시 힘듦"), prop.select("LOW"), prop.select(null)].map((intensity) => computePageVersion(pageOf({ 강도: intensity })));
  assert.equal(new Set(versions).size, 3);
});

test("형식 오류 소요시간(12:5와 12:6)과 제목 없음은 원문으로 구분된다", () => {
  const a = computePageVersion(pageOf({ 소요시간: prop.rich("12:5") }));
  const b = computePageVersion(pageOf({ 소요시간: prop.rich("12:6") }));
  assert.notEqual(a, b);
  assert.notEqual(computePageVersion(pageOf({ 제목: prop.title("") })), computePageVersion(pageOf()));
});

test("출처·외부ID가 바뀌어도 버전은 같다(충돌이 아님)", () => {
  assert.equal(computePageVersion(pageOf({ 출처: prop.select("기타"), 외부ID: prop.rich("x") })), computePageVersion(pageOf()));
});
