'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useVideoCreateStore } from '@/store/useVideoCreateStore'
import { useThemeStore } from '@/store/useThemeStore'
import { studioMetaApi } from '@/lib/api/studio-meta'
import { type StudioJobUpdate } from '@/lib/api/websocket'
import { useVideoCreateAuth } from '@/hooks/auth/useVideoCreateAuth'
import { authStorage } from '@/lib/api/auth-storage'
import { api, ApiError } from '@/lib/api/client'
import { getSupabaseClient } from '@/lib/supabase/client'

type RichProgressDetail = {
  step?: string | number
  percent?: number
  msg?: string
  message?: string
  progress?: number
  error?: string
  errorMessage?: string
  currentScene?: number
  sceneIndex?: number
  currentSceneIndex?: number
  scene?: number
}

type ProgressDetail = RichProgressDetail | string

type ExtendedStudioJobUpdate = StudioJobUpdate & {
  progressDetail?: ProgressDetail
  message?: string | Record<string, unknown>
}

export function useStep4Container() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const jobIdFromUrl = searchParams.get('jobId')
  
  // URL에서 jobId 가져오기 (의존성 배열을 위해 메모이제이션) - 먼저 선언
  const urlJobId = useMemo(() => searchParams.get('jobId'), [searchParams])
  
  const { 
    selectedProducts,
    scenes,
    videoTitle,
    videoTitleCandidates,
    videoDescription,
    videoHashtags,
    timeline,
    setVideoTitle,
    setVideoTitleCandidates,
    setVideoDescription,
    setVideoHashtags,
    reset,
  } = useVideoCreateStore()
  const theme = useThemeStore((state) => state.theme)

  // 토큰 검증
  const { isValidatingToken } = useVideoCreateAuth()

  // 영상 렌더링 관련 상태
  // Hydration 오류 방지를 위해 초기값은 null로 설정하고, useEffect에서 클라이언트에서만 설정
  const [currentJobId, setCurrentJobId] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  
  // 클라이언트 마운트 후 localStorage에서 복원
  useEffect(() => {
    setIsMounted(true)
    if (urlJobId) {
      setCurrentJobId(urlJobId)
    } else if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('currentVideoJobId')
      if (saved) {
        setCurrentJobId(saved)
      } else if (jobIdFromUrl) {
        setCurrentJobId(jobIdFromUrl)
      }
    }
  }, [urlJobId, jobIdFromUrl])
  
  // currentJobId가 변경될 때 localStorage에 저장
  useEffect(() => {
    if (isMounted && typeof window !== 'undefined') {
      if (currentJobId) {
        localStorage.setItem('currentVideoJobId', currentJobId)
      } else {
        localStorage.removeItem('currentVideoJobId')
      }
    }
  }, [currentJobId, isMounted])
  
  // UI 렌더링용 jobId (urlJobId가 없으면 currentJobId 사용)
  // Hydration 오류 방지를 위해 isMounted가 true일 때만 렌더링
  const jobId = isMounted ? (urlJobId || currentJobId) : urlJobId
  const [jobStatus, setJobStatus] = useState<'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | null>(null)
  const [jobProgress, setJobProgress] = useState<string>('')
  const jobStartTimeRef = useRef<number | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [encodingSceneIndex, setEncodingSceneIndex] = useState<number | null>(null)
  const [resultVideoUrl, setResultVideoUrl] = useState<string | null>(null)
  const jobStatusCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const refundedJobIdsRef = useRef<Set<string>>(new Set())
  const [isInitializing, setIsInitializing] = useState(false) // 초기 상태 로딩 중
  
  // 영상 제목 선택 관련 상태
  const [isGenerating, setIsGenerating] = useState(false)
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false)
  const [isGeneratingHashtags, setIsGeneratingHashtags] = useState(false)
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const product = selectedProducts[0]
  const descriptionInitialized = useRef(false)
  const hashtagsInitialized = useRef(false)
  const initialHashtags = useRef(videoHashtags)

  const formatElapsed = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}분 ${secs.toString().padStart(2, '0')}초`
  }, [])

  // 다운로드 함수
  const handleDownload = useCallback(() => {
    if (!resultVideoUrl) return

    const proxyUrl = `/api/videos/download?url=${encodeURIComponent(resultVideoUrl)}&filename=result.mp4`
    const a = document.createElement('a')
    a.href = proxyUrl
    a.download = 'result.mp4'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }, [resultVideoUrl])

  const requestRefundForFailedJob = useCallback(async (failedJobId: string, reason: string) => {
    const normalizedJobId = failedJobId.trim()
    if (!normalizedJobId || refundedJobIdsRef.current.has(normalizedJobId)) return

    refundedJobIdsRef.current.add(normalizedJobId)

    try {
      let accessToken = authStorage.getAccessToken()
      if (!accessToken) {
        const supabase = getSupabaseClient()
        const { data } = await supabase.auth.getSession()
        accessToken = data.session?.access_token ?? null
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`
      }

      const refundResponse = await fetch('/api/videos/refund', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          jobId: normalizedJobId,
          reason,
        }),
      })

      if (!refundResponse.ok) {
        refundedJobIdsRef.current.delete(normalizedJobId)
        const errorPayload = await refundResponse.json().catch(() => ({}))
        console.warn('[Step4] 크레딧 환불 요청 실패:', refundResponse.status, errorPayload)
      }
    } catch (error) {
      refundedJobIdsRef.current.delete(normalizedJobId)
      console.warn('[Step4] 크레딧 환불 요청 에러:', error)
    }
  }, [])

  // 작업 취소 실행 (confirm 없이 직접 호출 — handleCancel 및 retryCancel 공용)
  const doCancelJob = useCallback(async (targetJobId: string) => {
    const jobIdToCancel = targetJobId.trim()
    if (!jobIdToCancel) return

    setIsCancelling(true)
    setCancelError(null)

    try {
      await api.post(`/api/v1/studio/jobs/${jobIdToCancel}/cancel`)

      // 성공: 타임아웃·로컬스토리지·잡 상태 정리 후 이동
      if (jobStatusCheckTimeoutRef.current) {
        clearTimeout(jobStatusCheckTimeoutRef.current)
        jobStatusCheckTimeoutRef.current = null
      }

      if (typeof window !== 'undefined') {
        localStorage.removeItem('currentVideoJobId')
      }

      setCurrentJobId(null)
      setJobStatus(null)
      setJobProgress('')
      setEncodingSceneIndex(null)
      setResultVideoUrl(null)

      router.push('/')
    } catch (error) {
      // 실패: 잡 상태 유지, 타임아웃 유지, 오류 메시지만 노출
      const message =
        error instanceof ApiError
          ? error.message
          : '작업 취소 중 오류가 발생했어요. 다시 시도해주세요.'
      setCancelError(message)
      setIsCancelling(false)
    }
  }, [router])

  // 상태 업데이트 처리 함수
  const handleStatusUpdate = useCallback((statusData: ExtendedStudioJobUpdate) => {
    
    const newStatus = statusData.status
    
    // 이미 완료/실패 처리된 경우 추가 업데이트 무시
    setJobStatus((prevStatus) => {
      if (prevStatus === 'COMPLETED' || prevStatus === 'FAILED') {
        return prevStatus
      }
      return newStatus
    })

    // progressDetail에 에러 정보가 있으면 즉시 실패 처리
    const detailError =
      typeof statusData.progressDetail === 'object'
        ? statusData.progressDetail?.error || statusData.progressDetail?.errorMessage
        : typeof statusData.progressDetail === 'string'
          ? statusData.progressDetail
          : ''
    if (detailError && newStatus !== 'COMPLETED') {
      const errorText = detailError || statusData.errorMessage || '알 수 없는 오류가 발생했습니다.'
      // 실패 시 서버 응답 전체를 콘솔에 출력 (네트워크 탭에는 200으로 보일 수 있음)
      console.error('[Step4] 영상 생성 실패 – 서버 응답 전체:', statusData)
      const failedJobId = statusData.jobId || urlJobId || currentJobId
      if (failedJobId) {
        void requestRefundForFailedJob(failedJobId, 'render_failed:progress_detail')
      }
      alert(`영상 생성이 실패했어요.\n\n${errorText}\n\n자세한 내용은 브라우저 콘솔(F12)을 확인해주세요.`)
      setCurrentJobId(null)
      setJobStatus('FAILED')
      setJobProgress('')
      setEncodingSceneIndex(null)
      return
    }

    // progressDetail이 객체인 경우 처리
    let progressText = ''
    let sceneIndex: number | null = null
    
    const isRichProgressDetail = (detail: ProgressDetail): detail is RichProgressDetail =>
      typeof detail === 'object' && detail !== null

    const toText = (...values: Array<string | number | undefined | null>) => {
      const first = values.find((v) => v !== undefined && v !== null)
      return typeof first === 'number' ? first.toString() : first
    }

    if (statusData.progressDetail) {
      if (typeof statusData.progressDetail === 'string') {
        progressText = statusData.progressDetail
      } else if (isRichProgressDetail(statusData.progressDetail)) {
        const detail = statusData.progressDetail
        const detailText = toText(
          detail.msg,
          detail.message,
          detail.step,
          detail.progress,
          detail.percent
        )
        progressText = detailText || JSON.stringify(detail)
        const parsedScene =
          detail.currentScene ??
          detail.sceneIndex ??
          detail.currentSceneIndex ??
          detail.scene ??
          null
        if (typeof parsedScene === 'number') {
          sceneIndex = parsedScene
          setEncodingSceneIndex(parsedScene)
        }
      }
    } else if (statusData.message) {
      progressText = typeof statusData.message === 'string' 
        ? statusData.message 
        : JSON.stringify(statusData.message)
    }
    
    // progressText에서 씬 인덱스 파싱
    if (sceneIndex === null && progressText && timeline) {
      const sceneMatch = progressText.match(/\((\d+)\/(\d+)\)|(\d+)\/(\d+)/)
      if (sceneMatch) {
        const currentSceneNum = parseInt(sceneMatch[1] || sceneMatch[3] || '0', 10)
        sceneIndex = currentSceneNum > 0 ? currentSceneNum - 1 : null
        if (typeof sceneIndex === 'number' && sceneIndex >= 0) {
          setEncodingSceneIndex(sceneIndex)
        }
      }
    }
    
    // 경과 시간 계산 및 표시
    if (jobStartTimeRef.current) {
      const elapsedMs = Date.now() - jobStartTimeRef.current
      const elapsed = Math.floor(elapsedMs / 1000)
      setElapsedSeconds(elapsed)
    }
    
    setJobProgress(progressText)
    
    if (newStatus === 'COMPLETED') {
      const videoUrl = statusData.resultVideoUrl || null
      setResultVideoUrl(videoUrl)
      setJobProgress('영상 생성이 완료되었어요!')
      setEncodingSceneIndex(null)
      
      // 상태 확인 중단
      if (jobStatusCheckTimeoutRef.current) {
        clearTimeout(jobStatusCheckTimeoutRef.current)
        jobStatusCheckTimeoutRef.current = null
      }
    } else if (newStatus === 'FAILED') {
      const errorMessages = [
        statusData.errorMessage,
        statusData.error?.message,
        statusData.error,
      ].filter(Boolean)
      
      if (statusData.progressDetail) {
        if (typeof statusData.progressDetail === 'string') {
          errorMessages.push(statusData.progressDetail)
        } else if (typeof statusData.progressDetail === 'object') {
          const detailMsg = statusData.progressDetail.msg || 
                          statusData.progressDetail.message ||
                          statusData.progressDetail.error
          if (detailMsg) errorMessages.push(detailMsg)
        }
      }
      
      // 디버깅: 실패 시 서버 응답 전체를 콘솔에 출력 (네트워크 탭에는 성공으로 보일 때 확인용)
      console.error('[Step4] 영상 생성 실패 – 서버 응답 전체:', statusData)
      
      const errorText = errorMessages.length > 0 
        ? errorMessages.join('\n\n') 
        : '알 수 없는 오류'
      
      const isFfmpegError = errorText.includes('ffmpeg') || 
                           errorText.includes('Composition Failed') ||
                           errorText.includes('frame=')
      
      let userMessage = '영상 생성이 실패했어요.\n\n'
      if (isFfmpegError) {
        userMessage += '비디오 인코딩 과정에서 오류가 발생했어요.\n'
        userMessage += '백엔드 서버의 ffmpeg 처리 중 문제가 발생한 것으로 보입니다.\n\n'
        userMessage += '가능한 원인:\n'
        userMessage += '- 서버 리소스 부족\n'
        userMessage += '- 비디오 파일 형식 문제\n'
        userMessage += '- ffmpeg 설정 오류\n\n'
        userMessage += '잠시 후 다시 시도해주시거나, 백엔드 관리자에게 문의해주세요.\n\n'
      }
      userMessage += `에러 상세:\n${errorText.substring(0, 500)}${errorText.length > 500 ? '...' : ''}\n\n`
      userMessage += '자세한 내용은 브라우저 콘솔(F12)을 확인해주세요.'
      
      const failedJobId = statusData.jobId || urlJobId || currentJobId
      if (failedJobId) {
        void requestRefundForFailedJob(failedJobId, 'render_failed:status_failed')
      }
      alert(userMessage)
      setCurrentJobId(null)
      setJobStatus(null)
      setJobProgress('')
      setEncodingSceneIndex(null)
    }
  }, [timeline, currentJobId, requestRefundForFailedJob, urlJobId])

  // HTTP 폴링 함수
  const startHttpPolling = useCallback((jobId: string, startTime: number) => {
    if (jobStatusCheckTimeoutRef.current) {
                  return
                }
                
    const MAX_WAIT_TIME = 10 * 60 * 1000 // 10분으로 단축 (기존 30분)
    const MAX_PROCESSING_TIME = 5 * 60 * 1000 // PROCESSING 상태 최대 5분
    let checkCount = 0
    let lastStatusUpdateTime = startTime
    let lastStatus = 'PENDING'
    let processingStartTime = startTime
    
    const checkVideoFileExists = async (jobId: string): Promise<string | null> => {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        if (!supabaseUrl) return null
        
        const videoUrl = `${supabaseUrl}/storage/v1/object/public/videos/${jobId}/result.mp4`
        const headResponse = await fetch(videoUrl, { method: 'HEAD' })
        if (headResponse.ok) {
          return videoUrl
        }
        return null
                  } catch (error) {
        console.warn('[HTTP Polling] 비디오 파일 확인 실패:', error)
        return null
      }
    }
    
    const checkJobStatus = async () => {
      checkCount++
      
      const elapsed = Date.now() - startTime
      if (elapsed > MAX_WAIT_TIME) {
        alert(`영상 생성이 30분을 초과했습니다. 백엔드 서버에 문제가 있을 수 있습니다.\n\n작업 ID: ${jobId}\n\n나중에 다시 확인해주세요.`)
        setCurrentJobId(null)
        setJobStatus(null)
        if (jobStatusCheckTimeoutRef.current) {
          clearTimeout(jobStatusCheckTimeoutRef.current)
          jobStatusCheckTimeoutRef.current = null
        }
        return
      }
      
      try {
        const accessToken = authStorage.getAccessToken()
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL
        if (!API_BASE_URL) {
          console.error('[HTTP Polling] NEXT_PUBLIC_API_BASE_URL이 설정되지 않았습니다.')
          return
        }
        const statusUrl = `${API_BASE_URL}/api/v1/studio/jobs/${jobId}`
        
        const statusResponse = await fetch(statusUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        
        
        if (statusResponse.ok) {
          const statusData = await statusResponse.json()
          
          if (statusData.progressDetail?.error || statusData.progressDetail?.errorMessage) {
            const errorMsg = statusData.progressDetail.error || statusData.progressDetail.errorMessage
            handleStatusUpdate({
              ...statusData,
              status: 'FAILED',
              errorMessage: errorMsg
            })
            jobStatusCheckTimeoutRef.current = null
      return
    }
    
          const currentStatus = statusData.status || 'PENDING'
          if (currentStatus !== lastStatus) {
            lastStatusUpdateTime = Date.now()
            lastStatus = currentStatus
            if (currentStatus === 'PROCESSING') {
              processingStartTime = Date.now()
            }
          }
          
          // PROCESSING 상태가 5분 이상 지속되면 타임아웃 처리
          const processingElapsed = Date.now() - processingStartTime
          if (currentStatus === 'PROCESSING' && processingElapsed > MAX_PROCESSING_TIME) {
            console.error('[HTTP Polling] PROCESSING 상태가 5분 초과, 타임아웃 처리')
            alert(`영상 생성이 5분 이상 진행 중입니다. 서버에 문제가 있을 수 있습니다.\n\n작업 ID: ${jobId}\n\n나중에 다시 확인해주세요.`)
            setCurrentJobId(null)
            setJobStatus('FAILED')
            setJobProgress('영상 생성이 시간 초과되었습니다.')
            if (jobStatusCheckTimeoutRef.current) {
              clearTimeout(jobStatusCheckTimeoutRef.current)
              jobStatusCheckTimeoutRef.current = null
            }
            return
          }
          
          const timeSinceLastUpdate = Date.now() - lastStatusUpdateTime
          const STALE_PROCESSING_THRESHOLD = 30000 // 30초
          
          if (
            currentStatus === 'PROCESSING' && 
            timeSinceLastUpdate > STALE_PROCESSING_THRESHOLD &&
            checkCount >= 6
          ) {
            const videoUrl = await checkVideoFileExists(jobId)
            
            if (videoUrl) {
              handleStatusUpdate({
                ...statusData,
                status: 'COMPLETED',
                resultVideoUrl: videoUrl
              })
              jobStatusCheckTimeoutRef.current = null
              return
            }
          }
          
          handleStatusUpdate(statusData)
          
          if (statusData.status !== 'COMPLETED' && statusData.status !== 'FAILED') {
            const pollingInterval = 5000
            jobStatusCheckTimeoutRef.current = setTimeout(checkJobStatus, pollingInterval)
          } else {
            if (jobStatusCheckTimeoutRef.current) {
              clearTimeout(jobStatusCheckTimeoutRef.current)
              jobStatusCheckTimeoutRef.current = null
            }
          }
        } else {
          const errorText = await statusResponse.text().catch(() => '')
          console.error('[HTTP Polling] HTTP 에러:', statusResponse.status, errorText)
          setJobProgress(`상태 확인 실패 (${statusResponse.status})`)
          jobStatusCheckTimeoutRef.current = setTimeout(checkJobStatus, 2000)
        }
      } catch (error) {
        console.error('[HTTP Polling] 네트워크 에러:', error)
        jobStatusCheckTimeoutRef.current = setTimeout(checkJobStatus, 2000)
      }
    }
    
    jobStatusCheckTimeoutRef.current = setTimeout(checkJobStatus, 1000)
  }, [handleStatusUpdate])

  // 페이지 가시성 변경 감지 (다른 탭/사이트로 이동했다가 돌아올 때)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        // 페이지가 다시 보일 때 상태 확인 및 웹소켓 재연결
        const targetJobId = urlJobId || currentJobId
        if (!targetJobId) return

        // 진행 중인 작업이면 상태 확인 및 HTTP 폴링 재시작
        if (jobStatus === 'PENDING' || jobStatus === 'PROCESSING' || !jobStatus) {
          
          // 먼저 현재 상태 확인
          try {
            const accessToken = authStorage.getAccessToken()
            if (!accessToken) return

            const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL
            if (!API_BASE_URL) {
              console.error('[Step4] NEXT_PUBLIC_API_BASE_URL이 설정되지 않았습니다.')
              return
            }
            const statusUrl = `${API_BASE_URL}/api/v1/studio/jobs/${targetJobId}`
            
            const statusResponse = await fetch(statusUrl, {
              headers: { Authorization: `Bearer ${accessToken}` },
            })
            
            if (statusResponse.ok) {
              const statusData = await statusResponse.json()
              
              // 완료된 경우 상태 업데이트
              if (statusData.status === 'COMPLETED') {
                setJobStatus('COMPLETED')
                setResultVideoUrl(statusData.resultVideoUrl || null)
                setJobProgress('영상 생성이 완료되었어요!')
                return
              }
              
              // 실패한 경우 상태 업데이트
              if (statusData.status === 'FAILED') {
                void requestRefundForFailedJob(targetJobId, 'render_failed:visibility_check')
                setJobStatus('FAILED')
                setJobProgress(statusData.errorMessage || '영상 생성이 실패했어요.')
                return
              }
              
              // 진행 중이면 상태는 그대로 유지하고 HTTP 폴링만 재시작
              if (statusData.status === 'PENDING' || statusData.status === 'PROCESSING') {
                // 상태가 없으면 업데이트, 있으면 유지
                if (!jobStatus) {
                  setJobStatus(statusData.status)
                  if (statusData.progressDetail) {
                    if (typeof statusData.progressDetail === 'string') {
                      setJobProgress(statusData.progressDetail)
                    } else if (typeof statusData.progressDetail === 'object') {
                      setJobProgress(statusData.progressDetail.msg || statusData.progressDetail.message || '')
                    }
                  }
                }
                
                // 시작 시간 업데이트
                const startTime = statusData.updatedAt 
                  ? new Date(statusData.updatedAt).getTime()
                  : jobStartTimeRef.current || Date.now()
                jobStartTimeRef.current = startTime
                
                // HTTP 폴링 재시작
                if (!jobStatusCheckTimeoutRef.current) {
                  startHttpPolling(targetJobId, startTime)
                }
              }
            }
          } catch (error) {
            console.error('[Visibility] 상태 확인 실패:', error)
            // 에러가 나도 HTTP 폴링 재시작 시도
            const startTime = jobStartTimeRef.current || Date.now()
            if (!jobStatusCheckTimeoutRef.current) {
              startHttpPolling(targetJobId, startTime)
            }
          }
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
     
  }, [urlJobId, currentJobId, jobStatus, startHttpPolling, requestRefundForFailedJob])

  // 초기 작업 상태 확인 (페이지 마운트 시 또는 jobId 변경 시)
  useEffect(() => {
    const targetJobId = urlJobId || currentJobId
    
    if (!targetJobId) {
      if (currentJobId) {
        setCurrentJobId(null)
        setJobStatus(null)
        setJobProgress('')
        setResultVideoUrl(null)
        setIsInitializing(false)
      }
      return
    }
    
    // URL의 jobId와 currentJobId가 다르면 업데이트
    if (urlJobId && urlJobId !== currentJobId) {
      setCurrentJobId(urlJobId)
      setJobStatus(null)
      setJobProgress('')
      setResultVideoUrl(null)
    }
    
    // 중복 실행 방지: 이미 초기화 중이면 제외
    // 다른 step으로 이동했다가 돌아온 경우는 항상 상태 확인 필요
    if (isInitializing) {
        return
      }
    
    const checkInitialStatus = async () => {
      setIsInitializing(true)
      try {
        const accessToken = authStorage.getAccessToken()
        if (!accessToken) {
          setIsInitializing(false)
        return
      }

        const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL
        if (!API_BASE_URL) {
          console.error('[Step4] NEXT_PUBLIC_API_BASE_URL이 설정되지 않았습니다.')
          setIsInitializing(false)
          return
        }
        const statusUrl = `${API_BASE_URL}/api/v1/studio/jobs/${targetJobId}`
        
        const statusResponse = await fetch(statusUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        
        if (statusResponse.ok) {
          const statusData = await statusResponse.json()
          
          // 완료된 작업
          if (statusData.status === 'COMPLETED') {
            setJobStatus('COMPLETED')
            setResultVideoUrl(statusData.resultVideoUrl || null)
            setJobProgress('영상 생성이 완료되었어요!')
            setIsInitializing(false)
      return
    }
    
          // 실패한 작업
          if (statusData.status === 'FAILED') {
            void requestRefundForFailedJob(targetJobId, 'render_failed:initial_status')
            setJobStatus('FAILED')
            setJobProgress(statusData.errorMessage || '영상 생성이 실패했어요.')
            setIsInitializing(false)
      return
    }

          // 진행 중인 작업 - 현재 상태를 그대로 표시
          if (statusData.status === 'PENDING' || statusData.status === 'PROCESSING') {
            const startTime = statusData.updatedAt 
              ? new Date(statusData.updatedAt).getTime()
              : jobStartTimeRef.current || Date.now()
            jobStartTimeRef.current = startTime
            
            // 현재 상태 설정 (제작 시작 메시지 없이)
            setJobStatus(statusData.status)
            if (statusData.progressDetail) {
              if (typeof statusData.progressDetail === 'string') {
                setJobProgress(statusData.progressDetail)
              } else if (typeof statusData.progressDetail === 'object') {
                setJobProgress(statusData.progressDetail.msg || statusData.progressDetail.message || '영상 생성 중...')
              }
            } else {
              setJobProgress('영상 생성 중...')
            }
            
            // HTTP 폴링 시작
            if (!jobStatusCheckTimeoutRef.current) {
              startHttpPolling(targetJobId, startTime)
            }
          }
        }
      } catch (error) {
        console.error('[Initial Status] 상태 확인 실패:', error)
        // 에러가 나도 기본 상태 설정
        const startTime = jobStartTimeRef.current || Date.now()
        jobStartTimeRef.current = startTime
        setJobStatus('PENDING')
        setJobProgress('영상 생성 중...')
        startHttpPolling(targetJobId, startTime)
      } finally {
        setIsInitializing(false)
      }
    }
    
    checkInitialStatus()
    
    return () => {
      // HTTP 폴링 중단
      if (jobStatusCheckTimeoutRef.current) {
        clearTimeout(jobStatusCheckTimeoutRef.current)
        jobStatusCheckTimeoutRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlJobId, currentJobId, startHttpPolling, requestRefundForFailedJob])

  // 경과 시간 업데이트
  useEffect(() => {
    if (!jobStartTimeRef.current || jobStatus === 'COMPLETED' || jobStatus === 'FAILED') return
    
    const interval = setInterval(() => {
      if (jobStartTimeRef.current) {
        const elapsedMs = Date.now() - jobStartTimeRef.current
        const elapsed = Math.floor(elapsedMs / 1000)
        setElapsedSeconds(elapsed)
      }
    }, 1000)
    
    return () => clearInterval(interval)
  }, [jobStatus])

  const recommendedDescription = useMemo(() => {
    const productName = product?.name || '제품명'
    const productUrl = product?.url || 'https://link.coupang.com/'
    const priceText = product?.price
      ? `🔥특가 : ${product.price.toLocaleString()}원 (업로드 시점 기준)`
      : '🔥특가 : 가격 정보는 업로드 시점 기준으로 변동될 수 있어요.'

    return [
      '👉 이 영상은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받아요.',
      '👉 제품에 대하여 채널은 책임을 지지 않으며, 제품 관련은 쿠팡 고객센터로 연락 바랍니다.',
      '',
      '## 상품마다 내용이 달라지는 부분',
      productName,
      productUrl,
      priceText,
      '',
      '👉 본 영상에는 채널의 주관적인 생각이 포함되어 있어요.',
      '👉 본 영상에 표시된 가격 정보는 영상 업로드일 당시 원화 기준이며, 가격은 수시로 변동 가능합니다.',
    ].join('\n')
  }, [product])

  const recommendedHashtags = useMemo(() => {
    const productName = product?.name?.replace(/\s+/g, '') || '제품명'
    const platformTag = product?.platform
      ? `#${product.platform === 'coupang' ? '쿠팡' : product.platform}`
      : '#쇼핑'

    const baseTags = [
      '#쿠팡파트너스',
      platformTag,
      '#제품리뷰',
      '#언박싱',
      '#추천템',
      '#가성비',
      '#핫딜',
      `#${productName}`,
      '#쇼츠',
    ]

    return Array.from(new Set(baseTags)).slice(0, 9)
  }, [product])

  // 공통 유효성 검사 함수
  const getProductAndScript = useCallback(() => {
    if (scenes.length === 0) {
      alert('대본 정보가 필요합니다.')
      return null
    }

    const fullScript = scenes.map((scene) => scene.script).join('\n')

    // 유효성 검사: script가 비어있으면 에러
    if (!fullScript || fullScript.trim().length === 0) {
      alert('대본 내용이 없습니다. 대본을 먼저 생성해주세요.')
      return null
    }

    // 상품이 없으면 빈 문자열로 처리 (스크립트만으로 AI 생성)
    const productDescription = selectedProducts[0]
      ? (selectedProducts[0].description?.trim() || selectedProducts[0].name || '')
      : ''

    return { productDescription, script: fullScript }
  }, [selectedProducts, scenes])

  // 제목 AI 생성
  const handleGenerateTitles = useCallback(async () => {
    const data = getProductAndScript()
    if (!data) return

    setIsGenerating(true)

    try {
      const response = await studioMetaApi.createTitle(data)
      setVideoTitle(response.title)
      setVideoTitleCandidates([response.title])
    } catch (error) {
      console.error('제목 생성 오류:', error)
      alert('제목 생성 중 오류가 발생했어요.')
    } finally {
      setIsGenerating(false)
    }
  }, [getProductAndScript, setVideoTitle, setVideoTitleCandidates])

  // 컴포넌트 마운트 시 자동 생성 (렌더링 완료 후에만)
  useEffect(() => {
    if (jobStatus === 'COMPLETED' && videoTitleCandidates.length === 0 && !isGenerating) {
      handleGenerateTitles()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobStatus])

  // 기본 추천 상세 설명/해시태그 세팅
  useEffect(() => {
    if (descriptionInitialized.current || jobStatus !== 'COMPLETED') return

    if (!videoDescription) {
      setVideoDescription(recommendedDescription)
    }
    descriptionInitialized.current = true
  }, [videoDescription, recommendedDescription, setVideoDescription, jobStatus])

  useEffect(() => {
    if (hashtagsInitialized.current || jobStatus !== 'COMPLETED') return

    if (!initialHashtags.current || initialHashtags.current.length === 0) {
      setVideoHashtags(recommendedHashtags)
    }
    hashtagsInitialized.current = true
  }, [recommendedHashtags, setVideoHashtags, jobStatus])

  const handleCustomTitle = useCallback((title: string) => {
    setVideoTitle(title)
  }, [setVideoTitle])

  // 상세설명 AI 생성
  const handleGenerateDescription = useCallback(async () => {
    const data = getProductAndScript()
    if (!data) return

    setIsGeneratingDescription(true)

    try {
      const response = await studioMetaApi.createDescription(data)
      setVideoDescription(response.description)
    } catch (error) {
      console.error('상세설명 생성 오류:', error)
      alert('상세설명 생성 중 오류가 발생했어요.')
      // 에러 발생 시 기본 추천 설명으로 폴백
      setVideoDescription(recommendedDescription)
    } finally {
      setIsGeneratingDescription(false)
    }
  }, [getProductAndScript, setVideoDescription, recommendedDescription])

  // 해시태그 AI 생성
  const handleGenerateHashtags = useCallback(async () => {
    const data = getProductAndScript()
    if (!data) return

    setIsGeneratingHashtags(true)

    try {
      const response = await studioMetaApi.createHashtags(data)
      // 해시태그가 #으로 시작하지 않으면 추가
      const normalizedHashtags = response.hashtags.map((tag) =>
        tag.startsWith('#') ? tag : `#${tag}`
      )
      setVideoHashtags(normalizedHashtags)
        } catch (error) {
      console.error('해시태그 생성 오류:', error)
      alert('해시태그 생성 중 오류가 발생했어요.')
      // 에러 발생 시 기본 추천 해시태그로 폴백
      setVideoHashtags(recommendedHashtags)
    } finally {
      setIsGeneratingHashtags(false)
    }
  }, [getProductAndScript, setVideoHashtags, recommendedHashtags])

  const handleHashtagChange = useCallback((value: string) => {
    const normalized = value
      .split(/[\s,]+/)
      .filter(Boolean)
      .map((tag) => (tag.startsWith('#') ? tag : `#${tag}`))
    setVideoHashtags(normalized)
  }, [setVideoHashtags])

  const handleNext = useCallback(() => {
    if (!videoTitle) {
      alert('영상 제목을 선택하거나 입력해주세요.')
        return
      }
      
    setIsCompleteDialogOpen(true)
  }, [videoTitle])

  const handleComplete = useCallback(async () => {
    if (isCompleting) return
    setIsCompleting(true)

    // 영상 메타데이터 저장 (jobId와 함께)
    const targetJobId = urlJobId || currentJobId
    if (targetJobId && videoTitle) {
      try {
        let accessToken = authStorage.getAccessToken()
        if (!accessToken) {
          const supabase = getSupabaseClient()
          const { data } = await supabase.auth.getSession()
          accessToken = data.session?.access_token ?? null
        }

        if (accessToken) {
          const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL
          if (!API_BASE_URL) {
            console.error('[Step4] NEXT_PUBLIC_API_BASE_URL이 설정되지 않았습니다.')
            throw new Error('API_BASE_URL이 설정되지 않았습니다.')
          }
          
          // 영상 메타데이터 저장 API 호출
          // 백엔드 API가 jobId를 기반으로 영상을 생성하고 메타데이터를 저장하도록 요청
          const videoMetadataResponse = await fetch(`${API_BASE_URL}/api/v1/videos`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              studioJobId: targetJobId,
              title: videoTitle,
              titleCandidates: videoTitleCandidates,
              description: videoDescription,
              hashtags: videoHashtags,
            }),
          })

          if (!videoMetadataResponse.ok) {
            console.warn('[handleComplete] Video metadata save failed', videoMetadataResponse.status)
            // 실패해도 계속 진행 (메타데이터 저장 실패는 치명적이지 않음)
          }
        }
      } catch (error) {
        console.error('[handleComplete] Video metadata save error', error)
        // 에러가 나도 계속 진행
      }
    }

    // TTS 정리 시도 (실패해도 나머지 플로우는 진행)
    try {
      let accessToken = authStorage.getAccessToken()
      if (!accessToken) {
        const supabase = getSupabaseClient()
        const { data } = await supabase.auth.getSession()
        accessToken = data.session?.access_token ?? null
      }

      const headers: Record<string, string> = {}
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`
      }

      const res = await fetch('/api/media/tts/cleanup', {
        method: 'POST',
        headers,
      })
      if (!res.ok) {
        console.warn('[handleComplete] TTS cleanup failed', res.status)
      }
    } catch (error) {
      console.error('[handleComplete] TTS cleanup error', error)
    }

    // localStorage에서 jobId 제거
    if (typeof window !== 'undefined') {
      localStorage.removeItem('currentVideoJobId')
    }
    
    // 상태 초기화
    setCurrentJobId(null)
    setJobStatus(null)
    setJobProgress('')
    setResultVideoUrl(null)
    
    // HTTP 폴링 정리
    if (jobStatusCheckTimeoutRef.current) {
      clearTimeout(jobStatusCheckTimeoutRef.current)
      jobStatusCheckTimeoutRef.current = null
    }
    
    reset()
    useVideoCreateStore.persist.clearStorage()
    setIsCompleteDialogOpen(false)
    setIsCompleting(false)
    router.push('/')
  }, [isCompleting, reset, router, urlJobId, currentJobId, videoTitle, videoTitleCandidates, videoDescription, videoHashtags])

  // 중단하기 핸들러 (confirm → doCancelJob)
  const handleCancel = useCallback(async () => {
    if (!confirm('영상 생성을 중단하시겠습니까?')) {
      return
    }

    const targetJobId = urlJobId || currentJobId
    if (targetJobId) {
      await doCancelJob(targetJobId)
    } else {
      // jobId가 없는 경우 바로 홈으로
      router.push('/')
    }
  }, [router, urlJobId, currentJobId, doCancelJob])

  // 취소 실패 후 재시도 (confirm 없이 재호출)
  const retryCancel = useCallback(async () => {
    const targetJobId = urlJobId || currentJobId
    if (targetJobId) {
      await doCancelJob(targetJobId)
    }
  }, [urlJobId, currentJobId, doCancelJob])

  return {
    // State
    theme,
    isValidatingToken,
    
    // Job Status
    jobId,
    jobStatus,
    jobProgress,
    isInitializing,
    elapsedSeconds,
    encodingSceneIndex,
    resultVideoUrl,
    formatElapsed,
    handleDownload,
    handleCancel,
    isCancelling,
    cancelError,
    retryCancel,
    
    // Video Metadata
    videoTitle,
    videoTitleCandidates,
    videoDescription,
    videoHashtags,
    isGenerating,
    isGeneratingDescription,
    isGeneratingHashtags,
    handleCustomTitle,
    handleGenerateTitles,
    handleGenerateDescription,
    handleGenerateHashtags,
    handleHashtagChange,
    setVideoDescription,
    
    // Complete Dialog
    isCompleteDialogOpen,
    setIsCompleteDialogOpen,
    isCompleting,
    handleNext,
    handleComplete,
    
    // Timeline
    timeline,
  }
}
