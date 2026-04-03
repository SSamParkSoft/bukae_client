# Bukae Client

AI 기반 숏폼 영상 자동화 서비스 **부캐(Bukae)** 의 프론트엔드 모노레포입니다.  
### 스크립트 생성 → 씬 편집 → 효과 적용 → FFmpeg 인코딩 프로세스를 자동화합니다.

---

## 앱 구성

| 앱 | 포트 | 역할 |
|----|------|------|
| `apps/bukae_creator` | 3000 | 크리에이터 대시보드. 영상 제작 전 과정 담당. |
| `apps/bukae_viewer` | 3001 | 상품 구매로 이어지는 개인 미니홈페이지. |

---

## 기술 스택

| 분류 | 기술 |
|------|------|
| 🧱 프레임워크 | Next.js 16 (App Router) · React 19 · TypeScript 5 |
| 📦 패키지 매니저 | pnpm workspace (Node >=24) |
| 🎨 UI / 스타일링 | TailwindCSS 4 · shadcn/ui (Radix UI) · Framer Motion · GSAP |
| 🗂️ 상태 관리 | Zustand 5 · TanStack React Query 5 |
| 🎬 영상 렌더링 | PixiJS 8 (씬 재생·전환) · Fabric.js 7 (편집 인터랙션) · FFmpeg WASM (인코딩) |
| 🎙️ AI 음성 | Google Cloud TTS (한국어 SSML) · ElevenLabs |
| ☁️ 인프라 | Supabase (인증·DB·스토리지) · Upstash Redis (레이트리밋) |

---

## 문의

**이메일:** ssamso8282@gmail.com
