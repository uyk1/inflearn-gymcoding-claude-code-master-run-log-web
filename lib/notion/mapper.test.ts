import assert from "node:assert/strict";
import test, { mock } from "node:test";

import { excludedReasonsOf, toRunMapResult } from "./mapper.ts";
import { baseProps, fakePage, prop } from "./test-pages.ts";

// 제외 로그(console.warn)가 테스트 출력을 어지럽히지 않게 막습니다
test.before(() => {
  mock.method(console, "warn", () => {});
});

function map(over: Record<string, unknown> = {}) {
  return toRunMapResult(fakePage("page-1", baseProps(over)));
}

function excluded(over: Record<string, unknown>) {
  const result = map(over);
  assert.equal(result.kind, "excluded");
  return result.kind === "excluded" ? result.excluded : (undefined as never);
}

function record(over: Record<string, unknown> = {}) {
  const result = map(over);
  assert.equal(result.kind, "record");
  return result.kind === "record" ? result.record : (undefined as never);
}

test("정상 기록: 모든 필드를 변환한다", () => {
  assert.deepEqual(record(), {
    id: "page-1",
    title: "한강 아침 러닝",
    date: "2026-11-05",
    distanceKm: 5,
    durationText: "25:00",
    durationSeconds: 1500,
    paceSecondsPerKm: 300,
    place: "한강",
    intensity: "EASY",
    memo: "좋음",
    tags: ["회복", "장거리"],
    source: "수동",
    externalId: "web-1",
    notionUrl: "https://notion.so/page-1",
  });
});

test("선택 필드가 비어도 정상 기록이다", () => {
  const r = record({ 장소: prop.rich(""), 강도: prop.select(null), 메모: prop.rich(""), 태그: prop.multi([]), 출처: prop.select(null), 외부ID: prop.rich("") });
  assert.deepEqual([r.place, r.intensity, r.memo, r.tags, r.source, r.externalId], ["", null, "", [], null, ""]);
});

test("시간이 포함된 날짜는 한국 시간 기준 날짜로 바뀐다", () => {
  assert.equal(record({ 날짜: prop.date("2026-11-07T23:00:00.000Z") }).date, "2026-11-08");
  assert.equal(record({ 날짜: prop.date("2026-11-08T07:00:00.000+09:00") }).date, "2026-11-08");
});

test("h:mm:ss 소요시간과 페이스 반올림", () => {
  const r = record({ 소요시간: prop.rich("1:05:03") });
  assert.equal(r.durationSeconds, 3903);
  assert.equal(r.paceSecondsPerKm, 781); // 3903 / 5 = 780.6
});

test("거리가 0이면 정상 기록이고 페이스는 null이다", () => {
  assert.equal(record({ "거리(Km)": prop.num(0) }).paceSecondsPerKm, null);
});

test("제외 사유: 제목 없음", () => {
  const e = excluded({ 제목: prop.title("") });
  assert.deepEqual(e.reasons, ["제목 없음"]);
  assert.equal(e.title, null);
});

test("제외 사유: 날짜 없음과 날짜 형식 오류를 구분한다", () => {
  assert.deepEqual(excluded({ 날짜: prop.date(null) }).reasons, ["날짜 없음"]);
  assert.deepEqual(excluded({ 날짜: prop.date("2026-13-45") }).reasons, ["날짜 형식 오류"]);
});

test("제외 사유: 거리 없음", () => {
  assert.deepEqual(excluded({ "거리(Km)": prop.num(null) }).reasons, ["거리 없음"]);
});

test("제외 사유: 소요시간 없음과 형식 오류(12:5)를 구분한다", () => {
  assert.deepEqual(excluded({ 소요시간: prop.rich("") }).reasons, ["소요시간 없음"]);
  assert.deepEqual(excluded({ 소요시간: prop.rich("12:5") }).reasons, ["소요시간 형식 오류"]);
});

test("제외 사유가 여러 개면 모두 담고, 제목은 있으면 보여 주고 입력값은 담지 않는다", () => {
  const e = excluded({ 제목: prop.title(""), 날짜: prop.date(null), "거리(Km)": prop.num(null), 소요시간: prop.rich("75:99") });
  assert.deepEqual(e.reasons, ["제목 없음", "날짜 없음", "거리 없음", "소요시간 형식 오류"]);
  assert.deepEqual(Object.keys(e).sort(), ["notionUrl", "pageId", "reasons", "title"]);

  const withTitle = excluded({ 날짜: prop.date(null) });
  assert.equal(withTitle.title, "한강 아침 러닝");
});

test("속성 타입이 틀리거나 속성이 없으면 제외된다", () => {
  const wrongTypes = excluded({ 제목: prop.rich("x"), 날짜: prop.num(1), "거리(Km)": prop.rich("5"), 소요시간: prop.num(1) });
  assert.deepEqual(wrongTypes.reasons, ["제목 없음", "날짜 없음", "거리 없음", "소요시간 없음"]);

  const missing = toRunMapResult(fakePage("page-2", {}));
  assert.equal(missing.kind, "excluded");
});

test("excludedReasonsOf: 사유 6종을 계산하고 정상이면 빈 배열이며, 매퍼의 제외 사유와 같다", () => {
  const reasons = (over: Record<string, unknown> = {}) => excludedReasonsOf(baseProps(over) as never);
  assert.deepEqual(reasons(), []);
  assert.deepEqual(reasons({ 제목: prop.title("") }), ["제목 없음"]);
  assert.deepEqual(reasons({ 날짜: prop.date(null) }), ["날짜 없음"]);
  assert.deepEqual(reasons({ 날짜: prop.date("2026-13-45") }), ["날짜 형식 오류"]);
  assert.deepEqual(reasons({ "거리(Km)": prop.num(null) }), ["거리 없음"]);
  assert.deepEqual(reasons({ 소요시간: prop.rich("") }), ["소요시간 없음"]);
  assert.deepEqual(reasons({ 소요시간: prop.rich("12:5") }), ["소요시간 형식 오류"]);
  const many = { 제목: prop.title(""), 날짜: prop.date(null), "거리(Km)": prop.num(null), 소요시간: prop.rich("12:5") };
  assert.deepEqual(reasons(many), ["제목 없음", "날짜 없음", "거리 없음", "소요시간 형식 오류"]);
  assert.deepEqual(excluded(many).reasons, reasons(many));
});
