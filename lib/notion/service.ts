import type { RunRecordRepository } from "@/lib/notion/repository";
import { toRunRecordDto } from "@/lib/notion/mapper";
import type { RunRecordDto } from "@/lib/notion/dto";
import { AppError } from "@/lib/errors";

// 러닝 기록 비즈니스 로직 계층입니다. 저장소는 생성자로 주입받습니다
export class RunRecordService {
  constructor(private readonly repository: RunRecordRepository) {}

  async listRunRecords(): Promise<RunRecordDto[]> {
    try {
      const pages = await this.repository.findAllPages();
      return pages.map(toRunRecordDto).filter((record): record is RunRecordDto => record !== null);
    } catch (error) {
      // 노션 호출 실패는 내부 상세를 숨기고 일관된 에러로 바꿉니다
      console.error("[notion] 러닝 기록 조회 실패", error);
      throw new AppError("NOTION_REQUEST_FAILED", "노션에서 러닝 기록을 가져오지 못했습니다.", 502);
    }
  }
}
