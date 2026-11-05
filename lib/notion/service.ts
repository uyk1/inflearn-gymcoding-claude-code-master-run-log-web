import type { RunRecordRepository } from "@/lib/notion/repository";
import { toRunMapResult } from "@/lib/notion/mapper";
import type { ExcludedRunDto, RunRecordDto, RunRecordListDto } from "@/lib/notion/dto";
import { AppError } from "@/lib/errors";

// 러닝 기록 비즈니스 로직 계층입니다. 저장소는 생성자로 주입받습니다
export class RunRecordService {
  constructor(private readonly repository: RunRecordRepository) {}

  // 정상 기록과 제외된 행을 함께 돌려줍니다. 제외된 행은 화면에서 사유를 안내하는 데 씁니다
  async listRunRecords(): Promise<RunRecordListDto> {
    try {
      const pages = await this.repository.findAllPages();
      const records: RunRecordDto[] = [];
      const excluded: ExcludedRunDto[] = [];
      for (const result of pages.map(toRunMapResult)) {
        if (result.kind === "record") records.push(result.record);
        else excluded.push(result.excluded);
      }
      return { records, excluded };
    } catch (error) {
      // 노션 호출 실패는 내부 상세를 숨기고 일관된 에러로 바꿉니다
      // 에러 객체 전체에는 요청·응답 헤더가 들어 있을 수 있어, 원인 파악에 필요한 값만 남깁니다
      const { name, message, stack } = error instanceof Error ? error : new Error(String(error));
      const { code, status } = error as { code?: unknown; status?: unknown };
      console.error("[notion] 러닝 기록 조회 실패", { name, code, status, message, stack });
      throw new AppError("NOTION_REQUEST_FAILED", "노션에서 러닝 기록을 가져오지 못했습니다.", 502);
    }
  }

  // 상세 화면용 단건 조회입니다. 목록에서 찾고, 없거나 유효하지 않으면 404를 던집니다
  async findRunRecord(id: string): Promise<RunRecordDto> {
    const { records } = await this.listRunRecords();
    const record = records.find((item) => item.id === id);
    if (!record) {
      throw new AppError("NOT_FOUND", "해당 러닝 기록을 찾을 수 없습니다.", 404);
    }
    return record;
  }
}
