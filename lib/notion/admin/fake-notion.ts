// 테스트용 가짜 노션 클라이언트입니다. 실제 노션을 호출하지 않고, 호출 내용을 기록하고 미리 정한 응답을 돌려줍니다.
// 테스트에서만 import합니다(운영 코드에서 쓰지 않음)
import type { Client } from "@notionhq/client";

import { baseProps } from "../test-pages.ts";

export const DATA_SOURCE_ID = "11111111-1111-4111-8111-111111111111";

type Call = { method: string; args: unknown };

// 러닝 기록 data source에 속한 정상 페이지(노션이 돌려주는 읽기 형태)입니다. over로 일부만 바꿔 씁니다
export function runPage(
  over: { id?: string; properties?: Record<string, unknown>; inTrash?: boolean; parent?: unknown; lastEditedTime?: string } = {},
) {
  return {
    id: over.id ?? "page",
    in_trash: over.inTrash ?? false,
    last_edited_time: over.lastEditedTime ?? "2026-11-10T07:15:00.000Z",
    parent: over.parent ?? { type: "data_source_id", data_source_id: DATA_SOURCE_ID },
    properties: over.properties ?? baseProps(),
  };
}

export type FakeNotionOptions = {
  // dataSources.query가 돌려줄 결과(없으면 빈 목록)
  queryResults?: { id: string }[];
  // pages.create가 돌려줄 id
  createdId?: string;
  // pages.retrieve가 돌려줄 페이지(없으면 정상 페이지)
  retrieved?: Record<string, unknown>;
  // pages.update가 돌려줄 갱신된 페이지(없으면 정상 페이지)
  updated?: Record<string, unknown>;
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
      update: (args: unknown) => run("pages.update", args, options.updated ?? runPage()),
      retrieve: (args: unknown) => run("pages.retrieve", args, options.retrieved ?? runPage()),
    },
    dataSources: {
      query: (args: unknown) => run("dataSources.query", args, { results: options.queryResults ?? [] }),
    },
  } as unknown as Client;

  return { client, calls, methods: () => calls.map((call) => call.method) };
}
