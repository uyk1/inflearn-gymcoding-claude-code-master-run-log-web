import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";

import { apiFailure, apiSuccess } from "@/lib/api/response";
import { checkAdminRequest, errorResponse, json, readJsonBody } from "@/lib/auth/admin-request";
import { createAdminRunService } from "@/lib/notion/admin/container";
import { isPageId } from "@/lib/notion/admin/input";
import { parseUpdateBody } from "@/lib/notion/admin/update-body";

type Context = { params: Promise<{ id: string }> };

// 관리자 영역(미들웨어 matcher 밖)이므로 이 핸들러 안의 확인이 유일한 방어입니다.
// id가 UUID 형식이 아니면 노션을 부르기 전에 거부합니다. 서비스는 이어서 그 페이지가 러닝 기록 DB의 것인지 확인합니다

// 기록 수정: 본문은 { version, ...입력 필드 }. version은 수정 화면을 열 때 받은 내용 버전이며,
// 노션의 현재 내용과 다르면 409로 거부하고 덮어쓰지 않습니다
export async function PATCH(request: NextRequest, { params }: Context) {
  const rejected = await checkAdminRequest(request);
  if (rejected) return rejected;

  const { id } = await params;
  if (!isPageId(id)) {
    return json(apiFailure("VALIDATION_FAILED", "입력값을 확인해 주세요.", { id: "기록 식별값이 올바르지 않습니다." }), 400);
  }

  const body = await readJsonBody(request);
  if (!body.ok) return body.response;
  const parsed = parseUpdateBody(body.body);
  if (!parsed.ok) {
    return json(apiFailure("VALIDATION_FAILED", "입력값을 확인해 주세요.", parsed.fieldErrors), 400);
  }

  try {
    const result = await createAdminRunService().updateRun(id, parsed.fields, parsed.version);
    if (!result.ok) {
      return json(apiFailure("VALIDATION_FAILED", "입력값을 확인해 주세요.", result.fieldErrors), 400);
    }
    // 수정한 내용이 공개 화면에 바로 보이도록 조회 캐시를 갱신합니다
    revalidateTag("run-records");
    return json(apiSuccess({ id: result.id, version: result.version }), 200);
  } catch (error) {
    return errorResponse(error, "수정");
  }
}

// 기록 삭제: 노션 휴지통으로만 보냅니다(복구할 수 있고 영구 삭제는 하지 않습니다). 화면에서 확인 단계를 거친 뒤 호출합니다
export async function DELETE(request: NextRequest, { params }: Context) {
  const rejected = await checkAdminRequest(request);
  if (rejected) return rejected;

  const { id } = await params;
  if (!isPageId(id)) {
    return json(apiFailure("VALIDATION_FAILED", "입력값을 확인해 주세요.", { id: "기록 식별값이 올바르지 않습니다." }), 400);
  }

  try {
    const result = await createAdminRunService().trashRun(id);
    if (!result.ok) {
      return json(apiFailure("VALIDATION_FAILED", "입력값을 확인해 주세요.", result.fieldErrors), 400);
    }
    // 삭제한 기록이 공개 화면에서 바로 사라지도록 조회 캐시를 갱신합니다
    revalidateTag("run-records");
    return json(apiSuccess({ id: result.id }), 200);
  } catch (error) {
    return errorResponse(error, "삭제");
  }
}
