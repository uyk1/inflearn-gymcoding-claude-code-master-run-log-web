import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { createRunRecordService } from "@/lib/notion/container";
import { AppError } from "@/lib/errors";
import { formatKoreanDate } from "@/lib/runs/date";

// 노션 데이터를 5분마다 다시 가져옵니다
export const revalidate = 300;

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

  let record;
  try {
    record = await createRunRecordService().findRunRecord(id);
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND") notFound();
    if (error instanceof AppError) {
      return <p className="text-destructive text-sm">{error.message}</p>;
    }
    throw error;
  }

  const fields: { label: string; value: string }[] = [
    { label: "날짜", value: formatKoreanDate(record.date) },
    { label: "거리", value: `${record.distanceKm} km` },
    { label: "소요 시간", value: record.durationText },
    { label: "평균 페이스", value: `${record.paceText}/km` },
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
        <Link href="/runs" className="text-muted-foreground hover:text-foreground text-sm">
          ← 러닝 기록
        </Link>
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
        className={buttonVariants({ variant: "outline" })}
      >
        노션에서 원본 보기
      </a>
    </div>
  );
}
