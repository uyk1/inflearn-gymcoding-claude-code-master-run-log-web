import assert from "node:assert/strict";
import test from "node:test";

import { prop } from "./test-pages.ts";
import { readDate, readMultiSelect, readNumber, readRichText, readSelect, readTitle } from "./readers.ts";

// 테스트용 속성 객체는 필요한 필드만 갖고 있어 타입을 맞춰 줍니다
type Prop = Parameters<typeof readTitle>[0];
const as = (value: unknown) => value as Prop;

test("제목과 리치 텍스트는 여러 조각을 이어 붙인다", () => {
  assert.equal(readTitle(as({ type: "title", title: [{ plain_text: "한강 " }, { plain_text: "러닝" }] })), "한강 러닝");
  assert.equal(readRichText(as({ type: "rich_text", rich_text: [{ plain_text: "a" }, { plain_text: "b" }] })), "ab");
});

test("타입이 다르거나 속성이 없으면 기본값을 돌려준다", () => {
  assert.equal(readTitle(undefined), "");
  assert.equal(readTitle(as(prop.rich("x"))), "");
  assert.equal(readRichText(as(prop.title("x"))), "");
  assert.equal(readNumber(as(prop.rich("5"))), null);
  assert.equal(readDate(as(prop.num(1))), null);
  assert.equal(readSelect(as(prop.multi(["a"]))), null);
  assert.deepEqual(readMultiSelect(as(prop.select("a"))), []);
});

test("숫자, 날짜, 선택, 다중 선택", () => {
  assert.equal(readNumber(as(prop.num(5.2))), 5.2);
  assert.equal(readNumber(as(prop.num(null))), null);
  assert.equal(readDate(as(prop.date("2026-11-05"))), "2026-11-05");
  assert.equal(readDate(as(prop.date(null))), null);
  assert.equal(readSelect(as(prop.select("EASY"))), "EASY");
  assert.equal(readSelect(as(prop.select(null))), null);
  assert.deepEqual(readMultiSelect(as(prop.multi(["회복", "장거리"]))), ["회복", "장거리"]);
});
