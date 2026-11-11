import assert from "node:assert/strict";
import test from "node:test";

import type { ExcludedReason } from "../dto.ts";
import { excludedFields, excludedNoticeText, reasonToField } from "./excluded-fields.ts";

const ALL: ExcludedReason[] = ["제목 없음", "날짜 없음", "날짜 형식 오류", "거리 없음", "소요시간 없음", "소요시간 형식 오류"];

test("사유 6종이 모두 입력칸에 대응된다", () => {
  assert.deepEqual(ALL.map(reasonToField), ["title", "date", "date", "distance", "duration", "duration"]);
});

test("excludedFields: 중복 없이 폼 순서대로", () => {
  assert.deepEqual(excludedFields(["소요시간 형식 오류", "제목 없음", "날짜 없음", "소요시간 없음"]), ["title", "date", "duration"]);
  assert.deepEqual(excludedFields([]), []);
});

test("excludedNoticeText: 사유가 없으면 null, 있으면 사유를 담은 안내", () => {
  assert.equal(excludedNoticeText([]), null);
  const text = excludedNoticeText(["날짜 없음", "소요시간 형식 오류"]);
  assert.ok(text);
  assert.ok(text.includes("목록에서 제외") && text.includes("표시된 칸"));
  // 사유는 입력칸 오류가 알려 주므로 안내에서 반복하지 않는다
  assert.ok(!text.includes("날짜 없음") && !text.includes("소요시간 형식 오류"));
});
