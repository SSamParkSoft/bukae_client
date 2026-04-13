# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Monorepo-level commands (dev/build/lint), tech stack, CI/CD, and code style rules are in the root `CLAUDE.md`. This file covers `apps/bukae_analyze/`-specific architecture.

---

## Data Flow Architecture

모든 데이터는 아래 방향으로만 흐른다.

```
서버 (API Response)
   │  JSON — 서버 네이밍 규칙, 날짜는 문자열
   ▼
Service Layer  (lib/services/)
   ├── HTTP 호출
   ├── Zod 검증 — 응답 형태 계약 확인
   └── Mapper 변환 — DTO → Domain Model
   │  camelCase, Date 객체, 구조 정규화
   ▼
Domain Model  (lib/types/domain/)
   │  앱 전체에서 사용하는 표준 타입
   ▼
ViewModel 변환  (features/{domain}/hooks/)
   │  포맷된 문자열, 파생 상태, UI 전용 필드
   ▼
Component  (app/{page}/_components/)
   │  값을 받아서 보여주기만 한다
```

**UI 개발 중 (API 미연동)**: `lib/mocks/`의 목 데이터가 Service Layer를 대신한다.
목 데이터는 Domain Model 형태로 제공하므로 컴포넌트는 변경 없이 그대로 사용한다.

---

## Directory Structure

```
apps/bukae_analyze/
├── app/
│   └── {page}/
│       ├── _components/          # 해당 페이지 전용 UI 컴포넌트
│       └── page.tsx
├── lib/
│   ├── types/
│   │   ├── api/                  # 서버 raw 응답 타입 (DTO)
│   │   └── domain/               # 앱 표준 도메인 모델
│   ├── services/
│   │   └── mappers/              # DTO → Domain Model 변환 함수
│   └── mocks/                    # UI 개발용 목 데이터 (Domain Model 형태)
└── features/
    └── {domain}/                 # 데이터/로직 전용 — UI 없음
        ├── types/                # ViewModel 타입
        ├── hooks/                # Domain → ViewModel 변환 훅
        └── config/               # 도메인 설정 상수 (선택)
```

## 폴더별 역할 요약

| 폴더 | 역할 |
|------|------|
| `lib/types/api/` | 서버 raw 응답 타입 (DTO) |
| `lib/types/domain/` | 앱 표준 타입 (Domain Model) |
| `lib/services/` | fetch + Zod 검증 + mapper 호출 |
| `lib/services/mappers/` | DTO → Domain Model 변환 함수 |
| `lib/services/endpoints.ts` | API 엔드포인트 상수 |
| `lib/mocks/` | UI 개발용 목 데이터 (Domain Model 형태) |
| `features/{domain}/hooks/` | Domain Model → ViewModel 변환 |
| `features/{domain}/types/` | ViewModel 타입 |
| `app/{page}/_components/` | 해당 페이지 전용 UI 컴포넌트 (렌더링만) |

---

## Layer Rules

### `lib/types/api/` — DTO 타입
- 서버 응답 JSON 형태를 그대로 정의한다
- **Service Layer(mappers)에서만 사용한다** — 컴포넌트나 훅에서 직접 import 금지
- API 연동 시 Zod 스키마와 1:1 대응시킨다

### `lib/types/domain/` — Domain Model
- 앱 전체 표준 타입. 컴포넌트, 훅, store 어디서나 사용 가능
- camelCase 네이밍, 날짜는 `Date` 객체
- API 스펙이 바뀌어도 Domain Model은 안정적으로 유지한다
- DTO 타입을 import하지 않는다

### `lib/services/mappers/` — Mapper
- DTO → Domain Model 변환만 담당하는 순수 함수
- **이 파일들만 DTO 타입을 알고 있다**
- API 네이밍이 바뀌면 mapper만 수정한다

### `lib/mocks/` — 목 데이터
- Domain Model 형태로 작성한다 (DTO 형태 금지)
- 파일 네이밍: `{domain}.ts` (ex: `channelStats.ts`)
- API 연동 시 같은 이름의 Service 함수로 교체한다

### `features/{domain}/types/` — ViewModel
- Domain Model을 UI에 맞게 파생한 타입
- 포맷된 문자열, 색상 결정 boolean, UI 전용 파생 상태 등
- DTO 타입을 import하지 않는다

### `features/{domain}/hooks/` — ViewModel 변환 훅
- Domain Model을 받아 ViewModel로 변환한다
- **데이터 fetch 금지** — 변환(transform)만 담당한다
- 순수 변환이므로 `useMemo`로 감싼다

### `app/{page}/_components/` — UI 컴포넌트
- 해당 페이지에서만 사용하는 전용 컴포넌트
- ViewModel을 props로 받아 렌더링만 한다
- API 호출, 데이터 변환, 포맷팅 로직 금지
- props 타입은 `@/features/{domain}/types/viewModel`에서 import한다

---

## 새 도메인 추가 방법

새 기능/도메인을 추가할 때 이 순서로 만든다.

### 1. Domain Model 정의
```ts
// lib/types/domain/channelStats.ts
export interface ChannelStats {
  channelId: string
  subscriberCount: number
  updatedAt: Date
}
```
`lib/types/domain/index.ts`에 re-export 추가.

### 2. 목 데이터 작성 (UI 개발용)
```ts
// lib/mocks/channelStats.ts
import type { ChannelStats } from '@/lib/types/domain'

export const MOCK_CHANNEL_STATS: ChannelStats = {
  channelId: 'ch_001',
  subscriberCount: 12345,
  updatedAt: new Date('2024-01-15'),
}
```
`lib/mocks/index.ts`에 re-export 추가.

### 3. ViewModel 타입 정의
```ts
// features/channelStats/types/viewModel.ts
export interface ChannelStatsViewModel {
  formattedSubscriberCount: string  // "12,345"
  updatedDateLabel: string           // "2024.01.15"
}
```

### 4. ViewModel 변환 훅 작성
```ts
// features/channelStats/hooks/useChannelStatsViewModel.ts
import { useMemo } from 'react'
import type { ChannelStats } from '@/lib/types/domain'
import type { ChannelStatsViewModel } from '../types/viewModel'

export function useChannelStatsViewModel(domain: ChannelStats): ChannelStatsViewModel {
  return useMemo(() => ({
    formattedSubscriberCount: domain.subscriberCount.toLocaleString('ko-KR'),
    updatedDateLabel: domain.updatedAt.toLocaleDateString('ko-KR'),
  }), [domain])
}
```

### 5. 컴포넌트 작성
```tsx
// app/dashboard/_components/ChannelStatsCard.tsx
import type { ChannelStatsViewModel } from '@/features/channelStats/types/viewModel'

export function ChannelStatsCard({ data }: { data: ChannelStatsViewModel }) {
  return <div>{data.formattedSubscriberCount}</div>
}
```

### 6. 페이지에서 조합
```tsx
// app/dashboard/page.tsx
import { MOCK_CHANNEL_STATS } from '@/lib/mocks'
import { useChannelStatsViewModel } from '@/features/channelStats/hooks/useChannelStatsViewModel'
import { ChannelStatsCard } from './_components/ChannelStatsCard'

export default function DashboardPage() {
  const viewModel = useChannelStatsViewModel(MOCK_CHANNEL_STATS)
  return <ChannelStatsCard data={viewModel} />
}
```

---

## API 연동 시 추가할 것

목 데이터를 실제 API로 교체할 때는 Service Layer만 추가하면 된다. 컴포넌트, ViewModel, Domain Model은 변경하지 않는다.

### 추가 순서

1. **DTO 타입** (`lib/types/api/channelStats.ts`) — 서버 응답 raw 타입
2. **Zod 스키마** (같은 파일 또는 별도) — 런타임 검증
3. **Mapper** (`lib/services/mappers/channelStatsMapper.ts`) — DTO → Domain Model
4. **Service 함수** (`lib/services/channelStats.ts`) — HTTP 호출 + 검증 + 매핑
5. **페이지에서 교체** — `MOCK_CHANNEL_STATS` → `await fetchChannelStats()`

---

## 패턴 참고

`features/_example/` 폴더에 각 레이어의 주석 달린 예시 파일이 있다.
새 기능 추가 시 참고하거나 복사해서 시작한다.
