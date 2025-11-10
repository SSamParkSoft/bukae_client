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
