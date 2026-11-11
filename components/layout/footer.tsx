import Link from "next/link";

// 서버 컴포넌트: 정적 문구와 링크만 있으므로 클라이언트 JS가 필요 없습니다
export function Footer() {
  return (
    <footer className="border-t">
      <div className="container mx-auto flex flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row">
        <p>
          © {new Date().getFullYear()} Run Log
          {/* 홈 화면 앱(독립 창)에는 주소창이 없어 관리자 화면으로 들어갈 길이 필요합니다. 정적 링크라 쿠키를 읽지 않으므로
              공개 화면의 정적·ISR 렌더링은 그대로입니다. 로그인하지 않았으면 미들웨어가 로그인 화면으로 보냅니다.
              prefetch를 끄는 것은 방문자마다 /admin을 미리 요청하지 않게 하기 위해서입니다 */}
          <span aria-hidden> · </span>
          <Link
            href="/admin"
            prefetch={false}
            className="hover:text-foreground inline-flex min-h-11 items-center underline underline-offset-4 transition-colors sm:min-h-0"
          >
            관리자
          </Link>
        </p>
        <p>
          Built with{" "}
          <a
            href="https://nextjs.org"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground underline underline-offset-4 transition-colors"
          >
            Next.js
          </a>{" "}
          &amp;{" "}
          <a
            href="https://ui.shadcn.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground underline underline-offset-4 transition-colors"
          >
            shadcn/ui
          </a>
        </p>
      </div>
    </footer>
  );
}
