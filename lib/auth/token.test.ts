import test from "node:test";
import assert from "node:assert/strict";
import { createSessionToken, verifySessionToken } from "./token.ts";

const S = "test-secret-not-real";
const now = 1_000_000;

test("정상 토큰 통과", async () => {
  const t = await createSessionToken(S, now + 1000);
  assert.equal(await verifySessionToken(S, t, now), true);
});
test("만료 거부", async () => {
  const t = await createSessionToken(S, now + 1000);
  assert.equal(await verifySessionToken(S, t, now + 1000), false);
  assert.equal(await verifySessionToken(S, t, now + 5000), false);
});
test("다른 비밀값 거부", async () => {
  const t = await createSessionToken(S, now + 1000);
  assert.equal(await verifySessionToken("other", t, now), false);
});
test("페이로드 변조 거부(만료 연장 시도)", async () => {
  const t = await createSessionToken(S, now + 1000);
  const [, sig] = t.split(".");
  const forged = Buffer.from(String(now + 999999)).toString("base64url") + "." + sig;
  assert.equal(await verifySessionToken(S, forged, now), false);
});
test("서명 변조 거부", async () => {
  const t = await createSessionToken(S, now + 1000);
  assert.equal(await verifySessionToken(S, t.slice(0, -2) + "AA", now), false);
});
test("빈 값, 형식 오류 거부", async () => {
  for (const v of [undefined, "", "abc", "a.b.c", ".", "!!.??", "MTIz."]) {
    assert.equal(await verifySessionToken(S, v as string | undefined, now), false, String(v));
  }
  assert.equal(await verifySessionToken("", "x.y", now), false);
});
