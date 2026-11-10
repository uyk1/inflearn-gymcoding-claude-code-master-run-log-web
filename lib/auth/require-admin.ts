// 서버 측 관리자 확인입니다. 미들웨어를 통과했더라도 관리자 영역의 레이아웃, 페이지, 쓰기 동작에서 다시 호출합니다.
//
// 규칙: 노션에 쓰거나 관리자 정보를 읽는 서버 액션·라우트 핸들러는 첫 줄에서 requireAdmin()을 호출합니다.
// 레이아웃은 클라이언트 이동 때 다시 실행되지 않을 수 있어 레이아웃 확인만으로는 충분하지 않습니다.
import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SESSION_COOKIE_NAME } from "./constants";
import { isValidSessionToken } from "./session";

// 지금 요청에 유효한 관리자 세션이 있는지 확인합니다. 리다이렉트하지 않고 참/거짓만 돌려주므로
// 화면 이동이 맞지 않는 API 라우트 핸들러(401 응답)에서 씁니다
export async function hasAdminSession(): Promise<boolean> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  return isValidSessionToken(token);
}

// 유효한 관리자 세션이 없으면 로그인 화면으로 보냅니다(이후 코드는 실행되지 않음)
export async function requireAdmin(): Promise<void> {
  if (!(await hasAdminSession())) {
    redirect("/admin/login");
  }
}
