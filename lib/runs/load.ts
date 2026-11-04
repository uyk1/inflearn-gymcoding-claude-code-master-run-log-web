import { unstable_cache } from "next/cache";
import { createRunRecordService } from "@/lib/notion/container";
import type { RunRecordListDto } from "@/lib/notion/dto";
import { AppError } from "@/lib/errors";

// 노션 조회만 5분간 캐시합니다. 실패 시 예외를 던지므로 실패 결과는 캐시되지 않습니다
const listRunRecordsCached = unstable_cache(
  async () => createRunRecordService().listRunRecords(),
  // 키의 버전은 캐시 값의 형태가 바뀔 때 올려 이전 형태를 읽지 않게 하는 용도이고(v2: { records, excluded }),
  // tags는 revalidateTag로 수동 무효화할 때 쓰는 용도입니다 (지금은 호출하는 곳이 없습니다)
  ["run-records", "v2"],
  { revalidate: 300, tags: ["run-records"] },
);

// 화면에서 쓰는 조회 함수입니다. 노션 실패는 화면에 메시지로 보여 주고, 설정 오류 등은 그대로 던집니다
export async function loadRunRecords(): Promise<
  RunRecordListDto & {
    errorMessage: string | null;
  }
> {
  try {
    const { records, excluded } = await listRunRecordsCached();
    return { records, excluded, errorMessage: null };
  } catch (error) {
    if (error instanceof AppError && error.code === "NOTION_REQUEST_FAILED") {
      return { records: [], excluded: [], errorMessage: error.message };
    }
    throw error;
  }
}
