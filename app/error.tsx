"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

// 렌더링 중 오류가 나면 보이는 화면입니다. 오류 내용은 화면에 보여주지 않습니다
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 원인 확인용으로 콘솔에만 남깁니다
    console.error(error);
  }, [error]);

  return (
    <div className="space-y-6 py-10">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">문제가 발생했습니다</h1>
        <p className="text-muted-foreground text-sm">
          잠시 후 다시 시도해 주세요. 문제가 계속되면 나중에 다시 확인해 주세요.
        </p>
      </div>
      <Button onClick={reset}>다시 시도</Button>
    </div>
  );
}
