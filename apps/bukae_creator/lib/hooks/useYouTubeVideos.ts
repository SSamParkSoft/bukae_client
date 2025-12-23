import { useQuery } from '@tanstack/react-query'
import { YouTubeVideo } from '@/lib/types/statistics'
import { authStorage } from '@/lib/api/auth-storage'
import { useUserStore } from '@/store/useUserStore'

const fetchYouTubeVideos = async (): Promise<YouTubeVideo[]> => {
  const accessToken = authStorage.getAccessToken()
  if (!accessToken) {
    throw new Error('로그인이 필요합니다.')
  }

  const response = await fetch('/api/youtube/videos', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) {
    throw new Error('유튜브 동영상 목록을 가져오는데 실패했어요.')
  }
  return response.json()
}

export const useYouTubeVideos = () => {
  const isAuthenticated = useUserStore((state) => state.isAuthenticated)
  
  return useQuery({
    queryKey: ['youtube-videos'],
    queryFn: fetchYouTubeVideos,
    enabled: isAuthenticated, // 로그인 상태일 때만 쿼리 실행
    staleTime: 5 * 60 * 1000, // 5분간 캐시 유지
  })
}

