import { unstable_cache } from "next/cache";
import { createRunRecordService } from "@/lib/notion/container";
import type { RunRecordDto } from "@/lib/notion/dto";
import { AppError } from "@/lib/errors";

// 노션 조회만 5분간 캐시합니다. 실패 시 예외를 던지므로 실패 결과는 캐시되지 않습니다
const listRunRecordsCached = unstable_cache(
  async () => createRunRecordService().listRunRecords(),
  ["run-records"],
  { revalidate: 300, tags: ["run-records"] },
);

// 화면에서 쓰는 조회 함수입니다. 노션 실패는 화면에 메시지로 보여 주고, 설정 오류 등은 그대로 던집니다
export async function loadRunRecords(): Promise<{
  records: RunRecordDto[];
  errorMessage: string | null;
}> {
  try {
    const records = await listRunRecordsCached();
    return { records, errorMessage: null };
  } catch (error) {
    if (error instanceof AppError && error.code === "NOTION_REQUEST_FAILED") {
      return { records: [], errorMessage: error.message };
    }
    throw error;
  }
}
