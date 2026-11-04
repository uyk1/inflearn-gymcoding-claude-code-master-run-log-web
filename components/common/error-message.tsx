import { cn } from "@/lib/utils";

type ErrorMessageProps = {
  message: string;
  className?: string;
};

// 조회 실패 등 오류 문구. 오류 영역임을 보조기기에 알리도록 role="alert"를 둡니다
export function ErrorMessage({ message, className }: ErrorMessageProps) {
  return (
    <p role="alert" className={cn("text-destructive text-sm", className)}>
      {message}
    </p>
  );
}
