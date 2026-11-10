import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

import { isConfigErrorCode, toPublicMessage } from "@/lib/api/public-error";
import { apiFailure, apiSuccess, type ApiFailure, type ApiSuccess } from "@/lib/api/response";
import { isSameOrigin } from "@/lib/auth/origin";
import { hasAdminSession } from "@/lib/auth/require-admin";
import { AppError } from "@/lib/errors";
import { createAdminRunService } from "@/lib/notion/admin/container";

// 요청 본문 크기 상한(바이트). 기록 한 건에는 충분하고, 터무니없이 큰 요청은 파싱 전에 거부합니다
const MAX_BODY_BYTES = 20_000;

// 관리자 영역(미들웨어 matcher 밖)이므로 이 핸들러 안의 확인이 유일한 방어입니다.
// 순서: Origin 확인 → 세션 확인 → 본문 검증 → 서비스 호출. 어느 단계에서도 입력값과 키를 응답·로그에 남기지 않습니다
function json<T>(body: ApiSuccess<T> | ApiFailure, status: number) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request.headers.get("origin"), request.nextUrl.origin)) {
    return json(apiFailure("FORBIDDEN", "허용되지 않은 요청입니다."), 403);
  }
  if (!(await hasAdminSession())) {
    return json(apiFailure("UNAUTHORIZED", "로그인이 필요합니다."), 401);
  }

  // 선언된 크기가 이미 크면 본문을 읽지 않고 거부하고, 읽은 뒤에도 실제 바이트 수를 다시 확인합니다
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return json(apiFailure("PAYLOAD_TOO_LARGE", "요청이 너무 큽니다."), 413);
  }
  const text = await request.text();
  if (Buffer.byteLength(text, "utf8") > MAX_BODY_BYTES) {
    return json(apiFailure("PAYLOAD_TOO_LARGE", "요청이 너무 큽니다."), 413);
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return json(apiFailure("INVALID_JSON", "요청 형식이 올바르지 않습니다."), 400);
  }

  try {
    const result = await createAdminRunService().createRun(raw);
    if (!result.ok) {
      return json(apiFailure("VALIDATION_FAILED", "입력값을 확인해 주세요.", result.fieldErrors), 400);
    }
    // 새로 만들었을 때만 공개 화면의 조회 캐시를 갱신합니다(같은 제출의 재시도는 갱신할 것이 없음)
    if (result.created) revalidateTag("run-records");
    return json(apiSuccess({ id: result.id, created: result.created }), result.created ? 201 : 200);
  } catch (error) {
    if (error instanceof AppError) {
      // 설정 오류의 메시지에는 환경 변수 이름 같은 내부 정보가 있을 수 있어 응답에는 일반 문구만 보내고, 서버 로그에는 코드만 남깁니다
      if (isConfigErrorCode(error.code)) console.error("[api] 관리자 쓰기 설정 오류", { code: error.code });
      return json(apiFailure(error.code, toPublicMessage(error.code, error.message)), error.status);
    }
    // 예상하지 못한 오류는 내부 정보를 숨기고 코드만 남깁니다
    console.error("[api] 관리자 기록 생성 중 예상하지 못한 오류", { name: error instanceof Error ? error.name : "unknown" });
    return json(apiFailure("INTERNAL_ERROR", "처리하지 못했습니다. 잠시 후 다시 시도해 주세요."), 500);
  }
}
