import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { StatsGranularity } from "@/lib/runs/stats";

const VIEW_OPTIONS: { value: StatsGranularity; label: string }[] = [
  { value: "week", label: "주간" },
  { value: "month", label: "월간" },
];

// 통계 기간 단위 탭입니다. 링크로 주소의 view 값을 바꾸므로 서버에서 바로 집계됩니다
export function StatsViewTabs({ current }: { current: StatsGranularity }) {
  return (
    <nav aria-label="통계 기간 단위" className="flex gap-2">
      {VIEW_OPTIONS.map((option) => (
        <Link
          key={option.value}
          href={`/stats?view=${option.value}`}
          aria-current={current === option.value ? "page" : undefined}
          className={cn(
            buttonVariants({
              variant: current === option.value ? "default" : "outline",
              size: "sm",
            }),
          )}
        >
          {option.label}
        </Link>
      ))}
    </nav>
  );
}
