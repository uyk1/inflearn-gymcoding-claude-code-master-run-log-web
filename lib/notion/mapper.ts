import type { PageObjectResponse } from "@notionhq/client";
import { RUN_PROPERTY } from "@/lib/notion/properties";
import { formatDuration, formatPace, parseDurationToSeconds } from "@/lib/notion/duration";
import type { RunRecordDto } from "@/lib/notion/dto";

type NotionProperty = PageObjectResponse["properties"][string];

function readTitle(property: NotionProperty | undefined): string {
  if (property?.type !== "title") return "";
  return property.title.map((text) => text.plain_text).join("");
}

function readRichText(property: NotionProperty | undefined): string {
  if (property?.type !== "rich_text") return "";
  return property.rich_text.map((text) => text.plain_text).join("");
}

function readNumber(property: NotionProperty | undefined): number | null {
  if (property?.type !== "number") return null;
  return property.number;
}

function readDate(property: NotionProperty | undefined): string | null {
  if (property?.type !== "date") return null;
  return property.date?.start ?? null;
}

function readSelect(property: NotionProperty | undefined): string | null {
  if (property?.type !== "select") return null;
  return property.select?.name ?? null;
}

function readMultiSelect(property: NotionProperty | undefined): string[] {
  if (property?.type !== "multi_select") return [];
  return property.multi_select.map((option) => option.name);
}

// 노션 페이지 한 건을 RunRecordDto로 바꿉니다. 필수 값이 없거나 형식이 틀리면 null을 반환합니다
export function toRunRecordDto(page: PageObjectResponse): RunRecordDto | null {
  const properties = page.properties;

  const title = readTitle(properties[RUN_PROPERTY.title]);
  const date = readDate(properties[RUN_PROPERTY.date]);
  const distanceKm = readNumber(properties[RUN_PROPERTY.distanceKm]);
  const durationRaw = readRichText(properties[RUN_PROPERTY.duration]);
  const durationSeconds = parseDurationToSeconds(durationRaw);

  if (!title || !date || distanceKm === null || durationSeconds === null) {
    console.warn(`[notion] 필수 값이 없거나 형식이 맞지 않아 제외합니다: ${page.id}`);
    return null;
  }

  return {
    id: page.id,
    title,
    date,
    distanceKm,
    durationText: formatDuration(durationSeconds),
    durationSeconds,
    paceText: formatPace(durationSeconds, distanceKm),
    place: readRichText(properties[RUN_PROPERTY.place]),
    intensity: readSelect(properties[RUN_PROPERTY.intensity]),
    memo: readRichText(properties[RUN_PROPERTY.memo]),
    tags: readMultiSelect(properties[RUN_PROPERTY.tags]),
    source: readSelect(properties[RUN_PROPERTY.source]),
    externalId: readRichText(properties[RUN_PROPERTY.externalId]),
    notionUrl: page.url,
  };
}
