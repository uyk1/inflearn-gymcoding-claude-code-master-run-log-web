"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { AppError } from "@/lib/errors";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { checkRateLimit, clearFailures, recordFailure } from "@/lib/auth/rate-limit";
import { issueSessionToken, sessionCookieOptions, verifyPassword } from "@/lib/auth/session";

export type LoginResult = { ok: false; message: string };

const loginSchema = z.object({
  password: z.string().min(1, "비밀번호를 입력해 주세요.").max(200, "비밀번호가 너무 깁니다."),
});

// 실패 제한의 기준이 되는 클라이언트 키입니다. Vercel은 x-forwarded-for를 덮어써 주므로 첫 값을 씁니다
async function clientKey(): Promise<string> {
  const forwarded = (await headers()).get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

// 비밀번호가 틀렸는지, 설정이 잘못됐는지 구분하지 않는 일반 문구입니다(내부 정보 비노출)
const GENERIC_FAILURE = "로그인할 수 없습니다. 비밀번호를 확인한 뒤 다시 시도해 주세요.";

// 로그인: 성공하면 세션 쿠키를 설정하고 /admin으로 이동하며(반환 없음), 실패하면 오류 문구를 돌려줍니다.
// 비밀번호와 입력값은 로그에 남기지 않습니다
export async function loginAction(input: { password: string }): Promise<LoginResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? GENERIC_FAILURE };
  }

  const key = await clientKey();
  const limit = checkRateLimit(key);
  if (limit.blocked) {
    const minutes = Math.ceil(limit.retryAfterSeconds / 60);
    return { ok: false, message: `시도 횟수를 초과했습니다. ${minutes}분 뒤에 다시 시도해 주세요.` };
  }

  let token: string;
  try {
    if (!verifyPassword(parsed.data.password)) {
      recordFailure(key);
      return { ok: false, message: GENERIC_FAILURE };
    }
    token = await issueSessionToken();
  } catch (error) {
    // 환경 변수 누락 등 설정 오류: 값 없이 코드만 남기고 화면에는 일반 문구만 보여 줍니다
    const code = error instanceof AppError ? error.code : "UNKNOWN";
    console.error("[auth] 관리자 로그인 처리 실패", { code });
    return { ok: false, message: GENERIC_FAILURE };
  }

  clearFailures(key);
  (await cookies()).set({ ...sessionCookieOptions(), value: token });
  // redirect는 예외로 동작하므로 try 밖에서 호출합니다
  redirect("/admin");
}

// 로그아웃: 세션 쿠키를 지우고 로그인 화면으로 이동합니다
export async function logoutAction(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE_NAME);
  redirect("/admin/login");
}
