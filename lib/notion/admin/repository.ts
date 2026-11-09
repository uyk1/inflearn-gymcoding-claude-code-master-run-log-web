// 관리자 쓰기용 노션 데이터 접근 계층입니다. 노션 호출만 하고 검증·로그·오류 변환은 서비스 계층이 합니다.
// 테스트(node --test)에서 바로 실행할 수 있도록 타입만 import하고, 클래스 필드는 매개변수 프로퍼티 없이 선언합니다.
import type { Client, CreatePageParameters } from "@notionhq/client";

import { AppError } from "../../errors.ts";
import { RUN_PROPERTY } from "../properties.ts";

type NotionProperties = NonNullable<CreatePageParameters["properties"]>;

export class AdminRunRepository {
  private readonly notion: Client;
  private readonly dataSourceId: string;

  constructor(notion: Client, dataSourceId: string) {
    this.notion = notion;
    this.dataSourceId = dataSourceId;
  }

  // 러닝 기록 data source에 새 페이지를 만듭니다. 만들어진 페이지의 id를 돌려줍니다
  async createPage(properties: NotionProperties): Promise<string> {
    const page = await this.notion.pages.create({
      parent: { type: "data_source_id", data_source_id: this.dataSourceId },
      properties,
    });
    return page.id;
  }

  // 외부ID가 같은 페이지가 이미 있으면 그 id를, 없으면 null을 돌려줍니다(중복 입력 방지용)
  async findPageIdByExternalId(externalId: string): Promise<string | null> {
    const response = await this.notion.dataSources.query({
      data_source_id: this.dataSourceId,
      filter: { property: RUN_PROPERTY.externalId, rich_text: { equals: externalId } },
      page_size: 1,
    });
    return response.results[0]?.id ?? null;
  }

  // 페이지 속성을 고칩니다
  async updatePage(pageId: string, properties: NotionProperties): Promise<void> {
    await this.notion.pages.update({ page_id: pageId, properties });
  }

  // 페이지를 노션 휴지통으로 보냅니다(복구할 수 있고, 영구 삭제는 하지 않습니다)
  async trashPage(pageId: string): Promise<void> {
    await this.notion.pages.update({ page_id: pageId, in_trash: true });
  }

  // 이 페이지가 러닝 기록 data source의 휴지통에 없는 페이지인지 확인합니다.
  // 관리자 키로 워크스페이스의 다른 페이지를 고치거나 지우지 못하게 하는 방어입니다. 아니면 404를 던집니다
  async assertRunPage(pageId: string): Promise<void> {
    const page = await this.notion.pages.retrieve({ page_id: pageId });
    const inDataSource =
      "parent" in page && page.parent.type === "data_source_id" && page.parent.data_source_id === this.dataSourceId;
    const inTrash = "in_trash" in page && page.in_trash === true;
    if (!inDataSource || inTrash) {
      throw new AppError("NOT_FOUND", "해당 러닝 기록을 찾을 수 없습니다.", 404);
    }
  }
}
