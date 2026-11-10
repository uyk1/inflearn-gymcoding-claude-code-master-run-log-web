// 응답으로 내보내도 되는 오류 문구를 정하는 순수 함수입니다(어떤 모듈도 import하지 않음).
// 설정 오류의 메시지에는 환경 변수 이름 같은 내부 정보가 들어 있을 수 있어, 이런 코드는 일반 문구만 응답합니다.
// 원래 메시지는 응답 대신 서버 로그(코드만)에 남기는 용도로만 씁니다

// 값은 아니지만 서버 구성을 드러내는 설정 오류 코드
const CONFIG_ERROR_CODES: ReadonlySet<string> = new Set(["CONFIG_MISSING", "AUTH_NOT_CONFIGURED"]);

export const GENERIC_CONFIG_MESSAGE = "서버 설정 문제로 저장할 수 없습니다. 관리자에게 문의해 주세요.";

export function isConfigErrorCode(code: string): boolean {
  return CONFIG_ERROR_CODES.has(code);
}

// 응답에 실을 문구: 설정 오류는 일반 문구, 그 밖의 서비스 오류는 서비스가 정한 문구를 그대로 씁니다
export function toPublicMessage(code: string, message: string): string {
  return isConfigErrorCode(code) ? GENERIC_CONFIG_MESSAGE : message;
}
