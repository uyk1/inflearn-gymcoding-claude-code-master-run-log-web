# Run Log

러닝 기록을 노션(CMS)에 쌓고, 웹에서 살펴보며 도움을 받는 프로젝트입니다.
Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui 기반이며, 아직 기능 구현 전의 **기본 구성**만 담겨 있습니다.

## 기술 스택

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS 4
- shadcn/ui (button, card, input, label, textarea, field)
- next-themes (다크모드 토글)
- react-hook-form + zod (폼 유효성 검사)
- ESLint

## 요구 사항

- Node.js **20.18.1 이상** (shadcn CLI 요구 사항)

## 설치 및 실행

```bash
# 1. 의존성 설치
npm install

# 2. 환경 변수 파일 생성 (값은 필요에 맞게 수정)
cp .env.example .env.local        # macOS / Linux / Git Bash
Copy-Item .env.example .env.local # Windows PowerShell

# 3. 개발 서버 실행
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 엽니다.

## 주요 명령어

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | 개발 서버 실행 (Turbopack) |
| `npm run build` | 프로덕션 빌드 (lint 포함) |
| `npm run start` | 빌드 결과물 실행 |
| `npm run lint` | ESLint 검사 |

## 프로젝트 구조

```
app/
  layout.tsx           # 루트 레이아웃 (ThemeProvider, Header, Footer)
  page.tsx             # 홈
components/
  ui/                  # shadcn/ui 컴포넌트 (CLI로 생성)
  layout/
    header.tsx         # 서버 컴포넌트
    footer.tsx         # 서버 컴포넌트
  theme-toggle.tsx     # 클라이언트 컴포넌트 (다크모드 토글)
lib/
  utils.ts             # cn() 유틸리티
```

## 다크모드

`next-themes`의 `ThemeProvider`가 `app/layout.tsx`에서 `class` 속성으로 동작합니다.
헤더의 토글 버튼으로 라이트/다크를 전환하며, 기본값은 OS 설정을 따릅니다.

## 새 프로젝트로 복사해서 쓰는 방법

이 저장소를 새 프로젝트의 시작점으로 쓰려면 Git 기록과 설치 산출물을 빼고 복사합니다.

**PowerShell (Windows)**

```powershell
# 1. 새 위치로 복사 (.git, node_modules, .next 제외)
robocopy . ..\my-new-project /E /XD .git node_modules .next

# 2. 새 프로젝트로 이동
Set-Location ..\my-new-project

# 3. package.json의 "name"을 새 프로젝트 이름으로 수정

# 4. 새 Git 저장소로 초기화
git init -b main
git add .
git commit -m "chore: 스타터 킷에서 프로젝트 시작"

# 5. 의존성 설치 후 실행
npm install
npm run dev
```

**Git Bash / macOS / Linux**

```bash
rsync -av --exclude .git --exclude node_modules --exclude .next ./ ../my-new-project/
cd ../my-new-project
# package.json의 "name" 수정 후
git init -b main && git add . && git commit -m "chore: 스타터 킷에서 프로젝트 시작"
npm install && npm run dev
```

## 새 shadcn/ui 컴포넌트 추가

```bash
npx shadcn@latest add <component-name>
# 예: npx shadcn@latest add dialog
```

## 참고

- 인증(로그인/회원가입)은 포함되어 있지 않습니다. 필요하면 별도로 추가하세요.
- `.env.example`을 복사해 `.env.local`을 만들고, 실제 비밀 값은 `.env.local`에만 저장하세요.
