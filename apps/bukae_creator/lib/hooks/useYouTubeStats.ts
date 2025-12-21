import { useQuery } from '@tanstack/react-query'
import { YouTubeStats } from '@/lib/types/statistics'
import { authStorage } from '@/lib/api/auth-storage'

const fetchYouTubeStats = async (): Promise<YouTubeStats> => {
  const accessToken = authStorage.getAccessToken()
  if (!accessToken) {
    throw new Error('로그인이 필요합니다.')
  }

  const response = await fetch('/api/youtube/stats', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) {
    throw new Error('유튜브 통계 데이터를 가져오는데 실패했어요.')
  }
  return response.json()
}

export const useYouTubeStats = () => {
  return useQuery({
    queryKey: ['youtube-stats'],
    queryFn: fetchYouTubeStats,
    refetchInterval: 60 * 60 * 1000, // 1시간마다 갱신
    staleTime: 30 * 60 * 1000, // 30분간 캐시 유지
  })
}

