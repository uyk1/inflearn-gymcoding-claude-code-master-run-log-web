// 기록 상세를 불러오는 동안 보이는 자리표시 화면입니다. 구조는 page.tsx와 맞춥니다
export default function RunDetailLoading() {
  return (
    <div
      className="mx-auto max-w-2xl space-y-6"
      aria-busy="true"
      aria-label="기록을 불러오는 중"
      role="status"
    >
      <div className="space-y-1">
        <div className="bg-muted-foreground/15 h-5 w-24 animate-pulse rounded-md" />
        <div className="bg-muted-foreground/15 h-8 w-2/3 animate-pulse rounded-md" />
      </div>

      <div className="divide-y rounded-lg border">
        {Array.from({ length: 10 }).map((_, index) => (
          <div key={index} className="grid grid-cols-[7rem_1fr] gap-4 px-4 py-3 text-sm">
            <div className="bg-muted-foreground/15 h-5 w-16 animate-pulse rounded-md" />
            <div className="bg-muted-foreground/15 h-5 w-1/2 animate-pulse rounded-md" />
          </div>
        ))}
      </div>

      <div className="bg-muted-foreground/15 h-8 w-40 animate-pulse rounded-lg" />
    </div>
  );
}
