// 검증된 입력(RunInputDto)을 노션 페이지 속성 객체로 바꾸는 순수 함수입니다. 노션 호출은 하지 않습니다.
// 속성 이름은 properties.ts의 RUN_PROPERTY만 씁니다(노션에서 이름이 바뀌면 그곳만 고침).
import type { CreatePageParameters } from "@notionhq/client";

import { RUN_PROPERTY } from "../properties.ts";
import type { RunInputDto } from "./input.ts";

// 웹에서 만든 기록의 출처 값입니다. 노션에 이미 있는 옵션이라 DB 구조를 건드리지 않습니다
export const WEB_RUN_SOURCE = "수동";

// 폼의 고유 키(UUID)로 외부ID를 만듭니다. 외부 앱 연동 값과 구분하려고 web- 접두사를 붙입니다
export function toExternalId(clientKey: string): string {
  return `web-${clientKey.toLowerCase()}`;
}

type NotionProperties = NonNullable<CreatePageParameters["properties"]>;

// 비어 있는 문자열은 빈 목록으로 보내 노션에서 값을 비웁니다(수정할 때도 같은 형태로 지울 수 있음)
const richText = (content: string) => (content === "" ? [] : [{ text: { content } }]);

export function toNotionProperties(input: RunInputDto): NotionProperties {
  return {
    [RUN_PROPERTY.title]: { title: [{ text: { content: input.title } }] },
    [RUN_PROPERTY.date]: { date: { start: input.date } },
    [RUN_PROPERTY.distanceKm]: { number: input.distanceKm },
    // 소요시간은 입력한 문자열 그대로 저장합니다(앱이 읽을 때 초로 변환)
    [RUN_PROPERTY.duration]: { rich_text: richText(input.duration) },
    [RUN_PROPERTY.place]: { rich_text: richText(input.place) },
    [RUN_PROPERTY.intensity]: { select: input.intensity ? { name: input.intensity } : null },
    [RUN_PROPERTY.memo]: { rich_text: richText(input.memo) },
    [RUN_PROPERTY.tags]: { multi_select: input.tags.map((name) => ({ name })) },
    [RUN_PROPERTY.source]: { select: { name: WEB_RUN_SOURCE } },
    [RUN_PROPERTY.externalId]: { rich_text: richText(toExternalId(input.clientKey)) },
  };
}
