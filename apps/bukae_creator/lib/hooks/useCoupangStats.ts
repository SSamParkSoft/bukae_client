import { useQuery } from '@tanstack/react-query'
import { CoupangStats } from '@/lib/types/statistics'
import { authStorage } from '@/lib/api/auth-storage'

const fetchCoupangStats = async (): Promise<CoupangStats> => {
  const accessToken = authStorage.getAccessToken()
  if (!accessToken) {
    throw new Error('로그인이 필요합니다.')
  }

  const response = await fetch('/api/coupang/stats', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) {
    throw new Error('쿠팡 통계 데이터를 가져오는데 실패했어요.')
  }
  return response.json()
}

export const useCoupangStats = () => {
  return useQuery({
    queryKey: ['coupang-stats'],
    queryFn: fetchCoupangStats,
    refetchInterval: 60 * 60 * 1000, // 1시간마다 갱신 (추후 15:00 체크 로직 추가 가능)
    staleTime: 30 * 60 * 1000, // 30분간 캐시 유지
  })
}
