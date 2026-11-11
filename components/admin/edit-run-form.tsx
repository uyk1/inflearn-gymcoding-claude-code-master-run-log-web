"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { Button, buttonVariants } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import type { ApiFailure, ApiSuccess } from "@/lib/api/response";
import type { ExcludedReason } from "@/lib/notion/dto";
import { excludedFields, excludedNoticeText } from "@/lib/notion/admin/excluded-fields";
import { mapApiFailureToFieldErrors, toRunPayload, type RunFormValues } from "@/lib/notion/admin/run-form";
import { cn } from "@/lib/utils";
import { createRunFormResolver, RunFormFields } from "./run-form-fields";

// 수정 API는 clientKey를 받지 않으므로 검증에만 쓰는 형식이 맞는 자리표시 값입니다(서버로 보내지 않음)
const PLACEHOLDER_KEY = "00000000-0000-4000-8000-000000000000";
const RETRY_MESSAGE = "저장하지 못했습니다. 잠시 후 다시 시도해 주세요.";

type Notice = "saved" | "conflict" | "gone" | "expired" | "reloaded" | null;

// 러닝 기록 수정 폼입니다. 저장할 때 수정 화면을 연 시점의 내용 버전(version)을 함께 보내고,
// 노션에서 먼저 바뀐 내용이 있으면(409) 덮어쓰지 않고 최신 내용을 다시 불러오게 합니다
export function EditRunForm({
  id,
  initialValues,
  initialVersion,
  excludedReasons,
}: {
  id: string;
  initialValues: RunFormValues;
  initialVersion: string;
  // 이 기록이 목록에서 제외돼 있는 사유(정상 기록이면 빈 배열)
  excludedReasons: ExcludedReason[];
}) {
  const router = useRouter();
  const inFlightRef = useRef(false);
  const noticeRef = useRef<HTMLDivElement>(null);
  // 사용자가 "최신 내용 불러오기"를 눌러 새로고침한 것인지 구분합니다(안내 문구와 포커스 이동에 씁니다)
  const reloadingRef = useRef(false);
  const [reloading, startReload] = useTransition();
  const [version, setVersion] = useState(initialVersion);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  // 제외된 기록을 고쳐 저장했는지(저장 뒤 같은 화면에서 다시 저장해도 제외 안내가 되살아나지 않게 합니다)
  const [fixed, setFixed] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<RunFormValues>({
    defaultValues: initialValues,
    resolver: createRunFormResolver(() => PLACEHOLDER_KEY),
  });

  // 서버가 새 값을 내려주면(처음 렌더링, 최신 내용 불러오기) 입력칸과 버전을 그 값으로 바꿉니다.
  // 서버 컴포넌트가 다시 렌더링될 때만 initialValues가 새 객체가 되므로 입력 중인 값은 지워지지 않습니다.
  // 버전이 아니라 이 객체를 기준으로 삼아, 노션 내용이 처음 열었을 때와 같아져도 다시 채웁니다
  useEffect(() => {
    setVersion(initialVersion);
    form.reset(initialValues);
    setFormError(null);
    setFixed(false);
    setNotice(reloadingRef.current ? "reloaded" : null);
    reloadingRef.current = false;
    // 제외 사유에 해당하는 칸은 열자마자 서버와 같은 검증으로 오류를 보여 줍니다(어디를 고칠지 바로 알 수 있게)
    if (excludedReasons.length > 0) void form.trigger(excludedFields(excludedReasons));
    // form과 initialVersion은 initialValues와 함께 바뀌므로 initialValues만 기준으로 합니다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValues]);

  // 사유 칸의 오류는 제출 전에 직접 만든 것이라(기본 검증 시점이 제출 때) 값을 고쳐도 저장 전까지 남습니다.
  // 오류가 있는 칸이 바뀌면 그 칸만 다시 검증해, 고치는 즉시 오류가 사라지게 합니다
  useEffect(() => {
    const subscription = form.watch((_, { name }) => {
      if (name && form.getFieldState(name).error) void form.trigger(name);
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // 결과 안내가 나타나면 스크린 리더가 읽도록 포커스를 옮깁니다
  useEffect(() => {
    if (notice) noticeRef.current?.focus();
  }, [notice]);

  async function onSubmit(values: RunFormValues) {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setSubmitting(true);
    setFormError(null);
    setNotice(null);

    try {
      // clientKey는 수정에 필요 없으므로 떼어 내고 version을 붙입니다
      const fields: Record<string, unknown> = { ...toRunPayload(values, PLACEHOLDER_KEY) };
      delete fields.clientKey;
      const response = await fetch(`/api/admin/runs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...fields, version }),
      });
      const body = (await response.json().catch(() => null)) as ApiSuccess<{ id: string; version: string }> | ApiFailure | null;

      if (response.ok && body?.success) {
        // 다음 수정이 오탐 충돌 없이 저장되도록 응답의 새 버전으로 바꿉니다
        setVersion(body.data.version);
        setFixed(true);
        setNotice("saved");
        return;
      }
      if (response.status === 401) return setNotice("expired");
      if (response.status === 409) return setNotice("conflict");
      if (response.status === 404) return setNotice("gone");
      if (response.status === 400 && body && !body.success) {
        let focused = false;
        for (const [field, message] of Object.entries(mapApiFailureToFieldErrors(body))) {
          if (field === "_form") {
            setFormError(message ?? RETRY_MESSAGE);
          } else {
            form.setError(field as keyof RunFormValues, { type: "server", message }, { shouldFocus: !focused });
            focused = true;
          }
        }
        return;
      }
      setFormError(body && !body.success ? body.error.message : RETRY_MESSAGE);
    } catch {
      setFormError(RETRY_MESSAGE);
    } finally {
      inFlightRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-6">
      {/* 저장에 성공하면 더 이상 제외된 기록이 아니므로 안내를 감춥니다. 오류 안내(FieldError)와 겹치지 않도록 note 역할만 씁니다 */}
      {excludedReasons.length > 0 && !fixed && (
        <p role="note" className="border-destructive/50 text-destructive rounded-xl border p-3 text-sm break-keep">
          {excludedNoticeText(excludedReasons)}
        </p>
      )}
      <RunFormFields form={form} />

      {notice && (
        // 오류 안내(FieldError)가 이미 role=alert라서 바깥 래퍼에는 역할을 주지 않아 이중 낭독을 막습니다
        <div ref={noticeRef} tabIndex={-1} role={notice === "saved" || notice === "reloaded" ? "status" : undefined} className="space-y-3 outline-none">
          {notice === "saved" && (
            <p className="text-sm font-medium">
              {excludedReasons.length > 0 ? "저장되었습니다. 이제 목록에 표시됩니다." : "저장되었습니다."}{" "}
              <Link href={`/runs/${id}`} className="underline underline-offset-4">
                기록 보기
              </Link>
            </p>
          )}
          {notice === "reloaded" && <p className="text-sm font-medium">노션의 최신 내용을 불러왔습니다.</p>}
          {notice === "conflict" && (
            <FieldError>
              노션에서 먼저 바뀐 내용이 있어 저장하지 않았습니다. 최신 내용을 불러오면 지금 입력한 내용은 사라집니다.
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="mt-3 w-full"
                disabled={reloading}
                onClick={() => {
                  reloadingRef.current = true;
                  startReload(() => router.refresh());
                }}
              >
                {reloading ? "불러오는 중..." : "최신 내용 불러오기"}
              </Button>
            </FieldError>
          )}
          {notice === "gone" && (
            <FieldError>
              이미 삭제된 기록입니다.{" "}
              <Link href="/admin/runs" className="underline underline-offset-4">
                기록 목록으로
              </Link>
            </FieldError>
          )}
          {notice === "expired" && (
            <FieldError>
              로그인 시간이 지났습니다. 입력한 내용은 이 화면에 남아 있습니다.{" "}
              <a href="/admin/login" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                새 탭에서 로그인
              </a>
              한 뒤 이 화면에서 다시 저장해 주세요.
            </FieldError>
          )}
        </div>
      )}
      {formError && <FieldError>{formError}</FieldError>}

      <Button type="submit" size="lg" className="w-full" disabled={submitting}>
        {submitting ? "저장 중..." : "저장"}
      </Button>
      <Link href="/admin/runs" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full")}>
        목록으로
      </Link>
    </form>
  );
}
