/**
 * API 엔드포인트 상수
 *
 * 엔드포인트 변경 시 이 파일만 수정한다.
 * Service 함수에서 직접 문자열로 쓰지 않는다.
 *
 * next.config.ts의 rewrites 덕분에 브라우저에서 `/api/v1/...`으로 호출하면
 * Next.js 서버가 NEXT_PUBLIC_API_BASE_URL로 프록시한다. (CORS 불필요)
 */
const BASE = "/api/v1"

export const API_ENDPOINTS = {
  auth: {
    refresh: `${BASE}/auth/refresh`,
  },
  projects: {
    list:   `${BASE}/projects`,
    detail: (projectId: string) => `${BASE}/projects/${projectId}`,
    benchmark:         (projectId: string) => `${BASE}/projects/${projectId}/benchmark`,
    benchmarkAnalysis: (projectId: string) => `${BASE}/projects/${projectId}/benchmark-analysis`,
    timeline:          (projectId: string) => `${BASE}/projects/${projectId}/timeline`,
  },
} as const
