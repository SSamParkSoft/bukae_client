/**
 * @deprecated 이 파일은 더 이상 사용되지 않습니다.
 * API 타입은 @/lib/types/api/products를 사용하세요.
 * 변환 함수는 @/lib/utils/converters/product를 사용하세요.
 * 
 * 이 파일은 하위 호환성을 위해 유지되며, 향후 제거될 예정입니다.
 */

// 하위 호환성을 위한 re-export
export type { TargetMall, ProductSearchRequest, ProductSearchResponse, ProductResponse } from './api/products'

// 변환 함수는 converters로 이동됨 - 하위 호환성을 위한 re-export
export { convertProductResponseToProduct } from '@/lib/utils/converters/product'
