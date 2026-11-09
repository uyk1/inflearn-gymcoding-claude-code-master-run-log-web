// 인증 상수입니다. 미들웨어와 서버 코드가 같은 값을 쓰도록 한곳에 둡니다(import 없음)

// 세션 쿠키 이름
export const SESSION_COOKIE_NAME = "run-log-admin";

// 세션 유지 시간: 7일(초). 쿠키 만료와 토큰 만료에 같은 값을 씁니다
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
