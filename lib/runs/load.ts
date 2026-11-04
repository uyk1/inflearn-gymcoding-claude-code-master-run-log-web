import { unstable_cache } from "next/cache";
import { createRunRecordService } from "@/lib/notion/container";
import type { RunRecordListDto } from "@/lib/notion/dto";
import { AppError } from "@/lib/errors";

const DEFAULT_REVALIDATE_SECONDS = 300;

// 목록 캐시 기간(초)입니다. 테스트할 때만 RUN_RECORDS_REVALIDATE_SECONDS로 줄이고, 없거나 올바르지 않으면 300초입니다
function readRevalidateSeconds(): number {
  const raw = process.env.RUN_RECORDS_REVALIDATE_SECONDS;
  const seconds = Number(raw);
  if (Number.isInteger(seconds) && seconds >= 1) return seconds;

  // 값을 넣었는데 올바르지 않으면 조용히 5분이 되지 않도록 알립니다. 변수가 없을 때는 알리지 않습니다
  if (raw !== undefined && raw.trim() !== "") {
    console.warn(
      `[runs] RUN_RECORDS_REVALIDATE_SECONDS는 1 이상의 정수여야 합니다. 기본값 ${DEFAULT_REVALIDATE_SECONDS}초를 사용합니다`,
    );
  }
  return DEFAULT_REVALIDATE_SECONDS;
}

// 노션 조회만 기본 5분간 캐시합니다. 실패 시 예외를 던지므로 실패 결과는 캐시되지 않습니다
const listRunRecordsCached = unstable_cache(
  async () => createRunRecordService().listRunRecords(),
  // 키의 버전은 캐시 값의 형태가 바뀔 때 올려 이전 형태를 읽지 않게 하는 용도이고(v2: { records, excluded }),
  // tags는 revalidateTag로 수동 무효화할 때 쓰는 용도입니다 (지금은 호출하는 곳이 없습니다)
  ["run-records", "v2"],
  { revalidate: readRevalidateSeconds(), tags: ["run-records"] },
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
