// 노션 페이지 속성 값을 읽는 공유 함수입니다. 공개 매퍼(mapper.ts)와 관리자 쓰기 검증이 같은 규칙을 쓰도록 분리했습니다.
// 테스트(node --test)에서 바로 실행할 수 있도록 타입만 import하고 다른 모듈에 의존하지 않습니다
import type { PageObjectResponse } from "@notionhq/client";

export type NotionProperty = PageObjectResponse["properties"][string];

export function readTitle(property: NotionProperty | undefined): string {
  if (property?.type !== "title") return "";
  return property.title.map((text) => text.plain_text).join("");
}

export function readRichText(property: NotionProperty | undefined): string {
  if (property?.type !== "rich_text") return "";
  return property.rich_text.map((text) => text.plain_text).join("");
}

export function readNumber(property: NotionProperty | undefined): number | null {
  if (property?.type !== "number") return null;
  return property.number;
}

export function readDate(property: NotionProperty | undefined): string | null {
  if (property?.type !== "date") return null;
  return property.date?.start ?? null;
}

export function readSelect(property: NotionProperty | undefined): string | null {
  if (property?.type !== "select") return null;
  return property.select?.name ?? null;
}

export function readMultiSelect(property: NotionProperty | undefined): string[] {
  if (property?.type !== "multi_select") return [];
  return property.multi_select.map((option) => option.name);
}
