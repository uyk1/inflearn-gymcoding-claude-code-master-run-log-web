// 서비스 계층에서 발생한 예상 가능한 에러입니다. 라우트 핸들러에서 HTTP 응답으로 바꿉니다
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number = 500,
  ) {
    super(message);
    this.name = "AppError";
  }
}
