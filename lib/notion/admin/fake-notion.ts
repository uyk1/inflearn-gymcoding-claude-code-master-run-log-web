// 테스트용 가짜 노션 클라이언트입니다. 실제 노션을 호출하지 않고, 호출 내용을 기록하고 미리 정한 응답을 돌려줍니다.
// 테스트에서만 import합니다(운영 코드에서 쓰지 않음)
import type { Client } from "@notionhq/client";

export const DATA_SOURCE_ID = "11111111-1111-4111-8111-111111111111";

type Call = { method: string; args: unknown };

export type FakeNotionOptions = {
  // dataSources.query가 돌려줄 결과(없으면 빈 목록)
  queryResults?: { id: string }[];
  // pages.create가 돌려줄 id
  createdId?: string;
  // pages.retrieve가 돌려줄 페이지
  retrieved?: Record<string, unknown>;
  // 이 메서드를 호출하면 던질 오류(예: "pages.create")
  failOn?: Record<string, unknown>;
};

export function createFakeNotion(options: FakeNotionOptions = {}) {
  const calls: Call[] = [];

  const run = <T>(method: string, args: unknown, result: T): Promise<T> => {
    calls.push({ method, args });
    const failure = options.failOn?.[method];
    return failure === undefined ? Promise.resolve(result) : Promise.reject(failure);
  };

  const client = {
    pages: {
      create: (args: unknown) => run("pages.create", args, { id: options.createdId ?? "new-page-id" }),
      update: (args: unknown) => run("pages.update", args, { id: "updated" }),
      retrieve: (args: unknown) =>
        run(
          "pages.retrieve",
          args,
          options.retrieved ?? { id: "page", in_trash: false, parent: { type: "data_source_id", data_source_id: DATA_SOURCE_ID } },
        ),
    },
    dataSources: {
      query: (args: unknown) => run("dataSources.query", args, { results: options.queryResults ?? [] }),
    },
  } as unknown as Client;

  return { client, calls, methods: () => calls.map((call) => call.method) };
}
