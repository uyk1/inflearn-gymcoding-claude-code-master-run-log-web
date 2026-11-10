import assert from "node:assert/strict";
import test from "node:test";

import { parseRunInput } from "./input.ts";
import {
  emptyRunFormValues,
  isContentChanged,
  parseDistance,
  payloadSignature,
  toRunPayload,
  validateRunForm,
  type RunFormValues,
} from "./run-form.ts";

const KEY = "3f2b8c1e-5d4a-4b6c-9e7f-0a1b2c3d4e5f";

function values(over: Partial<RunFormValues> = {}): RunFormValues {
  return { ...emptyRunFormValues("2026-11-10"), title: "한강 아침 러닝", distance: "5", duration: "25:00", ...over };
}

function errorsOf(over: Partial<RunFormValues>) {
  const result = validateRunForm(values(over), KEY);
  assert.equal(result.success, false, JSON.stringify(over).slice(0, 120));
  return result.success ? {} : result.errors;
}

const tags = (count: number) => Array.from({ length: count }, (_, i) => `t${i}`).join(", ");

// ── 경계값: 상한 정확히는 통과한다 ──────────────────────────────────────────
test("경계 통과: 제목 100자, 장소 200자, 메모 1000자, 거리 1000", () => {
  for (const over of [
    { title: "가".repeat(100) },
    { place: "가".repeat(200) },
    { memo: "가".repeat(1000) },
    { distance: "1000" },
  ] as Partial<RunFormValues>[]) {
    assert.equal(validateRunForm(values(over), KEY).success, true, Object.keys(over)[0]);
  }
});

test("경계 통과: 태그 정확히 10개, 태그 한 개 30자", () => {
  assert.equal(validateRunForm(values({ tags: tags(10) }), KEY).success, true);
  assert.equal(validateRunForm(values({ tags: "가".repeat(30) }), KEY).success, true);
});

test("경계 거부: 상한을 넘으면 그 칸 오류가 난다", () => {
  assert.ok(errorsOf({ title: "가".repeat(101) }).title);
  assert.ok(errorsOf({ place: "가".repeat(201) }).place);
  assert.ok(errorsOf({ memo: "가".repeat(1001) }).memo);
  assert.ok(errorsOf({ tags: tags(11) }).tags);
  assert.ok(errorsOf({ tags: "가".repeat(31) }).tags);
});

test("현재 동작 고정: 태그 개수 상한은 중복을 합치기 전에 적용된다(서로 다른 6개를 두 번씩 쓰면 12개로 보고 거부)", () => {
  const twice = "a,b,c,d,e,f,a,b,c,d,e,f";
  assert.ok(errorsOf({ tags: twice }).tags);
  // 중복을 합친 6개만 쓰면 통과한다
  assert.equal(validateRunForm(values({ tags: "a,b,c,d,e,f" }), KEY).success, true);
});

// ── 공백만 있는 값 ─────────────────────────────────────────────────────────
test("공백만 있는 선택 값(장소, 메모)은 빈 값으로 정리되어 통과한다", () => {
  const result = validateRunForm(values({ place: "   ", memo: "\n\t " }), KEY);
  assert.equal(result.success, true);
  assert.ok(result.success && result.data.place === "" && result.data.memo === "");
});

test("공백만 있는 필수 값(제목, 소요시간, 거리)은 거부한다", () => {
  assert.ok(errorsOf({ title: "   " }).title);
  assert.ok(errorsOf({ duration: "   " }).duration);
  assert.ok(errorsOf({ distance: "   " }).distance);
});

test("쉼표만 있는 태그는 태그 없음으로 통과한다", () => {
  for (const text of [",", "，，", " , , "]) {
    const result = validateRunForm(values({ tags: text }), KEY);
    assert.equal(result.success, true, text);
    assert.ok(result.success && result.data.tags.length === 0);
  }
});

test("전각 쉼표로 쓴 태그도 폼과 서버가 같은 결과로 받는다", () => {
  const form = validateRunForm(values({ tags: "인터벌，회복" }), KEY);
  assert.ok(form.success && JSON.stringify(form.data.tags) === JSON.stringify(["인터벌", "회복"]));
  assert.deepEqual(parseRunInput(JSON.parse(JSON.stringify(toRunPayload(values({ tags: "인터벌，회복" }), KEY)))), form);
});

// ── 매우 긴 입력 ──────────────────────────────────────────────────────────
test("매우 긴 숫자 문자열은 Infinity가 되지만 거리 오류로 거부된다", () => {
  const huge = "9".repeat(400);
  assert.equal(parseDistance(huge), Infinity);
  assert.ok(errorsOf({ distance: huge }).distance);
  assert.ok(errorsOf({ distance: "1".repeat(400) + ".5" }).distance);
});

test("매우 긴 입력이어도 오류 문구에 입력값이 담기지 않는다", () => {
  const secret = "SECRET9999".repeat(60);
  const errors = errorsOf({ title: secret, place: secret, memo: secret, tags: secret, duration: secret, date: secret, distance: secret });
  const text = JSON.stringify(errors);
  assert.ok(!text.includes("SECRET"), "입력값이 오류 문구에 들어 있음");
  assert.ok(text.length < 1500, `오류 문구가 비정상적으로 긺: ${text.length}`);
});

// ── 날짜 경계 ─────────────────────────────────────────────────────────────
test("날짜: 달력에 없는 날, 시간 포함, 앞뒤 공백, 빈 값은 거부하고 윤년과 말일은 통과한다", () => {
  for (const date of ["2026-02-29", "2027-02-29", "2026-04-31", "2026-11-10T09:00", "2026-11-10T09:00:00+09:00", " 2026-11-10", "2026-11-10 ", "２０２６-11-10", ""]) {
    assert.ok(errorsOf({ date }).date, `거부되어야 함: ${JSON.stringify(date)}`);
  }
  for (const date of ["2028-02-29", "2026-02-28", "2026-12-31", "2026-01-01"]) {
    assert.equal(validateRunForm(values({ date }), KEY).success, true, date);
  }
});

// ── 소요시간 경계 ─────────────────────────────────────────────────────────
test("소요시간: 0, 60초 이상, 분 60 이상, 음수, 전각 문자, 자릿수 오류는 거부한다", () => {
  for (const duration of ["0:00", "00:00", "0:00:00", "59:60", "1:60:00", "1:00:60", "-5:00", "-0:30", "25：30", "２５:３０", "12:5", "1:5:03", "1:2:3:4", "25", ":30", "25:", "abc"]) {
    assert.ok(errorsOf({ duration }).duration, `거부되어야 함: ${JSON.stringify(duration)}`);
  }
  for (const duration of ["0:01", "59:59", "1:00:00", "100:00", "0:30", "5:03"]) {
    assert.equal(validateRunForm(values({ duration }), KEY).success, true, duration);
  }
});

// ── 폼과 서버가 같은 오류를 낸다(왕복) ────────────────────────────────────────
// 폼은 거리 NaN을 그대로 검증하지만 서버는 JSON을 거쳐 null을 받으므로, 두 경로의 결과가 같은지 확인한다
const FORM_TO_API: Record<string, string> = { distance: "distanceKm" };
const failingCases: Partial<RunFormValues>[] = [
  { title: "" },
  { title: "   " },
  { date: "2026-13-45" },
  { date: "" },
  { distance: "abc" },
  { distance: "5,2" },
  { distance: "" },
  { distance: "0" },
  { distance: "1000.01" },
  { distance: "9".repeat(400) },
  { duration: "12:5" },
  { duration: "" },
  { duration: "59:60" },
  { place: "가".repeat(201) },
  { memo: "가".repeat(1001) },
  { tags: tags(11) },
  { tags: "가".repeat(31) },
  { title: "", distance: "abc", duration: "12:5", date: "2026-02-30" },
];
for (const [index, over] of failingCases.entries()) {
  test(`왕복: 폼에서 거부된 값은 서버 스키마도 같은 칸에서 같은 문구로 거부한다 (#${index + 1})`, () => {
    const form = validateRunForm(values(over), KEY);
    assert.equal(form.success, false);
    const server = parseRunInput(JSON.parse(JSON.stringify(toRunPayload(values(over), KEY))));
    assert.equal(server.success, false);
    if (form.success || server.success) return;

    // 서버 오류의 키를 폼 칸 이름으로 바꿔 비교한다
    const serverByFormField = Object.fromEntries(
      Object.entries(server.fieldErrors).map(([key, message]) => [Object.entries(FORM_TO_API).find(([, api]) => api === key)?.[0] ?? key, message]),
    );
    assert.deepEqual(serverByFormField, form.errors);
  });
}

// ── 내용 서명(같은 clientKey 재시도에서 내용이 달라졌는지) ────────────────────────
test("payloadSignature: 서버가 같은 기록으로 보는 입력은 같은 서명이다", () => {
  const base = payloadSignature(values({ tags: "a, b" }));
  assert.equal(payloadSignature(values({ tags: "a, b", title: "  한강 아침 러닝  " })), base);
  assert.equal(payloadSignature(values({ tags: " a ,b ,, " })), base); // 공백·빈 항목
  assert.equal(payloadSignature(values({ tags: "a, b, a" })), base); // 중복
  assert.equal(payloadSignature(values({ tags: "a，b" })), base); // 전각 쉼표
  assert.equal(payloadSignature(values({ tags: "a, b", distance: "5.0" })), base); // 숫자 표기
  assert.equal(payloadSignature(values({ tags: "a, b", duration: " 25:00 ", memo: "  ", place: "" })), base);
});

test("payloadSignature: 내용이 바뀌면 다른 서명이다", () => {
  const base = payloadSignature(values());
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
    assert.notEqual(payloadSignature(values(over)), base, JSON.stringify(over));
  }
  assert.notEqual(payloadSignature(values({ tags: "a, b" })), payloadSignature(values({ tags: "b, a" }))); // 태그 순서
});

test("isContentChanged: 이전 시도 중 다른 내용이 하나라도 있으면 true, 같거나 이전 시도가 없으면 false", () => {
  const a = payloadSignature(values());
  const b = payloadSignature(values({ title: "고친 제목" }));
  assert.equal(isContentChanged(a, [a]), false);
  assert.equal(isContentChanged(a, [a, a]), false);
  assert.equal(isContentChanged(a, [b]), true);
  assert.equal(isContentChanged(a, [a, b]), true);
  assert.equal(isContentChanged(a, []), false);
});
