import type { Metadata } from "next";

import { LoginForm } from "@/components/admin/login-form";

// 관리자 화면은 검색에 노출하지 않습니다
export const metadata: Metadata = {
  title: "관리자 로그인 | Run Log",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <div className="mx-auto w-full max-w-sm space-y-6 py-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">관리자 로그인</h1>
        <p className="text-muted-foreground text-sm break-keep">
          기록을 입력·수정·삭제하려면 로그인해 주세요.
        </p>
      </div>
      <LoginForm />
    </div>
  );
}
