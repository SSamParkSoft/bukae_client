import { useQuery } from '@tanstack/react-query'
import { YouTubeVideo } from '@/lib/types/statistics'

const fetchYouTubeVideos = async (): Promise<YouTubeVideo[]> => {
  const response = await fetch('/api/youtube/videos')
  if (!response.ok) {
    throw new Error('유튜브 동영상 목록을 가져오는데 실패했습니다.')
  }
  return response.json()
}

export const useYouTubeVideos = () => {
  return useQuery({
    queryKey: ['youtube-videos'],
    queryFn: fetchYouTubeVideos,
    staleTime: 5 * 60 * 1000, // 5분간 캐시 유지
  })
}

