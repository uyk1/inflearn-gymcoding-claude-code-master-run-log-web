"use client";

import { useEffect } from "react";
import { StatusScreen } from "@/components/common/status-screen";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import "./globals.css";

// 루트 레이아웃 자체가 실패했을 때 보이는 화면입니다.
// 레이아웃이 없으므로 html·body를 직접 그리며, 오류 내용은 화면에 보여주지 않습니다.
// ThemeProvider가 없어 다크 모드는 적용되지 않고 라이트로 보입니다
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 원인 확인용으로 콘솔에만 남깁니다
    console.error(error);
  }, [error]);

  return (
    <html lang="ko">
      <body className="bg-background text-foreground antialiased">
        <div className="container mx-auto px-4 py-8">
          <StatusScreen
            title="문제가 발생했습니다"
            description="잠시 후 다시 시도해 주세요. 문제가 계속되면 나중에 다시 확인해 주세요."
          >
            <div className="flex flex-wrap gap-2">
              {/* 레이아웃이 깨진 상태라 reset 대신 전체를 새로 불러옵니다 */}
              <Button onClick={() => window.location.reload()}>다시 시도</Button>
              {/* 라우터가 깨졌을 수 있어 next/link 대신 a 태그를 씁니다 */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a href="/" className={cn(buttonVariants({ variant: "outline" }))}>
                홈으로
              </a>
            </div>
          </StatusScreen>
        </div>
      </body>
    </html>
  );
}
