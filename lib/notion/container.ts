// 서버 전용 모듈입니다. 클라이언트 컴포넌트에서 import하면 빌드가 실패합니다
import "server-only";
import { createNotionClient } from "@/lib/notion/client";
import { RunRecordRepository } from "@/lib/notion/repository";
import { RunRecordService } from "@/lib/notion/service";
import { AppError } from "@/lib/errors";

// 의존성을 한 곳에서 조립합니다. 라우트 핸들러는 이 함수로 서비스를 받습니다
export function createRunRecordService(): RunRecordService {
  const dataSourceId = process.env.NOTION_DATA_SOURCE_ID;
  if (!dataSourceId) {
    throw new AppError("CONFIG_MISSING", "NOTION_DATA_SOURCE_ID가 설정되지 않았습니다.", 500);
  }

  const repository = new RunRecordRepository(createNotionClient(), dataSourceId);
  return new RunRecordService(repository);
}
