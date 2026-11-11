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

// 필수 값 네 가지를 읽습니다. 제외 판정과 정상 기록 변환이 같은 값을 쓰도록 한 곳에서만 읽습니다
function readRequiredFields(properties: PageObjectResponse["properties"]) {
  const title = readTitle(properties[RUN_PROPERTY.title]);
  const rawDate = readDate(properties[RUN_PROPERTY.date]);
  // 시간이 포함된 날짜도 한국 시간 기준 YYYY-MM-DD로 맞춥니다. 형식이 틀리면 null입니다
  const date = rawDate === null ? null : normalizeNotionDate(rawDate);
  const distanceKm = readNumber(properties[RUN_PROPERTY.distanceKm]);
  const durationRaw = readRichText(properties[RUN_PROPERTY.duration]);
  const durationSeconds = parseDurationToSeconds(durationRaw);
  return { title, rawDate, date, distanceKm, durationRaw, durationSeconds };
}

function reasonsOf(fields: ReturnType<typeof readRequiredFields>): ExcludedReason[] {
  const reasons: ExcludedReason[] = [];
  if (!fields.title) reasons.push("제목 없음");
  if (!fields.date) reasons.push(fields.rawDate === null ? "날짜 없음" : "날짜 형식 오류");
  if (fields.distanceKm === null) reasons.push("거리 없음");
  if (fields.durationSeconds === null) {
    reasons.push(fields.durationRaw.trim() === "" ? "소요시간 없음" : "소요시간 형식 오류");
  }
  return reasons;
}

// 제외 사유를 계산합니다(정상이면 빈 배열). 공개 매퍼와 관리자 수정 화면이 같은 판정을 쓰도록 분리했습니다.
// 로그는 남기지 않으며, 사유에는 입력 원문이 담기지 않습니다
export function excludedReasonsOf(properties: PageObjectResponse["properties"]): ExcludedReason[] {
  return reasonsOf(readRequiredFields(properties));
}

// 노션 페이지 한 건을 RunRecordDto로 바꿉니다. 필수 값이 없거나 형식이 틀리면 제외 정보를 반환합니다.
// 제외 여부는 reasonsOf 한 곳에서만 판단합니다(사유가 비어 있으면 정상 기록)
export function toRunMapResult(page: PageObjectResponse): RunMapResult {
  const properties = page.properties;

  const fields = readRequiredFields(properties);
  const reasons = reasonsOf(fields);
  if (reasons.length > 0) {
    // 로그에는 페이지 id와 사유만 남기고, 사용자가 입력한 값은 넣지 않습니다
    console.warn(`[notion] 필수 값이 없거나 형식이 맞지 않아 제외합니다: ${page.id} (${reasons.join(", ")})`);
    return {
      kind: "excluded",
      excluded: { pageId: page.id, title: fields.title || null, reasons, notionUrl: page.url },
    };
  }

  // 사유가 없으면 네 값이 모두 유효합니다(reasonsOf가 같은 값으로 판정함)
  const { title } = fields;
  const date = fields.date as string;
  const distanceKm = fields.distanceKm as number;
  const durationSeconds = fields.durationSeconds as number;

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
