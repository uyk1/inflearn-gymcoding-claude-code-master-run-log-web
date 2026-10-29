# CLAUDE.md

러닝 기록을 노션(CMS)에 쌓고 웹에서 살펴보는 프로젝트입니다. Next.js 15 + shadcn/ui 기반 스타터 킷에서 출발했으며, 현재 인증·백엔드·DB는 포함되어 있지 않습니다. 노션 연동은 아직 추가 전입니다.
전역 규칙(한국어 응답·주석·커밋, 들여쓰기, TypeScript, Tailwind)은 `~/.claude/CLAUDE.md`를 따릅니다.

## 명령어와 검증

- 개발: `npm run dev` / 빌드: `npm run build` / 린트: `npm run lint`
- 타입 체크: `npx tsc --noEmit`
- 작업 후 전체 검증은 `/check:all` 커맨드를 사용합니다.
- 테스트 러너는 없습니다. 동작 확인은 `npm run dev` 후 화면으로 합니다.
- 셸은 Windows PowerShell입니다. `&&` 대신 `;`를 쓰세요.

## 스택과 주의점

- Next.js 15.5 (App Router, Turbopack), React 19, Tailwind CSS 4 (`tailwind.config` 없음, 설정은 `app/globals.css`).
- zod 4 문법을 씁니다. 예: `z.email()`.
- shadcn 스타일은 `base-nova`이며 Radix가 아니라 `@base-ui/react` 기반입니다. `asChild` 대신 `render` prop 계열 API를 사용하세요.
- `components/ui/`는 shadcn CLI 생성물입니다. 직접 수정은 최소화하고, 추가는 `npx shadcn@latest add <name>`으로 합니다.
- 경로 별칭 `@/*`는 프로젝트 루트를 가리킵니다. `components.json`에 `@/hooks`가 정의되어 있지만 디렉터리는 아직 없습니다.

## 코드 스타일

- `app/`과 직접 만든 `components/`는 세미콜론과 큰따옴표를 씁니다. `components/ui/`는 CLI 생성 스타일(세미콜론 없음)을 그대로 둡니다.
- 클래스 병합은 `lib/utils.ts`의 `cn()`을 사용합니다.
- 기본은 서버 컴포넌트입니다. 상태·이벤트·브라우저 API가 필요할 때만 파일 맨 위에 `"use client"`를 씁니다.

## 기존 패턴 (새 코드는 이 방식을 따르세요)

- **폼**: `useForm` + `zodResolver` + `Controller` + `Field`/`FieldError` 조합. 기준 예제는 `app/form-example/page.tsx`입니다.
- **다크모드**: `app/layout.tsx`의 `ThemeProvider`(`attribute="class"`)와 `<html suppressHydrationWarning>`을 유지하세요. 테마에 따라 달라지는 UI는 `mounted` 가드 뒤에서 그립니다. 기준은 `components/theme-toggle.tsx`입니다.
- **레이아웃**: 헤더·푸터는 `components/layout/`에 있으며 `app/layout.tsx`에서 감쌉니다.

## 환경 변수와 보안

- 브라우저에 노출할 값만 `NEXT_PUBLIC_` 접두사를 씁니다. 비밀 값에는 접두사를 붙이지 않습니다.
- 실제 값은 `.env.local`에만 둡니다. `.env*` 파일은 Claude가 직접 편집할 수 없고(훅 차단), 예시는 `.env.example`에 추가합니다.
- 백엔드 코드(Route Handler, Server Action)를 추가할 때는 전역 백엔드 규칙(레이어드 구조, DTO, 에러 처리, 트랜잭션)을 적용합니다.

## Claude 자동화 (`.claude/`)

- **훅**
  - PreToolUse: `node_modules`, `package-lock.json` 편집과 `rm -rf`, `git push --force`, `git reset --hard`, `git clean -f` 등을 차단합니다.
  - PostToolUse: ts/tsx/js/mjs 편집 후 eslint를 자동 실행합니다. 오류가 나면 바로 수정하세요.
- **커맨드**: `/check:all`(타입 체크 → lint → build), `/git:commit`
- **서브에이전트**: 구현 직후에는 `code-reviewer`, 보안 점검은 `security-checker`, 빌드·타입 오류는 `debugger`를 사용합니다. 나머지는 `.claude/agents/`를 참고하세요.
- **MCP**: `.mcp.json`에 playwright, context7, sequential-thinking, shadcn이 설정되어 있습니다. 라이브러리 문서는 context7로 확인하세요.
