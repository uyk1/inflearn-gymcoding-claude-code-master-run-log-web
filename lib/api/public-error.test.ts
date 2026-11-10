import assert from "node:assert/strict";
import test from "node:test";

import { GENERIC_CONFIG_MESSAGE, isConfigErrorCode, toPublicMessage } from "./public-error.ts";

test("설정 오류 코드는 일반 문구만 응답한다(환경 변수 이름을 숨긴다)", () => {
  for (const code of ["CONFIG_MISSING", "AUTH_NOT_CONFIGURED"]) {
    const message = toPublicMessage(code, "NOTION_ADMIN_API_KEY가 설정되지 않았습니다.");
    assert.equal(message, GENERIC_CONFIG_MESSAGE);
    assert.ok(!message.includes("NOTION"), message);
    assert.ok(!/[A-Z]{3,}_[A-Z_]+/.test(message), "환경 변수 이름 모양이 없어야 함");
  }
});

test("그 밖의 오류 문구는 그대로 응답한다", () => {
  assert.equal(toPublicMessage("NOTION_WRITE_FAILED", "노션에 기록을 저장하지 못했습니다."), "노션에 기록을 저장하지 못했습니다.");
  assert.equal(toPublicMessage("NOT_FOUND", "해당 러닝 기록을 찾을 수 없습니다."), "해당 러닝 기록을 찾을 수 없습니다.");
  assert.equal(toPublicMessage("", "빈 코드"), "빈 코드");
});

test("isConfigErrorCode: 정확히 일치하는 코드만 설정 오류로 본다", () => {
  assert.equal(isConfigErrorCode("CONFIG_MISSING"), true);
  assert.equal(isConfigErrorCode("AUTH_NOT_CONFIGURED"), true);
  assert.equal(isConfigErrorCode("config_missing"), false);
  assert.equal(isConfigErrorCode("CONFIG_MISSING_X"), false);
  assert.equal(isConfigErrorCode(""), false);
});
