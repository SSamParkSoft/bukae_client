# 🚀 Bookae Client (Monorepo)

AI 기반 부업 자동화 서비스 **부캐(Bookae)** 의 모노레포 프론트엔드입니다.  
Next.js 16 + TypeScript 기반으로, 상품 정보를 자동으로 크롤링하고 영상 생성 및 YouTube 업로드 기능을 제공합니다.

## 📁 프로젝트 구조

이 모노레포는 두 개의 독립적인 앱으로 구성되어 있습니다:

- **`apps/bookae_creator`** - 관리자용 대시보드 (포트: 3000)
  - 영상 제작 관리
  - 통계 확인
  - 계정 설정

- **`apps/bookae_viewer`** - 제3자용 공개 웹사이트 (포트: 3001)
  - 영상 시청 플랫폼
  - 공개 콘텐츠 제공

## ⚙️ 기술 스택
- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** TailwindCSS
- **UI Components:** shadcn/ui
- **State Management:** Zustand
- **Data Fetching:** TanStack Query
- **Package Manager:** pnpm (Workspace)

## 🧩 실행 방법

### 의존성 설치
```bash
pnpm install
```

### 개발 서버 실행

**관리자 대시보드만 실행 (기본)**
```bash
pnpm dev
# 또는
pnpm dev:creator
```
→ [http://localhost:3000](http://localhost:3000)

**제3자 웹사이트만 실행**
```bash
pnpm dev:viewer
```
→ [http://localhost:3001](http://localhost:3001)

**모든 앱 동시 실행**
```bash
pnpm dev:all
```

### 빌드

```bash
# 특정 앱 빌드
pnpm build:creator
pnpm build:viewer

# 모든 앱 빌드
pnpm build:all
```

### 프로덕션 실행

```bash
pnpm start:creator  # 포트 3000
pnpm start:viewer   # 포트 3001
```

## 🔧 환경 설정

### Supabase 인증(PostgreSQL) 연동

`apps/bookae_creator`는 Supabase Auth(PostgreSQL 기반)를 통해 로그인/회원가입을 처리합니다.

1. **Supabase 프로젝트 생성**
   - Database: PostgreSQL (Supabase 기본값)
   - Authentication > Email templates에서 발송 메일을 원하는 브랜드에 맞게 수정하세요.
2. **환경 변수 구성**
   - `apps/bookae_creator/env.example` 파일을 참고하여 `.env.local`을 생성합니다.
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=<Supabase 프로젝트 URL>
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<Supabase anon key>
   NEXT_PUBLIC_SUPABASE_EMAIL_REDIRECT_URL=http://localhost:3000/login
   ```
   - `NEXT_PUBLIC_SUPABASE_EMAIL_REDIRECT_URL`는 이메일 인증 완료 후 이동할 경로입니다.
3. **로컬 개발 시**
   - `pnpm dev` 실행 후 `/signup`에서 회원가입하면 Supabase Postgres에 계정이 생성됩니다.
   - 로그인/로그아웃 상태는 Supabase 세션과 동기화되어 있어 새로고침 후에도 유지됩니다.

### 백엔드 서버 연동

기존 REST API(상품/영상 데이터 등)를 사용한다면 `NEXT_PUBLIC_API_BASE_URL`을 설정하고 백엔드 서버를 실행해주세요. 서버가 실행되지 않아도 프론트엔드는 동작하며, API 호출 시에만 오류가 표시됩니다.

## 📽️ SQLite 데이터

1. 발표용 영상과 사진을 `apps/bookae_creator/public/media/` 폴더에 복사합니다.
   - 기본 seed는 `final-video.mp4`와 `photo-1.jpg` ~ `photo-5.jpg` 파일명을 사용합니다.
   - 다른 이름을 쓰고 싶다면 `scripts/seed-demo.mjs`의 `demoAssets` 배열을 수정하세요.
2. 아래 명령으로 SQLite seed 데이터를 새로 생성합니다.

```bash
pnpm seed-demo
```
