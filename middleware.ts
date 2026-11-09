import { NextResponse, type NextRequest } from "next/server";

import { MIN_SESSION_SECRET_LENGTH, SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySessionToken } from "@/lib/auth/token";

// /admin 이하의 1차 차단입니다. 세션 쿠키가 없거나 유효하지 않으면 로그인 화면으로 보냅니다.
// 이것만 믿지 않습니다. 관리자 페이지와 쓰기 동작은 서버에서 requireAdmin()으로 다시 확인합니다.
// 미들웨어는 Edge 런타임이므로 Web Crypto만 쓰는 lib/auth/token.ts를 사용합니다(server-only 모듈은 import하지 않음).
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 로그인 화면 자체는 누구나 열 수 있어야 합니다
  if (pathname === "/admin/login") return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  // 비밀값이 없거나 너무 짧으면 열리지 않습니다(닫힌 쪽으로 실패)
  const secret = process.env.ADMIN_SESSION_SECRET ?? "";
  const valid = secret.length >= MIN_SESSION_SECRET_LENGTH && (await verifySessionToken(secret, token, Date.now()));
  if (valid) return NextResponse.next();

  return NextResponse.redirect(new URL("/admin/login", request.url));
}

// 공개 화면(/, /runs, /stats, 상세)에는 영향을 주지 않도록 /admin 이하만 대상으로 합니다
export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
