// PATCH /api/admin/runs/[id]의 요청 본문을 "내용 버전"과 "입력 필드들"로 나누는 순수 함수입니다(어떤 모듈도 import하지 않음).
// 입력 필드의 검증(길이, 형식, 알 수 없는 항목 거부)은 서비스의 strictObject 스키마가 하고, 여기서는 구조만 확인합니다.

// 버전은 sha256 앞 32자(16진수)지만, 형식 자체는 서비스가 노션의 현재 버전과 비교해 판단하므로 여기서는 길이만 제한합니다
const MAX_VERSION_LENGTH = 64;

export type UpdateBodyResult =
  | { ok: true; version: string; fields: Record<string, unknown> }
  | { ok: false; fieldErrors: Record<string, string> };

export function parseUpdateBody(raw: unknown): UpdateBodyResult {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, fieldErrors: { _form: "입력 형식이 올바르지 않습니다." } };
  }

  const { version, ...fields } = raw as Record<string, unknown>;
  if (typeof version !== "string" || version === "" || version.length > MAX_VERSION_LENGTH) {
    return { ok: false, fieldErrors: { version: "기록 버전이 없습니다. 수정 화면을 새로 열어 주세요." } };
  }
  return { ok: true, version, fields };
}
