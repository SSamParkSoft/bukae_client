import { useQuery } from '@tanstack/react-query'
import { ChannelInfo } from '@/lib/types/viewer'

const fetchChannelInfo = async (channelId: string): Promise<ChannelInfo> => {
  const response = await fetch(`/api/channels/${channelId}`)
  if (!response.ok) {
    throw new Error('채널 정보를 가져오는데 실패했습니다.')
  }
  return response.json()
}

export const useChannelInfo = (channelId: string) => {
  return useQuery({
    queryKey: ['channel-info', channelId],
    queryFn: () => fetchChannelInfo(channelId),
    staleTime: 30 * 60 * 1000, // 30분간 캐시 유지
    enabled: !!channelId,
  })
}

