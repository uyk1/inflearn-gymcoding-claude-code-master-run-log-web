"use client";

import { Controller, useForm, type FieldErrors, type Resolver } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { INTENSITIES } from "@/lib/notion/admin/input";
import { previewPace, validateRunForm, type RunFormValues } from "@/lib/notion/admin/run-form";

export type RunFormApi = ReturnType<typeof useForm<RunFormValues>>;

// 폼 값을 서버와 같은 규칙으로 검증하는 resolver입니다. 통과한 값은 서버에서도 같은 결과로 통과합니다.
// clientKey는 생성 API에서만 필요한 값이라, 수정 화면은 형식만 맞는 자리표시 값을 넘깁니다
export function createRunFormResolver(getClientKey: () => string): Resolver<RunFormValues> {
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

// 입력칸의 안내문과 오류 문구를 스크린 리더가 칸과 함께 읽도록 연결하는 id 목록입니다
function describedBy(id: string, hasHint: boolean, invalid: boolean): string | undefined {
  const ids = [hasHint ? `${id}-hint` : null, invalid ? `${id}-error` : null].filter(Boolean);
  return ids.length > 0 ? ids.join(" ") : undefined;
}

// 텍스트 입력 한 칸(라벨, 안내, 오류)입니다
function TextField({
  form,
  name,
  label,
  hint,
  ...inputProps
}: {
  form: RunFormApi;
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
            aria-describedby={describedBy(id, Boolean(hint), fieldState.invalid)}
          />
          {hint && <FieldDescription id={`${id}-hint`}>{hint}</FieldDescription>}
          {fieldState.invalid && <FieldError id={`${id}-error`} errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}

// 기록 입력칸 전체입니다. 생성 폼과 수정 폼이 함께 씁니다
export function RunFormFields({ form }: { form: RunFormApi }) {
  const pace = previewPace(form.watch("duration"), form.watch("distance"));

  return (
    <FieldGroup>
      <TextField form={form} name="title" label="제목" placeholder="예: 한강 아침 러닝" autoComplete="off" />
      <TextField form={form} name="date" label="날짜" type="date" />
      <TextField
        form={form}
        name="distance"
        label="거리 (km)"
        inputMode="decimal"
        placeholder="5.25"
        autoComplete="off"
        hint="소수점은 마침표(.)로 씁니다. 예: 5.25"
      />
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
      <TextField form={form} name="place" label="장소 (선택)" autoComplete="off" />

      <Controller
        name="intensity"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel id="run-intensity-label">강도 (선택)</FieldLabel>
            <div
              role="group"
              aria-labelledby="run-intensity-label"
              aria-describedby={fieldState.invalid ? "run-intensity-error" : undefined}
              className="grid grid-cols-3 gap-2"
            >
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
            {fieldState.invalid && <FieldError id="run-intensity-error" errors={[fieldState.error]} />}
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
            <Textarea
              {...field}
              id="run-memo"
              rows={3}
              aria-invalid={fieldState.invalid}
              aria-describedby={describedBy("run-memo", false, fieldState.invalid)}
            />
            {fieldState.invalid && <FieldError id="run-memo-error" errors={[fieldState.error]} />}
          </Field>
        )}
      />
    </FieldGroup>
  );
}
