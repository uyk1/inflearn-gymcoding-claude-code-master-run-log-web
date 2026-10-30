import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

// 서버 컴포넌트: 훅이 필요한 ThemeToggle만 클라이언트 경계로 분리합니다
export function Header() {
  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-bold">
            Run Log
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              홈
            </Link>
          </nav>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
