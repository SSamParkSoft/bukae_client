import { api } from './client'

/**
 * NOTE:
 * 이 모듈은 일부 화면/훅에서 참조하지만, 현재 repo에서는 이미지 API 스펙이 고정되어 있지 않습니다.
 * 어떤 메서드든 호출 가능하도록 넓게 열어두되(`Record<string, fn>`), `any`는 쓰지 않습니다.
 */
type UnknownFn = (...args: unknown[]) => unknown

export const imagesApi: Record<string, UnknownFn> = {
  // 예시: 서버가 준비되면 실제 엔드포인트로 교체
  list: () => api.get<unknown>('/images'),
  create: (data: unknown) => api.post<unknown>('/images', data),
}


