"use client";

import { startTransition, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StatusScreen } from "@/components/common/status-screen";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// 렌더링 중 오류가 나면 보이는 화면입니다. 오류 내용은 화면에 보여주지 않습니다
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // 원인 확인용으로 콘솔에만 남깁니다
    console.error(error);
  }, [error]);

  // reset()만으로는 서버 컴포넌트 오류가 복구되지 않으므로
  // 서버 데이터를 다시 가져온 뒤 에러 상태를 지웁니다
  const handleRetry = () => {
    startTransition(() => {
      router.refresh();
      reset();
    });
  };

  return (
    <StatusScreen
      title="문제가 발생했습니다"
      description="잠시 후 다시 시도해 주세요. 문제가 계속되면 나중에 다시 확인해 주세요."
    >
      <div className="flex flex-wrap gap-2">
        <Button onClick={handleRetry}>다시 시도</Button>
        <Link href="/" className={cn(buttonVariants({ variant: "outline" }))}>
          홈으로
        </Link>
      </div>
    </StatusScreen>
  );
}
