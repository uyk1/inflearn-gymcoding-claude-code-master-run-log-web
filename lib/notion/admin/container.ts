// 서버 전용 모듈입니다. 환경 변수를 읽어 관리자 쓰기 서비스를 조립합니다. 관리자 영역(app/api/admin 등)에서만 import합니다
import "server-only";
import { AppError } from "@/lib/errors";
import { createAdminNotionClient } from "@/lib/notion/admin/client";
import { AdminRunRepository } from "@/lib/notion/admin/repository";
import { AdminRunService } from "@/lib/notion/admin/service";

export function createAdminRunService(): AdminRunService {
  const dataSourceId = process.env.NOTION_DATA_SOURCE_ID;
  if (!dataSourceId) {
    throw new AppError("CONFIG_MISSING", "NOTION_DATA_SOURCE_ID가 설정되지 않았습니다.", 500);
  }
  return new AdminRunService(new AdminRunRepository(createAdminNotionClient(), dataSourceId));
}
