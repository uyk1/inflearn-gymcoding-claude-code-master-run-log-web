// 기록 목록을 불러오는 동안 보이는 자리표시 화면입니다
export default function RunsLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="기록을 불러오는 중">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="bg-muted-foreground/15 h-8 w-32 animate-pulse rounded-md" />
        <div className="bg-muted-foreground/15 h-8 w-48 animate-pulse rounded-md" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="bg-muted-foreground/15 h-32 animate-pulse rounded-xl" />
        ))}
      </div>
    </div>
  );
}
