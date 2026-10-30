import { createRunRecordService } from "@/lib/notion/container";
import type { RunRecordDto } from "@/lib/notion/dto";
import { AppError } from "@/lib/errors";

// 화면에서 쓰는 조회 함수입니다. 노션 실패는 화면에 메시지로 보여 주고, 설정 오류 등은 그대로 던집니다
export async function loadRunRecords(): Promise<{
  records: RunRecordDto[];
  errorMessage: string | null;
}> {
  try {
    const records = await createRunRecordService().listRunRecords();
    return { records, errorMessage: null };
  } catch (error) {
    if (error instanceof AppError && error.code === "NOTION_REQUEST_FAILED") {
      return { records: [], errorMessage: error.message };
    }
    throw error;
  }
}
