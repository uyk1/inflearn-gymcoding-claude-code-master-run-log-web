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
  → lib/notion/mapper.ts      페이지 → RunRecordDto 또는 ExcludedRunDto, 필수값·형식 검사 (실패 행은 제외하고 사유와 함께 console.warn)
  → lib/notion/service.ts     listRunRecords({ records, excluded }) / findRunRecord, 노션 실패는 AppError(502)로 변환
  → lib/notion/container.ts   환경 변수를 읽어 조립 (createRunRecordService)
  → lib/runs/load.ts          화면용 로더, { records, excluded, errorMessage } 반환 (노션 실패는 errorMessage로)
  → app/ 서버 컴포넌트         위 로더를 직접 호출 (현재 API 라우트는 없음)
```

- 노션 속성 이름은 `lib/notion/properties.ts`에만 둡니다. 노션에서 필드 이름이 바뀌면 여기만 고칩니다.
- 소요시간은 노션에 텍스트(`mm:ss` 또는 `h:mm:ss`, 초와 `h:mm:ss`의 분은 두 자리, 예: `12:5`는 제외)로 저장합니다. 초 변환과 페이스 계산(`lib/notion/duration.ts`)은 앱에서 하며, 페이스는 노션에 저장하지 않습니다.
- `NOTION_DATA_SOURCE_ID`는 DB ID가 아니라 data source ID입니다. SDK 기본 Notion 버전은 `2025-09-03`입니다.
- 에러: 서비스 계층은 `lib/errors.ts`의 `AppError`(code, status)를 던집니다. API 응답 형식은 `lib/api/response.ts`의 `apiSuccess`/`apiFailure`를 씁니다. 라우트 핸들러를 새로 만들면 이 형식을 쓰세요.
- 기간 필터와 날짜 계산은 `lib/runs/date.ts`입니다. 기준은 한국 시간이고, 주는 월요일에 시작하며, 날짜는 "YYYY-MM-DD" 문자열끼리 비교합니다. 노션 날짜에 시간이 포함돼 있어도 `lib/notion/date.ts`(mapper가 사용)가 한국 시간 기준 "YYYY-MM-DD"로 바꿔 주므로 화면과 통계는 항상 이 형식만 받습니다.
- 기간별 통계(주간·월간 총 거리, 총 시간, 평균 페이스)는 `lib/runs/stats.ts`의 `buildPeriodStats`입니다. 노션을 다시 부르지 않고 `loadRunRecords()`의 기록을 입력으로 받으며, 평균 페이스는 기록별 페이스의 평균이 아니라 기간 총 시간 ÷ 총 거리입니다. 거리 0 이하 기록은 합계에서 제외하고, 통계 화면은 평균 페이스가 1:00~30:00/km 범위(`PLAUSIBLE_PACE_RANGE`)를 벗어난 기간의 페이스만 표시하지 않습니다(입력 실수 방어, 거리와 시간 합계는 그대로이고 요약 카드에 이유를 안내합니다). 이 범위는 극단값만 걸러내며, 범위 안에 드는 오타(예: 5km를 0.5km로 입력)는 걸러내지 못합니다. 오늘 이후 날짜의 기록은 오늘이 속한 기간 안이면 합산합니다(이번 달 안의 미래 날짜는 월간에 들어가고, 이번 주를 벗어난 날짜는 주간에서 빠집니다). 운동을 미리 적어 둘 수 있도록 의도한 동작입니다.
- 노션 호출을 줄이는 방식: 홈과 상세(`/runs/[id]`)는 `export const revalidate = 60`(ISR, 상세는 `generateStaticParams`가 빈 배열), 목록(`/runs`)은 동적 페이지이고 노션 조회만 `lib/runs/load.ts`의 `unstable_cache`로 60초 캐시합니다. 노션에서 바꾼 내용은 접속이 꾸준할 때 목록과 상세는 최대 약 1분, 홈은 최대 약 2분(ISR 60초 + 목록 캐시 60초) 뒤에 반영됩니다. 상세는 목록 캐시를 거치지 않고 직접 조회합니다. 한동안 접속이 없었다면 첫 접속에는 이전 내용이 보일 수 있어 새로고침이 필요할 수 있습니다. 테스트할 때만 `.env.local`의 `RUN_RECORDS_REVALIDATE_SECONDS`로 목록 캐시를 줄일 수 있고(홈은 같은 조회 캐시를 읽어 ISR 주기도 그 값으로 함께 짧아지고, 상세는 영향이 없습니다), 운영에는 설정하지 않습니다.
- 기록 화면의 컴포넌트는 `components/runs/`에 있습니다. 제외된 기록 안내(`excluded-notice.tsx`)는 `loadRunRecords()`가 돌려주는 `excluded`를 씁니다.
- 통계 화면은 `app/stats/page.tsx`(`?view=week|month`, 주간 8주·월간 6개월)이고 컴포넌트는 `components/stats/`에 있습니다. `/runs`처럼 `searchParams`를 쓰는 동적 페이지라 `revalidate`는 효과가 없고 노션 조회만 60초 캐시됩니다. 차트 두 개(`distance-chart.tsx`, `pace-chart.tsx`)만 `"use client"`이고 recharts는 이 두 파일에서만 import합니다.
- 차트(recharts 3.8 + shadcn `chart`)를 만들 때: `components/ui/chart.tsx`는 수정하지 않습니다. 이 조합에서는 축 글자 색이 적용되지 않아 `XAxis`/`YAxis`에 `tick={{ fill: "var(--muted-foreground)" }}`를 직접 줍니다. 색은 `--chart-N` 토큰만 쓰고(앱은 무채색이며 다크에서 `--chart-3`은 대비가 부족해 선 색에 `--muted-foreground`를 씁니다), `ChartContainer`에는 반드시 높이를 줍니다.

## 프로젝트 컨텍스트

- PRD 문서: @docs/PRD.md
- 개발 로드맵: @docs/ROADMAP.md
