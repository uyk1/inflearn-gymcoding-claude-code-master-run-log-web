// 제외 사유를 수정 화면의 입력칸과 안내 문구로 대응시키는 순수 함수입니다.
// 클라이언트 컴포넌트도 import하므로 타입만 가져오고 서버 전용 모듈에 의존하지 않습니다.
import type { ExcludedReason } from "../dto.ts";
import type { RunFormValues } from "./run-form.ts";

// 사유가 가리키는 입력칸입니다(제목 없음 → title 등)
const FIELD_BY_REASON: Record<ExcludedReason, keyof RunFormValues> = {
  "제목 없음": "title",
  "날짜 없음": "date",
  "날짜 형식 오류": "date",
  "거리 없음": "distance",
  "소요시간 없음": "duration",
  "소요시간 형식 오류": "duration",
};

export function reasonToField(reason: ExcludedReason): keyof RunFormValues {
  return FIELD_BY_REASON[reason];
}

// 사유에 해당하는 입력칸 목록입니다(중복 없이, 폼 순서대로)
export function excludedFields(reasons: readonly ExcludedReason[]): (keyof RunFormValues)[] {
  const order: (keyof RunFormValues)[] = ["title", "date", "distance", "duration"];
  const fields = new Set(reasons.map(reasonToField));
  return order.filter((field) => fields.has(field));
}

// 수정 화면 위에 보여 주는 안내 문구입니다. 제외 사유가 없으면 null입니다.
// 사유는 해당 입력칸의 오류 문구가 알려 주므로(스크린 리더가 두 번 읽지 않게) 여기서는 반복하지 않습니다
export function excludedNoticeText(reasons: readonly ExcludedReason[]): string | null {
  if (reasons.length === 0) return null;
  return "이 기록은 입력값에 문제가 있어 목록에서 제외돼 있습니다. 아래에 표시된 칸을 고쳐서 저장하면 목록에 나타납니다.";
}
