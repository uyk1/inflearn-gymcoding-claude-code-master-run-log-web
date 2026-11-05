# Run Log

러닝 기록을 노션(CMS)에 쌓고, 웹에서 조회하고 분석하며 훈련에 도움을 받는 프로젝트입니다.
노션 표에 기록을 입력하면 별도 관리자 화면 없이 웹에 반영됩니다. 웹은 읽기 전용이며, 기록 입력과 수정은 노션에서 합니다.

## 주요 기능

| 화면 | 경로 | 내용 |
|------|------|------|
| 홈 | `/` | 최근 기록 요약, 이번 주 총 거리, 제외된 기록 건수 안내 |
| 기록 목록 | `/runs` | 날짜순 카드, 기간 필터(이번 주, 이번 달, 전체), 제외된 기록 안내 |
| 기록 상세 | `/runs/[id]` | 거리, 시간, 페이스, 장소, 강도, 메모, 태그, 노션 원본 링크 |
| 통계 | `/stats` | 주간(8주)·월간(6개월) 거리와 평균 페이스 추이 차트 |
| PWA 설치 | 전체 | 안드로이드는 설치 버튼, 아이폰은 "공유 → 홈 화면에 추가" 안내 |

기능 명세와 노션 데이터베이스 구조는 [docs/PRD.md](docs/PRD.md), 현재 로드맵(고도화, v2)은 [docs/ROADMAP.md](docs/ROADMAP.md), 완료된 MVP 로드맵(v1)은 [docs/roadmaps/ROADMAP-v1.md](docs/roadmaps/ROADMAP-v1.md)에 있습니다.

## 기술 스택

- Next.js 15 (App Router), React 19
- TypeScript
- Tailwind CSS 4, shadcn/ui (`base-nova` 스타일, `@base-ui/react` 기반)
- Notion API (`@notionhq/client` v5)
- recharts (통계 차트)
- next-themes (다크모드)
- zod 4, react-hook-form (현재 화면에서는 사용하지 않음)
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
- 노션에서 바꾼 내용은 접속이 꾸준할 때 목록과 상세는 최대 약 1분, 홈은 최대 약 2분 뒤에 반영됩니다.

### 알려진 한계

**상세 화면에 존재하지 않는 주소를 계속 요청하면 노션 호출이 늘어납니다.**

- 홈, 목록, 통계는 노션에서 가져온 기록을 서버가 60초 동안 저장해 두고(캐시) 함께 씁니다. 그래서 접속이 많아도 노션 호출은 60초에 1~2번 수준입니다.
- 상세 화면(`/runs/기록ID`)만 이렇게 저장해 둔 기록을 쓰지 않습니다. 열릴 때마다 노션에서 전체 기록을 직접 가져와 그중에서 해당 기록을 찾습니다. 같은 주소는 결과를 60초 동안 기억하므로 정상 기록은 문제가 없습니다.
- 그런데 존재하지 않는 주소(예: `/runs/abc`, `/runs/abd`)도 노션에 한 번 물어본 뒤에야 "없음(404)"이라고 답합니다. 서로 다른 가짜 주소를 요청할 때마다 노션 호출이 1번씩 늘어납니다. 측정 결과 서로 다른 가짜 주소 3개를 요청하자 노션 호출이 3번 늘었고, 같은 가짜 주소를 반복해서 요청했을 때는 늘지 않았습니다.
- 노션에는 호출 제한(평균 초당 3회)이 있습니다. 공개 주소로 배포하면 자동 프로그램이 임의의 주소를 계속 요청하는 일이 있을 수 있습니다. 그러면 호출 제한을 다 써서 정상 목록과 통계도 노션 오류 화면이 날 수 있습니다. 개인용 앱이라 실제로 일어날지는 배포해 봐야 알 수 있습니다.
- 확인 방법: 배포 후 Vercel 로그에서 `/runs/...` 주소의 404 요청이 비정상적으로 많은지, 노션 호출 제한 오류(429)가 있는지 봅니다.
- 문제가 확인되면: 상세 화면도 목록과 같은 저장소(캐시)를 쓰도록 바꿉니다. 이 경우 노션에 방금 추가한 기록이 상세에서는 최대 약 1분 늦게 열릴 수 있습니다.

## 프로젝트 구조

```
app/
  layout.tsx           # 루트 레이아웃 (ThemeProvider, Header, InstallGuide, Footer)
  page.tsx             # 홈
  runs/                # 기록 목록, 상세([id]), 로딩 화면
  stats/               # 통계
  manifest.ts          # PWA manifest
  error.tsx, global-error.tsx, not-found.tsx
components/
  ui/                  # shadcn/ui 컴포넌트 (CLI로 생성)
  common/              # 빈 상태, 에러 표시, 전체 화면 상태
  layout/              # 헤더, 푸터
  runs/                # 기록 카드, 기간 탭, 제외 안내
  stats/               # 통계 요약, 탭, 차트
  install/             # 홈 화면 설치 안내
  theme-toggle.tsx     # 다크모드 토글 (클라이언트 컴포넌트)
lib/
  notion/              # 노션 클라이언트, 조회, 변환, 소요시간·날짜 처리
  runs/                # 화면용 조회, 기간 계산, 통계 집계
  api/response.ts      # API 응답 형식
  errors.ts            # AppError
  utils.ts             # cn() 유틸리티
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
- 배포용 노션 키는 개발용과 분리해 읽기 전용 권한으로 만드는 것을 권장합니다. 앱은 노션을 읽기만 합니다.
- 운영에는 `RUN_RECORDS_REVALIDATE_SECONDS`를 설정하지 않습니다(테스트 전용).
- 모든 응답에 보안 헤더(`nosniff`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`)가 붙고 `X-Powered-By`는 숨깁니다(`next.config.ts`).

## PWA

- `app/manifest.ts`가 이름, `display: "standalone"`, 아이콘을 정의하고, `apple-touch-icon`은 `app/layout.tsx`의 metadata로 연결합니다.
- service worker는 포함하지 않으므로 오프라인 캐시와 푸시 알림은 지원하지 않습니다.
- 설치는 HTTPS 주소에서만 됩니다. 배포 주소 [https://pjt-run-log.vercel.app](https://pjt-run-log.vercel.app)에서 아이폰 Safari의 홈 화면 추가와 독립 창 실행을 확인했습니다.
- 갤럭시(Chrome, Samsung Internet)에서의 설치는 확인하지 않았습니다. 안드로이드의 "앱 설치" 버튼 동작은 실기기 확인이 필요합니다.

## 새 shadcn/ui 컴포넌트 추가

```bash
npx shadcn@latest add <component-name>
# 예: npx shadcn@latest add dialog
```

`components/ui/`는 CLI 생성물이므로 직접 수정은 최소화합니다.

## 참고

- 인증(로그인/회원가입)과 웹에서의 기록 입력·수정은 포함되어 있지 않습니다.
- 개발 규칙과 자세한 구조 설명은 [CLAUDE.md](CLAUDE.md)에 있습니다.
