import assert from "node:assert/strict";
import test from "node:test";

import { parseRunInput } from "./input.ts";

const KEY = "3f2b8c1e-5d4a-4b6c-9e7f-0a1b2c3d4e5f";

function valid(over: Record<string, unknown> = {}) {
  return { title: "한강 아침 러닝", date: "2026-11-05", distanceKm: 5, duration: "25:00", clientKey: KEY, ...over };
}

function errors(over: Record<string, unknown>) {
  const result = parseRunInput(valid(over));
  assert.equal(result.success, false);
  return result.success ? {} : result.fieldErrors;
}

test("필수 값만 있어도 통과하고 기본값이 채워진다", () => {
  const result = parseRunInput(valid());
  assert.equal(result.success, true);
  if (!result.success) return;
  assert.deepEqual(result.data, {
    title: "한강 아침 러닝",
    date: "2026-11-05",
    distanceKm: 5,
    duration: "25:00",
    place: "",
    memo: "",
    intensity: null,
    tags: [],
    clientKey: KEY,
  });
});

test("앞뒤 공백을 지우고, 중복 태그는 하나로 합친다", () => {
  const result = parseRunInput(valid({ title: "  러닝  ", duration: " 25:00 ", place: " 한강 ", tags: [" 회복 ", "회복", "장거리"], intensity: "HARD" }));
  assert.equal(result.success, true);
  if (!result.success) return;
  assert.equal(result.data.title, "러닝");
  assert.equal(result.data.duration, "25:00");
  assert.equal(result.data.place, "한강");
  assert.deepEqual(result.data.tags, ["회복", "장거리"]);
  assert.equal(result.data.intensity, "HARD");
});

test("강도는 없거나 null이어도 된다", () => {
  for (const intensity of [undefined, null]) {
    const result = parseRunInput(valid({ intensity }));
    assert.equal(result.success && result.data.intensity, null);
  }
});

test("제목: 비어 있거나 공백뿐이거나 너무 길면 거부", () => {
  assert.ok(errors({ title: "" }).title);
  assert.ok(errors({ title: "   " }).title);
  assert.ok(errors({ title: "가".repeat(101) }).title);
  assert.equal(parseRunInput(valid({ title: "가".repeat(100) })).success, true);
  assert.ok(errors({ title: 123 }).title);
});

test("날짜: 달력에 없는 날짜, 형식 오류, 시간 포함 형식은 거부", () => {
  for (const date of ["2026-13-45", "2026-02-30", "2026-11-5", "26-11-05", "2026/11/05", "", "2026-11-05T07:00:00+09:00", "2026-11-05 ", " 2026-11-05"]) {
    assert.ok(errors({ date }).date, `거부되어야 함: ${JSON.stringify(date)}`);
  }
  for (const date of ["2026-02-28", "2028-02-29", "2026-12-31"]) {
    assert.equal(parseRunInput(valid({ date })).success, true, date);
  }
  assert.ok(errors({ date: undefined }).date);
});

test("거리: 0 이하, 숫자가 아닌 값, 너무 큰 값은 거부", () => {
  for (const distanceKm of [0, -1, NaN, Infinity, "5", null, 1000.01]) {
    assert.ok(errors({ distanceKm }).distanceKm, `거부되어야 함: ${String(distanceKm)}`);
  }
  for (const distanceKm of [0.01, 5.25, 1000]) {
    assert.equal(parseRunInput(valid({ distanceKm })).success, true, String(distanceKm));
  }
});

test("소요시간: 12:5 같은 한 자리 초와 잘못된 형식은 거부", () => {
  for (const duration of ["12:5", "1:5:03", "45:7", "75:99", "0:00", "", "abc", "1:2:3:4", "12", "12:60"]) {
    assert.ok(errors({ duration }).duration, `거부되어야 함: ${JSON.stringify(duration)}`);
  }
  for (const duration of ["5:03", "45:23", "1:05:03", "100:00", "0:30"]) {
    assert.equal(parseRunInput(valid({ duration })).success, true, duration);
  }
});

test("장소와 메모는 길이를 제한한다", () => {
  assert.ok(errors({ place: "가".repeat(201) }).place);
  assert.ok(errors({ memo: "가".repeat(1001) }).memo);
  assert.equal(parseRunInput(valid({ place: "가".repeat(200), memo: "가".repeat(1000) })).success, true);
});

test("강도는 EASY, NORMAL, HARD만 허용한다", () => {
  assert.ok(errors({ intensity: "easy" }).intensity);
  assert.ok(errors({ intensity: "VERY_HARD" }).intensity);
});

test("태그: 쉼표, 빈 태그, 너무 긴 태그, 11개 이상은 거부", () => {
  assert.ok(errors({ tags: ["a,b"] }).tags);
  assert.ok(errors({ tags: ["  "] }).tags);
  assert.ok(errors({ tags: ["가".repeat(31)] }).tags);
  assert.ok(errors({ tags: Array.from({ length: 11 }, (_, i) => `t${i}`) }).tags);
  assert.ok(errors({ tags: "회복" }).tags);
  assert.equal(parseRunInput(valid({ tags: Array.from({ length: 10 }, (_, i) => `t${i}`) })).success, true);
});

test("clientKey는 UUID여야 한다", () => {
  assert.ok(errors({ clientKey: "abc" }).clientKey);
  assert.ok(errors({ clientKey: undefined }).clientKey);
  assert.ok(errors({ clientKey: "web-" + KEY }).clientKey);
});

test("스키마에 없는 항목(출처, 외부ID 등)은 거부한다", () => {
  const result = parseRunInput(valid({ source: "NRC", externalId: "x" }));
  assert.equal(result.success, false);
  assert.ok(!result.success && result.fieldErrors._form);
});

test("객체가 아닌 입력은 거부한다", () => {
  for (const raw of [null, undefined, "x", 1, []]) {
    assert.equal(parseRunInput(raw).success, false);
  }
});

test("오류 문구에는 입력값이 담기지 않는다", () => {
  const secret = "SECRET-입력값-9999";
  const result = parseRunInput(valid({ title: "", duration: secret, date: secret, distanceKm: secret, tags: [secret + ","], intensity: secret, place: "가".repeat(300), clientKey: secret }));
  assert.equal(result.success, false);
  assert.ok(!result.success && !JSON.stringify(result.fieldErrors).includes("SECRET"));
  assert.ok(!result.success && !JSON.stringify(result.fieldErrors).includes("9999"));
});
