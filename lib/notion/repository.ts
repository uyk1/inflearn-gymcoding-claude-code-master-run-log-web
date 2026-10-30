import { isFullPage, type Client, type PageObjectResponse } from "@notionhq/client";
import { RUN_PROPERTY } from "@/lib/notion/properties";

// 노션 data source에서 페이지를 가져오는 데이터 접근 계층입니다. 응답 변환은 하지 않습니다
export class RunRecordRepository {
  constructor(
    private readonly notion: Client,
    private readonly dataSourceId: string,
  ) {}

  // 날짜 내림차순으로 모든 페이지를 가져옵니다. 커서를 따라 끝까지 순회합니다
  async findAllPages(): Promise<PageObjectResponse[]> {
    const pages: PageObjectResponse[] = [];
    let cursor: string | undefined;

    do {
      const response = await this.notion.dataSources.query({
        data_source_id: this.dataSourceId,
        sorts: [{ property: RUN_PROPERTY.date, direction: "descending" }],
        start_cursor: cursor,
        page_size: 100,
      });

      for (const result of response.results) {
        if (isFullPage(result)) pages.push(result);
      }

      cursor = response.has_more && response.next_cursor ? response.next_cursor : undefined;
    } while (cursor);

    return pages;
  }
}
