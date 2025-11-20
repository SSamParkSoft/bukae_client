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

### 백엔드 서버 연동

프론트엔드는 백엔드 API 서버와 연동됩니다. 백엔드 서버를 별도로 실행해야 합니다.

1. **백엔드 서버 실행**
   - 백엔드 서버를 GitHub에서 클론하여 실행합니다
   - 기본 포트: `http://localhost:8080`

2. **환경 변수 설정** (선택사항)
   - 각 앱의 루트 디렉토리에 `.env.local` 파일을 생성합니다
   - 백엔드 서버 URL이 기본값(`http://localhost:8080`)과 다른 경우 설정합니다:
   ```bash
   # apps/bookae_creator/.env.local
   NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
   ```
   - 환경 변수를 설정하지 않으면 기본값(`http://localhost:8080`)이 사용됩니다

3. **서버 미실행 시**
   - 프론트엔드는 서버가 실행되지 않아도 빌드/실행 가능합니다
   - API 호출 시 적절한 에러 메시지가 표시됩니다

## 📽️ SQLite 데이터

1. 발표용 영상과 사진을 `apps/bookae_creator/public/media/` 폴더에 복사합니다.
   - 기본 seed는 `final-video.mp4`와 `photo-1.jpg` ~ `photo-5.jpg` 파일명을 사용합니다.
   - 다른 이름을 쓰고 싶다면 `scripts/seed-demo.mjs`의 `demoAssets` 배열을 수정하세요.
2. 아래 명령으로 SQLite seed 데이터를 새로 생성합니다.

```bash
pnpm seed-demo
```
