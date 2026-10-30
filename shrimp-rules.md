# Development Guidelines

이 문서는 코딩 에이전트가 이 저장소에서 작업할 때 따를 프로젝트 전용 규칙입니다. 전체 구조 설명은 `CLAUDE.md`의 "구조 (큰 그림)"를 따르고, 여기서는 수정 절차와 금지 사항만 다룹니다.

## 1. 프로젝트 개요

- 노션(CMS)에 쌓인 러닝 기록을 Next.js 웹에서 조회합니다.
- 기술 스택: Next.js 15.5 (App Router, Turbopack), React 19, TypeScript strict, Tailwind CSS 4, shadcn/ui(base-nova, `@base-ui/react`), zod 4, react-hook-form, next-themes, `@notionhq/client` v5.
- 자체 DB와 인증은 없습니다. 노션 data source가 DB 역할을 합니다.
- 진행 순서와 상태는 `docs/ROADMAP.md`를 기준으로 합니다.

## 2. 디렉터리와 계층 경로

| 경로 | 역할 | 수정 규칙 |
|---|---|---|
| `lib/notion/properties.ts` | 노션 속성 이름 상수 | 노션 속성 이름은 **이 파일에서만** 씁니다 |
| `lib/notion/duration.ts` | 소요시간 파싱, 시간 표시, 페이스 계산 | 순수 함수로 유지합니다 (import 없음) |
| `lib/notion/dto.ts` | `RunRecordDto` | 화면과 API가 쓰는 형태만 둡니다 |
| `lib/notion/mapper.ts` | 노션 페이지 → DTO | 필수값 검사와 제외 로그는 여기서 합니다 |
| `lib/notion/repository.ts` | dataSources.query 호출과 커서 순회 | 응답 변환을 하지 않습니다 |
| `lib/notion/service.ts` | `listRunRecords`, `findRunRecord` | 노션 실패는 `AppError`로 바꿉니다 |
| `lib/notion/container.ts` | 환경 변수를 읽어 서비스 조립 | 의존성 조립은 여기서만 합니다 |
| `lib/notion/client.ts` | 노션 클라이언트 생성 | 서버 전용입니다 |
| `lib/runs/load.ts` | 화면용 로더 | 노션 실패를 `errorMessage`로 돌려줍니다 |
| `lib/runs/date.ts` | 기간 종류, 날짜 범위, 한국 시간 기준 날짜 | 날짜 비교는 "YYYY-MM-DD" 문자열로 합니다 |
| `lib/errors.ts` | `AppError(code, message, status)` | 예상 가능한 에러는 이 클래스로 던집니다 |
| `lib/api/response.ts` | `apiSuccess`, `apiFailure`, `ApiResponse` | API 응답은 이 형식만 씁니다 |
| `app/**/page.tsx` | 서버 컴포넌트 화면 | 노션을 직접 호출하지 않고 `lib/runs/load.ts` 또는 container를 씁니다 |
| `components/runs/` | 기록 화면 전용 컴포넌트 | 기록 도메인 외 재사용은 `components/`에 둡니다 |
| `components/ui/` | shadcn CLI 생성물 | **수정 금지** (아래 9장) |
| `components/layout/` | 헤더, 푸터 | 메뉴 추가는 `header.tsx`에서 합니다 |
| `docs/PRD.md` | 요구사항 | 노션 필드 변경 시 4장을 함께 고칩니다 |
| `CLAUDE.md` | Claude 작업 규칙과 구조 설명 | 구조가 바뀌면 "구조" 섹션을 갱신합니다 |

## 3. 코드 규칙

- `app/`과 `components/runs/`, `lib/`는 **세미콜론과 큰따옴표**를 씁니다.
- `components/ui/`는 CLI 생성 스타일(세미콜론 없음)을 그대로 둡니다.
- 모든 페이지는 서버 컴포넌트입니다. `"use client"`는 상태, 이벤트, 브라우저 API가 필요할 때만 붙입니다.
- 클래스 병합은 `cn()`(`lib/utils.ts`)을 씁니다.
- 경로 별칭은 `@/`를 씁니다. 예: `import { cn } from "@/lib/utils";`
- 주석은 한국어로 씁니다. 주석은 "왜"를 설명할 때만 씁니다.
- 백엔드 식별자(함수, 변수, 필드)는 camelCase를 씁니다. 노션 속성 이름만 한국어 원문을 씁니다.

## 4. 기능 구현 절차

### 4-1. 노션 속성을 추가하거나 이름을 바꿀 때 (함께 수정)

1. `lib/notion/properties.ts`에 키와 속성 이름을 추가하거나 바꿉니다.
2. `lib/notion/dto.ts`에 필드를 추가합니다.
3. `lib/notion/mapper.ts`에서 해당 타입 읽기 함수를 써서 DTO에 넣습니다.
4. 상세 화면에 보여 줄 필드면 `app/runs/[id]/page.tsx`의 `fields` 배열에 추가합니다.
5. `docs/PRD.md` 4장 표를 같은 이름과 타입으로 맞춥니다.
6. 노션 DB의 실제 속성과 이름, 타입이 일치하는지 확인합니다.

### 4-2. 기간 필터 종류를 추가할 때

1. `lib/runs/date.ts`의 `RunPeriod` 타입, `getPeriodRange`, `parsePeriod`를 함께 고칩니다.
2. `components/runs/period-tabs.tsx`의 `PERIOD_OPTIONS`에 같은 값을 추가합니다.
3. 두 값이 어긋나면 안 됩니다. 예: `RunPeriod`에 `"year"`를 추가하면서 `PERIOD_OPTIONS`에 넣지 않는 것은 금지입니다.

### 4-3. 새 화면(페이지)을 추가할 때

1. 노션 데이터가 필요하면 `loadRunRecords()`(목록) 또는 `createRunRecordService().findRunRecord(id)`(단건)를 씁니다.
2. 노션 호출이 있는 페이지 파일 맨 위에 `export const revalidate = 300;`을 둡니다. `searchParams`를 쓰는 동적 페이지는 페이지 캐시가 안 되므로, `loadRunRecords()`(내부 `unstable_cache` 5분)로 노션 호출을 줄입니다. 동적 세그먼트(`[id]`)는 `generateStaticParams`가 빈 배열을 반환해야 ISR이 됩니다.
3. 화면 이동 링크가 필요하면 `components/layout/header.tsx`의 `nav`에 추가합니다.
4. 기록 전용 컴포넌트는 `components/runs/`에 둡니다.

### 4-4. 라우트 핸들러(API)를 새로 만들 때

1. 응답은 `apiSuccess(data)`와 `apiFailure(code, message)`로 만듭니다.
2. `AppError`를 잡아 `status`를 그대로 씁니다. 그 밖의 예외는 500과 `UNKNOWN`으로 응답합니다.
3. 서비스 호출은 `createRunRecordService()`를 씁니다. 라우트 핸들러에서 노션 클라이언트를 직접 만들지 않습니다.

### 4-5. 구조(계층, 경로)를 바꿀 때

1. 새 경로가 `lib/notion/` 또는 `lib/runs/` 규칙을 따르는지 확인합니다.
2. `CLAUDE.md`의 "구조 (큰 그림)" 섹션을 갱신합니다.
3. 이 문서의 2장 표를 갱신합니다.

## 5. 외부 라이브러리 사용 규칙

- **zod 4**: `z.email()`처럼 v4 문법을 씁니다. v3 문법(`z.string().email()`)을 쓰지 않습니다.
- **shadcn/base-ui**: `asChild`를 쓰지 않습니다. `render` prop 계열 API를 씁니다.
- **shadcn 컴포넌트 추가**: `npx shadcn@latest add <name>`만 씁니다. 파일을 직접 만들어 `components/ui/`에 넣지 않습니다.
- **@notionhq/client**: `dataSources.query`와 `dataSources.retrieve`를 씁니다. 신규 코드에서 `databases.query`를 쓰지 않습니다. 기본 Notion 버전은 SDK가 정하는 `2025-09-03`을 그대로 씁니다.
- **recharts**: 아직 설치되어 있지 않습니다. PRD 4단계(통계)에서만 설치합니다.
- **PRD 기술 스택에 없는 패키지는 설치하지 않습니다.** 설치가 필요하면 먼저 사용자에게 묻습니다.
- 패키지 설치와 제거는 `npm` 명령으로만 합니다. `package-lock.json`을 직접 편집하지 않습니다.

## 6. 워크플로우와 데이터 흐름

```
Notion data source
  → repository (dataSources.query, 커서 순회)
  → mapper (페이지 → RunRecordDto, 실패 행은 제외하고 console.warn)
  → service (listRunRecords / findRunRecord, 노션 실패 → AppError 502)
  → container (환경 변수 → 서비스 조립)
  → lib/runs/load.ts (화면용, 조회만 unstable_cache 5분, errorMessage 반환)
  → app/ 서버 컴포넌트 (직접 호출, 홈·상세는 revalidate = 300)
```

- 새 기능은 이 흐름을 벗어나지 않습니다.
- 노션에서 바뀐 내용은 최대 5분 뒤에 화면에 반영됩니다. 이 지연을 버그로 고치지 않습니다.

### 검증 순서

1. `npx tsc --noEmit`
2. `npm run lint`
3. `npm run build`
4. 화면 확인은 `npm run dev`로 합니다.
- 개발 서버가 떠 있는 상태에서 `npm run build`를 실행하지 않습니다. `.next`가 충돌해 페이지가 500을 냅니다.
- 3000 포트가 사용 중이면 개발 서버는 3001로 뜹니다. 이전 `node` 프로세스를 먼저 정리합니다.
- 테스트 러너는 없습니다. 단일 테스트 실행 명령도 없습니다.

## 7. 함께 수정해야 하는 파일 묶음

| 변경 | 함께 수정할 파일 |
|---|---|
| 노션 속성 추가·이름 변경 | `lib/notion/properties.ts`, `lib/notion/dto.ts`, `lib/notion/mapper.ts`, `docs/PRD.md` 4장, 필요 시 `app/runs/[id]/page.tsx` |
| DTO 필드 추가 | `lib/notion/dto.ts`, `lib/notion/mapper.ts`, `app/runs/[id]/page.tsx`의 `fields`, 필요 시 `components/runs/run-card.tsx` |
| 기간 종류 추가 | `lib/runs/date.ts`, `components/runs/period-tabs.tsx`, `app/runs/page.tsx` |
| 페이스 또는 시간 표시 방식 변경 | `lib/notion/duration.ts`, 관련 DTO 필드 주석, `docs/PRD.md` 4장 계산 규칙 |
| 새 화면 추가 | 해당 `app/**/page.tsx`(`revalidate`), `components/layout/header.tsx`(메뉴가 필요한 경우) |
| 구조 변경 | `CLAUDE.md` "구조 (큰 그림)", 이 문서 2장 |
| 환경 변수 추가 | `.env.example`(사용자가 `.env.local`에 값을 넣음), `lib/notion/container.ts` 또는 `client.ts`, `docs/PRD.md` 3장 |
| MCP 서버 추가 | `.mcp.json`의 최상위 `mcpServers` 아래에만 추가합니다 |

## 8. 판단 기준 (모호할 때 우선순위)

1. 노션 데이터는 항상 `lib/notion/`을 거칩니다. 화면 파일에서 노션을 직접 호출하지 않습니다.
2. 기존 패턴을 따릅니다. 같은 일을 하는 기존 파일이 있으면 그 방식을 복사해서 씁니다.
3. 새 의존성은 PRD 3장 기술 스택에 있는 것만 씁니다.
4. 노션 속성 이름이나 타입이 PRD와 다르면 코드를 PRD에 맞추지 말고, 노션 실제 상태를 기준으로 PRD를 고칠지 사용자에게 묻습니다.
5. 여기 적히지 않은 상황은 관련 코드를 직접 읽고 판단합니다. 근거 없이 추측하지 않습니다.
6. 그래도 판단이 안 되면 작업 전에 사용자에게 묻습니다.

## 9. 금지 사항

**절대 금지**

- `components/ui/` 파일을 직접 수정합니다.
  - 금지 예: `components/ui/button.tsx`의 기본 스타일을 바꿔서 기록 카드 모양을 맞추는 것
  - 허용 예: `components/runs/run-card.tsx`를 새로 만들고 `Card`를 가져다 씁니다
- `.env*` 파일을 편집합니다. 예시 값은 `.env.example`에만 씁니다.
- `package-lock.json`을 직접 편집합니다.
- `node_modules/` 안의 파일을 수정합니다.
- `NOTION_API_KEY`를 클라이언트 컴포넌트, `NEXT_PUBLIC_` 변수, 응답 본문에 넣습니다.
- 노션 속성 이름 문자열(`"거리(Km)"` 등)을 `lib/notion/properties.ts` 밖에 씁니다.
  - 금지 예: `app/runs/page.tsx`에서 `record["거리(Km)"]`처럼 직접 접근
- `databases.query`로 신규 조회를 만듭니다. 기존 `dataSources.query` 경로를 씁니다.
- `rm -rf`, `Remove-Item -Recurse -Force`, `git push --force`, `git reset --hard`, `git clean -f`를 실행합니다. 훅이 차단하며, 우회하지 않습니다.
- 개발 서버가 떠 있는 상태에서 `npm run build`를 실행합니다.
- 검증용 임시 라우트를 만든 뒤 삭제하지 않고 남겨 둡니다.

**확인 후 진행 (사용자 승인 필요)**

- `git push`, PR 생성, PR 머지, 저장소 공개 전환
- `.gitignore` 수정. 현재 `shrimp_data/`가 `.gitignore`에 없어서 커밋될 수 있습니다. 추가 여부는 사용자가 정합니다.
- `docs/PRD.md` 요구사항 변경
- 기존 커밋 수정(amend, rebase)

## 10. 현재 알려진 상태 (작업 전 확인)

- 기록 목록, 상세, 홈 화면(3단계)과 `lib/runs/`는 `feat/run-pages` 브랜치에 있고 아직 커밋되지 않았습니다. 작업 전에 `git status`로 확인합니다.
- `lib/notion/`, `lib/api/`, `lib/errors.ts`는 `main`에 머지되어 있습니다.
- `shrimp-task-manager` MCP 설정은 `.mcp.json`의 최상위 `mcpServers`에 있습니다(커밋 `4116dd0`).
