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
  };
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export function apiSuccess<T>(data: T): ApiSuccess<T> {
  return { success: true, data };
}

export function apiFailure(code: string, message: string): ApiFailure {
  return { success: false, error: { code, message } };
}
