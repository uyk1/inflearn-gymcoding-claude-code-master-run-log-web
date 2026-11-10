import assert from "node:assert/strict";
import test from "node:test";

import { apiFailure } from "../../api/response.ts";
import { parseRunInput } from "./input.ts";
import {
  emptyRunFormValues,
  mapApiFailureToFieldErrors,
  parseDistance,
  parseTags,
  previewPace,
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
  assert.equal(result.success, false, JSON.stringify(over));
  return result.success ? {} : result.errors;
}

test("emptyRunFormValues: 날짜만 오늘이고 나머지는 비어 있다", () => {
  assert.deepEqual(emptyRunFormValues("2026-11-10"), {
    title: "",
    date: "2026-11-10",
    distance: "",
    duration: "",
    place: "",
    memo: "",
    intensity: "",
    tags: "",
  });
});

test("parseDistance: 마침표 소수점만 숫자로 받고 나머지는 NaN", () => {
  for (const [text, expected] of [
    ["5", 5],
    [" 5.25 ", 5.25],
    ["5.", 5],
    [".5", 0.5],
    ["0", 0],
    ["10.0", 10],
  ] as const) {
    assert.equal(parseDistance(text), expected, JSON.stringify(text));
  }
  for (const text of ["", "  ", "5,2", "abc", "1e3", "-1", "+5", "5km", "5 5", "０５", "Infinity", "0x10"]) {
    assert.ok(Number.isNaN(parseDistance(text)), `NaN이어야 함: ${JSON.stringify(text)}`);
  }
});

test("parseTags: 쉼표로 나누고 공백과 빈 항목을 정리한다", () => {
  assert.deepEqual(parseTags("인터벌, 회복"), ["인터벌", "회복"]);
  assert.deepEqual(parseTags(" a ,, b ,"), ["a", "b"]);
  assert.deepEqual(parseTags("a，b"), ["a", "b"]); // 전각 쉼표
  assert.deepEqual(parseTags(""), []);
  assert.deepEqual(parseTags(" , , "), []);
  assert.deepEqual(parseTags("한 단어 태그"), ["한 단어 태그"]);
});

test("toRunPayload: API 본문 형태로 바꾼다", () => {
  assert.deepEqual(
    toRunPayload(values({ place: "한강", memo: "좋음", intensity: "HARD", tags: "회복, 장거리", distance: " 5.25 " }), KEY),
    {
      title: "한강 아침 러닝",
      date: "2026-11-10",
      distanceKm: 5.25,
      duration: "25:00",
      place: "한강",
      memo: "좋음",
      intensity: "HARD",
      tags: ["회복", "장거리"],
      clientKey: KEY,
    },
  );
});

test("toRunPayload: 선택하지 않은 강도는 null", () => {
  assert.equal(toRunPayload(values({ intensity: "" }), KEY).intensity, null);
});

// 핵심: 폼에서 통과한 값은 서버와 같은 스키마에서도 같은 결과로 통과한다
const validCases: Partial<RunFormValues>[] = [
  {},
  { distance: "5.25", duration: "29:15" },
  { distance: ".5", duration: "3:00" },
  { distance: "5.", duration: "25:00" },
  { duration: "1:05:03" },
  { duration: "100:00", distance: "21.0975" },
  { place: "한강", memo: "좋음", intensity: "EASY", tags: "회복, 장거리" },
  { tags: "a, a, b" },
  { title: "  앞뒤 공백  ", place: "  공백  " },
  { date: "2028-02-29" },
];
for (const [index, over] of validCases.entries()) {
  test(`왕복: 폼 검증을 통과한 값은 서버 스키마도 같은 결과로 통과한다 (#${index + 1})`, () => {
    const form = validateRunForm(values(over), KEY);
    assert.equal(form.success, true, JSON.stringify(form));
    const server = parseRunInput(JSON.parse(JSON.stringify(toRunPayload(values(over), KEY))));
    assert.deepEqual(server, form);
  });
}

test("validateRunForm: 칸별 오류(거리는 distance 칸)로 돌려준다", () => {
  assert.ok(errorsOf({ title: "" }).title);
  assert.ok(errorsOf({ title: "   " }).title);
  assert.ok(errorsOf({ date: "" }).date);
  assert.ok(errorsOf({ date: "2026-13-45" }).date);
  assert.ok(errorsOf({ duration: "12:5" }).duration);
  assert.ok(errorsOf({ duration: "" }).duration);
  assert.ok(errorsOf({ tags: "a,b".repeat(1) + ",c,d,e,f,g,h,i,j,k,l" }).tags);
  assert.ok(errorsOf({ place: "가".repeat(201) }).place);
  assert.ok(errorsOf({ memo: "가".repeat(1001) }).memo);
  // 거리는 API 이름(distanceKm)이 아니라 폼 칸 이름(distance)으로 나온다
  for (const distance of ["", "abc", "5,2", "0", "-1", "1000.01"]) {
    const errors = errorsOf({ distance });
    assert.ok(errors.distance, `distance 오류가 있어야 함: ${JSON.stringify(distance)}`);
    assert.ok(!("distanceKm" in errors));
  }
});

test("validateRunForm: 잘못된 clientKey는 폼 전체 오류(_form)", () => {
  const result = validateRunForm(values(), "not-a-uuid");
  assert.equal(result.success, false);
  assert.ok(!result.success && result.errors._form);
});

test("validateRunForm: 오류 문구에 입력값이 담기지 않는다", () => {
  const secret = "SECRET-입력값-9999";
  const result = validateRunForm(values({ title: "", duration: secret, date: secret, distance: secret }), KEY);
  assert.equal(result.success, false);
  assert.ok(!result.success && !JSON.stringify(result.errors).includes("SECRET"));
});

test("previewPace: 둘 다 유효하면 예상 페이스를 돌려준다", () => {
  assert.equal(previewPace("25:00", "5"), "5:00/km");
  assert.equal(previewPace("29:15", "5.25"), "5:34/km");
  assert.equal(previewPace("1:05:03", "10"), "6:30/km");
  assert.equal(previewPace(" 25:00 ", " 5 "), "5:00/km");
});

test("previewPace: 소요시간이나 거리가 유효하지 않으면 null", () => {
  assert.equal(previewPace("12:5", "5"), null);
  assert.equal(previewPace("", "5"), null);
  assert.equal(previewPace("25:00", ""), null);
  assert.equal(previewPace("25:00", "abc"), null);
  assert.equal(previewPace("25:00", "5,2"), null);
  assert.equal(previewPace("25:00", "0"), null);
});

test("mapApiFailureToFieldErrors: details를 폼 칸 오류로 바꾼다", () => {
  assert.deepEqual(
    mapApiFailureToFieldErrors(
      apiFailure("VALIDATION_FAILED", "입력값을 확인해 주세요.", { duration: "형식 오류", distanceKm: "거리 오류", _form: "항목 오류", mystery: "모름" }),
    ),
    { duration: "형식 오류", distance: "거리 오류", _form: "항목 오류" },
  );
});

test("mapApiFailureToFieldErrors: details가 없으면 메시지를 폼 전체 오류로 쓴다", () => {
  assert.deepEqual(mapApiFailureToFieldErrors(apiFailure("UNAUTHORIZED", "로그인이 필요합니다.")), { _form: "로그인이 필요합니다." });
  assert.deepEqual(mapApiFailureToFieldErrors(apiFailure("X", "빈 details", {})), { _form: "빈 details" });
});
