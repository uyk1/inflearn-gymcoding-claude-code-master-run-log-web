import assert from "node:assert/strict";
import test from "node:test";

import { MAX_DURATION_SECONDS, parseDurationToSeconds } from "./duration.ts";

test("정상 형식은 초로 바꾼다", () => {
  assert.equal(parseDurationToSeconds("45:23"), 45 * 60 + 23);
  assert.equal(parseDurationToSeconds("5:03"), 303);
  assert.equal(parseDurationToSeconds("1:05:03"), 3903);
  assert.equal(parseDurationToSeconds(" 100:00 "), 6000);
});

test("형식 오류와 0초는 null", () => {
  for (const value of ["", "12", "12:5", "1:5:03", "1:60:00", "12:60", "00:00", "a:bc", "1:2:3:4"]) {
    assert.equal(parseDurationToSeconds(value), null, value);
  }
});

test("상한: 48시간까지는 허용하고 넘으면 거부한다", () => {
  assert.equal(parseDurationToSeconds("48:00:00"), MAX_DURATION_SECONDS);
  assert.equal(parseDurationToSeconds("2880:00"), MAX_DURATION_SECONDS);
  assert.equal(parseDurationToSeconds("48:00:01"), null);
  assert.equal(parseDurationToSeconds("2880:01"), null);
});

test("아주 긴 숫자는 Infinity가 아니라 null", () => {
  assert.equal(parseDurationToSeconds(`${"1".repeat(400)}:00`), null);
  assert.equal(parseDurationToSeconds(`${"9".repeat(30)}:00:00`), null);
});
