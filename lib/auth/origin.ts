// 쓰기 요청의 Origin 헤더가 이 앱의 주소와 같은지 확인하는 순수 함수입니다(CSRF 방어의 한 겹).
// 서버 액션과 달리 Route Handler에는 Next가 Origin 검사를 해 주지 않아 직접 확인합니다.
// 어떤 모듈도 import하지 않아 테스트(node --test)에서 바로 실행할 수 있습니다.

// origin이 없거나 형식이 틀리거나 앱 주소(expectedOrigin)와 다르면 false입니다.
// 브라우저는 같은 사이트의 fetch POST에도 Origin을 보내므로, 없는 요청도 거부합니다(관리자 화면에서만 쓰는 API)
export function isSameOrigin(origin: string | null | undefined, expectedOrigin: string): boolean {
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(expectedOrigin).origin;
  } catch {
    return false;
  }
}
