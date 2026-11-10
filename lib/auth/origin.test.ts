import assert from "node:assert/strict";
import test from "node:test";

import { isSameOrigin } from "./origin.ts";

const APP = "https://pjt-run-log.vercel.app";

test("같은 Origin이면 통과한다", () => {
  assert.equal(isSameOrigin("https://pjt-run-log.vercel.app", APP), true);
  assert.equal(isSameOrigin("http://localhost:3000", "http://localhost:3000"), true);
  // 경로가 붙어 있어도 Origin(스킴, 호스트, 포트)만 비교한다
  assert.equal(isSameOrigin("https://pjt-run-log.vercel.app/admin", "https://pjt-run-log.vercel.app/x"), true);
});

test("다른 사이트, 다른 스킴, 다른 포트는 거부한다", () => {
  assert.equal(isSameOrigin("https://evil.example", APP), false);
  assert.equal(isSameOrigin("http://pjt-run-log.vercel.app", APP), false);
  assert.equal(isSameOrigin("http://localhost:3001", "http://localhost:3000"), false);
  assert.equal(isSameOrigin("https://pjt-run-log.vercel.app.evil.example", APP), false);
  assert.equal(isSameOrigin("https://evil.example/https://pjt-run-log.vercel.app", APP), false);
});

test("Origin이 없거나 형식이 틀리면 거부한다", () => {
  assert.equal(isSameOrigin(null, APP), false);
  assert.equal(isSameOrigin(undefined, APP), false);
  assert.equal(isSameOrigin("", APP), false);
  assert.equal(isSameOrigin("null", APP), false); // 샌드박스 iframe 등이 보내는 값
  assert.equal(isSameOrigin("not a url", APP), false);
  assert.equal(isSameOrigin(APP, "not a url"), false);
});
