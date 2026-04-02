# Bukae Client

AI 기반 숏폼 영상 자동화 서비스 **부캐(Bukae)** 의 프론트엔드 모노레포입니다.  
상품 정보를 입력하면 스크립트 생성 → 씬 편집 → 효과 적용 → FFmpeg 인코딩 → YouTube 업로드까지 자동화합니다.

---

## 앱 구성

| 앱 | 포트 | 역할 |
|----|------|------|
| `apps/bukae_creator` | 3000 | 크리에이터 대시보드. 영상 제작 전 과정 담당. |
| `apps/bukae_viewer` | 3001 | 공개 뷰어. 완성된 영상 시청 플랫폼. |

---

## 영상 제작 플로우

```
step1  상품 선택 + 이미지 수집
step2  스크립트 생성 (직접 입력 또는 AI 생성)
step3  씬 구성 + 타임라인 편집  ← 가장 복잡한 단계
step4  효과/템플릿 적용
Export FFmpeg 인코딩 + YouTube 업로드
```

---

## 기술 스택

### 프레임워크 / 언어
- Next.js 16 (App Router), React 19, TypeScript 5
- pnpm workspace (Node >=24, pnpm >=10)

### UI / 스타일링
- TailwindCSS 4, shadcn/ui (Radix UI), Framer Motion, GSAP

### 상태 관리 / 데이터 패칭
- Zustand 5 (전역 상태 + localStorage 영속화)
- TanStack React Query 5 (서버 상태 캐싱)

### 영상 렌더링 / 편집
- **PixiJS 8** — 씬 재생 및 전환 효과 (캔버스 렌더)
- **Fabric.js 7** — 편집 모드 텍스트/이미지 드래그·리사이즈·회전
- **FFmpeg (WebAssembly)** — 클라이언트 사이드 인코딩

### AI / 음성
- **Google Cloud TTS** — 한국어 SSML 음성 합성
- **ElevenLabs** — 프리미엄 AI 음성

### 인프라 / 백엔드
- **Supabase** — 인증, DB, 스토리지
- **Upstash Redis** — TTS 레이트리밋 + 일일 쿼터 관리
- **Better SQLite3** — 로컬 데모 데이터

### 실시간
- HTTP 폴링 (5초 간격, step4 job 상태 확인)
- WebSocket/STOMP — 보조 용도

---

## 개발 명령어

루트에서 실행:

```bash
pnpm dev          # creator 앱 실행 (포트 3000, Chrome 자동 오픈)
pnpm dev:viewer   # viewer 앱 실행 (포트 3001)
pnpm dev:all      # 전체 앱 동시 실행

pnpm build        # 빌드 (lint 오류 자동 수정 포함)
pnpm lint         # ESLint 검사
pnpm typecheck    # TypeScript 타입 검사
pnpm test         # 테스트 1회 실행 (CI용)
pnpm test:watch   # watch 모드 테스트
```

---

## 주요 환경변수 (bukae_creator)

| 변수 | 용도 |
|------|------|
| `UPSTASH_REDIS_REST_URL` | Redis 레이트리밋 |
| `UPSTASH_REDIS_REST_TOKEN` | Redis 인증 |
| `GOOGLE_TTS_*` | Google Cloud TTS |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 연결 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 인증 |

---

## 문의

**이메일:** ssamso8282@gmail.com
