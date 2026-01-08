'use client'

import { Suspense } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Loader2, CheckCircle2, Sparkles, XCircle, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import StepIndicator from '@/components/StepIndicator'
import { useStep5Container } from './hooks/useStep5Container'

function Step5PageContent() {
  const container = useStep5Container()

  // 토큰 검증 중에는 로딩 표시
  if (container.isValidatingToken) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-purple-600" />
          <p className={container.theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>인증 확인 중...</p>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="flex min-h-screen justify-center"
    >
      <div className="flex w-full max-w-[1600px]">
        <StepIndicator />
        <div className="flex-1 p-4 md:p-8 overflow-y-auto min-w-0">
          <div className="max-w-5xl mx-auto space-y-6">
            {/* 영상 렌더링 진행 상황 */}
            {container.jobId && (
              <div>
                <h1 className={`text-3xl font-bold mb-2 ${
                  container.theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  영상 생성 중
                </h1>
                <p className={`mt-2 ${
                  container.theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  영상이 생성되고 있어요. 잠시만 기다려주세요.
                </p>

                {/* 진행 상태 표시 */}
                <Card className={`mt-4 ${
                  container.theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                }`}>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {container.isInitializing && (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" style={{
                                color: container.theme === 'dark' ? '#60a5fa' : '#2563eb'
                              }} />
                              <span className="text-sm font-medium" style={{
                                color: container.theme === 'dark' ? '#ffffff' : '#111827'
                              }}>
                                상태 확인 중...
                              </span>
                            </>
                          )}
                          {!container.isInitializing && (!container.jobStatus || container.jobStatus === 'PENDING') && (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" style={{
                                  color: container.theme === 'dark' ? '#60a5fa' : '#2563eb'
                                }} />
                                <span className="text-sm font-medium" style={{
                                  color: container.theme === 'dark' ? '#ffffff' : '#111827'
                                }}>
                                  영상 제작을 시작합니다...
                                </span>
                              </>
                            )}
                            {container.jobStatus === 'PROCESSING' && (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" style={{
                                  color: container.theme === 'dark' ? '#60a5fa' : '#2563eb'
                                }} />
                                <span className="text-sm font-medium" style={{
                                  color: container.theme === 'dark' ? '#ffffff' : '#111827'
                                }}>
                                  영상 생성 중...
                                </span>
                              </>
                            )}
                        </div>
                        {(container.jobStatus === 'PROCESSING' || container.jobStatus === 'PENDING') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={container.handleCancel}
                          >
                            중단하기
                          </Button>
                        )}
                        {container.jobStatus === 'COMPLETED' && (
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" style={{
                              color: container.theme === 'dark' ? '#34d399' : '#10b981'
                            }} />
                            <span className="text-sm font-medium" style={{
                              color: container.theme === 'dark' ? '#34d399' : '#10b981'
                            }}>
                              생성 완료!
                            </span>
                          </div>
                        )}
                        {container.jobStatus === 'FAILED' && (
                          <div className="flex items-center gap-2">
                            <XCircle className="w-4 h-4" style={{
                              color: container.theme === 'dark' ? '#f87171' : '#ef4444'
                            }} />
                            <span className="text-sm font-medium" style={{
                              color: container.theme === 'dark' ? '#f87171' : '#ef4444'
                            }}>
                              생성 실패
                            </span>
                          </div>
                        )}
                      </div>
                        {container.jobProgress && (
                          <div className="mt-2 space-y-1">
                            <p className="text-xs" style={{
                              color: container.theme === 'dark' ? '#9ca3af' : '#6b7280'
                            }}>
                              {typeof container.jobProgress === 'string' ? container.jobProgress : JSON.stringify(container.jobProgress)}
                            </p>
                            {(container.jobStatus === 'PROCESSING' || container.jobStatus === 'PENDING') && container.timeline && container.timeline.scenes && (
                              <p className="text-xs" style={{
                                color: container.theme === 'dark' ? '#9ca3af' : '#6b7280'
                              }}>
                                {container.encodingSceneIndex !== null && container.encodingSceneIndex >= 0
                                  ? `(${container.encodingSceneIndex + 1}/${container.timeline.scenes.length})`
                                  : `(0/${container.timeline.scenes.length})`
                                } · 경과 {container.formatElapsed(container.elapsedSeconds)}
                              </p>
                            )}
                          </div>
                        )}
                        {container.jobStatus === 'COMPLETED' && container.resultVideoUrl && (
                          <div className="mt-4 p-4 rounded-lg border-2" style={{
                            backgroundColor: container.theme === 'dark' ? '#1f2937' : '#f9fafb',
                            borderColor: container.theme === 'dark' ? '#10b981' : '#10b981',
                            borderWidth: '2px'
                          }}>
                            <div className="flex items-center gap-2 mb-3">
                              <CheckCircle2 className="w-5 h-5" style={{
                                color: container.theme === 'dark' ? '#34d399' : '#10b981'
                              }} />
                              <div className="text-sm font-bold" style={{
                                color: container.theme === 'dark' ? '#34d399' : '#10b981'
                              }}>
                                영상 생성 완료!
                              </div>
                            </div>
                            
                            {/* 영상 플레이어 */}
                            <div className="mb-4 flex justify-center">
                              <div 
                                className="video-player-container rounded-lg overflow-hidden"
                                style={{
                                  width: '100%',
                                  maxWidth: '400px',
                                  aspectRatio: '9/16', // 쇼츠 영상 비율 (가로:세로 = 9:16)
                                  backgroundColor: container.theme === 'dark' ? '#000000' : '#000000'
                                }}
                              >
                                <video
                                  src={container.resultVideoUrl}
                                  controls
                                  className="video-player-shorts w-full h-full"
                                  style={{
                                    display: 'block'
                                  }}
                                />
                              </div>
                            </div>
                            
                            {/* 다운로드 버튼 */}
                            <Button
                              onClick={container.handleDownload}
                              className="w-full gap-2"
                            >
                              <Download className="w-4 h-4" />
                              다운로드
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
              </div>
            )}

            {/* 영상 제목 선택 (렌더링 완료 후에만 표시) */}
            {container.jobStatus === 'COMPLETED' && (
              <>
                <div>
                  <h1 className={`text-3xl font-bold mb-2 ${
                    container.theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    유튜브 영상 제목 선택
                  </h1>
                  <p className={`mt-2 ${
                    container.theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    AI가 추천한 제목 중에서 선택하거나 직접 입력하세요
                  </p>
                </div>

                {/* 제목 작성 및 AI 추천 */}
                <Card className={container.theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}>
                  <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle className={container.theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                        영상 제목 작성/추천
                      </CardTitle>
                      <p className={`text-sm mt-1 ${
                        container.theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        직접 작성하거나 AI 버튼으로 추천 제목을 받아보세요.
                      </p>
                    </div>
                    <Button
                      onClick={container.handleGenerateTitles}
                      size="sm"
                      className="gap-2"
                      disabled={container.isGenerating}
                    >
                      {container.isGenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          AI 생성 중...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          AI 제목 추천
                        </>
                      )}
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <textarea
                        value={container.videoTitle}
                        onChange={(e) => container.handleCustomTitle(e.target.value)}
                        placeholder="영상 제목을 직접 입력하거나, AI 추천을 받아 수정해보세요."
                        rows={3}
                        className={`w-full p-3 rounded-lg border resize-none ${
                          container.theme === 'dark'
                            ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-400'
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                        } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                      />
                      <p className={`text-sm ${
                        container.theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {container.videoTitle.length}자
                      </p>
                    </div>

                    {container.isGenerating && (
                      <div className="flex items-center gap-2 rounded-md px-3 py-2 border border-dashed border-purple-400/60 bg-purple-50 dark:bg-purple-900/20">
                        <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                        <p className={`text-sm ${
                          container.theme === 'dark' ? 'text-purple-200' : 'text-purple-800'
                        }`}>
                          AI가 제목을 생성하고 있어요...
                        </p>
                      </div>
                    )}

                    {container.videoTitleCandidates[0] && (
                      <div className={`flex items-center gap-2 rounded-md px-3 py-2 border ${
                        container.theme === 'dark'
                          ? 'border-purple-700 bg-purple-900/20 text-purple-200'
                          : 'border-purple-200 bg-purple-50 text-purple-800'
                      }`}>
                        <CheckCircle2 className="w-4 h-4 text-purple-500" />
                        <p className="text-sm">
                          AI 추천 제목: {container.videoTitleCandidates[0]}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 선택된 제목 표시 */}
                {container.videoTitle && (
                  <Card className={container.theme === 'dark' ? 'bg-purple-900/20 border-purple-700' : 'bg-purple-50 border-purple-200'}>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className={`w-5 h-5 ${
                          container.theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                        }`} />
                        <p className={`font-medium ${
                          container.theme === 'dark' ? 'text-purple-300' : 'text-purple-800'
                        }`}>
                          선택된 제목: {container.videoTitle}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 영상 상세 설명 추천 */}
                <Card className={container.theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}>
                  <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle className={container.theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                        영상 상세 설명 (AI 추천)
                      </CardTitle>
                      <p className={`text-sm mt-1 ${
                        container.theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        쿠팡 파트너스 고지와 상품 정보를 포함한 설명을 자동으로 채워드립니다.
                      </p>
                    </div>
                    <Button
                      onClick={container.handleGenerateDescription}
                      size="sm"
                      className="gap-2"
                      variant="secondary"
                      disabled={container.isGeneratingDescription}
                    >
                      {container.isGeneratingDescription ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          AI 생성 중...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          AI 상세 설명 추천
                        </>
                      )}
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <textarea
                      value={container.videoDescription}
                      onChange={(e) => container.setVideoDescription(e.target.value)}
                      rows={10}
                      className={`w-full p-3 rounded-lg border resize-none ${
                        container.theme === 'dark'
                          ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-400'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      } focus:outline-none focus:ring-2 focus:ring-purple-500 whitespace-pre-line`}
                    />
                  </CardContent>
                </Card>

                {/* 해시태그 추천 */}
                <Card className={container.theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}>
                  <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle className={container.theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                        AI 추천 해시태그
                      </CardTitle>
                      <p className={`text-sm mt-1 ${
                        container.theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        상품명과 플랫폼을 반영한 해시태그를 한 번에 받아보세요.
                      </p>
                    </div>
                    <Button
                      onClick={container.handleGenerateHashtags}
                      size="sm"
                      className="gap-2"
                      variant="secondary"
                      disabled={container.isGeneratingHashtags}
                    >
                      {container.isGeneratingHashtags ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          AI 생성 중...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          AI 해시태그 추천
                        </>
                      )}
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {container.videoHashtags.map((tag) => (
                        <span
                          key={tag}
                          className={`px-3 py-1 text-sm rounded-full border ${
                            container.theme === 'dark'
                              ? 'bg-gray-900 border-gray-700 text-gray-100'
                              : 'bg-gray-50 border-gray-200 text-gray-800'
                          }`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <textarea
                      value={container.videoHashtags.join(' ')}
                      onChange={(e) => container.handleHashtagChange(e.target.value)}
                      rows={3}
                      className={`w-full p-3 rounded-lg border resize-none ${
                        container.theme === 'dark'
                          ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-400'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                      placeholder="#쿠팡파트너스 #제품리뷰 #핫딜 ..."
                    />
                    <p className={`text-xs ${
                      container.theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                    }`}>
                      해시태그는 공백 또는 쉼표로 구분해 입력/수정할 수 있어요.
                    </p>
                  </CardContent>
                </Card>

                {/* 다음 단계 버튼 */}
                <div className="flex justify-end pt-4">
                  <Button
                    onClick={container.handleNext}
                    size="lg"
                    className="gap-2"
                    disabled={!container.videoTitle}
                  >
                    완료 및 업로드
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 완료 확인 팝업 */}
      <Dialog open={container.isCompleteDialogOpen} onOpenChange={container.setIsCompleteDialogOpen}>
        <DialogContent className={container.theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}>
          <DialogHeader>
            <DialogTitle className={container.theme === 'dark' ? 'text-white' : 'text-gray-900'}>
              영상제작을 완료하시겠어요?
            </DialogTitle>
            <DialogDescription className={container.theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
              업로드 기능은 추가 예정이에요.
            </DialogDescription>
          </DialogHeader>
          <div className={`rounded-lg border px-4 py-3 text-sm ${
            container.theme === 'dark'
              ? 'bg-gray-900 border-gray-700 text-gray-100'
              : 'bg-purple-50 border-purple-200 text-purple-900'
          }`}>
            제작된 영상은 30일간 보관 후 자동 삭제됩니다. <br />기한 내 필요한 파일은 다운로드해 주세요!
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => container.setIsCompleteDialogOpen(false)}
              className={container.theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}
            >
              취소
            </Button>
            <Button onClick={container.handleComplete} className="gap-2" disabled={container.isCompleting}>
              {container.isCompleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  정리 중...
                </>
              ) : (
                <>
                  완료하기
                  <CheckCircle2 className="w-4 h-4" />
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}

export default function Step5Page() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen justify-center items-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    }>
      <Step5PageContent />
    </Suspense>
  )
}
