// 수정 화면의 "내용 버전"입니다. 수정 화면을 열 때의 내용과 저장할 때 노션의 현재 내용이 같은지 비교하는 데 씁니다.
//
// 노션의 last_edited_time은 분 단위 정밀도(초와 밀리초가 항상 0)라 같은 분 안의 수정을 놓치므로, 시각 대신 내용으로 비교합니다.
// 버전은 우리가 쓰는 입력 필드 8개만 반영합니다. 출처·외부ID나 last_edited_time이 바뀌어도 버전은 그대로여서
// 노션에서 그런 항목을 바꿔도 충돌로 보지 않습니다. 같은 내용이면 항상 같은 값이 나옵니다(payloadSignature의 정규화를 따름).
//
// 서버에서만 씁니다(node:crypto). 클라이언트 컴포넌트는 이 모듈을 import하지 않고, 서버가 준 버전 문자열을 그대로 돌려보냅니다.
import { createHash } from "node:crypto";

import type { PageObjectResponse } from "@notionhq/client";

import { RUN_PROPERTY } from "../properties.ts";
import { readDate, readSelect } from "../readers.ts";
import { pageToRunFormValues } from "./page-to-form.ts";
import { parseDistance, payloadSignature, type RunFormValues } from "./run-form.ts";

function hash(signature: string): string {
  return createHash("sha256").update(signature).digest("hex").slice(0, 32);
}

export function computeVersion(values: RunFormValues): string {
  return hash(payloadSignature(values));
}

// 노션 페이지의 내용 버전입니다. 수정 화면을 열 때와 저장 직전의 비교에는 이 함수를 씁니다.
// 입력칸 값(pageToRunFormValues)만으로는 형식이 틀린 날짜, 음수 같은 잘못된 거리, 폼이 모르는 강도가 서로 다른 값이어도
// 똑같이 비거나 NaN이 되어 구분되지 않으므로(제외 행을 고칠 때 문제), 그런 값만 원문을 서명에 덧붙입니다.
// 모든 값이 정상인 기록은 덧붙이는 것이 없어 computeVersion과 같은 값입니다
export function computePageVersion(page: { properties: PageObjectResponse["properties"] }): string {
  const values = pageToRunFormValues(page);
  const properties = page.properties ?? {};
  const raw: Record<string, string> = {};

  const rawDate = readDate(properties[RUN_PROPERTY.date]);
  if (values.date === "" && rawDate !== null) raw.date = rawDate;

  if (values.distance !== "" && Number.isNaN(parseDistance(values.distance))) raw.distance = values.distance;

  const rawIntensity = readSelect(properties[RUN_PROPERTY.intensity]);
  if (values.intensity === "" && rawIntensity !== null) raw.intensity = rawIntensity;

  const signature = payloadSignature(values);
  return hash(Object.keys(raw).length === 0 ? signature : `${signature}\n${JSON.stringify(raw)}`);
}
