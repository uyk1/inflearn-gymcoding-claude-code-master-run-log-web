import assert from "node:assert/strict";
import test from "node:test";

import { baseProps, prop } from "../test-pages.ts";
import { detectLossyChanges, pageToRunFormValues } from "./page-to-form.ts";
import { validateRunForm } from "./run-form.ts";

const KEY = "3f2b8c1e-5d4a-4b6c-9e7f-0a1b2c3d4e5f";
const toValues = (over: Record<string, unknown> = {}) => pageToRunFormValues({ properties: baseProps(over) as never });

test("정상 페이지: 모든 칸을 입력칸 값으로 바꾼다", () => {
  assert.deepEqual(toValues(), {
    title: "한강 아침 러닝",
    date: "2026-11-05",
    distance: "5",
    duration: "25:00",
    place: "한강",
    memo: "좋음",
    intensity: "EASY",
    tags: "회복, 장거리",
  });
});

test("소요시간·장소·메모는 노션에 적힌 원문 그대로(공백 포함) 돌려준다", () => {
  const values = toValues({ 소요시간: prop.rich(" 100:00 "), 장소: prop.rich("  한강  "), 메모: prop.rich("줄1\n줄2") });
  assert.equal(values.duration, " 100:00 ");
  assert.equal(values.place, "  한강  ");
  assert.equal(values.memo, "줄1\n줄2");
});

test("날짜: 시간이 포함된 값은 한국 시간 기준 YYYY-MM-DD로, 없거나 형식이 틀리면 빈 칸", () => {
  assert.equal(toValues({ 날짜: prop.date("2026-11-07T23:00:00.000Z") }).date, "2026-11-08");
  assert.equal(toValues({ 날짜: prop.date("2026-11-08T07:00:00.000+09:00") }).date, "2026-11-08");
  assert.equal(toValues({ 날짜: prop.date(null) }).date, "");
  assert.equal(toValues({ 날짜: prop.date("2026-13-45") }).date, "");
});

test("거리: 소수와 0은 문자열로, 없으면 빈 칸", () => {
  assert.equal(toValues({ "거리(Km)": prop.num(5.25) }).distance, "5.25");
  assert.equal(toValues({ "거리(Km)": prop.num(0) }).distance, "0");
  assert.equal(toValues({ "거리(Km)": prop.num(null) }).distance, "");
});

test("강도: 폼이 아는 값만 채우고 모르는 값이나 없음은 빈 칸", () => {
  assert.equal(toValues({ 강도: prop.select("HARD") }).intensity, "HARD");
  assert.equal(toValues({ 강도: prop.select("몹시 힘듦") }).intensity, "");
  assert.equal(toValues({ 강도: prop.select(null) }).intensity, "");
});

test("태그: 쉼표와 공백으로 이어 붙이고 없으면 빈 문자열", () => {
  assert.equal(toValues({ 태그: prop.multi(["a", "b", "c"]) }).tags, "a, b, c");
  assert.equal(toValues({ 태그: prop.multi([]) }).tags, "");
});

test("제외되는 행(필수값 누락·형식 오류)도 원문을 버리지 않고 그대로 돌려준다", () => {
  const values = toValues({ 제목: prop.title(""), 날짜: prop.date(null), "거리(Km)": prop.num(null), 소요시간: prop.rich("12:5") });
  assert.deepEqual([values.title, values.date, values.distance, values.duration], ["", "", "", "12:5"]);
});

test("속성이 없거나 타입이 달라도 빈 칸으로 안전하게 바꾼다", () => {
  const empty = pageToRunFormValues({ properties: {} as never });
  assert.deepEqual(empty, { title: "", date: "", distance: "", duration: "", place: "", memo: "", intensity: "", tags: "" });
  const wrong = toValues({ 제목: prop.rich("x"), 날짜: prop.num(1), "거리(Km)": prop.rich("5"), 소요시간: prop.num(1) });
  assert.deepEqual([wrong.title, wrong.date, wrong.distance, wrong.duration], ["", "", "", ""]);
});

test("정상 기록의 입력칸 값은 그대로 폼 검증을 통과한다(고치기 전에 이미 유효)", () => {
  for (const over of [{}, { 소요시간: prop.rich("1:05:03") }, { 강도: prop.select(null), 태그: prop.multi([]), 장소: prop.rich(""), 메모: prop.rich("") }]) {
    const result = validateRunForm(toValues(over), KEY);
    assert.equal(result.success, true, JSON.stringify(over).slice(0, 80));
  }
});

test("detectLossyChanges: 정상 기록은 빈 배열, 모르는 강도와 전각 쉼표 태그는 문구를 돌려준다", () => {
  const detect = (over: Record<string, unknown> = {}) => detectLossyChanges({ properties: baseProps(over) as never });
  assert.deepEqual(detect(), []);
  assert.deepEqual(detect({ 강도: prop.select(null) }), []);
  assert.equal(detect({ 강도: prop.select("몹시 힘듦") }).length, 1);
  assert.match(detect({ 강도: prop.select("몹시 힘듦") })[0], /몹시 힘듦/);
  const tags = detect({ 태그: prop.multi(["a，b", "c", "d，e"]) });
  assert.equal(tags.length, 2);
  assert.match(tags[0], /a，b/);
  assert.deepEqual(detectLossyChanges({ properties: {} as never }), []);
});

