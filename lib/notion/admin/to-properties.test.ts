import assert from "node:assert/strict";
import test, { mock } from "node:test";

import { formatDuration, parseDurationToSeconds } from "../duration.ts";
import { toRunMapResult } from "../mapper.ts";
import { fakePage } from "../test-pages.ts";
import { parseRunInput, type RunInputDto } from "./input.ts";
import { toExternalId, toNotionProperties, WEB_RUN_SOURCE } from "./to-properties.ts";

test.before(() => {
  mock.method(console, "warn", () => {});
});

const KEY = "3F2B8C1E-5D4A-4B6C-9E7F-0A1B2C3D4E5F";

function input(over: Record<string, unknown> = {}): RunInputDto {
  const result = parseRunInput({ title: "한강 아침 러닝", date: "2026-11-05", distanceKm: 5, duration: "25:00", clientKey: KEY, ...over });
  assert.equal(result.success, true, JSON.stringify(over));
  return (result as { data: RunInputDto }).data;
}

// 노션에 쓰는 형태를 노션이 읽어서 돌려주는 형태로 바꿉니다(실제 노션 호출 없이 왕복을 시험하기 위한 어댑터)
type Obj = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
function asReadFormat(properties: Obj): Obj {
  const out: Obj = {};
  for (const [name, value] of Object.entries(properties)) {
    if ("title" in value) out[name] = { type: "title", title: value.title.map((t: Obj) => ({ plain_text: t.text.content })) };
    else if ("rich_text" in value) out[name] = { type: "rich_text", rich_text: value.rich_text.map((t: Obj) => ({ plain_text: t.text.content })) };
    else if ("number" in value) out[name] = { type: "number", number: value.number };
    else if ("date" in value) out[name] = { type: "date", date: value.date };
    else if ("select" in value) out[name] = { type: "select", select: value.select };
    else if ("multi_select" in value) out[name] = { type: "multi_select", multi_select: value.multi_select };
    else assert.fail(`알 수 없는 속성 형태: ${name}`);
  }
  return out;
}

test("노션 속성 객체의 형태", () => {
  const properties = toNotionProperties(input({ place: "한강", memo: "좋음", intensity: "EASY", tags: ["회복"] }));
  assert.deepEqual(properties, {
    제목: { title: [{ text: { content: "한강 아침 러닝" } }] },
    날짜: { date: { start: "2026-11-05" } },
    "거리(Km)": { number: 5 },
    소요시간: { rich_text: [{ text: { content: "25:00" } }] },
    장소: { rich_text: [{ text: { content: "한강" } }] },
    강도: { select: { name: "EASY" } },
    메모: { rich_text: [{ text: { content: "좋음" } }] },
    태그: { multi_select: [{ name: "회복" }] },
    출처: { select: { name: "수동" } },
    외부ID: { rich_text: [{ text: { content: "web-3f2b8c1e-5d4a-4b6c-9e7f-0a1b2c3d4e5f" } }] },
  });
});

test("비어 있는 선택 값은 노션에서 비우는 형태로 보낸다", () => {
  const properties = toNotionProperties(input());
  assert.deepEqual(properties.장소, { rich_text: [] });
  assert.deepEqual(properties.메모, { rich_text: [] });
  assert.deepEqual(properties.강도, { select: null });
  assert.deepEqual(properties.태그, { multi_select: [] });
});

test("출처는 항상 수동이고 외부ID는 web- 접두사와 소문자 UUID다", () => {
  assert.equal(WEB_RUN_SOURCE, "수동");
  assert.equal(toExternalId(KEY), "web-3f2b8c1e-5d4a-4b6c-9e7f-0a1b2c3d4e5f");
  // 입력에 출처를 넣어도 스키마가 거부하므로 바꿀 수 없다
  assert.equal(parseRunInput({ title: "t", date: "2026-11-05", distanceKm: 1, duration: "5:00", clientKey: KEY, source: "NRC" }).success, false);
});

// 핵심: 스키마를 통과한 입력은 노션에 쓴 뒤 다시 읽어도 목록에서 제외되지 않고 같은 값이 된다
const validCases: Record<string, unknown>[] = [
  {},
  { place: "한강", memo: "좋음", intensity: "HARD", tags: ["회복", "장거리"] },
  { duration: "5:03" },
  { duration: "45:23" },
  { duration: "1:05:03" },
  { duration: "100:00" },
  { duration: "0:30" },
  { date: "2026-02-28" },
  { date: "2028-02-29" },
  { date: "2026-12-31" },
  { distanceKm: 0.01 },
  { distanceKm: 1000 },
  { distanceKm: 5.25, duration: "29:15" },
  { title: "가".repeat(100), memo: "가".repeat(1000), place: "가".repeat(200) },
  { title: "  앞뒤 공백  ", place: "  공백  ", tags: ["  a  ", "a", "b"] },
  { intensity: null },
];

for (const [index, over] of validCases.entries()) {
  test(`왕복: 통과한 입력은 제외되지 않고 같은 값으로 읽힌다 (#${index + 1})`, () => {
    const data = input(over);
    const result = toRunMapResult(fakePage("page-x", asReadFormat(toNotionProperties(data))));

    assert.equal(result.kind, "record", result.kind === "excluded" ? `제외 사유: ${result.excluded.reasons.join(", ")}` : "");
    if (result.kind !== "record") return;
    const r = result.record;
    assert.equal(r.title, data.title);
    assert.equal(r.date, data.date);
    assert.equal(r.distanceKm, data.distanceKm);
    assert.equal(r.durationSeconds, parseDurationToSeconds(data.duration));
    assert.equal(r.durationText, formatDuration(parseDurationToSeconds(data.duration) as number));
    assert.equal(r.place, data.place);
    assert.equal(r.memo, data.memo);
    assert.equal(r.intensity, data.intensity);
    assert.deepEqual(r.tags, data.tags);
    assert.equal(r.source, "수동");
    assert.equal(r.externalId, toExternalId(data.clientKey));
  });
}

test("거부된 입력은 변환까지 가지 못한다(스키마 단계에서 막힌다)", () => {
  for (const bad of [{ duration: "12:5" }, { date: "2026-13-45" }, { title: "" }, { distanceKm: 0 }, { distanceKm: -3 }]) {
    const result = parseRunInput({ title: "t", date: "2026-11-05", distanceKm: 5, duration: "25:00", clientKey: KEY, ...bad });
    assert.equal(result.success, false, JSON.stringify(bad));
  }
});
