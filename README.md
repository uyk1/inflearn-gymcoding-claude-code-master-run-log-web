# Run Log

러닝 기록을 노션(CMS)에 쌓고, 웹에서 조회하고 분석하며 훈련에 도움을 받는 프로젝트입니다.
노션 표에 기록을 입력하면 웹에 반영됩니다. 공개 화면은 읽기 전용입니다. 기록 입력·수정·삭제는 노션 앱에서 하거나, 로그인한 관리자가 웹 관리자 화면에서 합니다.

## 주요 기능

| 화면 | 경로 | 내용 |
|------|------|------|
| 홈 | `/` | 최근 기록 요약, 이번 주 총 거리, 제외된 기록 건수 안내 |
| 기록 목록 | `/runs` | 날짜순 카드, 기간 필터(이번 주, 이번 달, 전체), 제외된 기록 안내 |
| 기록 상세 | `/runs/[id]` | 거리, 시간, 페이스, 장소, 강도, 메모, 태그, 노션 원본 링크 |
| 통계 | `/stats` | 주간(8주)·월간(6개월) 거리와 평균 페이스 추이 차트 |
| 관리자 | `/admin` | 로그인한 관리자만 사용합니다. 기록 입력(`/admin/runs/new`), 목록·수정·삭제와 제외된 기록 고치기(`/admin/runs`). 삭제는 노션 휴지통으로 보냅니다. 홈 화면 앱에서는 공개 화면 푸터의 "관리자" 링크로 들어갑니다 |
| PWA 설치 | 전체 | 안드로이드는 설치 버튼, 아이폰은 "공유 → 홈 화면에 추가" 안내 |

기능 명세와 노션 데이터베이스 구조는 [docs/PRD.md](docs/PRD.md)(v1 PRD는 [docs/prds/PRD-v1.md](docs/prds/PRD-v1.md)), 현재 로드맵(고도화, v2)은 [docs/ROADMAP.md](docs/ROADMAP.md), 완료된 MVP 로드맵(v1)은 [docs/roadmaps/ROADMAP-v1.md](docs/roadmaps/ROADMAP-v1.md)에 있습니다.

## 기술 스택

- Next.js 15 (App Router), React 19
- TypeScript
- Tailwind CSS 4, shadcn/ui (`base-nova` 스타일, `@base-ui/react` 기반)
- Notion API (`@notionhq/client` v5)
- recharts (통계 차트)
- next-themes (다크모드)
- zod 4, react-hook-form (관리자 입력·수정 폼)
- ESLint

## 요구 사항

- Node.js **20.18.1 이상** (shadcn CLI 요구 사항)
- 노션 통합(integration)과 러닝 기록 데이터베이스 (구조는 PRD 4장)

## 설치 및 실행

```bash
# 1. 의존성 설치
npm install

# 2. 환경 변수 파일 생성
cp .env.example .env.local        # macOS / Linux / Git Bash
Copy-Item .env.example .env.local # Windows PowerShell

# 3. .env.local에 노션 값 입력 (아래 "환경 변수" 참고)

# 4. 개발 서버 실행
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 엽니다.

## 환경 변수

| 변수 | 구분 | 설명 |
|------|------|------|
| `NOTION_API_KEY` | 서버 전용 | 노션 통합 키. 접두사를 붙이지 않으며 브라우저에 노출되지 않습니다 |
| `NOTION_DATA_SOURCE_ID` | 서버 전용 | 러닝 기록 data source ID. 데이터베이스 ID가 아닙니다 |
| `NEXT_PUBLIC_APP_URL` | 공개 | 앱 주소. 현재 코드에서는 사용하지 않습니다 |
| `NEXT_PUBLIC_APP_NAME` | 공개 | 앱 이름. 현재 코드에서는 사용하지 않습니다 |
| `ADMIN_PASSWORD` | 서버 전용(관리자) | 관리자 로그인 비밀번호. 길고 추측하기 어려운 값을 씁니다 |
| `ADMIN_SESSION_SECRET` | 서버 전용(관리자) | 세션 쿠키 서명용 비밀값(32자 이상 무작위). 바꾸면 모든 로그인 세션이 무효가 됩니다 |
| `NOTION_ADMIN_API_KEY` | 서버 전용(관리자) | 관리자 쓰기용 노션 통합 키(읽기·삽입·수정). 공개 조회용 키와 분리되어 있고 `lib/notion/admin`에서만 읽습니다 |
| `RUN_RECORDS_REVALIDATE_SECONDS` | 서버 전용(선택) | 테스트 전용. 노션 조회 캐시 기간(초)을 줄입니다. 운영에는 설정하지 않습니다 |

- 실제 값은 `.env.local`에만 저장하고 커밋하지 않습니다. 변수 설명은 `.env.example`에 있습니다.
- 브라우저에 노출할 값에만 `NEXT_PUBLIC_` 접두사를 씁니다. 비밀 값에는 붙이지 않습니다.

## 주요 명령어

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | 개발 서버 실행 (Turbopack) |
| `npm run build` | 프로덕션 빌드 (Turbopack) |
| `npm run start` | 빌드 결과물 실행 |
| `npm run lint` | ESLint 검사 |
| `npx tsc --noEmit` | 타입 검사 |

## 데이터 흐름

노션 데이터는 아래 순서로만 화면까지 올라갑니다. 노션 호출은 서버에서만 일어납니다.

```
노션 data source
  → lib/notion/repository.ts   data source 조회, 커서를 따라 전체 페이지 순회
  → lib/notion/mapper.ts       페이지를 기록 DTO로 변환, 필수 값이 없거나 형식이 틀린 행은 제외
  → lib/notion/service.ts      기록 목록과 제외 목록 반환, 노션 실패는 AppError로 변환
  → lib/runs/load.ts           화면용 조회 함수, 노션 조회만 60초 캐시
  → app/ 서버 컴포넌트          조회 결과를 화면에 표시
```

- 소요시간은 노션에 텍스트(`mm:ss` 또는 `h:mm:ss`)로 저장하고, 초 변환과 페이스 계산은 앱에서 합니다.
- 필수 값(제목, 날짜, 거리, 소요시간)이 비었거나 형식이 틀린 행은 목록에서 빼고, 제목과 사유와 노션 링크를 화면에 안내합니다.
- 날짜는 한국 시간 기준 `YYYY-MM-DD`로 처리하고, 주는 월요일에 시작합니다.
- 노션 속성 이름은 `lib/notion/properties.ts` 한 곳에서 관리합니다.

### 캐시

- 홈과 상세(`/runs/[id]`)는 60초마다 다시 만드는 ISR입니다.
- 목록(`/runs`)과 통계(`/stats`)는 요청마다 렌더링하는 동적 페이지이고, 노션 조회만 60초 캐시를 공유합니다.
- 상세도 목록과 같은 조회 캐시에서 기록을 찾습니다(`loadRunRecord`).
- 노션에서 바꾼 내용은 접속이 꾸준할 때 목록은 최대 약 1분, 홈과 상세는 최대 약 2분 뒤에 반영됩니다.

### 알려진 한계

**노션에서 직접 바꾼 내용은 상세 화면에도 최대 약 2분 늦게 반영됩니다.**

- 상세 화면(`/runs/기록ID`)도 홈, 목록, 통계와 같은 저장된 기록(캐시)을 읽습니다. 그래서 존재하지 않는 주소를 계속 요청해도 노션 호출이 늘지 않습니다. 측정 결과 서로 다른 가짜 주소 3개를 요청했을 때 노션 호출이 수정 전에는 3번 늘었고 수정 후에는 늘지 않았습니다.
- 대신 노션 앱에서 방금 추가하거나 고친 내용이 상세에는 최대 약 2분(ISR 60초 + 조회 캐시 60초) 뒤에 보입니다. 웹 관리자 화면(v2)에서 입력·수정한 기록은 저장 직후 캐시를 갱신해 바로 반영할 예정입니다.

**관리자 화면의 알려진 한계**

- 로그인 실패 제한은 서버리스 인스턴스별로 따로 세어집니다(비밀번호를 길게 쓰는 것이 1차 방어). 쓰기 API 횟수 제한은 없습니다.
- 세션은 3일이며 서버에서 폐기할 수 없습니다(만료를 기다리거나 `ADMIN_SESSION_SECRET` 교체). 홈 화면 앱은 3일마다 다시 로그인합니다.
- CSP는 없습니다. 노션 날짜의 종료일·시각은 수정 화면에서 저장하면 사라집니다.
- 확인과 저장(삭제) 사이의 밀리초 틈은 막지 못합니다. 자세한 목록은 [docs/ROADMAP.md](docs/ROADMAP.md) Phase 6의 "남은 한계"에 있습니다.

## 프로젝트 구조

```
app/
  layout.tsx           # 루트 레이아웃 (ThemeProvider, Header, InstallGuide, Footer)
  page.tsx             # 홈
  runs/                # 기록 목록, 상세([id]), 로딩 화면
  stats/               # 통계
  admin/               # 관리자 로그인, 입력, 기록 목록·수정·삭제 (보호 구간은 (protected))
  api/admin/runs/      # 관리자 쓰기 API (POST, PATCH, DELETE)
  manifest.ts          # PWA manifest
  error.tsx, global-error.tsx, not-found.tsx
components/
  ui/                  # shadcn/ui 컴포넌트 (CLI로 생성)
  common/              # 빈 상태, 에러 표시, 전체 화면 상태
  layout/              # 헤더, 푸터
  runs/                # 기록 카드, 기간 탭, 제외 안내
  admin/               # 관리자 입력·수정 폼, 삭제 확인, 제외된 기록 목록
  stats/               # 통계 요약, 탭, 차트
  install/             # 홈 화면 설치 안내
  theme-toggle.tsx     # 다크모드 토글 (클라이언트 컴포넌트)
lib/
  notion/              # 노션 클라이언트, 조회, 변환, 소요시간·날짜 처리
  notion/admin/        # 관리자 쓰기(입력 검증, 쓰기 전용 클라이언트, 내용 버전 충돌 확인)
  runs/                # 화면용 조회, 기간 계산, 통계 집계
  auth/                # 관리자 인증(세션 쿠키, 로그인 제한, 요청 확인)
  api/response.ts      # API 응답 형식
  errors.ts            # AppError
  utils.ts             # cn() 유틸리티
middleware.ts          # /admin 1차 차단(각 페이지와 쓰기 API가 세션을 다시 확인)
public/                # PWA 아이콘 (192, 512, maskable, apple-touch-icon)
docs/                  # PRD, ROADMAP
```

## 다크모드

`next-themes`의 `ThemeProvider`가 `app/layout.tsx`에서 `class` 속성으로 동작합니다.
헤더의 토글 버튼으로 라이트/다크를 전환하며, 기본값은 OS 설정을 따릅니다.

## 배포

- 플랫폼: Vercel. GitHub 저장소를 가져오면 Next.js로 자동 인식되며 빌드 설정은 기본값을 씁니다.
- 배포 주소: [https://pjt-run-log.vercel.app](https://pjt-run-log.vercel.app)
- Vercel 프로젝트 환경 변수에 `NOTION_API_KEY`와 `NOTION_DATA_SOURCE_ID`를 등록합니다. 두 값은 접두사 없이 서버 전용으로 쓰고, 저장소에는 기록하지 않습니다.
- 공개 조회용 노션 키는 읽기 전용 권한으로 만드는 것을 권장합니다. 관리자 쓰기용 키(`NOTION_ADMIN_API_KEY`, 읽기·삽입·수정)는 별도 통합으로 만들고 **Production에만 등록하며 Preview에는 등록하지 않습니다**. 관리자 비밀번호(`ADMIN_PASSWORD`)와 세션 비밀값(`ADMIN_SESSION_SECRET`, 32자 이상)도 Production에만 등록합니다. 세 값 모두 콘솔에만 입력하고 저장소와 채팅에 쓰지 않습니다.
- 환경 변수는 새 배포부터 적용되므로 등록하거나 바꾼 뒤에는 재배포합니다. Preview 배포에서는 관리자 로그인이 되지 않고 쓰기는 설정 오류로 거부됩니다.
- 운영에는 `RUN_RECORDS_REVALIDATE_SECONDS`를 설정하지 않습니다(테스트 전용).
- 모든 응답에 보안 헤더(`nosniff`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`)가 붙고 `X-Powered-By`는 숨깁니다(`next.config.ts`). HSTS는 Vercel이 기본으로 붙입니다. CSP는 아직 없습니다.

## PWA

- `app/manifest.ts`가 이름, `display: "standalone"`, 아이콘을 정의하고, `apple-touch-icon`은 `app/layout.tsx`의 metadata로 연결합니다.
- service worker는 포함하지 않으므로 오프라인 캐시와 푸시 알림은 지원하지 않습니다.
- 설치는 HTTPS 주소에서만 됩니다. 배포 주소 [https://pjt-run-log.vercel.app](https://pjt-run-log.vercel.app)에서 아이폰 Safari의 홈 화면 추가와 독립 창 실행을 확인했습니다.
- 홈 화면 앱은 `/`로 열리므로 관리자 화면에는 공개 화면 푸터의 "관리자" 링크로 들어갑니다. 세션이 3일이라 3일마다 다시 로그인합니다(아이폰 홈 화면 앱에서 로그인 유지를 확인했습니다).
- 갤럭시(Chrome, Samsung Internet)에서의 설치는 확인하지 않았습니다. 안드로이드의 "앱 설치" 버튼 동작은 실기기 확인이 필요합니다.

## 새 shadcn/ui 컴포넌트 추가

```bash
npx shadcn@latest add <component-name>
# 예: npx shadcn@latest add dialog
```

`components/ui/`는 CLI 생성물이므로 직접 수정은 최소화합니다.

## 참고

- 관리자는 1명(환경 변수 비밀번호 + 쿠키 세션)입니다. 여러 사용자와 권한 구분, 회원가입, 영구 삭제는 지원하지 않습니다.
- 개발 규칙과 자세한 구조 설명은 [CLAUDE.md](CLAUDE.md)에 있습니다.
