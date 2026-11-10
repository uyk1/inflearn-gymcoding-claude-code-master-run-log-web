// API 응답 형식을 한 가지로 통일합니다. 성공과 실패 모두 success 필드로 구분합니다
export type ApiSuccess<T> = {
  success: true;
  data: T;
};

export type ApiFailure = {
  success: false;
  error: {
    code: string;
    message: string;
    // 필드별 검증 오류처럼 화면이 쓰는 추가 정보입니다(없으면 키 자체가 없습니다). 입력값은 담지 않습니다
    details?: Record<string, string>;
  };
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export function apiSuccess<T>(data: T): ApiSuccess<T> {
  return { success: true, data };
}

export function apiFailure(code: string, message: string, details?: Record<string, string>): ApiFailure {
  return { success: false, error: details ? { code, message, details } : { code, message } };
}
