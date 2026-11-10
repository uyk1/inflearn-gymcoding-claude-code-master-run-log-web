import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";

import { apiFailure, apiSuccess } from "@/lib/api/response";
import { checkAdminRequest, errorResponse, json, readJsonBody } from "@/lib/auth/admin-request";
import { createAdminRunService } from "@/lib/notion/admin/container";

// 관리자 영역(미들웨어 matcher 밖)이므로 이 핸들러 안의 확인이 유일한 방어입니다.
// 순서: Origin 확인 → 세션 확인 → 본문 검증 → 서비스 호출. 공통 확인은 lib/auth/admin-request.ts에 있습니다
export async function POST(request: NextRequest) {
  const rejected = await checkAdminRequest(request);
  if (rejected) return rejected;

  const body = await readJsonBody(request);
  if (!body.ok) return body.response;

  try {
    const result = await createAdminRunService().createRun(body.body);
    if (!result.ok) {
      return json(apiFailure("VALIDATION_FAILED", "입력값을 확인해 주세요.", result.fieldErrors), 400);
    }
    // 새로 만들었을 때만 공개 화면의 조회 캐시를 갱신합니다(같은 제출의 재시도는 갱신할 것이 없음)
    if (result.created) revalidateTag("run-records");
    return json(apiSuccess({ id: result.id, created: result.created }), result.created ? 201 : 200);
  } catch (error) {
    return errorResponse(error, "생성");
  }
}
