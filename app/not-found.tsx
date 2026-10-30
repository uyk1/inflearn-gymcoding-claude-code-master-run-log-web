import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// 존재하지 않는 주소나 notFound() 호출 시 보이는 404 화면입니다
export default function NotFound() {
  return (
    <div className="space-y-6 py-10">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">페이지를 찾을 수 없습니다</h1>
        <p className="text-muted-foreground text-sm">
          주소가 잘못되었거나 삭제된 기록일 수 있습니다.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href="/" className={cn(buttonVariants({ variant: "default" }))}>
          홈으로
        </Link>
        <Link href="/runs" className={cn(buttonVariants({ variant: "outline" }))}>
          기록 목록
        </Link>
      </div>
    </div>
  );
}
