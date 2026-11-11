// 관리자 쓰기 비즈니스 로직 계층입니다. 입력을 검증한 뒤에만 노션을 부르고, 노션 실패는 AppError로 바꿉니다.
// 로그에는 작업 이름과 오류의 name, code, status만 남깁니다(입력값, 오류 메시지, 키는 남기지 않음).
// 테스트(node --test)에서 바로 실행할 수 있도록 상대 경로 import와 매개변수 프로퍼티 없는 필드를 씁니다.
import { AppError } from "../../errors.ts";
import { computePageVersion } from "./edit-version.ts";
import { isPageId, parseRunInput, parseRunUpdate } from "./input.ts";
import { excludedReasonsOf } from "../mapper.ts";
import type { ExcludedReason } from "../dto.ts";
import { detectLossyChanges, pageToRunFormValues } from "./page-to-form.ts";
import type { AdminRunRepository } from "./repository.ts";
import type { RunFormValues } from "./run-form.ts";
import { toExternalId, toNotionProperties, toNotionUpdateProperties } from "./to-properties.ts";

type FieldErrors = Record<string, string>;

// 입력이 틀리면 ok: false와 필드별 오류만 돌려주고 노션은 부르지 않습니다. 노션 실패는 AppError(502)를 던집니다
export type CreateRunResult = { ok: true; id: string; created: boolean } | { ok: false; fieldErrors: FieldErrors };
export type MutateRunResult = { ok: true; id: string } | { ok: false; fieldErrors: FieldErrors };
// 수정 화면에 채울 입력칸 값과 그 시점의 내용 버전, 저장하면 노션 값이 달라지는 항목 안내(notices)
export type EditRunResult =
  | { ok: true; id: string; values: RunFormValues; version: string; notices: string[]; excludedReasons: ExcludedReason[] }
  | { ok: false; fieldErrors: FieldErrors };
// 수정 결과: 노션이 돌려준 페이지로 만든 새 내용 버전을 함께 돌려줍니다
export type UpdateRunResult = { ok: true; id: string; version: string } | { ok: false; fieldErrors: FieldErrors };

const INVALID_ID = { id: "기록 식별값이 올바르지 않습니다." };

export class AdminRunService {
  private readonly repository: AdminRunRepository;

  constructor(repository: AdminRunRepository) {
    this.repository = repository;
  }

  // 기록을 만듭니다. 같은 clientKey(외부ID)가 이미 있으면 새로 만들지 않고 기존 기록의 id를 돌려줍니다.
  // 한계: 노션 조회가 방금 만든 행을 아주 잠깐 못 볼 수 있어, 중복 방지는 연타·재시도를 막는 수준입니다
  async createRun(raw: unknown): Promise<CreateRunResult> {
    const parsed = parseRunInput(raw);
    if (!parsed.success) return { ok: false, fieldErrors: parsed.fieldErrors };

    return this.guard("create", async () => {
      const existingId = await this.repository.findPageIdByExternalId(toExternalId(parsed.data.clientKey));
      if (existingId) return { ok: true as const, id: existingId, created: false };

      const id = await this.repository.createPage(toNotionProperties(parsed.data));
      return { ok: true as const, id, created: true };
    });
  }

  // 수정 화면용 조회입니다. 공유 캐시가 아니라 노션에서 직접 읽어, 입력칸에 채울 원문 값과 그 시점의 내용 버전을 돌려줍니다.
  // 러닝 기록 DB의 페이지가 아니거나 휴지통에 있으면 404입니다
  async getRunForEdit(pageId: unknown): Promise<EditRunResult> {
    if (!isPageId(pageId)) return { ok: false, fieldErrors: INVALID_ID };

    return this.guard("read", async () => {
      const page = await this.repository.assertRunPage(pageId);
      const values = pageToRunFormValues(page);
      return { ok: true as const, id: pageId, values, version: computePageVersion(page), notices: detectLossyChanges(page), excludedReasons: excludedReasonsOf(page.properties) };
    });
  }

  // 기록을 고칩니다. 출처와 외부ID는 바뀌지 않습니다.
  // baseVersion은 수정 화면을 열 때 받은 내용 버전입니다. 저장 직전에 노션에서 다시 읽은 현재 버전과 다르면
  // 노션에서 먼저 바뀐 것이므로 덮어쓰지 않고 CONFLICT(409)로 거부합니다.
  // 한계: "다시 읽기"와 "수정" 사이(밀리초)의 노션 수정은 막지 못합니다(노션에 조건부 갱신이 없음)
  async updateRun(pageId: unknown, raw: unknown, baseVersion: unknown): Promise<UpdateRunResult> {
    if (!isPageId(pageId)) return { ok: false, fieldErrors: INVALID_ID };
    if (typeof baseVersion !== "string" || baseVersion === "") {
      return { ok: false, fieldErrors: { version: "기록 버전이 없습니다. 수정 화면을 새로 열어 주세요." } };
    }
    const parsed = parseRunUpdate(raw);
    if (!parsed.success) return { ok: false, fieldErrors: parsed.fieldErrors };

    return this.guard("update", async () => {
      const page = await this.repository.assertRunPage(pageId);
      if (computePageVersion(page) !== baseVersion) {
        throw new AppError("CONFLICT", "노션에서 먼저 바뀐 내용이 있어 저장하지 않았습니다.", 409);
      }
      const updated = await this.repository.updatePage(pageId, toNotionUpdateProperties(parsed.data));
      return { ok: true as const, id: pageId, version: computePageVersion(updated) };
    });
  }

  // 기록을 노션 휴지통으로 보냅니다(복구 가능).
  // baseVersion은 수정 화면을 열 때 받은 내용 버전입니다. 삭제 직전에 노션에서 다시 읽은 현재 버전과 다르면
  // 노션에서 먼저 바뀐 것이므로 삭제하지 않고 CONFLICT(409)로 거부합니다(화면의 확인 단계를 건너뛴 직접 호출과
  // 낡은 화면에서의 오삭제를 줄입니다). 수정과 같은 한계: "다시 읽기"와 "삭제" 사이(밀리초)의 변경은 막지 못합니다
  async trashRun(pageId: unknown, baseVersion: unknown): Promise<MutateRunResult> {
    if (!isPageId(pageId)) return { ok: false, fieldErrors: INVALID_ID };
    if (typeof baseVersion !== "string" || baseVersion === "") {
      return { ok: false, fieldErrors: { version: "기록 버전이 없습니다. 수정 화면을 새로 열어 주세요." } };
    }

    return this.guard("trash", async () => {
      const page = await this.repository.assertRunPage(pageId);
      if (computePageVersion(page) !== baseVersion) {
        throw new AppError("CONFLICT", "노션에서 먼저 바뀐 내용이 있어 삭제하지 않았습니다.", 409);
      }
      await this.repository.trashPage(pageId);
      return { ok: true as const, id: pageId };
    });
  }

  // 노션 호출 실패를 AppError(502)로 바꿉니다. 이미 AppError(예: 404)면 그대로 던집니다
  private async guard<T>(operation: string, run: () => Promise<T>): Promise<T> {
    try {
      return await run();
    } catch (error) {
      if (error instanceof AppError) throw error;
      const { name } = error instanceof Error ? error : new Error("unknown");
      const { code, status } = (error ?? {}) as { code?: unknown; status?: unknown };
      console.error("[notion-admin] 쓰기 실패", { operation, name, code, status });
      throw new AppError("NOTION_WRITE_FAILED", "노션에 기록을 저장하지 못했습니다.", 502);
    }
  }
}
