// 노션 페이지를 수정 화면의 입력칸 값(RunFormValues)으로 바꾸는 순수 함수입니다.
// 공개 DTO(mapper)와 달리 소요시간·장소·메모를 노션에 적힌 원문 그대로 돌려주고, 검증에 실패하는 값도 버리지 않습니다
// (Phase 5의 제외 행 고치기가 같은 함수를 씁니다). 읽기 함수는 공개 매퍼와 같은 readers를 재사용합니다.
// 테스트(node --test)에서 바로 실행할 수 있도록 타입만 import하고 확장자 있는 상대 경로를 씁니다.
import type { PageObjectResponse } from "@notionhq/client";

import { normalizeNotionDate } from "../date.ts";
import { RUN_PROPERTY } from "../properties.ts";
import { readDate, readMultiSelect, readNumber, readRichText, readSelect, readTitle } from "../readers.ts";
import { INTENSITIES } from "./input.ts";
import type { RunFormValues } from "./run-form.ts";

export function pageToRunFormValues(page: { properties: PageObjectResponse["properties"] }): RunFormValues {
  const properties = page.properties ?? {};

  // 시간이 포함된 날짜도 한국 시간 기준 YYYY-MM-DD로 맞춥니다. 형식이 틀리거나 없으면 빈 칸입니다
  const rawDate = readDate(properties[RUN_PROPERTY.date]);
  const date = rawDate === null ? "" : (normalizeNotionDate(rawDate) ?? "");

  const distance = readNumber(properties[RUN_PROPERTY.distanceKm]);
  const intensity = readSelect(properties[RUN_PROPERTY.intensity]);

  return {
    title: readTitle(properties[RUN_PROPERTY.title]),
    date,
    distance: distance === null ? "" : String(distance),
    duration: readRichText(properties[RUN_PROPERTY.duration]),
    place: readRichText(properties[RUN_PROPERTY.place]),
    memo: readRichText(properties[RUN_PROPERTY.memo]),
    // 폼이 모르는 강도 값(노션에서 새로 만든 옵션 등)은 빈 칸으로 둡니다
    intensity: INTENSITIES.find((option) => option === intensity) ?? "",
    tags: readMultiSelect(properties[RUN_PROPERTY.tags]).join(", "),
  };
}
