import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { FOCUS_RING } from "@/lib/focus-ring";
import type { ExcludedRunDto } from "@/lib/notion/dto";
import { cn } from "@/lib/utils";

// 목록에서 제외된 노션 행을 접이식으로 안내합니다. 입력값은 받지 않고 제목과 사유만 보여 줍니다
export function ExcludedNotice({ items }: { items: ExcludedRunDto[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <details className="group bg-muted/50 rounded-xl border">
      <summary
        className={cn(
          FOCUS_RING,
          "flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl px-4 py-3 [&::-webkit-details-marker]:hidden",
        )}
      >
        <ChevronRight
          aria-hidden
          className="text-muted-foreground size-4 shrink-0 transition-transform group-open:rotate-90"
        />
        <span className="min-w-0 text-sm">
          <span className="text-foreground font-medium">{items.length}건이 제외되었습니다</span>
          <span className="text-muted-foreground block sm:ml-2 sm:inline">
            노션 행의 값을 확인해 주세요
          </span>
        </span>
      </summary>
      <ul className="divide-y border-t">
        {items.map((item) => {
          const title = item.title?.trim() || "제목 없음";
          return (
            <li
              key={item.pageId}
              className="flex min-w-0 flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            >
              <div className="min-w-0 space-y-1">
                <p className="text-foreground text-sm font-medium break-words">{title}</p>
                <p className="text-muted-foreground text-sm break-words">
                  <span className="sr-only">제외 사유: </span>
                  {item.reasons.join(", ")}
                </p>
              </div>
              <a
                href={item.notionUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${title} 노션에서 보기 (새 탭)`}
                className={cn(
                  FOCUS_RING,
                  "text-foreground inline-flex min-h-11 shrink-0 items-center rounded-md text-sm underline underline-offset-4 sm:min-h-8",
                )}
              >
                노션에서 보기
              </a>
            </li>
          );
        })}
      </ul>
    </details>
  );
}

// 홈에서 쓰는 한 줄 요약입니다. 제외 건수가 있을 때만 목록으로 안내합니다
export function ExcludedNoticeSummary({ count }: { count: number }) {
  if (count <= 0) {
    return null;
  }

  return (
    <p className="text-muted-foreground text-sm">
      노션 기록 {count}건이 목록에서 제외되었습니다.{" "}
      <Link
        href="/runs"
        className={cn(FOCUS_RING, "text-foreground inline-block rounded-sm py-2 underline underline-offset-4")}
      >
        목록에서 사유를 확인하세요
      </Link>
    </p>
  );
}
