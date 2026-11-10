"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldError } from "@/components/ui/field";
import type { ApiFailure, ApiSuccess } from "@/lib/api/response";
import {
  emptyRunFormValues,
  isContentChanged,
  mapApiFailureToFieldErrors,
  payloadSignature,
  toRunPayload,
  type RunFormValues,
} from "@/lib/notion/admin/run-form";
import { cn } from "@/lib/utils";
import { createRunFormResolver, RunFormFields } from "./run-form-fields";

type SavedRun = { id: string; created: boolean };
// 저장 결과와 함께, 같은 키로 이미 저장된 기록이 있었는데 지금 내용이 이전 시도와 다른지 담습니다
type SavedState = SavedRun & { contentChanged: boolean };

// 서버가 보내는 일반 문구가 없을 때 쓰는 안내입니다(입력값은 담지 않습니다)
const RETRY_MESSAGE = "저장하지 못했습니다. 잠시 후 다시 시도해 주세요. 같은 내용으로 다시 저장해도 중복되지 않습니다.";

// 러닝 기록 입력 폼입니다. 검증은 서버와 같은 규칙을 먼저 적용하고, 저장은 POST /api/admin/runs로 합니다.
// 폼이 열릴 때 만든 clientKey는 재시도에도 그대로 보내 같은 기록이 두 번 만들어지지 않게 하고,
// 저장에 성공하면 새 키로 바꿉니다
export function RunForm({ today }: { today: string }) {
  const clientKeyRef = useRef<string | null>(null);
  const inFlightRef = useRef(false);
  // 이 키로 보낸 시도 중 서버에 닿았는지 알 수 없는 것(네트워크 오류, 5xx)의 내용 서명입니다.
  // 응답이 유실된 채 저장됐을 수 있어, 나중에 내용을 고쳐 다시 저장했을 때 달라졌는지 알리는 데 씁니다
  const uncertainSignaturesRef = useRef<string[]>([]);
  const titleRef = useRef<HTMLDivElement>(null);
  const focusTitleNextRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState<SavedState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);

  // 키는 처음 필요할 때 브라우저에서 한 번 만듭니다(화면에 그리지 않으므로 서버 렌더링과 어긋나지 않음)
  function getClientKey(): string {
    if (!clientKeyRef.current) clientKeyRef.current = crypto.randomUUID();
    return clientKeyRef.current;
  }

  const form = useForm<RunFormValues>({
    defaultValues: emptyRunFormValues(today),
    resolver: createRunFormResolver(getClientKey),
  });

  // 저장 결과 화면이 나타나면 제목으로, 계속 입력으로 돌아오면 제목 입력칸으로 포커스를 옮깁니다
  useEffect(() => {
    if (saved) {
      titleRef.current?.focus();
    } else if (focusTitleNextRef.current) {
      focusTitleNextRef.current = false;
      form.setFocus("title");
    }
  }, [saved, form]);

  async function onSubmit(values: RunFormValues) {
    // 버튼이 비활성화되기 전의 연타를 막습니다(키가 같아 서버에서도 중복 생성되지 않음)
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setSubmitting(true);
    setFormError(null);
    setExpired(false);

    const signature = payloadSignature(values);
    try {
      const response = await fetch("/api/admin/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toRunPayload(values, getClientKey())),
      });
      const body = (await response.json().catch(() => null)) as ApiSuccess<SavedRun> | ApiFailure | null;

      if (response.ok && body?.success) {
        // 이미 저장된 기록이라는 응답이면, 이전에 보냈을 수 있는 내용과 지금 내용이 다른지 함께 알립니다
        const contentChanged = !body.data.created && isContentChanged(signature, uncertainSignaturesRef.current);
        setSaved({ ...body.data, contentChanged });
        return;
      }
      if (response.status === 401) {
        // 입력한 내용은 그대로 두고 로그인 안내만 보여 줍니다
        setExpired(true);
        return;
      }
      if (response.status === 400 && body && !body.success) {
        const errors = mapApiFailureToFieldErrors(body);
        let focused = false;
        for (const [field, message] of Object.entries(errors)) {
          if (field === "_form") {
            setFormError(message ?? RETRY_MESSAGE);
          } else {
            // 첫 오류 칸으로만 포커스를 옮깁니다(클라이언트 검증 실패 때와 같은 동작)
            form.setError(field as keyof RunFormValues, { type: "server", message }, { shouldFocus: !focused });
            focused = true;
          }
        }
        return;
      }
      // 서버가 행을 만들었는지 알 수 없는 실패(5xx)는 내용을 기억해 둡니다. 400·401·403 같은 거부는 만들지 않은 것이 확실합니다
      if (response.status >= 500) uncertainSignaturesRef.current.push(signature);
      setFormError(body && !body.success ? body.error.message : RETRY_MESSAGE);
    } catch {
      // 네트워크 오류는 요청이 서버에 닿았는지 알 수 없습니다
      uncertainSignaturesRef.current.push(signature);
      setFormError(RETRY_MESSAGE);
    } finally {
      inFlightRef.current = false;
      setSubmitting(false);
    }
  }

  // 계속 입력: 폼을 비우고 새 기록용 키를 만듭니다
  function startNext() {
    clientKeyRef.current = null;
    uncertainSignaturesRef.current = [];
    focusTitleNextRef.current = true;
    form.reset(emptyRunFormValues(today));
    setSaved(null);
    setFormError(null);
    setExpired(false);
  }

  if (saved) {
    const warn = !saved.created && saved.contentChanged;
    return (
      <Card>
        <CardHeader>
          {/* tabIndex -1: 저장 결과가 나타나면 스크린 리더가 읽도록 이 제목으로 포커스를 옮깁니다 */}
          <CardTitle ref={titleRef} role="status" tabIndex={-1} className="outline-none">
            {saved.created ? "저장되었습니다" : warn ? "이전에 저장된 기록이 있습니다" : "이미 저장된 기록입니다"}
          </CardTitle>
          {warn && (
            <CardDescription>
              같은 요청으로 이미 저장된 기록이 있어, 방금 고친 내용은 저장되지 않았을 수 있습니다. 기록 보기에서 저장된 내용을 확인해 주세요.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-2 sm:flex-row">
          <Link href={`/runs/${saved.id}`} className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}>
            기록 보기
          </Link>
          <Button type="button" variant="outline" size="lg" className="w-full sm:w-auto" onClick={startNext}>
            계속 입력
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-6">
      <RunFormFields form={form} />

      {expired && (
        <FieldError>
          로그인 시간이 지났습니다. 입력한 내용은 이 화면에 남아 있습니다.{" "}
          {/* 같은 탭으로 이동하면 입력한 내용이 사라지므로 새 탭에서 로그인하게 합니다 */}
          <a href="/admin/login" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
            새 탭에서 로그인
          </a>
          한 뒤 이 화면에서 다시 저장해 주세요.
        </FieldError>
      )}
      {formError && <FieldError>{formError}</FieldError>}

      <Button type="submit" size="lg" className="w-full" disabled={submitting}>
        {submitting ? "저장 중..." : "저장"}
      </Button>
    </form>
  );
}
