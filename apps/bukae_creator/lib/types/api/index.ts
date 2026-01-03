/**
 * API DTO (Data Transfer Object) 타입 모음
 * 
 * 이 디렉토리의 모든 타입은 백엔드 API와의 통신을 위한 DTO입니다.
 * 내부 도메인 로직에서는 사용하지 않고, 반드시 변환 함수를 통해
 * 도메인 모델로 변환하여 사용해야 합니다.
 * 
 * @see lib/types/domain/ - 도메인 모델
 * @see lib/utils/converters/ - 변환 함수
 */

// 공통 DTO 타입
export * from './common'

// 인증 DTO
export * from './auth'

// 상품 DTO
export * from './products'

// 비디오 DTO
export * from './video'

// Studio DTO
export * from './studio-script'
export * from './studio-meta'
// studio-title은 studio-meta와 타입이 겹치므로 별도 export 제외
// 필요시 직접 import: import { ... } from '@/lib/types/api/studio-title'

// 기타 DTO
export * from './image'
export * from './mall-configs'

