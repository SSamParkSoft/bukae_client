# 리팩토링 구조/네이밍/모듈화 원칙

## 디렉터리 구조 (apps/bukae_creator 기준)
- `app/`: Next App Router 페이지. 페이지 파일은 얇게 유지하고 로직은 훅/컴포넌트로 분리.
- `components/`: 재사용 가능한 UI. 도메인별 하위 폴더 사용.
  - `components/video-editor/*`: Step4 관련 (미리보기, 타임라인, 씬 에디터).
  - `components/image-selector/*`: Step3 이미지 선택/카드.
  - `components/product-selector/*`: Step1 상품 선택 UI.
  - `components/dashboard/*`: 홈 대시보드 위젯.
  - `components/profile/*`: 프로필 페이지 섹션.
  - `components/video-uploader/*`: 업로드 리스트/아이템.
- `hooks/`: UI 비즈니스 로직 훅. 라이브러리별 하위 폴더 권장 (`hooks/video`, `hooks/image`, `hooks/product`).
- `services/`: 순수 로직/비동기 처리. 예: `services/video/transitionEffects.ts`, `services/video/particleSystem.ts`.
- `lib/`: 공용 유틸, 타입, API 클라이언트.
  - `lib/utils/format.ts`: 숫자/통화/파일 크기/날짜 포맷 공통화.
- `store/`: Zustand 등 전역 상태.
- `public/`: 정적 자산.
- `scripts/`: 빌드/데이터 스크립트.

## 네이밍 규칙
- 컴포넌트: PascalCase (`VideoPreview.tsx`, `TimelineControls.tsx`).
- 훅: `use` 접두사, 기능 명시 (`usePixiRenderer`, `useFabricEditor`, `useTimeline`, `useSceneEditor`, `useImageSelection`, `useSceneGeneration`).
- 서비스/유틸: 동사+명사 또는 명확한 도메인 (`transitionEffects`, `particleSystem`, `format.ts`).
- 상태 selector: 의도 명시 (`selectTimeline`, `selectScenes` 등).
- 파일명은 단일 책임을 반영하고, 한 파일 내 다기능 금지.

## 모듈화 원칙
- 페이지는 라우팅/데이터 페칭 정도로 얇게 유지; 렌더/로직은 컴포넌트/훅으로 이동.
- UI/로직 분리: 렌더링 컴포넌트와 상태/이펙트 훅을 분리 (Presentational vs Container).
- 사이드이펙트/비동기 호출은 훅 또는 서비스로 분리, UI는 props로 주입.
- 공통 포맷터/상수/타입은 `lib/utils`/`lib/types`/`lib/data`에 위치.
- 거대 컴포넌트 분해 순서: (1) 화면 단위 컴포넌트 → (2) 커스텀 훅 → (3) 서비스/유틸 → (4) 상수/타입.

## 경로/별칭
- `tsconfig` paths: `@/*` → `apps/bukae_creator/*`. 신규 모듈은 이 별칭 활용.
- 신규 하위 폴더 추가 시 import 경로는 `@/components/...`, `@/hooks/...`, `@/services/...`, `@/lib/utils/...` 형태로 통일.

## 공통 유틸 정책 (format.ts 예시)
- `formatNumber(num: number): string`
- `formatCurrency(num: number, locale='ko-KR', currency='KRW'): string`
- `formatFileSize(bytes: number): string`
- `formatDate(date: string | number | Date, locale='ko-KR'): string`

## 제출/커밋 단위 가이드
- 대형 파일 분해 시: “추출된 훅/컴포넌트 추가” → “페이지 경량화” 순으로 작은 커밋.
- 공통 유틸 통합 시: 유틸 추가 커밋 → 호출부 교체 커밋을 분리해 영향 범위 명확화.

