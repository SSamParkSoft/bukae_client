# 리팩토링 인벤토리 보고서

## 대형 파일 목록 (500줄 이상)

### 1. apps/bukae_creator/app/video/create/step4/page.tsx (4,602줄) ⚠️ 최우선
**문제점:**
- 단일 파일에 4,600줄 이상의 코드
- PixiJS, Fabric.js, GSAP 등 여러 라이브러리 통합
- 타임라인 관리, 씬 편집, 재생 컨트롤, 전환 효과 등 모든 기능이 한 파일에 집중

**주요 기능:**
- PixiJS 초기화 및 렌더링
- Fabric.js 편집 오버레이
- 타임라인 관리 및 재생
- 씬 편집 (이미지, 텍스트)
- 전환 효과 및 애니메이션
- UI 컨트롤 (재생, 속도, 편집 모드)

**리팩토링 제안:**
- `hooks/usePixiRenderer.ts` - PixiJS 렌더링 로직
- `hooks/useFabricEditor.ts` - Fabric.js 편집 로직
- `hooks/useTimeline.ts` - 타임라인 관리
- `hooks/useSceneEditor.ts` - 씬 편집 로직
- `components/video-editor/VideoPreview.tsx` - 미리보기 컴포넌트
- `components/video-editor/TimelineControls.tsx` - 타임라인 컨트롤
- `components/video-editor/SceneEditor.tsx` - 씬 편집 UI
- `components/video-editor/AnimationPanel.tsx` - 애니메이션 설정 패널
- `services/video/transitionEffects.ts` - 전환 효과 로직
- `services/video/particleSystem.ts` - 파티클 시스템

### 2. apps/bukae_creator/app/profile/page.tsx (759줄)
**문제점:**
- 프로필 페이지에 모든 기능이 집중
- 사용자 정보, 연동 서비스, 알림 설정, 영상 목록 등

**리팩토링 제안:**
- `components/profile/ProfileInfo.tsx` - 사용자 정보 섹션
- `components/profile/ConnectedServices.tsx` - 연동 서비스 섹션
- `components/profile/NotificationSettings.tsx` - 알림 설정
- `components/profile/RecentVideos.tsx` - 최근 영상 목록

### 3. apps/bukae_creator/app/page.tsx (729줄)
**문제점:**
- 홈 페이지에 통계, 상품, 영상 등 모든 대시보드 기능

**리팩토링 제안:**
- `components/dashboard/StatsSummary.tsx` - 통계 요약
- `components/dashboard/HotKeywords.tsx` - 핫 키워드
- `components/dashboard/TopProducts.tsx` - 인기 상품
- `components/dashboard/TopVideos.tsx` - 인기 영상

### 4. apps/bukae_creator/app/video/create/step3/page.tsx (639줄)
**문제점:**
- 이미지 선택 및 씬 생성 로직이 한 파일에 집중

**리팩토링 제안:**
- `components/image-selector/ImageGrid.tsx` - 이미지 그리드
- `components/image-selector/SceneCard.tsx` - 씬 카드
- `hooks/useImageSelection.ts` - 이미지 선택 로직
- `hooks/useSceneGeneration.ts` - 씬 생성 로직

### 5. apps/bukae_creator/app/video/create/step1/page.tsx (609줄)
**리팩토링 제안:**
- `components/product-selector/ProductSearch.tsx`
- `components/product-selector/ProductCard.tsx`
- `hooks/useProductSelection.ts`

### 6. apps/bukae_creator/components/VideoUploader.tsx (329줄)
**리팩토링 제안:**
- `components/video-uploader/VideoFileList.tsx`
- `components/video-uploader/VideoFileItem.tsx`
- `hooks/useVideoUpload.ts`

### 7. apps/bukae_creator/store/useVideoCreateStore.ts (315줄)
**상태:**
- Zustand 스토어로 적절한 크기
- 타입 정의와 상태 관리가 명확하게 분리됨
- 리팩토링 우선순위 낮음

## 중복 코드 패턴

### 1. 숫자 포맷팅 함수 (`formatNumber`)
**중복 위치:**
- `apps/bukae_creator/app/page.tsx:17`
- `apps/bukae_creator/app/profile/page.tsx:44`
- `apps/bukae_creator/components/YouTubeStats.tsx:19`
- `apps/bukae_creator/components/CoupangStats.tsx:9`

**해결책:**
- `lib/utils/format.ts`에 통합

### 2. 통화 포맷팅 함수 (`formatCurrency`)
**중복 위치:**
- `apps/bukae_creator/app/page.tsx:27`
- `apps/bukae_creator/components/YouTubeStats.tsx:29`
- `apps/bukae_creator/components/CoupangStats.tsx:19`

**해결책:**
- `lib/utils/format.ts`에 통합

### 3. 파일 크기 포맷팅 (`formatFileSize`)
**위치:**
- `apps/bukae_creator/components/VideoUploader.tsx:138`

**해결책:**
- `lib/utils/format.ts`에 통합 (향후 재사용 가능)

### 4. 날짜 포맷팅 (`formatDate`)
**위치:**
- `apps/bukae_creator/app/profile/page.tsx:35`

**해결책:**
- `lib/utils/format.ts`에 통합

## 디렉터리 구조 개선 제안

### 현재 구조
```
apps/bukae_creator/
├── app/
│   ├── video/create/
│   │   ├── step1/page.tsx (609줄)
│   │   ├── step3/page.tsx (639줄)
│   │   └── step4/page.tsx (4,602줄) ⚠️
├── components/
│   ├── VideoUploader.tsx (329줄)
│   └── ...
└── lib/
    └── utils.ts (6줄)
```

### 제안 구조
```
apps/bukae_creator/
├── app/
│   └── video/create/
│       ├── step1/
│       │   └── page.tsx (간소화)
│       ├── step3/
│       │   └── page.tsx (간소화)
│       └── step4/
│           └── page.tsx (간소화)
├── components/
│   ├── video-editor/          # step4 관련 컴포넌트
│   │   ├── VideoPreview.tsx
│   │   ├── TimelineControls.tsx
│   │   ├── SceneEditor.tsx
│   │   └── AnimationPanel.tsx
│   ├── image-selector/        # step3 관련 컴포넌트
│   │   ├── ImageGrid.tsx
│   │   └── SceneCard.tsx
│   ├── product-selector/      # step1 관련 컴포넌트
│   │   ├── ProductSearch.tsx
│   │   └── ProductCard.tsx
│   ├── video-uploader/         # VideoUploader 분리
│   │   ├── VideoFileList.tsx
│   │   └── VideoFileItem.tsx
│   ├── dashboard/              # 홈 페이지 컴포넌트
│   │   ├── StatsSummary.tsx
│   │   ├── HotKeywords.tsx
│   │   ├── TopProducts.tsx
│   │   └── TopVideos.tsx
│   └── profile/                # 프로필 페이지 컴포넌트
│       ├── ProfileInfo.tsx
│       ├── ConnectedServices.tsx
│       ├── NotificationSettings.tsx
│       └── RecentVideos.tsx
├── hooks/
│   ├── video/                  # 비디오 관련 훅
│   │   ├── usePixiRenderer.ts
│   │   ├── useFabricEditor.ts
│   │   ├── useTimeline.ts
│   │   └── useSceneEditor.ts
│   ├── image/                  # 이미지 관련 훅
│   │   ├── useImageSelection.ts
│   │   └── useSceneGeneration.ts
│   └── product/                # 상품 관련 훅
│       └── useProductSelection.ts
├── services/
│   └── video/                  # 비디오 서비스 로직
│       ├── transitionEffects.ts
│       └── particleSystem.ts
└── lib/
    └── utils/
        ├── format.ts           # 포맷팅 함수 통합
        └── ...
```

## 우선순위

### Phase 1: 최우선 (step4/page.tsx)
1. PixiJS 렌더링 로직을 `hooks/usePixiRenderer.ts`로 분리
2. Fabric.js 편집 로직을 `hooks/useFabricEditor.ts`로 분리
3. 타임라인 관리 로직을 `hooks/useTimeline.ts`로 분리
4. UI 컴포넌트 분리 (VideoPreview, TimelineControls 등)

### Phase 2: 중복 코드 제거
1. 포맷팅 함수 통합 (`lib/utils/format.ts`)
2. 모든 파일에서 중복 함수 제거 및 import 변경

### Phase 3: 다른 대형 파일 리팩토링
1. `profile/page.tsx` 컴포넌트 분리
2. `app/page.tsx` (홈) 컴포넌트 분리
3. `step3/page.tsx` 컴포넌트 분리
4. `step1/page.tsx` 컴포넌트 분리

### Phase 4: VideoUploader 리팩토링
1. 컴포넌트 분리 및 훅 추출

## 예상 효과

- **유지보수성**: 각 모듈이 명확한 책임을 가져 수정이 용이
- **재사용성**: 공통 로직을 훅/서비스로 분리하여 재사용 가능
- **테스트 용이성**: 작은 단위로 분리되어 테스트 작성이 쉬움
- **가독성**: 파일 크기가 줄어 코드 이해가 쉬움
- **협업 효율성**: 여러 개발자가 동시에 작업하기 용이

