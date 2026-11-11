// 인증 상수입니다. 미들웨어와 서버 코드가 같은 값을 쓰도록 한곳에 둡니다(import 없음)

// 세션 쿠키 이름
export const SESSION_COOKIE_NAME = "run-log-admin";

// 세션 유지 시간: 3일(초). 쿠키 만료와 토큰 만료에 같은 값을 씁니다.
// 서버에서 세션을 미리 폐기할 방법이 없어(만료가 유일한 안전장치) 쿠키가 유출됐을 때의 악용 기간을 줄이려고 정했고,
// 아이폰 홈 화면 앱에서는 3일마다 다시 로그인해야 합니다
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 3;

// 세션 서명 비밀값의 최소 길이. 짧으면 서명 위조(추측)가 쉬워지므로 이보다 짧으면 인증을 설정 오류로 막습니다
export const MIN_SESSION_SECRET_LENGTH = 32;

// 관리자 비밀번호 권장 길이. 이보다 짧으면 서버 로그에 경고만 남깁니다(로그인은 허용)
export const RECOMMENDED_PASSWORD_LENGTH = 12;
