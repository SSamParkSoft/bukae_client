# Bukae Client (Monorepo)

AI 기반 부업 자동화 서비스 **부캐(Bookae)** 의 모노레포 프론트엔드입니다.  
Next.js 16 + TypeScript 기반으로, 상품 정보를 자동으로 크롤링하고 영상 생성 및 YouTube 업로드 기능을 제공합니다.

## 📁 프로젝트 구조

이 모노레포는 두 개의 독립적인 앱으로 구성되어 있습니다:

- **`apps/bukae_creator`** - 관리자용 대시보드 (포트: 3000)
  - 영상 제작 관리
  - 통계 확인
  - 계정 설정

- **`apps/bukae_viewer`** - 제3자용 공개 웹사이트 (포트: 3001)
  - 영상 시청 플랫폼
  - 공개 콘텐츠 제공

## ⚙️ 기술 스택 (25.12.07 ReactServerComponent 취약점 업데이트 완료)
- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** TailwindCSS
- **UI Components:** shadcn/ui
- **State Management:** Zustand
- **Data Fetching:** TanStack Query
- **Package Manager:** pnpm (Workspace)

## 🧠 Redis 사용 (Upstash)

`apps/bukae_creator`에서는 **Upstash Redis**를 사용해 서버 API의 **레이트리밋**과 **일일 쿼터(TTS 문자수/요청수)** 를 관리합니다. (비용 발생/남용 방지 목적)

- **사용 위치**: `apps/bukae_creator/lib/api/rate-limit.ts`
- **프로덕션 필수 환경변수**
  - `UPSTASH_REDIS_REST_URL`
  - `UPSTASH_REDIS_REST_TOKEN`

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

## 📽️ 미리보기 렌더링에 사용한 주요 라이브러리

- **PixiJS**: 캔버스 기반 이미지/텍스트 렌더링 및 재생 시 전환 효과 적용
- **Fabric.js**: 편집 모드에서 이미지·텍스트 드래그/리사이즈/회전 등 인터랙션 처리
- **GSAP**: 씬 전환 애니메이션(페이드, 슬라이드, 줌 등) 구현
