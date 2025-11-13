import { useQuery } from '@tanstack/react-query'
import { CoupangStats } from '@/lib/types/statistics'

const fetchCoupangStats = async (): Promise<CoupangStats> => {
  const response = await fetch('/api/coupang/stats')
  if (!response.ok) {
    throw new Error('쿠팡 통계 데이터를 가져오는데 실패했습니다.')
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

