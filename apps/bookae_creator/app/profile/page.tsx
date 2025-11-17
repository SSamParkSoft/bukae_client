'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useUserStore } from '@/store/useUserStore'
import { useThemeStore } from '@/store/useThemeStore'
import { useYouTubeVideos } from '@/lib/hooks/useYouTubeVideos'
import { useCoupangStats } from '@/lib/hooks/useCoupangStats'
import { useYouTubeStats } from '@/lib/hooks/useYouTubeStats'
import {
  User,
  Mail,
  Calendar,
  Settings,
  Link2,
  Link2Off,
  Youtube,
  ShoppingCart,
  Video,
  Bell,
  Eye,
  DollarSign,
  Edit2,
  Upload,
  Download,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react'

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

const formatCurrency = (num: number): string => {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
  }).format(num)
}

export default function ProfilePage() {
  const theme = useThemeStore((state) => state.theme)
  const { user, connectedServices, notificationSettings, updateUser, setConnectedService, updateNotificationSettings } = useUserStore()
  const { data: youtubeVideos, isLoading: youtubeLoading } = useYouTubeVideos()
  const { data: coupangData } = useCoupangStats()
  const { data: youtubeStats } = useYouTubeStats()

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
  })

  // 통계 계산
  const totalVideos = youtubeVideos?.length || 0
  const totalViews = youtubeStats?.views || 0
  const totalRevenue = (coupangData?.dailyRevenue.reduce((sum, item) => sum + item.commission, 0) || 0) + (youtubeStats?.totalEstimatedRevenue || 0)

  // 최근 영상 목록 (최대 5개)
  const recentVideos = youtubeVideos?.slice(0, 5) || []

  const handleSaveProfile = () => {
    if (user) {
      updateUser({
        name: editForm.name,
        email: editForm.email,
      })
      setIsEditDialogOpen(false)
    }
  }

  const handleConnectService = (platform: 'coupang' | 'youtube') => {
    const service = connectedServices.find((s) => s.platform === platform)
    if (service?.isConnected) {
      // 연동 해제
      setConnectedService({
        platform,
        isConnected: false,
      })
    } else {
      // 연동 (실제로는 OAuth 플로우 필요)
      setConnectedService({
        platform,
        isConnected: true,
        connectedAt: new Date().toISOString(),
        ...(platform === 'youtube' && {
          channelName: '내 YouTube 채널',
          subscriberCount: 1000,
        }),
      })
    }
  }

  const coupangService = connectedServices.find((s) => s.platform === 'coupang')
  const youtubeService = connectedServices.find((s) => s.platform === 'youtube')

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="p-8"
    >
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className={`text-3xl font-bold mb-2 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            마이페이지
          </h1>
          <p className={`${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>
            계정 정보 및 설정을 관리하세요
          </p>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className={`grid w-full grid-cols-4 max-w-2xl mb-6 ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
          }`}>
            <TabsTrigger value="profile">프로필</TabsTrigger>
            <TabsTrigger value="services">연동 서비스</TabsTrigger>
            <TabsTrigger value="activity">활동 내역</TabsTrigger>
            <TabsTrigger value="settings">설정</TabsTrigger>
          </TabsList>

          {/* 프로필 탭 */}
          <TabsContent value="profile">
            <div className="space-y-6">
              {/* 프로필 정보 카드 */}
              <Card className="border border-gray-200">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>프로필 정보</CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditForm({
                          name: user?.name || '',
                          email: user?.email || '',
                        })
                        setIsEditDialogOpen(true)
                      }}
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      수정
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6 mb-6">
                    <div className={`relative w-24 h-24 rounded-full flex items-center justify-center ${
                      theme === 'dark' ? 'bg-purple-900/40' : 'bg-purple-100'
                    }`}>
                      {user?.profileImage ? (
                        <img
                          src={user.profileImage}
                          alt={user.name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <User className={`w-12 h-12 ${
                          theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                        }`} />
                      )}
                      <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center hover:bg-purple-700 transition-colors">
                        <Upload className="w-4 h-4" />
                      </button>
                    </div>
                    <div>
                      <h2 className={`text-2xl font-bold mb-1 ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        {user?.name || '사용자'}
                      </h2>
                      <p className={`${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        {user?.email || 'user@example.com'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <Mail className={`w-5 h-5 ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                      }`} />
                      <div>
                        <div className={`text-sm ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          이메일
                        </div>
                        <div className={`font-medium ${
                          theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                        }`}>
                          {user?.email || 'user@example.com'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Calendar className={`w-5 h-5 ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                      }`} />
                      <div>
                        <div className={`text-sm ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          가입일
                        </div>
                        <div className={`font-medium ${
                          theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                        }`}>
                          {user?.createdAt ? formatDate(user.createdAt) : '2024년 1월 1일'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                        user?.accountStatus === 'active'
                          ? 'bg-green-500'
                          : 'bg-gray-400'
                      }`}>
                        {user?.accountStatus === 'active' ? (
                          <CheckCircle2 className="w-4 h-4 text-white" />
                        ) : (
                          <XCircle className="w-4 h-4 text-white" />
                        )}
                      </div>
                      <div>
                        <div className={`text-sm ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          계정 상태
                        </div>
                        <div className={`font-medium ${
                          theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                        }`}>
                          {user?.accountStatus === 'active' ? '활성' : '비활성'}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 통계 요약 카드 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border border-gray-200">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Video className={`w-5 h-5 ${
                        theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                      }`} />
                      <CardTitle className="text-lg">총 영상 수</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className={`text-3xl font-bold ${
                      theme === 'dark' ? 'text-purple-300' : 'text-purple-600'
                    }`}>
                      {totalVideos}
                    </p>
                    <p className={`text-sm mt-1 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      제작한 영상
                    </p>
                  </CardContent>
                </Card>

                <Card className="border border-gray-200">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Eye className={`w-5 h-5 ${
                        theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                      }`} />
                      <CardTitle className="text-lg">총 조회수</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className={`text-3xl font-bold ${
                      theme === 'dark' ? 'text-purple-300' : 'text-purple-600'
                    }`}>
                      {formatNumber(totalViews)}
                    </p>
                    <p className={`text-sm mt-1 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      누적 조회수
                    </p>
                  </CardContent>
                </Card>

                <Card className="border border-gray-200">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <DollarSign className={`w-5 h-5 ${
                        theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                      }`} />
                      <CardTitle className="text-lg">총 수익</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className={`text-3xl font-bold ${
                      theme === 'dark' ? 'text-purple-300' : 'text-purple-600'
                    }`}>
                      {formatCurrency(totalRevenue)}
                    </p>
                    <p className={`text-sm mt-1 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      누적 수익
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* 연동 서비스 탭 */}
          <TabsContent value="services">
            <div className="space-y-6">
              {/* 쿠팡파트너스 연동 */}
              <Card className="border border-gray-200">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ShoppingCart className={`w-6 h-6 ${
                        theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                      }`} />
                      <CardTitle>쿠팡파트너스</CardTitle>
                    </div>
                    {coupangService?.isConnected ? (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                        <span className={`text-sm ${
                          theme === 'dark' ? 'text-green-400' : 'text-green-600'
                        }`}>
                          연동됨
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <XCircle className="w-5 h-5 text-gray-400" />
                        <span className={`text-sm ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          미연동
                        </span>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {coupangService?.isConnected && coupangService.connectedAt && (
                      <div>
                        <p className={`text-sm ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          연동일: {formatDate(coupangService.connectedAt)}
                        </p>
                      </div>
                    )}
                    <Button
                      variant={coupangService?.isConnected ? 'outline' : 'default'}
                      onClick={() => handleConnectService('coupang')}
                      className="w-full"
                    >
                      {coupangService?.isConnected ? (
                        <>
                          <Link2Off className="w-4 h-4 mr-2" />
                          연동 해제
                        </>
                      ) : (
                        <>
                          <Link2 className="w-4 h-4 mr-2" />
                          연동하기
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* YouTube 연동 */}
              <Card className="border border-gray-200">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Youtube className={`w-6 h-6 ${
                        theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                      }`} />
                      <CardTitle>YouTube</CardTitle>
                    </div>
                    {youtubeService?.isConnected ? (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                        <span className={`text-sm ${
                          theme === 'dark' ? 'text-green-400' : 'text-green-600'
                        }`}>
                          연동됨
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <XCircle className="w-5 h-5 text-gray-400" />
                        <span className={`text-sm ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          미연동
                        </span>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {youtubeService?.isConnected && (
                      <>
                        {youtubeService.channelName && (
                          <div>
                            <p className={`text-sm ${
                              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                            }`}>
                              채널명: {youtubeService.channelName}
                            </p>
                          </div>
                        )}
                        {youtubeService.subscriberCount && (
                          <div>
                            <p className={`text-sm ${
                              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                            }`}>
                              구독자: {formatNumber(youtubeService.subscriberCount)}명
                            </p>
                          </div>
                        )}
                        {youtubeService.connectedAt && (
                          <div>
                            <p className={`text-sm ${
                              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                            }`}>
                              연동일: {formatDate(youtubeService.connectedAt)}
                            </p>
                          </div>
                        )}
                      </>
                    )}
                    <Button
                      variant={youtubeService?.isConnected ? 'outline' : 'default'}
                      onClick={() => handleConnectService('youtube')}
                      className="w-full"
                    >
                      {youtubeService?.isConnected ? (
                        <>
                          <Link2Off className="w-4 h-4 mr-2" />
                          연동 해제
                        </>
                      ) : (
                        <>
                          <Link2 className="w-4 h-4 mr-2" />
                          연동하기
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 활동 내역 탭 */}
          <TabsContent value="activity">
            <div className="space-y-6">
              {/* 최근 제작한 영상 */}
              <Card className="border border-gray-200">
                <CardHeader>
                  <CardTitle>최근 제작한 영상</CardTitle>
                </CardHeader>
                <CardContent>
                  {youtubeLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                    </div>
                  ) : recentVideos.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {recentVideos.map((video) => (
                        <motion.div
                          key={video.videoId}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                        className={`p-4 rounded-lg border border-gray-200 cursor-pointer transition-colors ${
                          theme === 'dark'
                            ? 'hover:bg-purple-900/20'
                            : 'hover:bg-purple-50'
                        }`}
                        >
                          <div className="relative aspect-video rounded-lg overflow-hidden mb-3">
                            {video.thumbnailUrl ? (
                              <img
                                src={video.thumbnailUrl}
                                alt={video.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className={`w-full h-full flex items-center justify-center ${
                                theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-50'
                              }`}>
                                <Youtube className={`w-12 h-12 ${
                                  theme === 'dark' ? 'text-purple-500' : 'text-purple-400'
                                }`} />
                              </div>
                            )}
                          </div>
                          <h3 className={`font-semibold mb-2 line-clamp-2 ${
                            theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                          }`}>
                            {video.title}
                          </h3>
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1">
                              <Eye className={`w-4 h-4 ${
                                theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                              }`} />
                              <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>
                                {formatNumber(video.views || 0)}
                              </span>
                            </div>
                            {video.publishedAt && (
                              <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>
                                {formatDate(video.publishedAt)}
                              </span>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className={`text-center py-8 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      제작한 영상이 없습니다
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 설정 탭 */}
          <TabsContent value="settings">
            <div className="space-y-6">
              {/* 알림 설정 */}
              <Card className="border border-gray-200">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Bell className={`w-5 h-5 ${
                      theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                    }`} />
                    <CardTitle>알림 설정</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <div className={`font-medium ${
                        theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                      }`}>
                        영상 제작 완료 알림
                      </div>
                      <div className={`text-sm ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        영상 제작이 완료되면 알림을 받습니다
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={notificationSettings.videoComplete}
                        onChange={(e) =>
                          updateNotificationSettings({ videoComplete: e.target.checked })
                        }
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <div className={`font-medium ${
                        theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                      }`}>
                        수익 알림
                      </div>
                      <div className={`text-sm ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        수익이 발생하면 알림을 받습니다
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={notificationSettings.revenueAlert}
                        onChange={(e) =>
                          updateNotificationSettings({ revenueAlert: e.target.checked })
                        }
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <div className={`font-medium ${
                        theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                      }`}>
                        주간 리포트
                      </div>
                      <div className={`text-sm ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        매주 성과 리포트를 이메일로 받습니다
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={notificationSettings.weeklyReport}
                        onChange={(e) =>
                          updateNotificationSettings({ weeklyReport: e.target.checked })
                        }
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                </CardContent>
              </Card>

              {/* 계정 설정 */}
              <Card className="border border-gray-200">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Settings className={`w-5 h-5 ${
                      theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                    }`} />
                    <CardTitle>계정 설정</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setIsPasswordDialogOpen(true)}
                  >
                    비밀번호 변경
                  </Button>
                  <div className="flex gap-4">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        // 데이터 내보내기 기능
                        const data = {
                          user,
                          connectedServices,
                          notificationSettings,
                        }
                        const blob = new Blob([JSON.stringify(data, null, 2)], {
                          type: 'application/json',
                        })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = `bookae-data-${new Date().toISOString()}.json`
                        a.click()
                        URL.revokeObjectURL(url)
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      데이터 내보내기
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => setIsDeleteDialogOpen(true)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      계정 삭제
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* 프로필 수정 다이얼로그 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent
          className={`border ${
            theme === 'dark' ? 'bg-gray-900 border-gray-200' : 'border-gray-200'
          }`}
        >
          <DialogHeader>
            <DialogTitle>프로필 정보 수정</DialogTitle>
            <DialogDescription>
              프로필 정보를 수정하세요
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">이름</Label>
              <Input
                id="name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSaveProfile}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 비밀번호 변경 다이얼로그 */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent
          className={`border ${
            theme === 'dark' ? 'bg-gray-900 border-gray-200' : 'border-gray-200'
          }`}
        >
          <DialogHeader>
            <DialogTitle>비밀번호 변경</DialogTitle>
            <DialogDescription>
              새로운 비밀번호를 입력하세요
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="currentPassword">현재 비밀번호</Label>
              <Input
                id="currentPassword"
                type="password"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="newPassword">새 비밀번호</Label>
              <Input
                id="newPassword"
                type="password"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">비밀번호 확인</Label>
              <Input
                id="confirmPassword"
                type="password"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={() => setIsPasswordDialogOpen(false)}>변경</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 계정 삭제 다이얼로그 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent
          className={`border ${
            theme === 'dark' ? 'bg-gray-900 border-gray-200' : 'border-gray-200'
          }`}
        >
          <DialogHeader>
            <DialogTitle>계정 삭제</DialogTitle>
            <DialogDescription>
              계정을 삭제하면 모든 데이터가 영구적으로 삭제됩니다. 이 작업은 취소할 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                // 계정 삭제 로직
                setIsDeleteDialogOpen(false)
              }}
            >
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
