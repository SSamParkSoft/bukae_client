/**
 * 변환 함수 타입 정의
 * API DTO를 도메인 모델로 변환하는 함수들의 타입을 정의합니다.
 */

/**
 * 변환 함수 기본 타입
 * @template ApiType - API 응답 타입 (DTO)
 * @template DomainType - 도메인 모델 타입
 */
export type ConverterFunction<ApiType, DomainType> = (
  apiData: ApiType,
  options?: ConverterOptions
) => DomainType

/**
 * 변환 옵션
 */
export interface ConverterOptions {
  /**
   * 필수 필드가 없을 때 에러를 던질지 여부
   * @default false
   */
  strict?: boolean
  /**
   * 기본값 설정
   */
  defaults?: Record<string, unknown>
  /**
   * 추가 컨텍스트 데이터
   */
  context?: Record<string, unknown>
}

/**
 * 변환 결과 타입
 * 성공 또는 실패를 나타냄
 */
export type ConverterResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; details?: unknown }

/**
 * 안전한 변환 함수 타입
 * 에러를 던지지 않고 결과를 반환
 */
export type SafeConverterFunction<ApiType, DomainType> = (
  apiData: ApiType,
  options?: ConverterOptions
) => ConverterResult<DomainType>

/**
 * 배치 변환 함수 타입
 * 여러 API 응답을 한 번에 변환
 */
export type BatchConverterFunction<ApiType, DomainType> = (
  apiDataList: ApiType[],
  options?: ConverterOptions
) => DomainType[]

