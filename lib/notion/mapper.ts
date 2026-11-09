import type { PageObjectResponse } from "@notionhq/client";
// 테스트(node --test)에서 실행할 수 있도록 별칭(@/) 대신 확장자 있는 상대 경로로 import합니다
import { RUN_PROPERTY } from "./properties.ts";
import { normalizeNotionDate } from "./date.ts";
import { calcPaceSecondsPerKm, formatDuration, parseDurationToSeconds } from "./duration.ts";
import type { ExcludedReason, ExcludedRunDto, RunRecordDto } from "./dto.ts";
import { readDate, readMultiSelect, readNumber, readRichText, readSelect, readTitle } from "./readers.ts";

// 노션 페이지 한 건의 변환 결과입니다. 정상 기록이거나 제외 정보 중 하나입니다
export type RunMapResult =
  | { kind: "record"; record: RunRecordDto }
  | { kind: "excluded"; excluded: ExcludedRunDto };

// 노션 페이지 한 건을 RunRecordDto로 바꿉니다. 필수 값이 없거나 형식이 틀리면 제외 정보를 반환합니다
export function toRunMapResult(page: PageObjectResponse): RunMapResult {
  const properties = page.properties;

  const title = readTitle(properties[RUN_PROPERTY.title]);
  const rawDate = readDate(properties[RUN_PROPERTY.date]);
  // 시간이 포함된 날짜도 한국 시간 기준 YYYY-MM-DD로 맞춥니다. 형식이 틀리면 null입니다
  const date = rawDate === null ? null : normalizeNotionDate(rawDate);
  const distanceKm = readNumber(properties[RUN_PROPERTY.distanceKm]);
  const durationRaw = readRichText(properties[RUN_PROPERTY.duration]);
  const durationSeconds = parseDurationToSeconds(durationRaw);

  if (!title || !date || distanceKm === null || durationSeconds === null) {
    // 로그에는 페이지 id와 사유만 남기고, 사용자가 입력한 값은 넣지 않습니다
    const reasons: ExcludedReason[] = [];
    if (!title) reasons.push("제목 없음");
    if (!date) reasons.push(rawDate === null ? "날짜 없음" : "날짜 형식 오류");
    if (distanceKm === null) reasons.push("거리 없음");
    if (durationSeconds === null) {
      reasons.push(durationRaw.trim() === "" ? "소요시간 없음" : "소요시간 형식 오류");
    }
    console.warn(`[notion] 필수 값이 없거나 형식이 맞지 않아 제외합니다: ${page.id} (${reasons.join(", ")})`);
    return {
      kind: "excluded",
      excluded: { pageId: page.id, title: title || null, reasons, notionUrl: page.url },
    };
  }

  const record: RunRecordDto = {
    id: page.id,
    title,
    date,
    distanceKm,
    durationText: formatDuration(durationSeconds),
    durationSeconds,
    paceSecondsPerKm: calcPaceSecondsPerKm(durationSeconds, distanceKm),
    place: readRichText(properties[RUN_PROPERTY.place]),
    intensity: readSelect(properties[RUN_PROPERTY.intensity]),
    memo: readRichText(properties[RUN_PROPERTY.memo]),
    tags: readMultiSelect(properties[RUN_PROPERTY.tags]),
    source: readSelect(properties[RUN_PROPERTY.source]),
    externalId: readRichText(properties[RUN_PROPERTY.externalId]),
    notionUrl: page.url,
  };
  return { kind: "record", record };
}
