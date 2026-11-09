// 테스트용 가짜 노션 페이지를 만드는 도우미입니다. 필요한 필드만 채우며, 실제 노션 호출은 없습니다.
// 이 파일은 테스트에서만 import합니다(운영 코드에서 쓰지 않음)
import type { PageObjectResponse } from "@notionhq/client";

type Props = Record<string, unknown>;

export const prop = {
  title: (text: string) => ({ type: "title", title: text ? [{ plain_text: text }] : [] }),
  rich: (text: string) => ({ type: "rich_text", rich_text: text ? [{ plain_text: text }] : [] }),
  num: (value: number | null) => ({ type: "number", number: value }),
  date: (start: string | null) => ({ type: "date", date: start ? { start } : null }),
  select: (name: string | null) => ({ type: "select", select: name ? { name } : null }),
  multi: (names: string[]) => ({ type: "multi_select", multi_select: names.map((name) => ({ name })) }),
};

export function fakePage(id: string, properties: Props): PageObjectResponse {
  return { object: "page", id, url: `https://notion.so/${id}`, properties } as unknown as PageObjectResponse;
}

// 모든 필드가 정상인 기본 속성입니다. over로 일부만 바꿔 씁니다
export function baseProps(over: Props = {}): Props {
  return {
    제목: prop.title("한강 아침 러닝"),
    날짜: prop.date("2026-11-05"),
    "거리(Km)": prop.num(5),
    소요시간: prop.rich("25:00"),
    장소: prop.rich("한강"),
    강도: prop.select("EASY"),
    메모: prop.rich("좋음"),
    태그: prop.multi(["회복", "장거리"]),
    출처: prop.select("수동"),
    외부ID: prop.rich("web-1"),
    ...over,
  };
}
