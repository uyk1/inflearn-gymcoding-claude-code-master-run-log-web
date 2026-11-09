import Link from "next/link";
import { notFound } from "next/navigation";
import { ErrorMessage } from "@/components/common/error-message";
import { buttonVariants } from "@/components/ui/button";
import { loadRunRecord } from "@/lib/runs/load";
import { formatDistanceLabel, formatPaceLabel } from "@/lib/notion/duration";
import { formatKoreanDate } from "@/lib/runs/date";
import { FOCUS_RING } from "@/lib/focus-ring";
import { cn } from "@/lib/utils";

// 노션 데이터를 60초마다 다시 가져옵니다
export const revalidate = 60;

// 빌드 때 노션을 부르지 않도록 빈 배열을 두고, 첫 방문 때 렌더링해 revalidate로 캐시합니다
export async function generateStaticParams() {
  return [];
}

// 목록으로 돌아가는 링크. 정상 화면과 오류 화면이 같이 씁니다
function BackLink() {
  return (
    <Link
      href="/runs"
      className={cn(FOCUS_RING, "text-muted-foreground hover:text-foreground inline-block rounded-sm text-sm")}
    >
      ← 러닝 기록
    </Link>
  );
}

// 빈 값은 "-"로 표시해서 화면이 깨지지 않게 합니다
function valueOrDash(value: string | null | undefined): string {
  return value && value.trim() !== "" ? value : "-";
}

export default async function RunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // 목록과 같은 공유 캐시에서 찾습니다. 설정 오류 등은 던져져 error.tsx가 처리합니다
  const { record, errorMessage } = await loadRunRecord(id);
  if (errorMessage) {
    return (
      <div className="mx-auto max-w-2xl space-y-3">
        <BackLink />
        <ErrorMessage message={errorMessage} />
      </div>
    );
  }
  if (!record) notFound();

  const fields: { label: string; value: string }[] = [
    { label: "날짜", value: formatKoreanDate(record.date) },
    { label: "거리", value: formatDistanceLabel(record.distanceKm) },
    { label: "소요 시간", value: record.durationText },
    { label: "평균 페이스", value: formatPaceLabel(record.paceSecondsPerKm) },
    { label: "장소", value: valueOrDash(record.place) },
    { label: "강도", value: valueOrDash(record.intensity) },
    { label: "태그", value: record.tags.length > 0 ? record.tags.join(", ") : "-" },
    { label: "메모", value: valueOrDash(record.memo) },
    { label: "출처", value: valueOrDash(record.source) },
    { label: "외부ID", value: valueOrDash(record.externalId) },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-1">
        <BackLink />
        <h1 className="text-2xl font-bold tracking-tight break-words">{record.title}</h1>
      </div>

      <dl className="divide-y rounded-lg border">
        {fields.map((field) => (
          <div key={field.label} className="grid grid-cols-[7rem_1fr] gap-4 px-4 py-3 text-sm">
            <dt className="text-muted-foreground">{field.label}</dt>
            <dd className="break-words">{field.value}</dd>
          </div>
        ))}
      </dl>

      <a
        href={record.notionUrl}
        target="_blank"
        rel="noopener noreferrer"
        // cn(twMerge)은 buttonVariants의 border-transparent와 outline의 border-border 충돌을 정리합니다. 지우면 라이트 모드 테두리가 사라집니다
        className={cn(buttonVariants({ variant: "outline" }))}
      >
        노션에서 원본 보기
      </a>
    </div>
  );
}
