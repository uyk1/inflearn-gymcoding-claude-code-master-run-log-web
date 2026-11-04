import type { ReactNode } from "react";

type StatusScreenProps = {
  title: string;
  description: string;
  children?: ReactNode;
};

// 에러·404처럼 화면 전체를 채우는 안내 화면의 공통 구조입니다.
// 훅과 라우터 의존이 없어 클라이언트 컴포넌트(error.tsx 등)에서도 import할 수 있습니다
export function StatusScreen({ title, description, children }: StatusScreenProps) {
  return (
    <div className="space-y-6 py-10">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      {children}
    </div>
  );
}
