import { useQuery } from '@tanstack/react-query'
import { ChannelStats } from '@/lib/types/viewer'

const fetchChannelStats = async (channelId: string): Promise<ChannelStats> => {
  const response = await fetch(`/api/channels/${channelId}/stats`)
  if (!response.ok) {
    throw new Error('통계 데이터를 가져오는데 실패했습니다.')
  }
  return response.json()
}

export const useChannelStats = (channelId: string) => {
  return useQuery({
    queryKey: ['channel-stats', channelId],
    queryFn: () => fetchChannelStats(channelId),
    refetchInterval: 60 * 60 * 1000, // 1시간마다 갱신
    staleTime: 30 * 60 * 1000, // 30분간 캐시 유지
    enabled: !!channelId,
  })
}

