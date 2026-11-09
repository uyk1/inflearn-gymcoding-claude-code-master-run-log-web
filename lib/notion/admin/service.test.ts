import assert from "node:assert/strict";
import test, { mock } from "node:test";

import { AppError } from "../../errors.ts";
import { createFakeNotion, DATA_SOURCE_ID, type FakeNotionOptions } from "./fake-notion.ts";
import { AdminRunRepository } from "./repository.ts";
import { AdminRunService } from "./service.ts";

const KEY = "3f2b8c1e-5d4a-4b6c-9e7f-0a1b2c3d4e5f";
const PAGE_ID = "22222222-2222-4222-8222-222222222222";

function setup(options: FakeNotionOptions = {}) {
  const fake = createFakeNotion(options);
  return { fake, service: new AdminRunService(new AdminRunRepository(fake.client, DATA_SOURCE_ID)) };
}

const validInput = (over: Record<string, unknown> = {}) => ({
  title: "한강 아침 러닝",
  date: "2026-11-05",
  distanceKm: 5,
  duration: "25:00",
  clientKey: KEY,
  ...over,
});

// 서비스가 남기는 오류 로그를 모아서 확인합니다
function captureErrors() {
  return mock.method(console, "error", () => {});
}

test("createRun: 새 키면 외부ID를 조회한 뒤 페이지를 만든다", async () => {
  const { fake, service } = setup({ createdId: "created-1" });
  const result = await service.createRun(validInput());

  assert.deepEqual(result, { ok: true, id: "created-1", created: true });
  assert.deepEqual(fake.methods(), ["dataSources.query", "pages.create"]);
  const create = fake.calls[1].args as { properties: Record<string, unknown>; parent: unknown };
  assert.deepEqual(create.parent, { type: "data_source_id", data_source_id: DATA_SOURCE_ID });
  assert.deepEqual(create.properties.출처, { select: { name: "수동" } });
  assert.deepEqual(create.properties.외부ID, { rich_text: [{ text: { content: `web-${KEY}` } }] });
});

test("createRun: 같은 키가 이미 있으면 새로 만들지 않고 기존 id를 돌려준다", async () => {
  const { fake, service } = setup({ queryResults: [{ id: "existing-1" }] });
  const result = await service.createRun(validInput());

  assert.deepEqual(result, { ok: true, id: "existing-1", created: false });
  assert.deepEqual(fake.methods(), ["dataSources.query"]);
});

test("createRun: 같은 제출을 두 번 보내도 행은 하나만 만들어진다", async () => {
  // 첫 호출 뒤에는 노션이 만든 행을 돌려주는 상태를 흉내 냅니다
  const fake = createFakeNotion({ createdId: "created-1" });
  const service = new AdminRunService(new AdminRunRepository(fake.client, DATA_SOURCE_ID));
  const first = await service.createRun(validInput());

  const fake2 = createFakeNotion({ queryResults: [{ id: "created-1" }] });
  const second = await new AdminRunService(new AdminRunRepository(fake2.client, DATA_SOURCE_ID)).createRun(validInput());

  assert.deepEqual(first, { ok: true, id: "created-1", created: true });
  assert.deepEqual(second, { ok: true, id: "created-1", created: false });
  assert.equal(fake.methods().filter((m) => m === "pages.create").length, 1);
  assert.equal(fake2.methods().filter((m) => m === "pages.create").length, 0);
});

test("createRun: 잘못된 입력은 필드별 오류만 돌려주고 노션을 부르지 않는다", async () => {
  for (const [over, field] of [
    [{ duration: "12:5" }, "duration"],
    [{ date: "2026-13-45" }, "date"],
    [{ title: "" }, "title"],
    [{ distanceKm: 0 }, "distanceKm"],
    [{ source: "NRC" }, "_form"],
  ] as const) {
    const { fake, service } = setup();
    const result = await service.createRun(validInput(over));
    assert.equal(result.ok, false);
    assert.ok(!result.ok && result.fieldErrors[field], `${field} 오류가 있어야 함`);
    assert.deepEqual(fake.calls, [], "노션 호출이 없어야 함");
  }
});

test("createRun: 노션 실패는 AppError(NOTION_WRITE_FAILED, 502)로 바뀌고 로그에는 입력값이 없다", async () => {
  for (const failing of ["dataSources.query", "pages.create"]) {
    const log = captureErrors();
    const secretTitle = "SECRET-TITLE-제목";
    const notionError = Object.assign(new Error(`body failed: ${secretTitle} ntn_SECRETKEY`), { code: "rate_limited", status: 429 });
    const { service } = setup({ failOn: { [failing]: notionError } });

    await assert.rejects(
      () => service.createRun(validInput({ title: secretTitle, memo: "SECRET-MEMO" })),
      (error: unknown) =>
        error instanceof AppError &&
        error.code === "NOTION_WRITE_FAILED" &&
        error.status === 502 &&
        !error.message.includes("SECRET"),
    );

    const logged = JSON.stringify(log.mock.calls.map((call) => call.arguments));
    assert.ok(logged.includes("rate_limited") && logged.includes("429") && logged.includes("create"));
    assert.ok(!logged.includes("SECRET"), "로그에 입력값·메시지·키가 없어야 함");
    log.mock.restore();
  }
});

test("updateRun: 소속을 확인한 뒤 수정하고, 출처와 외부ID는 보내지 않는다", async () => {
  const { fake, service } = setup();
  const { clientKey: _omit, ...update } = validInput({ place: "한강" });
  void _omit;
  const result = await service.updateRun(PAGE_ID, update);

  assert.deepEqual(result, { ok: true, id: PAGE_ID });
  assert.deepEqual(fake.methods(), ["pages.retrieve", "pages.update"]);
  const { properties } = fake.calls[1].args as { properties: Record<string, unknown> };
  assert.ok("제목" in properties && "장소" in properties);
  assert.ok(!("출처" in properties) && !("외부ID" in properties));
});

test("updateRun: 출처·외부ID·clientKey를 넣으면 거부하고 노션을 부르지 않는다", async () => {
  for (const extra of [{ source: "NRC" }, { externalId: "x" }, { clientKey: KEY }]) {
    const { fake, service } = setup();
    const { clientKey: _omit, ...update } = validInput();
    void _omit;
    const result = await service.updateRun(PAGE_ID, { ...update, ...extra });
    assert.equal(result.ok, false);
    assert.deepEqual(fake.calls, []);
  }
});

test("updateRun: id 형식이 틀리면 노션을 부르지 않는다", async () => {
  for (const id of ["abc", "", undefined, 123, "../etc"]) {
    const { fake, service } = setup();
    const result = await service.updateRun(id, { title: "t", date: "2026-11-05", distanceKm: 1, duration: "5:00" });
    assert.equal(result.ok, false);
    assert.ok(!result.ok && result.fieldErrors.id);
    assert.deepEqual(fake.calls, []);
  }
});

test("updateRun: 러닝 기록 DB의 페이지가 아니면 404이고 수정하지 않는다", async () => {
  const { fake, service } = setup({
    retrieved: { id: PAGE_ID, in_trash: false, parent: { type: "page_id", page_id: "other" } },
  });
  const { clientKey: _omit, ...update } = validInput();
  void _omit;
  await assert.rejects(
    () => service.updateRun(PAGE_ID, update),
    (error: unknown) => error instanceof AppError && error.status === 404,
  );
  assert.deepEqual(fake.methods(), ["pages.retrieve"]);
});

test("trashRun: 소속을 확인한 뒤 휴지통으로 보낸다", async () => {
  const { fake, service } = setup();
  assert.deepEqual(await service.trashRun(PAGE_ID), { ok: true, id: PAGE_ID });
  assert.deepEqual(fake.methods(), ["pages.retrieve", "pages.update"]);
  assert.deepEqual(fake.calls[1].args, { page_id: PAGE_ID, in_trash: true });
});

test("trashRun: 다른 DB의 페이지는 지우지 않고, 형식이 틀린 id는 노션을 부르지 않는다", async () => {
  const other = setup({ retrieved: { id: PAGE_ID, in_trash: false, parent: { type: "workspace", workspace: true } } });
  await assert.rejects(() => other.service.trashRun(PAGE_ID), (e: unknown) => e instanceof AppError && e.status === 404);
  assert.deepEqual(other.fake.methods(), ["pages.retrieve"]);

  const bad = setup();
  const result = await bad.service.trashRun("not-a-uuid");
  assert.equal(result.ok, false);
  assert.deepEqual(bad.fake.calls, []);
});

test("update·trash의 노션 실패도 AppError(502)로 바뀌고 로그에 메시지가 없다", async () => {
  const log = captureErrors();
  const notionError = Object.assign(new Error("SECRET-NOTION-MESSAGE"), { code: "internal_server_error", status: 500 });
  const { service } = setup({ failOn: { "pages.update": notionError } });
  await assert.rejects(() => service.trashRun(PAGE_ID), (e: unknown) => e instanceof AppError && e.code === "NOTION_WRITE_FAILED" && e.status === 502);
  assert.ok(!JSON.stringify(log.mock.calls.map((c) => c.arguments)).includes("SECRET"));
  log.mock.restore();
});
