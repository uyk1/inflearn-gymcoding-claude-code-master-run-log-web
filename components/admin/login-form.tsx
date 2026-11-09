"use client";

import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { loginAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const formSchema = z.object({
  password: z.string().min(1, "비밀번호를 입력해 주세요.").max(200, "비밀번호가 너무 깁니다."),
});

type FormValues = z.infer<typeof formSchema>;

// 관리자 로그인 폼입니다. 검증과 인증은 서버 액션이 다시 하며, 여기서는 입력 안내만 합니다
export function LoginForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { password: "" },
  });

  function onSubmit(values: FormValues) {
    setServerError(null);
    startTransition(async () => {
      // 성공하면 서버 액션이 /admin으로 이동시키므로 실패 결과만 돌아옵니다
      const result = await loginAction(values);
      if (result && !result.ok) {
        setServerError(result.message);
        form.resetField("password");
      }
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
      <FieldGroup>
        <Controller
          name="password"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="admin-password">비밀번호</FieldLabel>
              <Input
                {...field}
                id="admin-password"
                type="password"
                autoComplete="current-password"
                aria-invalid={fieldState.invalid}
                disabled={isPending}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>
      {serverError && <FieldError>{serverError}</FieldError>}
      <Button type="submit" size="lg" className="w-full" disabled={isPending}>
        {isPending ? "확인 중..." : "로그인"}
      </Button>
    </form>
  );
}
