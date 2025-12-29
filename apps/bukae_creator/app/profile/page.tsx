'use client'

import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Image from 'next/image'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useUserStore } from '@/store/useUserStore'
import { useThemeStore } from '@/store/useThemeStore'
import { authApi } from '@/lib/api/auth'
import { saveMallConfig } from '@/lib/api/mall-configs'
import { useMyVideos } from '@/lib/hooks/useVideos'
import PageHeader from '@/components/PageHeader'
import ComingSoonBanner from '@/components/ComingSoonBanner'
import type { TargetMall } from '@/lib/types/products'
import {
  User,
  Mail,
  Calendar,
  Settings,
  Bell,
  Edit2,
  Upload,
  Download,
  Trash2,
  CheckCircle2,
  Save,
  X,
  Loader2,
  Video,
  ExternalLink,
  Play,
} from 'lucide-react'

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

const formatDateTime = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// 영상 목록 컴포넌트
function VideoList() {
  const theme = useThemeStore((state) => state.theme)
  const { data: videos, isLoading, error } = useMyVideos()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className={`w-8 h-8 animate-spin ${
          theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
        }`} />
        <span className={`ml-2 ${
          theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
        }`}>
          영상 목록을 불러오는 중...
        </span>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`p-6 rounded-lg border text-center ${
        theme === 'dark' 
          ? 'border-red-500/50 bg-red-900/20 text-red-300' 
          : 'border-red-200 bg-red-50 text-red-700'
      }`}>
        영상 목록을 불러오지 못했어요. 잠시 후 다시 시도해주세요.
      </div>
    )
  }

  if (!videos || videos.length === 0) {
    return (
      <div className={`p-8 rounded-lg border-2 border-dashed text-center ${
        theme === 'dark' 
          ? 'border-gray-700 bg-gray-800/50 text-gray-400' 
          : 'border-gray-200 bg-gray-50 text-gray-500'
      }`}>
        <Video className={`w-12 h-12 mx-auto mb-3 ${
          theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
        }`} />
        <p className="font-medium">제작한 영상이 없어요</p>
        <p className="text-sm mt-1">영상을 제작하면 여기에 표시됩니다.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {videos.map((video) => (
        <motion.div
          key={video.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-lg border transition-colors ${
            theme === 'dark' 
              ? 'border-gray-700 hover:bg-gray-800/50' 
              : 'border-gray-200 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-start gap-4">
            {/* 썸네일/비디오 아이콘 */}
            <div className={`relative w-32 h-20 rounded-lg overflow-hidden flex-shrink-0 ${
              theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
            }`}>
              {video.fileUrl ? (
                <video
                  src={video.fileUrl}
                  className="w-full h-full object-cover"
                  muted
                  onMouseEnter={(e) => {
                    const videoEl = e.currentTarget
                    videoEl.play().catch(() => {
                      // 자동 재생 실패 시 무시
                    })
                  }}
                  onMouseLeave={(e) => {
                    const videoEl = e.currentTarget
                    videoEl.pause()
                    videoEl.currentTime = 0
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Video className={`w-8 h-8 ${
                    theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
                  }`} />
                </div>
              )}
            </div>

            {/* 영상 정보 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className={`font-semibold text-lg line-clamp-2 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  {video.title}
                </h3>
                {video.fileUrl && (
                  <a
                    href={video.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex-shrink-0 p-2 rounded-lg transition-colors ${
                      theme === 'dark' 
                        ? 'hover:bg-gray-700 text-gray-400 hover:text-white' 
                        : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'
                    }`}
                    title="영상 보기"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>

              {video.description && (
                <p className={`text-sm mb-3 line-clamp-2 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {video.description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-4 text-sm">
                {/* 플랫폼 타입 */}
                <div className="flex items-center gap-1">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    video.platformType === 'COUPANG'
                      ? theme === 'dark'
                        ? 'bg-purple-900/40 text-purple-300'
                        : 'bg-purple-100 text-purple-700'
                      : theme === 'dark'
                      ? 'bg-gray-700 text-gray-300'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {video.platformType === 'COUPANG' ? '쿠팡' : video.platformType}
                  </span>
                </div>

                {/* 게시된 채널 */}
                {video.posts && video.posts.length > 0 && (
                  <div className="flex items-center gap-2">
                    {video.posts.map((post, idx) => (
                      <a
                        key={idx}
                        href={post.postUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                          post.channel === 'YOUTUBE'
                            ? theme === 'dark'
                              ? 'bg-red-900/40 text-red-300 hover:bg-red-900/60'
                              : 'bg-red-100 text-red-700 hover:bg-red-200'
                            : theme === 'dark'
                            ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <Play className="w-3 h-3" />
                        {post.channel === 'YOUTUBE' ? '유튜브' : post.channel}
                      </a>
                    ))}
                  </div>
                )}

                {/* 생성일 */}
                <div className={`flex items-center gap-1 ${
                  theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                }`}>
                  <Calendar className="w-3 h-3" />
                  <span>{formatDateTime(video.createdAt)}</span>
                </div>
              </div>

              {/* 파트너스 링크 */}
              {video.partnersLink && (
                <div className="mt-3">
                  <a
                    href={video.partnersLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1 text-sm transition-colors ${
                      theme === 'dark' 
                        ? 'text-purple-400 hover:text-purple-300' 
                        : 'text-purple-600 hover:text-purple-700'
                    }`}
                  >
                    파트너스 링크
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

export default function ProfilePage() {
  const theme = useThemeStore((state) => state.theme)
  const {
    user,
    connectedServices,
    notificationSettings,
    platformTrackingIds,
    updateUser,
    updateNotificationSettings,
    setPlatformTrackingId,
    isAuthenticated,
    setUser,
  } = useUserStore()
  const {
    data: currentUser,
    isLoading: userLoading,
    error: userError,
  } = useQuery({
    queryKey: ['current-user'],
    queryFn: authApi.getCurrentUser,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
  })
  
  // Tracking ID 편집 상태
  const [editingTrackingId, setEditingTrackingId] = useState<TargetMall | null>(null)
  const [trackingIdForm, setTrackingIdForm] = useState<Record<TargetMall, string>>({
    ALI_EXPRESS: '',
    COUPANG: '',
    AMAZON: '',
  })
  const [isSavingTrackingId, setIsSavingTrackingId] = useState(false)
  const [trackingIdError, setTrackingIdError] = useState<string | null>(null)

  // 편집 시작 시 현재 값으로 폼 초기화
  const handleStartEdit = (platform: TargetMall) => {
    setTrackingIdForm((prev) => ({
      ...prev,
      [platform]: platformTrackingIds[platform] || '',
    }))
    setEditingTrackingId(platform)
  }

  const handleSaveProfile = () => {
    if (user) {
      updateUser({
        name: editForm.name,
        email: editForm.email,
      })
      setIsEditDialogOpen(false)
    }
  }

  const handleSaveTrackingId = async (platform: TargetMall) => {
    const trackingId = trackingIdForm[platform].trim() || ''
    setIsSavingTrackingId(true)
    setTrackingIdError(null)

    try {
      // API에 저장 (빈 문자열도 저장 가능)
      await saveMallConfig(platform, trackingId)
      
      // 성공 시 로컬 스토리지에도 저장
      setPlatformTrackingId(platform, trackingId || null)
      setEditingTrackingId(null)
    } catch (error) {
      console.error('[Profile] 트래킹 ID 저장 실패:', error)
      const errorMessage = error instanceof Error ? error.message : '트래킹 ID 저장에 실패했습니다.'
      setTrackingIdError(errorMessage)
    } finally {
      setIsSavingTrackingId(false)
    }
  }

  const handleCancelTrackingId = () => {
    setEditingTrackingId(null)
  }

  const platformNames: Record<TargetMall, string> = {
    ALI_EXPRESS: '알리익스프레스',
    COUPANG: '쿠팡',
    AMAZON: '아마존',
  }

  useEffect(() => {
    if (currentUser) {
      setUser({
        id: String(currentUser.id),
        name: currentUser.name || currentUser.nickname || '사용자',
        email: currentUser.email || '',
        profileImage: currentUser.profileImage || currentUser.profileImageUrl || undefined,
        createdAt: currentUser.createdAt,
        accountStatus: 'active',
      })
    }
  }, [currentUser, setUser])

  const mergedProfile = useMemo(() => {
    if (!user && !currentUser) return null
    return {
      name: user?.name || currentUser?.name || currentUser?.nickname || '사용자',
      email: user?.email || currentUser?.email || 'user@example.com',
      profileImage: user?.profileImage || currentUser?.profileImage || currentUser?.profileImageUrl,
      createdAt: user?.createdAt || currentUser?.createdAt,
    }
  }, [currentUser, user])

  const profileDisplayName = mergedProfile?.name || '사용자'
  const profileEmail = mergedProfile?.email || 'user@example.com'
  const profileImage = mergedProfile?.profileImage
  const profileLoading = isAuthenticated && userLoading && !user
  const shouldRenderProfileCard = Boolean(mergedProfile)

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="p-8"
    >
      <div className="max-w-6xl mx-auto">
        <PageHeader
          title="마이페이지"
          description="프로필 정보와 설정을 관리하세요"
        />

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
              {!isAuthenticated && (
                <div className={`p-6 rounded-xl border text-center ${
                  theme === 'dark' ? 'border-gray-700 text-gray-300' : 'border-gray-200 text-gray-700'
                }`}>
                  로그인이 필요합니다. 로그인 후 내 프로필 정보를 불러올게요.
                </div>
              )}

              {userError && !shouldRenderProfileCard && (
                <div className="p-6 rounded-xl border border-red-200 bg-red-50 text-red-700">
                  프로필 정보를 불러오지 못했어요. 잠시 후 다시 시도해주세요.
                </div>
              )}

              {profileLoading && !shouldRenderProfileCard && (
                <Card className="border border-gray-200">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-6 mb-6">
                      <div className="relative w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse" />
                      <div className="space-y-3 flex-1">
                        <div className="h-5 w-40 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                        <div className="h-4 w-64 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="h-4 w-full bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                      <div className="h-4 w-4/5 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                      <div className="h-4 w-3/5 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                    </div>
                  </CardContent>
                </Card>
              )}

              {shouldRenderProfileCard && (
                <Card className="border border-gray-200">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>프로필 정보</CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditForm({
                            name: profileDisplayName || '',
                            email: profileEmail || '',
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
                        {profileImage ? (
                          <Image
                            src={profileImage}
                            alt={profileDisplayName}
                            fill
                            className="rounded-full object-cover"
                            sizes="96px"
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
                          {profileDisplayName}
                        </h2>
                        <p className={`${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          {profileEmail}
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
                            {profileEmail}
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
                            {user?.createdAt ? formatDate(user?.createdAt) : '없음'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                          'bg-green-500'
                        }`}>
                          <CheckCircle2 className="w-4 h-4 text-white" />
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
                            활성
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* 연동 서비스 탭 */}
          <TabsContent value="services">
            <div className="space-y-6">
              {/* 플랫폼별 Tracking ID 설정 */}
              <Card className="border border-gray-200">
                <CardHeader>
                  <CardTitle>파트너스 추적 ID 설정</CardTitle>
                  <p className={`text-sm mt-2 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    각 플랫폼에서 발급받은 추적 ID를 등록하세요. 상품 검색 시 사용됩니다.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(Object.keys(platformNames) as TargetMall[]).map((platform) => {
                    const isEditing = editingTrackingId === platform
                    const currentValue = platformTrackingIds[platform]
                    const formValue = trackingIdForm[platform]

                    return (
                      <div
                        key={platform}
                        className={`p-4 rounded-lg border ${
                          theme === 'dark'
                            ? 'border-gray-700 bg-gray-800'
                            : 'border-gray-200 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h3 className={`font-semibold ${
                              theme === 'dark' ? 'text-white' : 'text-gray-900'
                            }`}>
                              {platformNames[platform]}
                            </h3>
                            <p className={`text-xs mt-1 ${
                              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                            }`}>
                              {platform === 'ALI_EXPRESS' && '알리익스프레스 파트너스 추적 ID'}
                              {platform === 'COUPANG' && '쿠팡 파트너스 추적 ID'}
                              {platform === 'AMAZON' && '아마존 어소시에이트 추적 ID'}
                            </p>
                          </div>
                        </div>
                        {isEditing ? (
                          <div className="space-y-2">
                            <Input
                              value={formValue}
                              onChange={(e) =>
                                setTrackingIdForm((prev) => ({
                                  ...prev,
                                  [platform]: e.target.value,
                                }))
                              }
                              placeholder="추적 ID를 입력하세요"
                              className={theme === 'dark' ? 'bg-gray-900' : ''}
                            />
                            <div className="space-y-2">
                              {trackingIdError && (
                                <p className="text-xs text-red-500">{trackingIdError}</p>
                              )}
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleSaveTrackingId(platform)}
                                  className="flex-1"
                                  disabled={isSavingTrackingId}
                                >
                                  {isSavingTrackingId ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                      저장 중...
                                    </>
                                  ) : (
                                    <>
                                      <Save className="w-4 h-4 mr-1" />
                                      저장
                                    </>
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={handleCancelTrackingId}
                                  className="flex-1"
                                  disabled={isSavingTrackingId}
                                >
                                  <X className="w-4 h-4 mr-1" />
                                  취소
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              {currentValue ? (
                                <p className={`font-mono text-sm ${
                                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                                }`}>
                                  {currentValue}
                                </p>
                              ) : (
                                <p className={`text-sm ${
                                  theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                                }`}>
                                  등록되지 않음
                                </p>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStartEdit(platform)}
                            >
                              <Edit2 className="w-4 h-4 mr-1" />
                              {currentValue ? '수정' : '등록'}
                            </Button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </CardContent>
              </Card>

              {/* 기타 연동 서비스 (향후 확장) */}
              <ComingSoonBanner
                title="기타 연동 서비스"
                description="추가 연동 서비스는 준비 중입니다."
              />
            </div>
          </TabsContent>

          {/* 활동 내역 탭 */}
          <TabsContent value="activity">
            <div className="space-y-6">
              <Card className={`border ${
                theme === 'dark' ? 'border-gray-700 bg-gray-900' : 'border-purple-200 bg-purple-50'
              }`}>
                <CardHeader>
                  <CardTitle className={theme === 'dark' ? 'text-white' : 'text-purple-900'}>
                    제작된 영상 보관 안내
                  </CardTitle>
                </CardHeader>
                <CardContent className={theme === 'dark' ? 'text-gray-100' : 'text-purple-900'}>
                  제작된 영상과 업로드된 음성/자막 파일은 30일간 보관된 뒤 자동 삭제됩니다.
                  보관 기간 내 필요한 파일은 다운로드해 주세요.
                </CardContent>
              </Card>
              
              {/* 최근 제작한 영상 */}
              <Card className="border border-gray-200">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Video className={`w-5 h-5 ${
                      theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                    }`} />
                    <CardTitle>최근 제작한 영상</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <VideoList />
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
                        영상 제작이 완료되면 알림을 받아요
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
                        수익이 발생하면 알림을 받아요
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
                        매주 성과 리포트를 이메일로 받아요
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
              계정을 삭제하면 모든 데이터가 영구적으로 삭제돼요. 이 작업은 취소할 수 없어요.
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
