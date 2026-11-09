// 서비스 계층에서 발생한 예상 가능한 에러입니다. 라우트 핸들러에서 HTTP 응답으로 바꿉니다
// 매개변수 프로퍼티(public readonly)를 쓰면 Node의 타입 제거 모드(node --test)가 import하지 못해 필드를 직접 선언합니다
export class AppError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number = 500) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
  }
}
