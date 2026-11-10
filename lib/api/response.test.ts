import assert from "node:assert/strict";
import test from "node:test";

import { apiFailure, apiSuccess } from "./response.ts";

test("apiSuccess: success true와 data", () => {
  assert.deepEqual(apiSuccess({ id: "a", created: true }), { success: true, data: { id: "a", created: true } });
});

test("apiFailure: success false와 code, message (details 키는 없다)", () => {
  const failure = apiFailure("UNAUTHORIZED", "로그인이 필요합니다.");
  assert.deepEqual(failure, { success: false, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다." } });
  assert.ok(!("details" in failure.error));
});

test("apiFailure: 필드별 오류는 details로 담긴다", () => {
  assert.deepEqual(apiFailure("VALIDATION_FAILED", "입력값을 확인해 주세요.", { duration: "형식 오류" }), {
    success: false,
    error: { code: "VALIDATION_FAILED", message: "입력값을 확인해 주세요.", details: { duration: "형식 오류" } },
  });
});
