// 관리자 쓰기 API 라우트(POST, PATCH, DELETE)가 함께 쓰는 요청 확인과 응답 변환입니다.
//
// 이 경로(/api/admin/...)는 미들웨어 matcher(/admin) 밖이라, 각 핸들러 안의 확인이 유일한 방어입니다.
// 순서: Origin 확인 → 세션 확인 → (본문 읽기) → 검증 → 서비스 호출. 어느 단계에서도 입력값과 키를 응답·로그에 남기지 않습니다.
import "server-only";

import { NextResponse, type NextRequest } from "next/server";

import { isConfigErrorCode, toPublicMessage } from "@/lib/api/public-error";
import { apiFailure, type ApiFailure, type ApiSuccess } from "@/lib/api/response";
import { AppError } from "@/lib/errors";
import { isSameOrigin } from "./origin";
import { hasAdminSession } from "./require-admin";

// 요청 본문 크기 상한(바이트). 기록 한 건에는 충분하고, 터무니없이 큰 요청은 파싱 전에 거부합니다
export const MAX_BODY_BYTES = 20_000;

// 모든 응답은 캐시하지 않습니다
export function json<T>(body: ApiSuccess<T> | ApiFailure, status: number) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

// Origin과 세션을 확인합니다. 통과하면 null, 아니면 그대로 돌려줄 실패 응답(403, 401)입니다
export async function checkAdminRequest(request: NextRequest): Promise<NextResponse | null> {
  if (!isSameOrigin(request.headers.get("origin"), request.nextUrl.origin)) {
    return json(apiFailure("FORBIDDEN", "허용되지 않은 요청입니다."), 403);
  }
  if (!(await hasAdminSession())) {
    return json(apiFailure("UNAUTHORIZED", "로그인이 필요합니다."), 401);
  }
  return null;
}

export type JsonBodyResult = { ok: true; body: unknown } | { ok: false; response: NextResponse };

// 본문을 읽어 JSON으로 파싱합니다. 선언된 크기가 이미 크면 읽지 않고 거부하고, 읽은 뒤에도 실제 바이트 수를 다시 확인합니다
export async function readJsonBody(request: NextRequest): Promise<JsonBodyResult> {
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return { ok: false, response: json(apiFailure("PAYLOAD_TOO_LARGE", "요청이 너무 큽니다."), 413) };
  }
  const text = await request.text();
  if (Buffer.byteLength(text, "utf8") > MAX_BODY_BYTES) {
    return { ok: false, response: json(apiFailure("PAYLOAD_TOO_LARGE", "요청이 너무 큽니다."), 413) };
  }
  try {
    return { ok: true, body: JSON.parse(text) };
  } catch {
    return { ok: false, response: json(apiFailure("INVALID_JSON", "요청 형식이 올바르지 않습니다."), 400) };
  }
}

// 서비스에서 던진 오류를 응답으로 바꿉니다. AppError는 code와 status를 그대로 쓰되 설정 오류는 일반 문구로 숨기고,
// 예상하지 못한 오류는 내부 정보를 숨긴 채 오류 이름만 서버 로그에 남깁니다. operation은 로그에 쓰는 작업 이름입니다
export function errorResponse(error: unknown, operation: string): NextResponse {
  if (error instanceof AppError) {
    // 설정 오류의 메시지에는 환경 변수 이름 같은 내부 정보가 있을 수 있어 응답에는 일반 문구만 보내고, 서버 로그에는 코드만 남깁니다
    if (isConfigErrorCode(error.code)) console.error("[api] 관리자 쓰기 설정 오류", { code: error.code });
    return json(apiFailure(error.code, toPublicMessage(error.code, error.message)), error.status);
  }
  console.error(`[api] 관리자 기록 ${operation} 중 예상하지 못한 오류`, { name: error instanceof Error ? error.name : "unknown" });
  return json(apiFailure("INTERNAL_ERROR", "처리하지 못했습니다. 잠시 후 다시 시도해 주세요."), 500);
}
