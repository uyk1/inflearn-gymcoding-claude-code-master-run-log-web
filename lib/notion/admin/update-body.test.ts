import assert from "node:assert/strict";
import test from "node:test";

import { parseUpdateBody } from "./update-body.ts";

const VERSION = "0123456789abcdef0123456789abcdef";

test("version과 나머지 필드를 나눈다(필드 값은 검증하지 않고 그대로 넘긴다)", () => {
  const result = parseUpdateBody({ version: VERSION, title: "제목", distanceKm: 5, anything: { nested: true } });
  assert.deepEqual(result, { ok: true, version: VERSION, fields: { title: "제목", distanceKm: 5, anything: { nested: true } } });
});

test("version만 있어도 구조상 통과한다(필드 검증은 서비스가 한다)", () => {
  assert.deepEqual(parseUpdateBody({ version: VERSION }), { ok: true, version: VERSION, fields: {} });
});

test("version이 없거나 문자열이 아니거나 비었거나 너무 길면 version 필드 오류", () => {
  for (const version of [undefined, null, "", 123, true, {}, [], "a".repeat(65)]) {
    const result = parseUpdateBody({ version, title: "t" });
    assert.equal(result.ok, false, JSON.stringify(version));
    assert.ok(!result.ok && result.fieldErrors.version && !result.fieldErrors._form);
  }
  assert.equal(parseUpdateBody({ title: "t" }).ok, false);
  assert.equal(parseUpdateBody({ version: "a".repeat(64) }).ok, true);
});

test("객체가 아닌 본문은 폼 전체 오류(_form)", () => {
  for (const raw of [null, undefined, "x", 1, true, []]) {
    const result = parseUpdateBody(raw);
    assert.equal(result.ok, false, JSON.stringify(raw));
    assert.ok(!result.ok && result.fieldErrors._form && !result.fieldErrors.version);
  }
});

test("clientKey나 출처 같은 항목도 그대로 필드로 넘긴다(거부는 서비스의 strictObject가 한다)", () => {
  const result = parseUpdateBody({ version: VERSION, clientKey: "k", 출처: "NRC", source: "NRC" });
  assert.ok(result.ok && "clientKey" in result.fields && "source" in result.fields);
});

test("오류 문구에 입력값이 담기지 않는다", () => {
  const secret = "SECRET-입력값-9999";
  for (const raw of [{ version: 1, title: secret }, { title: secret }, secret, [secret]]) {
    const result = parseUpdateBody(raw);
    assert.ok(!result.ok && !JSON.stringify(result.fieldErrors).includes("SECRET"));
  }
});
