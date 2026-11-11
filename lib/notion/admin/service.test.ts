import assert from "node:assert/strict";
import test, { mock } from "node:test";

import { AppError } from "../../errors.ts";
import { computeVersion } from "./edit-version.ts";
import { createFakeNotion, DATA_SOURCE_ID, runPage, type FakeNotionOptions } from "./fake-notion.ts";
import { pageToRunFormValues } from "./page-to-form.ts";
import { AdminRunRepository } from "./repository.ts";
import { AdminRunService } from "./service.ts";
import { baseProps, prop } from "../test-pages.ts";

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

// 기본 페이지(fake의 retrieve 응답)의 현재 내용 버전입니다
const DEFAULT_VERSION = computeVersion(pageToRunFormValues(runPage() as never));

// 수정 입력(clientKey 없음)
const updateInput = (over: Record<string, unknown> = {}) => {
  const { clientKey: _omit, ...rest } = validInput(over);
  void _omit;
  return rest;
};

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
  const result = await service.updateRun(PAGE_ID, updateInput({ place: "한강" }), DEFAULT_VERSION);

  assert.equal(result.ok, true);
  assert.deepEqual(result.ok && result.id, PAGE_ID);
  assert.deepEqual(fake.methods(), ["pages.retrieve", "pages.update"]);
  const { properties } = fake.calls[1].args as { properties: Record<string, unknown> };
  assert.ok("제목" in properties && "장소" in properties);
  assert.ok(!("출처" in properties) && !("외부ID" in properties));
});

test("updateRun: 출처·외부ID·clientKey를 넣으면 거부하고 노션을 부르지 않는다", async () => {
  for (const extra of [{ source: "NRC" }, { externalId: "x" }, { clientKey: KEY }]) {
    const { fake, service } = setup();
    const result = await service.updateRun(PAGE_ID, { ...updateInput(), ...extra }, DEFAULT_VERSION);
    assert.equal(result.ok, false);
    assert.deepEqual(fake.calls, []);
  }
});

test("updateRun: id 형식이 틀리면 노션을 부르지 않는다", async () => {
  for (const id of ["abc", "", undefined, 123, "../etc"]) {
    const { fake, service } = setup();
    const result = await service.updateRun(id, { title: "t", date: "2026-11-05", distanceKm: 1, duration: "5:00" }, DEFAULT_VERSION);
    assert.equal(result.ok, false);
    assert.ok(!result.ok && result.fieldErrors.id);
    assert.deepEqual(fake.calls, []);
  }
});

test("updateRun: 러닝 기록 DB의 페이지가 아니면 404이고 수정하지 않는다", async () => {
  const { fake, service } = setup({
    retrieved: { id: PAGE_ID, in_trash: false, parent: { type: "page_id", page_id: "other" } },
  });
  await assert.rejects(
    () => service.updateRun(PAGE_ID, updateInput(), DEFAULT_VERSION),
    (error: unknown) => error instanceof AppError && error.status === 404,
  );
  assert.deepEqual(fake.methods(), ["pages.retrieve"]);
});

test("trashRun: 소속을 확인한 뒤 휴지통으로 보낸다", async () => {
  const { fake, service } = setup();
  assert.deepEqual(await service.trashRun(PAGE_ID, DEFAULT_VERSION), { ok: true, id: PAGE_ID });
  assert.deepEqual(fake.methods(), ["pages.retrieve", "pages.update"]);
  assert.deepEqual(fake.calls[1].args, { page_id: PAGE_ID, in_trash: true });
});

test("trashRun: 다른 DB의 페이지는 지우지 않고, 형식이 틀린 id는 노션을 부르지 않는다", async () => {
  const other = setup({ retrieved: { id: PAGE_ID, in_trash: false, parent: { type: "workspace", workspace: true } } });
  await assert.rejects(() => other.service.trashRun(PAGE_ID, DEFAULT_VERSION), (e: unknown) => e instanceof AppError && e.status === 404);
  assert.deepEqual(other.fake.methods(), ["pages.retrieve"]);

  const bad = setup();
  const result = await bad.service.trashRun("not-a-uuid", DEFAULT_VERSION);
  assert.equal(result.ok, false);
  assert.deepEqual(bad.fake.calls, []);
});

test("노션에 없는 페이지(object_not_found)는 502가 아니라 404이고 쓰기는 하지 않는다", async () => {
  const notFound = Object.assign(new Error("Could not find page"), { code: "object_not_found", status: 404 });
  for (const run of [
    (s: AdminRunService) => s.getRunForEdit(PAGE_ID),
    (s: AdminRunService) => s.trashRun(PAGE_ID, DEFAULT_VERSION),
    (s: AdminRunService) => s.updateRun(PAGE_ID, updateInput(), DEFAULT_VERSION),
  ]) {
    const { service, fake } = setup({ failOn: { "pages.retrieve": notFound } });
    await assert.rejects(() => run(service), (e: unknown) => e instanceof AppError && e.code === "NOT_FOUND" && e.status === 404);
    assert.equal(fake.calls.filter((c) => c.method === "pages.update").length, 0);
  }
});

test("update·trash의 노션 실패도 AppError(502)로 바뀌고 로그에 메시지가 없다", async () => {
  const log = captureErrors();
  const notionError = Object.assign(new Error("SECRET-NOTION-MESSAGE"), { code: "internal_server_error", status: 500 });
  const { service } = setup({ failOn: { "pages.update": notionError } });
  await assert.rejects(() => service.trashRun(PAGE_ID, DEFAULT_VERSION), (e: unknown) => e instanceof AppError && e.code === "NOTION_WRITE_FAILED" && e.status === 502);
  assert.ok(!JSON.stringify(log.mock.calls.map((c) => c.arguments)).includes("SECRET"));
  log.mock.restore();
});

// ── 편집용 조회와 내용 버전 충돌 확인(Phase 4) ────────────────────────────────

const noKeyFields = (properties: Record<string, unknown>) => !("출처" in properties) && !("외부ID" in properties);

test("getRunForEdit: 노션에서 직접 읽어 입력칸 값과 내용 버전을 돌려준다", async () => {
  const { fake, service } = setup();
  const result = await service.getRunForEdit(PAGE_ID);

  assert.equal(result.ok, true);
  assert.ok(result.ok && result.version === DEFAULT_VERSION && result.values.title === "한강 아침 러닝" && result.values.tags === "회복, 장거리");
  assert.deepEqual(fake.methods(), ["pages.retrieve"]);
  assert.deepEqual(result.ok && result.notices, []);
});

test("getRunForEdit: 모르는 강도와 전각 쉼표 태그는 notices로 알린다", async () => {
  const { service } = setup({ retrieved: runPage({ properties: baseProps({ 강도: prop.select("몹시 힘듦"), 태그: prop.multi(["a，b"]) }) }) });
  const result = await service.getRunForEdit(PAGE_ID);
  assert.ok(result.ok && result.notices.length === 2);
});

test("getRunForEdit: 형식이 틀린 id는 노션을 부르지 않고, 다른 DB 페이지와 휴지통 페이지는 404", async () => {
  const bad = setup();
  const result = await bad.service.getRunForEdit("nope");
  assert.equal(result.ok, false);
  assert.deepEqual(bad.fake.calls, []);

  for (const retrieved of [
    runPage({ parent: { type: "page_id", page_id: "other" } }),
    runPage({ parent: { type: "workspace", workspace: true } }),
    runPage({ inTrash: true }),
  ]) {
    const { service } = setup({ retrieved });
    await assert.rejects(() => service.getRunForEdit(PAGE_ID), (e: unknown) => e instanceof AppError && e.code === "NOT_FOUND" && e.status === 404);
  }
});

test("updateRun: 버전이 같으면 수정하고, 노션이 돌려준 페이지로 만든 새 버전을 돌려준다", async () => {
  const updated = runPage({ properties: baseProps({ 제목: prop.title("고친 제목"), "거리(Km)": prop.num(6) }) });
  const { fake, service } = setup({ updated });
  const result = await service.updateRun(PAGE_ID, updateInput({ title: "고친 제목", distanceKm: 6 }), DEFAULT_VERSION);

  assert.equal(result.ok, true);
  assert.ok(result.ok && result.id === PAGE_ID);
  assert.ok(result.ok && result.version === computeVersion(pageToRunFormValues(updated as never)));
  assert.ok(result.ok && result.version !== DEFAULT_VERSION);
  assert.deepEqual(fake.methods(), ["pages.retrieve", "pages.update"]);
  assert.ok(noKeyFields((fake.calls[1].args as { properties: Record<string, unknown> }).properties));
});

test("updateRun: 노션에서 먼저 바뀌어 버전이 다르면 409 CONFLICT이고 노션을 수정하지 않는다", async () => {
  // 화면을 연 뒤(DEFAULT_VERSION) 노션에서 제목이 바뀐 상태
  const changedInNotion = runPage({ properties: baseProps({ 제목: prop.title("노션에서 고친 제목") }) });
  const { fake, service } = setup({ retrieved: changedInNotion });

  await assert.rejects(
    () => service.updateRun(PAGE_ID, updateInput({ title: "내가 고친 제목" }), DEFAULT_VERSION),
    (e: unknown) => e instanceof AppError && e.code === "CONFLICT" && e.status === 409,
  );
  assert.deepEqual(fake.methods(), ["pages.retrieve"], "pages.update가 호출되면 안 됨");
});

test("updateRun: 우리가 쓰지 않는 항목(출처, 외부ID)이나 수정 시각이 바뀐 것은 충돌이 아니다", async () => {
  const touched = runPage({
    lastEditedTime: "2026-11-10T09:59:00.000Z",
    properties: baseProps({ 출처: prop.select("NRC"), 외부ID: prop.rich("nrc-123") }),
  });
  const { fake, service } = setup({ retrieved: touched });
  const result = await service.updateRun(PAGE_ID, updateInput(), DEFAULT_VERSION);

  assert.equal(result.ok, true);
  assert.deepEqual(fake.methods(), ["pages.retrieve", "pages.update"]);
});

test("updateRun: 우리가 쓰는 항목 8개 중 어느 것이 노션에서 바뀌어도 충돌로 본다", async () => {
  const changes: Record<string, unknown>[] = [
    { 제목: prop.title("다름") },
    { 날짜: prop.date("2026-11-04") },
    { "거리(Km)": prop.num(7) },
    { 소요시간: prop.rich("26:00") },
    { 장소: prop.rich("다른 곳") },
    { 메모: prop.rich("다른 메모") },
    { 강도: prop.select("HARD") },
    { 태그: prop.multi(["다른"]) },
  ];
  for (const change of changes) {
    const { service } = setup({ retrieved: runPage({ properties: baseProps(change) }) });
    await assert.rejects(
      () => service.updateRun(PAGE_ID, updateInput(), DEFAULT_VERSION),
      (e: unknown) => e instanceof AppError && e.code === "CONFLICT",
      Object.keys(change)[0],
    );
  }
});

test("updateRun: 돌려받은 새 버전으로 이어서 수정해도 충돌로 오판하지 않는다", async () => {
  // 1차 수정: 노션이 돌려준 페이지(고친 내용)
  const afterFirst = runPage({ properties: baseProps({ 제목: prop.title("1차 수정") }) });
  const first = setup({ updated: afterFirst });
  const r1 = await first.service.updateRun(PAGE_ID, updateInput({ title: "1차 수정" }), DEFAULT_VERSION);
  assert.ok(r1.ok);

  // 2차 수정: 이제 노션의 현재 내용은 1차 수정본이고, 화면은 r1.version을 들고 있다
  const second = setup({ retrieved: afterFirst, updated: runPage({ properties: baseProps({ 제목: prop.title("2차 수정") }) }) });
  const r2 = await second.service.updateRun(PAGE_ID, updateInput({ title: "2차 수정" }), r1.ok ? r1.version : "");
  assert.equal(r2.ok, true);
  assert.deepEqual(second.fake.methods(), ["pages.retrieve", "pages.update"]);
});

test("updateRun: 버전이 없거나 문자열이 아니면 노션을 부르지 않고 필드 오류", async () => {
  for (const version of [undefined, null, "", 123, {}]) {
    const { fake, service } = setup();
    const result = await service.updateRun(PAGE_ID, updateInput(), version);
    assert.equal(result.ok, false);
    assert.ok(!result.ok && result.fieldErrors.version);
    assert.deepEqual(fake.calls, []);
  }
});

test("updateRun: 입력이 틀리면 버전이 맞아도 노션을 부르지 않는다", async () => {
  const { fake, service } = setup();
  const result = await service.updateRun(PAGE_ID, updateInput({ duration: "12:5" }), DEFAULT_VERSION);
  assert.equal(result.ok, false);
  assert.ok(!result.ok && result.fieldErrors.duration);
  assert.deepEqual(fake.calls, []);
});

test("updateRun: 노션 수정이 실패하면 502이고 충돌 거부(409)와 구분된다", async () => {
  const log = captureErrors();
  const notionError = Object.assign(new Error("SECRET-NOTION-MESSAGE"), { code: "internal_server_error", status: 500 });
  const { service } = setup({ failOn: { "pages.update": notionError } });
  await assert.rejects(
    () => service.updateRun(PAGE_ID, updateInput(), DEFAULT_VERSION),
    (e: unknown) => e instanceof AppError && e.code === "NOTION_WRITE_FAILED" && e.status === 502,
  );
  assert.ok(!JSON.stringify(log.mock.calls.map((c) => c.arguments)).includes("SECRET"));
  log.mock.restore();
});

test("getRunForEdit: 제외 사유를 돌려주고(정상이면 빈 배열) 형식이 틀린 값끼리 바뀌어도 충돌로 본다", async () => {
  const bad = (소요시간: string) => runPage({ properties: baseProps({ 소요시간: prop.rich(소요시간), 날짜: prop.date(null) }) });
  const { service } = setup({ retrieved: bad("12:5") });
  const result = await service.getRunForEdit(PAGE_ID);
  assert.ok(result.ok && result.excludedReasons.join() === "날짜 없음,소요시간 형식 오류");
  assert.ok(result.ok && result.values.duration === "12:5" && result.values.date === "");

  // 열었을 때의 버전으로, 노션의 형식 오류 값이 12:6으로 바뀐 뒤 저장하면 409(같은 버전으로 뭉개지지 않음)
  const { service: later } = setup({ retrieved: bad("12:6") });
  await assert.rejects(() => later.updateRun(PAGE_ID, updateInput(), result.ok ? result.version : ""), (e: unknown) => e instanceof AppError && e.status === 409);

  const normal = await setup().service.getRunForEdit(PAGE_ID);
  assert.ok(normal.ok && normal.excludedReasons.length === 0);
});

test("trashRun: 내용 버전이 다르면 409이고 휴지통으로 보내지 않는다", async () => {
  const { fake, service } = setup();
  await assert.rejects(() => service.trashRun(PAGE_ID, "0".repeat(32)), (e: unknown) => e instanceof AppError && e.code === "CONFLICT" && e.status === 409);
  assert.deepEqual(fake.methods(), ["pages.retrieve"]);
});

test("trashRun: 버전이 없거나 문자열이 아니면 노션을 부르지 않고 version 오류", async () => {
  for (const version of [undefined, null, "", 123, {}]) {
    const { fake, service } = setup();
    const result = await service.trashRun(PAGE_ID, version);
    assert.ok(!result.ok && result.fieldErrors.version, String(version));
    assert.deepEqual(fake.calls, []);
  }
});

test("trashRun: 출처·외부ID만 바뀐 기록은 충돌이 아니고, 제외 행도 같은 규칙이다", async () => {
  const changed = runPage({ properties: baseProps({ 출처: prop.select("기타"), 외부ID: prop.rich("x") }) });
  const { fake, service } = setup({ retrieved: changed });
  assert.deepEqual(await service.trashRun(PAGE_ID, DEFAULT_VERSION), { ok: true, id: PAGE_ID });
  assert.deepEqual(fake.methods(), ["pages.retrieve", "pages.update"]);
});
