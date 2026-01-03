# API DTO (Data Transfer Object) 가이드

이 디렉토리는 백엔드 API의 요청/응답 타입(DTO)을 정의합니다.

## DTO란?

DTO (Data Transfer Object)는 **백엔드 API와의 통신을 위해 사용하는 데이터 구조**입니다.

### DTO의 특징
- ✅ 백엔드 API 스펙을 그대로 반영
- ✅ API 필드명 그대로 사용 (예: `productTitle`, `salePrice`)
- ✅ Optional 필드가 많을 수 있음 (API 버전별 차이)
- ✅ 내부 도메인 로직에서는 사용하지 않음

### 도메인 모델과의 차이
- **DTO**: API 통신용, 백엔드 스펙 그대로
- **도메인 모델**: 내부 로직용, 비즈니스 규칙 반영

## 디렉토리 구조

```
lib/types/api/
├── index.ts           # 모든 DTO 타입 export
├── common.ts          # 공통 DTO 타입 (ApiResponse, 에러 타입 등)
├── products.ts        # Product API DTO
├── video.ts           # Video API DTO
├── auth.ts            # 인증 API DTO
├── studio-script.ts   # Studio Script API DTO
├── studio-meta.ts     # Studio Meta API DTO
├── studio-title.ts    # Studio Title API DTO
├── image.ts           # Image API DTO
├── mall-configs.ts    # Mall Config API DTO
└── README.md          # 이 파일
```

## 사용 원칙

### 1. DTO는 API 통신에만 사용

DTO는 백엔드와의 통신에만 사용하고, 내부 도메인 로직에서는 사용하지 않습니다.

```typescript
// ❌ 잘못된 사용 - DTO를 내부 로직에서 직접 사용
import type { ProductResponse } from '@/lib/types/api/products'

function calculateTotalPrice(products: ProductResponse[]) {
  // ProductResponse는 DTO이므로 내부 로직에서 사용하지 않음
  return products.reduce((sum, p) => sum + (p.salePrice || 0), 0)
}

// ✅ 올바른 사용 - DTO를 도메인 모델로 변환 후 사용
import type { Product } from '@/lib/types/domain/product'
import { convertProductResponseToProduct } from '@/lib/utils/converters/product'

async function loadProducts() {
  const dtos = await searchProducts(request) // DTO 받기
  const products = dtos.map(dto => 
    convertProductResponseToProduct(dto, targetMall) // 도메인 모델로 변환
  )
  // 이제 Product 도메인 모델을 사용
  return products.reduce((sum, p) => sum + p.price, 0)
}
```

### 2. 변환 함수를 통한 변환

API 응답(DTO)을 받은 후 반드시 변환 함수를 통해 도메인 모델로 변환합니다.

```typescript
import { searchProducts } from '@/lib/api/products'
import { convertProductResponseToProduct } from '@/lib/utils/converters/product'
import type { ProductResponse } from '@/lib/types/api/products'

// 1. API 호출 (DTO 받기)
const dtos: ProductResponse[] = await searchProducts(request)

// 2. 도메인 모델로 변환
const products = dtos.map(dto => 
  convertProductResponseToProduct(dto, targetMall)
)

// 3. 도메인 모델 사용
products.forEach(product => {
  console.log(product.name, product.price) // 타입 안전
})
```

### 3. 타입 가드로 런타임 검증

API 응답을 받은 후 타입 가드로 런타임 검증을 수행합니다.

```typescript
import { isProductResponseArray } from '@/lib/utils/type-guards/product'

const response = await searchProducts(request)
if (!isProductResponseArray(response)) {
  throw new Error('유효하지 않은 응답입니다.')
}
// 이제 response는 ProductResponse[]로 타입 보장됨
```

## 네이밍 컨벤션

### Request DTO
- 패턴: `{Resource}{Action}Request`
- 예시:
  - `ProductSearchRequest`
  - `StudioScriptRequest`
  - `LoginRequest`

### Response DTO
- 패턴: `{Resource}{Action}Response` 또는 `{Resource}Response`
- 예시:
  - `ProductSearchResponse` (배열 타입)
  - `ProductResponse` (단일 객체)
  - `StudioScriptResponse`
  - `TokenResponse`

## 공통 DTO 타입

`common.ts`에 정의된 공통 DTO 타입들:

### ApiResponse<T>
성공적인 API 응답을 감싸는 공통 구조
```typescript
interface ApiResponse<T> {
  data: T
  message?: string
  statusCode?: number
}
```

### ApiErrorResponse
에러 응답 구조
```typescript
interface ApiErrorResponse {
  error: string
  message: string
  statusCode: number
  details?: unknown
}
```

### PaginatedResponse<T>
페이지네이션된 응답
```typescript
interface PaginatedResponse<T> {
  data: T[]
  meta: PaginationMeta
}
```

### ApiResult<T>
성공/실패 Union 타입
```typescript
type ApiResult<T> = SuccessResponse<T> | FailureResponse
```

## DTO 작성 가이드

### 1. API 스펙 그대로 반영
```typescript
// ✅ API 스펙 그대로
export interface ProductResponse {
  productTitle?: string  // API 필드명 그대로
  salePrice?: number
  imageURL?: string | string[]
}

// ❌ 도메인 모델처럼 변형하지 않음
export interface ProductResponse {
  name: string  // 이미 변환된 형태 (X)
  price: number
  images: string[]
}
```

### 2. Optional 필드 허용
API 버전별 차이나 선택적 필드를 고려하여 optional로 정의
```typescript
export interface ProductResponse {
  id?: string
  productId?: string | number  // 다양한 형태 허용
  productTitle?: string
  title?: string  // 이전 버전 호환
  // ...
}
```

### 3. Index Signature 사용
추가 필드가 있을 수 있는 경우 index signature 사용
```typescript
export interface ProductResponse {
  // ... 기본 필드들
  [key: string]: unknown  // 추가 필드 허용
}
```

## 마이그레이션 가이드

기존 코드에서 DTO를 직접 사용하는 경우:

1. **변환 함수 사용**: DTO를 도메인 모델로 변환
2. **타입 가드 추가**: 런타임 검증 강화
3. **점진적 마이그레이션**: 기존 코드는 deprecated로 표시하고 점진적으로 변경

## 관련 파일

- **도메인 모델**: `lib/types/domain/` - 내부 비즈니스 로직용 타입
- **변환 함수**: `lib/utils/converters/` - DTO → 도메인 모델 변환
- **타입 가드**: `lib/utils/type-guards/` - 런타임 타입 검증

## 예제

### 완전한 예제: 상품 검색

```typescript
import { searchProducts } from '@/lib/api/products'
import { convertProductResponseToProduct } from '@/lib/utils/converters/product'
import { isProductResponseArray } from '@/lib/utils/type-guards/product'
import type { ProductResponse } from '@/lib/types/api/products'
import type { Product } from '@/lib/types/domain/product'

async function searchAndConvertProducts(query: string, targetMall: TargetMall): Promise<Product[]> {
  // 1. API 호출 (DTO 받기)
  const dtos: ProductResponse[] = await searchProducts({
    query,
    targetMall,
    userTrackingId: null,
  })

  // 2. 타입 가드로 검증
  if (!isProductResponseArray(dtos)) {
    throw new Error('유효하지 않은 응답입니다.')
  }

  // 3. 도메인 모델로 변환
  const products = dtos.map(dto => 
    convertProductResponseToProduct(dto, targetMall)
  )

  // 4. 도메인 모델 반환 (내부 로직에서 사용)
  return products
}
```
