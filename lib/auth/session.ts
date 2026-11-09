// 관리자 세션 서버 모듈입니다. 환경 변수에서 비밀번호와 서명 비밀값을 읽습니다.
// 값은 로그에 남기지 않고, 설정이 없으면 값 없이 AppError만 던집니다.
import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

import { AppError } from "../errors";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "./constants";
import { createSessionToken, verifySessionToken } from "./token";

// 환경 변수를 읽습니다. 비어 있으면 설정 오류로 처리해 로그인을 막습니다(값은 절대 출력하지 않음)
function readEnv(name: "ADMIN_PASSWORD" | "ADMIN_SESSION_SECRET"): string {
  const value = process.env[name];
  if (!value) {
    throw new AppError("AUTH_NOT_CONFIGURED", "관리자 인증이 설정되지 않았습니다.", 500);
  }
  return value;
}

// 비밀번호를 상수 시간으로 비교합니다. 길이가 달라도 시간이 같도록 SHA-256 해시끼리 비교합니다
export function verifyPassword(input: string): boolean {
  const expected = createHash("sha256").update(readEnv("ADMIN_PASSWORD")).digest();
  const actual = createHash("sha256").update(input).digest();
  return timingSafeEqual(expected, actual);
}

// 로그인 성공 시 쿠키에 담을 세션 토큰을 만듭니다
export async function issueSessionToken(nowMs: number = Date.now()): Promise<string> {
  return createSessionToken(readEnv("ADMIN_SESSION_SECRET"), nowMs + SESSION_MAX_AGE_SECONDS * 1000);
}

// 쿠키 값이 유효한 세션인지 확인합니다. 설정이 없거나 값이 없으면 false입니다
export async function isValidSessionToken(token: string | undefined, nowMs: number = Date.now()): Promise<boolean> {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return false;
  return verifySessionToken(secret, token, nowMs);
}

// 세션 쿠키 설정입니다. 운영에서만 Secure를 켭니다(로컬 http 개발 허용)
export function sessionCookieOptions() {
  return {
    name: SESSION_COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}
