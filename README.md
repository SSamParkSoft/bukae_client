# Bukae Client (Monorepo)

AI 기반 부업 자동화 서비스 **부캐(Bookae)** 의 모노레포 프론트엔드입니다.  
Next.js 16 + TypeScript 기반으로, 상품 정보를 자동으로 크롤링하고 영상 생성 및 YouTube 업로드 기능을 제공합니다.

## 📁 프로젝트 구조

이 모노레포는 두 개의 독립적인 앱으로 구성되어 있습니다:

```
bukae_client/
├── apps/
│   ├── bukae_creator/          # 관리자용 대시보드 (포트: 3000)
│   │   ├── app/                 # Next.js App Router 페이지 및 API 라우트
│   │   │   ├── api/             # API 엔드포인트 (TTS, 영상 생성, YouTube 등)
│   │   │   ├── video/create/    # 영상 제작 페이지
│   │   │   └── ...
│   │   ├── components/          # React 컴포넌트
│   │   │   ├── video-editor/    # 영상 편집 관련 컴포넌트
│   │   │   └── ui/              # shadcn/ui 기반 UI 컴포넌트
│   │   ├── hooks/               # Custom React Hooks
│   │   │   └── video/           # 영상 관련 훅들
│   │   ├── lib/                 # 유틸리티 및 라이브러리
│   │   │   ├── api/             # API 클라이언트
│   │   │   ├── tts/             # TTS 관련 로직
│   │   │   └── utils/           # 유틸리티 함수
│   │   └── store/               # Zustand 상태 관리
│   │
│   └── bukae_viewer/            # 제3자용 공개 웹사이트 (포트: 3001)
│       ├── app/                 # Next.js App Router 페이지
│       ├── components/          # React 컴포넌트
│       └── lib/                 # 유틸리티 및 라이브러리
│
├── packages/                    # 공유 패키지
│   └── shared/
│
└── scripts/                     # 빌드 및 유틸리티 스크립트
```

### 주요 디렉토리 설명

- **`apps/bukae_creator`** - 관리자용 대시보드
  - 영상 제작 및 편집 관리
  - 통계 확인 (쿠팡, YouTube)
  - 계정 설정 및 프로필 관리
  - TTS 음성 합성 및 영상 생성

- **`apps/bukae_viewer`** - 제3자용 공개 웹사이트
  - 영상 시청 플랫폼
  - 공개 콘텐츠 제공
  - 상품 검색 및 조회

## ⚙️ 기술 스택

### Core Framework & Language
- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript 5
- **Package Manager:** pnpm (Workspace)

### UI & Styling
- **Styling:** TailwindCSS 4
- **UI Components:** shadcn/ui (Radix UI 기반)
- **Icons:** Lucide React
- **Animation:** Framer Motion, GSAP

### State Management & Data Fetching
- **State Management:** Zustand
- **Data Fetching:** TanStack Query (React Query)

### 영상 렌더링 & 편집
- **PixiJS**: 캔버스 기반 이미지/텍스트 렌더링 및 재생 시 전환 효과 적용
- **Fabric.js**: 편집 모드에서 이미지·텍스트 드래그/리사이즈/회전 등 인터랙션 처리
- **GSAP**: 씬 전환 애니메이션(페이드, 슬라이드, 줌 등) 구현

### AI & 외부 서비스
- **Google Cloud Text-to-Speech**: AI 기반 음성 합성
- **Supabase**: 인증 및 데이터베이스
- **Upstash Redis**: 레이트 리밋 및 쿼터 관리

### 기타
- **WebSocket**: 실시간 통신 (STOMP 프로토콜)

## 🤖 AI 적극 활용

이 프로젝트는 개발 단계부터 운영까지 전 과정에서 AI 도구를 적극적으로 활용하여 개발 효율성과 품질을 극대화합니다:

### 1. **AI 기반 개발 도구**
- **Cursor AI**: 코드 작성, 리팩토링, 버그 수정 등 개발 전 과정에서 AI 어시스턴트 활용
- **MCP (Model Context Protocol)**: Context7, Figma 등 외부 도구와의 통합을 통한 문서화 및 디자인 자동화
- **AI 코드 리뷰**: 자동화된 코드 품질 검사 및 개선 제안

### 2. **프로덕트 AI 기능**
- **Google Cloud Text-to-Speech**: 자연스러운 한국어 음성 합성 및 SSML 마크업 지원
- **AI 추천 시스템**: 영상 제작 시 제목, 콘셉트, 톤 등에 대한 AI 기반 추천
- **자동화된 워크플로우**: 상품 정보 크롤링, 스크립트 생성, 씬 구성 등 AI 기반 자동화

### 3. **개발 생산성 향상**
- AI를 통한 빠른 프로토타이핑 및 반복 개발
- 복잡한 로직 구현 시 AI 어시스턴트 활용으로 개발 시간 단축
- 코드베이스 이해 및 문서화 자동화

## 🧠 Redis 사용 (Upstash)

`apps/bukae_creator`에서는 **Upstash Redis**를 사용해 서버 API의 **레이트리밋**과 **일일 쿼터(TTS 문자수/요청수)** 를 관리합니다. (비용 발생/남용 방지 목적)

- **사용 위치**: `apps/bukae_creator/lib/api/rate-limit.ts`
- **프로덕션 필수 환경변수**
  - `UPSTASH_REDIS_REST_URL`
  - `UPSTASH_REDIS_REST_TOKEN`

## 📧 협업 문의

프로젝트 관련 협업 및 문의사항은 아래 이메일로 연락해주세요:

**이메일:** ssamso8282@gmail.com
