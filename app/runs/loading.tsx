// 기록 목록을 불러오는 동안 보이는 자리표시 화면입니다
export default function RunsLoading() {
  return (
    <div
      className="space-y-6"
      aria-busy="true"
      aria-label="기록을 불러오는 중"
      role="status"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="bg-muted-foreground/15 h-8 w-32 animate-pulse rounded-md" />
        <div className="bg-muted-foreground/15 h-8 w-48 animate-pulse rounded-md" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          // RunCard와 같은 구조(py-4, 날짜·제목 줄, 값 줄)로 높이를 맞춥니다
          <div
            key={index}
            className="ring-foreground/10 flex animate-pulse flex-col gap-4 rounded-xl px-4 py-4 ring-1"
          >
            <div className="space-y-1">
              <div className="bg-muted-foreground/15 h-5 w-28 rounded-md" />
              <div className="bg-muted-foreground/15 h-5.5 w-2/3 rounded-md" />
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <div className="bg-muted-foreground/15 h-5 w-24 rounded-md" />
              <div className="bg-muted-foreground/15 h-5 w-24 rounded-md" />
              <div className="bg-muted-foreground/15 h-5 w-24 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
