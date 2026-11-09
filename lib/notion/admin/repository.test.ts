import assert from "node:assert/strict";
import test from "node:test";

import { AppError } from "../../errors.ts";
import { createFakeNotion, DATA_SOURCE_ID } from "./fake-notion.ts";
import { AdminRunRepository } from "./repository.ts";

const PAGE_ID = "22222222-2222-4222-8222-222222222222";

test("createPage: 러닝 기록 data source를 부모로 페이지를 만들고 id를 돌려준다", async () => {
  const fake = createFakeNotion({ createdId: "created-1" });
  const repository = new AdminRunRepository(fake.client, DATA_SOURCE_ID);
  const properties = { 제목: { title: [{ text: { content: "러닝" } }] } };

  assert.equal(await repository.createPage(properties), "created-1");
  assert.deepEqual(fake.calls, [
    { method: "pages.create", args: { parent: { type: "data_source_id", data_source_id: DATA_SOURCE_ID }, properties } },
  ]);
});

test("findPageIdByExternalId: 외부ID가 같은 페이지를 한 건만 조회한다", async () => {
  const fake = createFakeNotion({ queryResults: [{ id: "existing-1" }] });
  const repository = new AdminRunRepository(fake.client, DATA_SOURCE_ID);

  assert.equal(await repository.findPageIdByExternalId("web-abc"), "existing-1");
  assert.deepEqual(fake.calls, [
    {
      method: "dataSources.query",
      args: {
        data_source_id: DATA_SOURCE_ID,
        filter: { property: "외부ID", rich_text: { equals: "web-abc" } },
        page_size: 1,
      },
    },
  ]);
});

test("findPageIdByExternalId: 없으면 null", async () => {
  const fake = createFakeNotion({ queryResults: [] });
  assert.equal(await new AdminRunRepository(fake.client, DATA_SOURCE_ID).findPageIdByExternalId("web-none"), null);
});

test("updatePage: 속성만 고친다", async () => {
  const fake = createFakeNotion();
  const properties = { 메모: { rich_text: [] } };
  await new AdminRunRepository(fake.client, DATA_SOURCE_ID).updatePage(PAGE_ID, properties);
  assert.deepEqual(fake.calls, [{ method: "pages.update", args: { page_id: PAGE_ID, properties } }]);
});

test("trashPage: in_trash만 true로 보낸다(영구 삭제 아님)", async () => {
  const fake = createFakeNotion();
  await new AdminRunRepository(fake.client, DATA_SOURCE_ID).trashPage(PAGE_ID);
  assert.deepEqual(fake.calls, [{ method: "pages.update", args: { page_id: PAGE_ID, in_trash: true } }]);
});

test("assertRunPage: 러닝 기록 data source의 페이지면 통과한다", async () => {
  const fake = createFakeNotion();
  await new AdminRunRepository(fake.client, DATA_SOURCE_ID).assertRunPage(PAGE_ID);
  assert.deepEqual(fake.methods(), ["pages.retrieve"]);
});

test("assertRunPage: 다른 data source나 다른 부모의 페이지는 404", async () => {
  for (const parent of [
    { type: "data_source_id", data_source_id: "99999999-9999-4999-8999-999999999999" },
    { type: "page_id", page_id: "x" },
    { type: "workspace", workspace: true },
  ]) {
    const fake = createFakeNotion({ retrieved: { id: PAGE_ID, in_trash: false, parent } });
    await assert.rejects(
      () => new AdminRunRepository(fake.client, DATA_SOURCE_ID).assertRunPage(PAGE_ID),
      (error: unknown) => error instanceof AppError && error.code === "NOT_FOUND" && error.status === 404,
    );
  }
});

test("assertRunPage: 이미 휴지통에 있는 페이지는 404", async () => {
  const fake = createFakeNotion({
    retrieved: { id: PAGE_ID, in_trash: true, parent: { type: "data_source_id", data_source_id: DATA_SOURCE_ID } },
  });
  await assert.rejects(
    () => new AdminRunRepository(fake.client, DATA_SOURCE_ID).assertRunPage(PAGE_ID),
    (error: unknown) => error instanceof AppError && error.status === 404,
  );
});

test("AppError는 code, status, name, message를 유지한다", () => {
  const error = new AppError("X", "메시지", 418);
  assert.deepEqual([error.code, error.status, error.name, error.message], ["X", 418, "AppError", "메시지"]);
  assert.equal(new AppError("Y", "m").status, 500);
  assert.ok(error instanceof Error);
});
