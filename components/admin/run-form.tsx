"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Controller, useForm, type FieldErrors, type Resolver } from "react-hook-form";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ApiFailure, ApiSuccess } from "@/lib/api/response";
import { INTENSITIES } from "@/lib/notion/admin/input";
import {
  emptyRunFormValues,
  mapApiFailureToFieldErrors,
  previewPace,
  toRunPayload,
  validateRunForm,
  type RunFormValues,
} from "@/lib/notion/admin/run-form";
import { cn } from "@/lib/utils";

type SavedRun = { id: string; created: boolean };

// 서버가 보내는 일반 문구가 없을 때 쓰는 안내입니다(입력값은 담지 않습니다)
const RETRY_MESSAGE = "저장하지 못했습니다. 잠시 후 다시 시도해 주세요. 같은 내용으로 다시 저장해도 중복되지 않습니다.";

// 폼 값을 서버와 같은 규칙으로 검증하는 resolver입니다. 통과한 값은 서버에서도 같은 결과로 통과합니다
function createResolver(getClientKey: () => string): Resolver<RunFormValues> {
  return async (values) => {
    const result = validateRunForm(values, getClientKey());
    if (result.success) return { values, errors: {} };

    const errors: FieldErrors<RunFormValues> = {};
    for (const [field, message] of Object.entries(result.errors)) {
      if (field !== "_form") errors[field as keyof RunFormValues] = { type: "validation", message };
    }
    return { values: {}, errors };
  };
}

// 텍스트 입력 한 칸(라벨, 안내, 오류)입니다
function TextField({
  form,
  name,
  label,
  hint,
  ...inputProps
}: {
  form: ReturnType<typeof useForm<RunFormValues>>;
  name: Exclude<keyof RunFormValues, "intensity">;
  label: string;
  hint?: string;
} & Omit<React.ComponentProps<typeof Input>, "name" | "form">) {
  const id = `run-${name}`;
  return (
    <Controller
      name={name}
      control={form.control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          <Input
            {...field}
            {...inputProps}
            id={id}
            className="h-10"
            aria-invalid={fieldState.invalid}
            aria-describedby={hint ? `${id}-hint` : undefined}
          />
          {hint && <FieldDescription id={`${id}-hint`}>{hint}</FieldDescription>}
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}

// 러닝 기록 입력 폼입니다. 검증은 서버와 같은 규칙을 먼저 적용하고, 저장은 POST /api/admin/runs로 합니다.
// 폼이 열릴 때 만든 clientKey는 재시도에도 그대로 보내 같은 기록이 두 번 만들어지지 않게 하고,
// 저장에 성공하면 새 키로 바꿉니다
export function RunForm({ today }: { today: string }) {
  const clientKeyRef = useRef<string | null>(null);
  const inFlightRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState<SavedRun | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);

  // 키는 처음 필요할 때 브라우저에서 한 번 만듭니다(화면에 그리지 않으므로 서버 렌더링과 어긋나지 않음)
  function getClientKey(): string {
    if (!clientKeyRef.current) clientKeyRef.current = crypto.randomUUID();
    return clientKeyRef.current;
  }

  const form = useForm<RunFormValues>({
    defaultValues: emptyRunFormValues(today),
    resolver: createResolver(getClientKey),
  });

  const pace = previewPace(form.watch("duration"), form.watch("distance"));

  async function onSubmit(values: RunFormValues) {
    // 버튼이 비활성화되기 전의 연타를 막습니다(키가 같아 서버에서도 중복 생성되지 않음)
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setSubmitting(true);
    setFormError(null);
    setExpired(false);

    try {
      const response = await fetch("/api/admin/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toRunPayload(values, getClientKey())),
      });
      const body = (await response.json().catch(() => null)) as ApiSuccess<SavedRun> | ApiFailure | null;

      if (response.ok && body?.success) {
        setSaved(body.data);
        return;
      }
      if (response.status === 401) {
        // 입력한 내용은 그대로 두고 로그인 안내만 보여 줍니다
        setExpired(true);
        return;
      }
      if (response.status === 400 && body && !body.success) {
        const errors = mapApiFailureToFieldErrors(body);
        for (const [field, message] of Object.entries(errors)) {
          if (field === "_form") setFormError(message ?? RETRY_MESSAGE);
          else form.setError(field as keyof RunFormValues, { type: "server", message });
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

  // 계속 입력: 폼을 비우고 새 기록용 키를 만듭니다
  function startNext() {
    clientKeyRef.current = null;
    form.reset(emptyRunFormValues(today));
    setSaved(null);
    setFormError(null);
    setExpired(false);
  }

  if (saved) {
    return (
      <Card>
        <CardHeader>
          <CardTitle role="status">{saved.created ? "저장되었습니다" : "이미 저장된 기록입니다"}</CardTitle>
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
      <FieldGroup>
        <TextField form={form} name="title" label="제목" placeholder="예: 한강 아침 러닝" autoComplete="off" maxLength={100} />
        <TextField form={form} name="date" label="날짜" type="date" />
        <TextField form={form} name="distance" label="거리 (km)" inputMode="decimal" placeholder="5.25" autoComplete="off" />
        <TextField
          form={form}
          name="duration"
          label="소요시간"
          placeholder="25:30"
          autoComplete="off"
          hint="mm:ss 또는 h:mm:ss 형식이며 초와 분은 두 자리로 씁니다. 예: 25:30, 1:05:03"
        />
        {/* 입력 오타를 눈으로 잡을 수 있도록 예상 페이스를 보여 줍니다. 자리를 항상 차지해 화면이 흔들리지 않습니다 */}
        <p aria-live="polite" className="text-muted-foreground min-h-5 text-sm">
          {pace ? `예상 페이스 ${pace}` : ""}
        </p>
        <TextField form={form} name="place" label="장소 (선택)" autoComplete="off" maxLength={200} />

        <Controller
          name="intensity"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel id="run-intensity-label">강도 (선택)</FieldLabel>
              <div role="group" aria-labelledby="run-intensity-label" className="grid grid-cols-3 gap-2">
                {INTENSITIES.map((option) => {
                  const selected = field.value === option;
                  return (
                    <Button
                      key={option}
                      type="button"
                      size="lg"
                      variant={selected ? "default" : "outline"}
                      aria-pressed={selected}
                      // 선택된 버튼을 다시 누르면 선택이 해제됩니다
                      onClick={() => field.onChange(selected ? "" : option)}
                    >
                      {option}
                    </Button>
                  );
                })}
              </div>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <TextField
          form={form}
          name="tags"
          label="태그 (선택)"
          autoComplete="off"
          placeholder="인터벌, 회복"
          hint="쉼표로 구분하며 최대 10개입니다."
        />

        <Controller
          name="memo"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="run-memo">메모 (선택)</FieldLabel>
              <Textarea {...field} id="run-memo" rows={3} maxLength={1000} aria-invalid={fieldState.invalid} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>

      {expired && (
        <FieldError>
          로그인 시간이 지났습니다. 입력한 내용은 이 화면에 남아 있으니{" "}
          <Link href="/admin/login" className="underline underline-offset-4">
            다시 로그인
          </Link>
          한 뒤 저장해 주세요.
        </FieldError>
      )}
      {formError && <FieldError>{formError}</FieldError>}

      <Button type="submit" size="lg" className="w-full" disabled={submitting}>
        {submitting ? "저장 중..." : "저장"}
      </Button>
    </form>
  );
}
