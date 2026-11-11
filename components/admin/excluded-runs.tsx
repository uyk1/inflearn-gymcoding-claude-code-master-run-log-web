import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { FOCUS_RING } from "@/lib/focus-ring";
import type { ExcludedRunDto } from "@/lib/notion/dto";
import { cn } from "@/lib/utils";

// 관리자 목록 위에 보여 주는 "제외된 기록" 섹션입니다. 공개 DTO(제목과 사유뿐, 입력 원문 없음)만 받고,
// 각 기록에서 수정 화면으로 들어가 고칠 수 있게 합니다. 제외된 기록이 없으면 그리지 않습니다
export function ExcludedRuns({ items }: { items: ExcludedRunDto[] }) {
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="excluded-runs-heading" className="bg-muted/50 space-y-3 rounded-xl border p-4">
      <div className="space-y-1">
        <h2 id="excluded-runs-heading" className="text-base font-semibold">
          제외된 기록 {items.length}건
        </h2>
        <p className="text-muted-foreground text-sm break-keep">입력값에 문제가 있어 공개 목록에서 빠져 있습니다. 고치면 다시 나타납니다.</p>
      </div>
      <ul className="divide-y">
        {items.map((item) => {
          const title = item.title?.trim() || "제목 없음";
          return (
            <li key={item.pageId} className="flex min-w-0 flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-medium break-words">{title}</p>
                <p className="text-muted-foreground text-sm break-words">
                  <span className="sr-only">제외 사유: </span>
                  {item.reasons.join(", ")}
                </p>
              </div>
              <Link
                href={`/admin/runs/${item.pageId}/edit`}
                // 제목이 같거나 없는 행도 구분되도록 사유를 함께 읽어 줍니다
                aria-label={`${title}(${item.reasons.join(", ")}) 고치기`}
                className={cn(FOCUS_RING, buttonVariants({ variant: "outline", size: "lg" }), "w-full sm:w-auto")}
              >
                고치기
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
