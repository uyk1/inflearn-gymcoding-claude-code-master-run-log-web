# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

러닝 기록을 노션(CMS)에 쌓고 웹에서 살펴보는 프로젝트입니다. Next.js 15 + shadcn/ui 기반 스타터 킷에서 출발했으며, 현재 인증·DB는 포함되어 있지 않습니다. 노션 연동은 `lib/notion/`에 구현되어 있고, 화면은 서버 컴포넌트에서 이를 직접 읽습니다(API 라우트는 아직 없음).
전역 규칙(한국어 응답·주석·커밋, 들여쓰기, TypeScript, Tailwind)은 `~/.claude/CLAUDE.md`를 따릅니다.

## 명령어와 검증

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

- **폼**: `useForm` + `zodResolver` + `Controller` + `Field`/`FieldError` 조합. 기준 예제 페이지는 제거되었으므로 이 조합을 직접 따르세요.
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
- **MCP**: 라이브러리 문서는 context7로 확인하세요.

## 구조 (큰 그림)

노션 데이터는 아래 순서로만 화면까지 올라갑니다. 새 기능도 이 경로를 따릅니다.

```
Notion data source
  → lib/notion/repository.ts  dataSources.query 호출, 커서를 따라 전체 페이지 순회
  → lib/notion/mapper.ts      페이지 → RunRecordDto, 필수값·형식 검사 (실패 행은 제외하고 console.warn)
  → lib/notion/service.ts     listRunRecords / findRunRecord, 노션 실패는 AppError(502)로 변환
  → lib/notion/container.ts   환경 변수를 읽어 조립 (createRunRecordService)
  → lib/runs/load.ts          화면용 로더, 노션 실패는 errorMessage로 돌려줌
  → app/ 서버 컴포넌트         위 로더를 직접 호출 (현재 API 라우트는 없음)
```

- 노션 속성 이름은 `lib/notion/properties.ts`에만 둡니다. 노션에서 필드 이름이 바뀌면 여기만 고칩니다.
- 소요시간은 노션에 텍스트(`mm:ss` 또는 `h:mm:ss`)로 저장합니다. 초 변환과 페이스 계산(`lib/notion/duration.ts`)은 앱에서 하며, 페이스는 노션에 저장하지 않습니다.
- `NOTION_DATA_SOURCE_ID`는 DB ID가 아니라 data source ID입니다. SDK 기본 Notion 버전은 `2025-09-03`입니다.
- 에러: 서비스 계층은 `lib/errors.ts`의 `AppError`(code, status)를 던집니다. API 응답 형식은 `lib/api/response.ts`의 `apiSuccess`/`apiFailure`를 씁니다. 라우트 핸들러를 새로 만들면 이 형식을 쓰세요.
- 기간 필터와 날짜 계산은 `lib/runs/date.ts`입니다. 기준은 한국 시간이고, 주는 월요일에 시작하며, 날짜는 "YYYY-MM-DD" 문자열끼리 비교합니다.
- 노션 호출을 줄이는 방식: 홈과 상세(`/runs/[id]`)는 `export const revalidate = 300`(ISR, 상세는 `generateStaticParams`가 빈 배열), 목록(`/runs`)은 동적 페이지이고 노션 조회만 `lib/runs/load.ts`의 `unstable_cache`로 5분 캐시합니다. 노션에서 바꾼 내용은 최대 5분 뒤에 반영됩니다.
- 기록 화면의 컴포넌트는 `components/runs/`에 있습니다.

## 프로젝트 컨텍스트

- PRD 문서: @docs/PRD.md
- 개발 로드맵: @docs/ROADMAP.md
