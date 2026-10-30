import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RunPeriod } from "@/lib/runs/date";

const PERIOD_OPTIONS: { value: RunPeriod; label: string }[] = [
  { value: "week", label: "이번 주" },
  { value: "month", label: "이번 달" },
  { value: "all", label: "전체" },
];

// 기간 필터입니다. 링크로 주소의 period 값을 바꾸므로 서버에서 바로 필터링됩니다
export function PeriodTabs({ current }: { current: RunPeriod }) {
  return (
    <nav aria-label="기간 필터" className="flex gap-2">
      {PERIOD_OPTIONS.map((option) => (
        <Link
          key={option.value}
          href={`/runs?period=${option.value}`}
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
