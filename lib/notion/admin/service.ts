// 관리자 쓰기 비즈니스 로직 계층입니다. 입력을 검증한 뒤에만 노션을 부르고, 노션 실패는 AppError로 바꿉니다.
// 로그에는 작업 이름과 오류의 name, code, status만 남깁니다(입력값, 오류 메시지, 키는 남기지 않음).
// 테스트(node --test)에서 바로 실행할 수 있도록 상대 경로 import와 매개변수 프로퍼티 없는 필드를 씁니다.
import { AppError } from "../../errors.ts";
import { isPageId, parseRunInput, parseRunUpdate } from "./input.ts";
import type { AdminRunRepository } from "./repository.ts";
import { toExternalId, toNotionProperties, toNotionUpdateProperties } from "./to-properties.ts";

type FieldErrors = Record<string, string>;

// 입력이 틀리면 ok: false와 필드별 오류만 돌려주고 노션은 부르지 않습니다. 노션 실패는 AppError(502)를 던집니다
export type CreateRunResult = { ok: true; id: string; created: boolean } | { ok: false; fieldErrors: FieldErrors };
export type MutateRunResult = { ok: true; id: string } | { ok: false; fieldErrors: FieldErrors };

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

  // 기록을 고칩니다. 출처와 외부ID는 바뀌지 않습니다. (노션에서 먼저 바뀐 내용과의 충돌 확인은 Phase 4)
  async updateRun(pageId: unknown, raw: unknown): Promise<MutateRunResult> {
    if (!isPageId(pageId)) return { ok: false, fieldErrors: { id: "기록 식별값이 올바르지 않습니다." } };
    const parsed = parseRunUpdate(raw);
    if (!parsed.success) return { ok: false, fieldErrors: parsed.fieldErrors };

    return this.guard("update", async () => {
      await this.repository.assertRunPage(pageId);
      await this.repository.updatePage(pageId, toNotionUpdateProperties(parsed.data));
      return { ok: true as const, id: pageId };
    });
  }

  // 기록을 노션 휴지통으로 보냅니다(복구 가능)
  async trashRun(pageId: unknown): Promise<MutateRunResult> {
    if (!isPageId(pageId)) return { ok: false, fieldErrors: { id: "기록 식별값이 올바르지 않습니다." } };

    return this.guard("trash", async () => {
      await this.repository.assertRunPage(pageId);
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
