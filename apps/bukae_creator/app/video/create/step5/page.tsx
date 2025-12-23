'use client'

import { useState, useEffect, useMemo, useRef, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
import { useVideoCreateStore } from '@/store/useVideoCreateStore'
import { useThemeStore } from '@/store/useThemeStore'
import { studioTitleApi } from '@/lib/api/studio-title'
import { StudioJobWebSocket, type StudioJobUpdate } from '@/lib/api/websocket'
import { websocketManager } from '@/lib/api/websocket-manager'
import { authStorage } from '@/lib/api/auth-storage'

function Step5PageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const jobIdFromUrl = searchParams.get('jobId')
  
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
  
  // 영상 렌더링 관련 상태
  const [currentJobId, setCurrentJobId] = useState<string | null>(jobIdFromUrl)
  
  // URL에서 jobId 가져오기 (의존성 배열을 위해 메모이제이션)
  const urlJobId = useMemo(() => searchParams.get('jobId'), [searchParams])
  
  // UI 렌더링용 jobId (urlJobId가 없으면 currentJobId 사용)
  const jobId = urlJobId || currentJobId
  const [jobStatus, setJobStatus] = useState<'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | null>(null)
  const [jobProgress, setJobProgress] = useState<string>('')
  const jobStartTimeRef = useRef<number | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [encodingSceneIndex, setEncodingSceneIndex] = useState<number | null>(null)
  const [resultVideoUrl, setResultVideoUrl] = useState<string | null>(null)
  const jobStatusCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const websocketRef = useRef<StudioJobWebSocket | null>(null)
  // 전역 매니저에서 구독 해제를 위한 콜백 참조
  const websocketCallbacksRef = useRef<{
    onUpdate?: (update: StudioJobUpdate) => void
    onError?: (error: Error) => void
    onClose?: () => void
  }>({})
  const [isInitializing, setIsInitializing] = useState(false) // 초기 상태 로딩 중
  
  // 영상 제목 선택 관련 상태
  const [isGenerating, setIsGenerating] = useState(false)
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false)
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
  const handleDownload = useCallback(async () => {
    if (!resultVideoUrl || !currentJobId) return
    
    try {
      const response = await fetch(resultVideoUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `video-${currentJobId}.mp4`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('다운로드 실패:', error)
      alert('다운로드 중 오류가 발생했어요.')
    }
  }, [resultVideoUrl, currentJobId])

  // 상태 업데이트 처리 함수
  const handleStatusUpdate = useCallback((statusData: any) => {
    console.log('[handleStatusUpdate] 상태 업데이트 받음:', statusData)
    
    const newStatus = statusData.status
    
    // 이미 완료/실패 처리된 경우 추가 업데이트 무시
    setJobStatus((prevStatus) => {
      if (prevStatus === 'COMPLETED' || prevStatus === 'FAILED') {
        console.log('[handleStatusUpdate] 이미 완료/실패 상태라 무시:', prevStatus)
        return prevStatus
      }
      console.log('[handleStatusUpdate] 상태 업데이트:', prevStatus, '->', newStatus)
      return newStatus
    })

    // progressDetail에 에러 정보가 있으면 즉시 실패 처리
    const detailError =
      typeof statusData.progressDetail === 'object'
        ? statusData.progressDetail?.error || statusData.progressDetail?.errorMessage
        : typeof statusData.progressDetail === 'string'
          ? statusData.progressDetail
          : ''
    if ((newStatus === 'FAILED' || detailError) && newStatus !== 'COMPLETED') {
      const errorText = detailError || statusData.errorMessage || '알 수 없는 오류가 발생했습니다.'
      console.log('[handleStatusUpdate] 실패 처리:', errorText)
      alert(`영상 생성이 실패했어요.\n\n${errorText}`)
      // 전역 매니저에서 구독 해제
      if (currentJobId && websocketCallbacksRef.current) {
        const { onUpdate, onError, onClose } = websocketCallbacksRef.current
        websocketManager.disconnect(currentJobId, onUpdate, onError, onClose)
        websocketRef.current = null
        websocketCallbacksRef.current = {}
      }
      setCurrentJobId(null)
      setJobStatus('FAILED')
      setJobProgress('')
      setEncodingSceneIndex(null)
      return
    }

    // progressDetail이 객체인 경우 처리
    let progressText = ''
    let sceneIndex: number | null = null
    
    if (statusData.progressDetail) {
      if (typeof statusData.progressDetail === 'string') {
        progressText = statusData.progressDetail
      } else if (typeof statusData.progressDetail === 'object') {
        progressText = statusData.progressDetail.msg || 
                      statusData.progressDetail.message || 
                      statusData.progressDetail.step ||
                      statusData.progressDetail.progress ||
                      JSON.stringify(statusData.progressDetail)
        sceneIndex = statusData.progressDetail.currentScene ?? 
                    statusData.progressDetail.sceneIndex ?? 
                    statusData.progressDetail.currentSceneIndex ??
                    statusData.progressDetail.scene ??
                    null
        if (typeof sceneIndex === 'number') {
          setEncodingSceneIndex(sceneIndex)
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
          console.log('[handleStatusUpdate] progressText에서 씬 인덱스 파싱:', sceneIndex, 'from:', progressText)
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
      console.log('[handleStatusUpdate] 완료 처리 시작')
      const videoUrl = statusData.resultVideoUrl || null
      console.log('[handleStatusUpdate] 비디오 URL:', videoUrl)
      setResultVideoUrl(videoUrl)
      setJobProgress('영상 생성이 완료되었어요!')
      setEncodingSceneIndex(null)
      
      // 상태 확인 중단
      if (jobStatusCheckTimeoutRef.current) {
        clearTimeout(jobStatusCheckTimeoutRef.current)
        jobStatusCheckTimeoutRef.current = null
      }
      // 전역 매니저에서 구독 해제 (완료되었으므로 더 이상 업데이트가 필요 없음)
      if (currentJobId && websocketCallbacksRef.current) {
        const { onUpdate, onError, onClose } = websocketCallbacksRef.current
        websocketManager.disconnect(currentJobId, onUpdate, onError, onClose)
        websocketRef.current = null
        websocketCallbacksRef.current = {}
      }
      console.log('[handleStatusUpdate] 완료 처리 완료, jobStatus:', newStatus)
    } else if (newStatus === 'FAILED') {
      let errorMessages = [
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
      
      alert(userMessage)
      // 전역 매니저에서 구독 해제
      if (currentJobId && websocketCallbacksRef.current) {
        const { onUpdate, onError, onClose } = websocketCallbacksRef.current
        websocketManager.disconnect(currentJobId, onUpdate, onError, onClose)
        websocketRef.current = null
        websocketCallbacksRef.current = {}
      }
      setCurrentJobId(null)
      setJobStatus(null)
      setJobProgress('')
      setEncodingSceneIndex(null)
    }
  }, [timeline])

  // HTTP 폴링 함수
  const startHttpPolling = useCallback((jobId: string, startTime: number) => {
    if (jobStatusCheckTimeoutRef.current) {
      return
    }
    
    const MAX_WAIT_TIME = 30 * 60 * 1000 // 30분
    let checkCount = 0
    let lastStatusUpdateTime = startTime
    let lastStatus = 'PENDING'
    
    const checkVideoFileExists = async (jobId: string): Promise<string | null> => {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        if (!supabaseUrl) return null
        
        const videoUrl = `${supabaseUrl}/storage/v1/object/public/videos/${jobId}/result.mp4`
        const headResponse = await fetch(videoUrl, { method: 'HEAD' })
        if (headResponse.ok) {
          console.log('[HTTP Polling] Supabase Storage에서 비디오 파일 발견:', videoUrl)
          return videoUrl
        }
        return null
      } catch (error) {
        console.warn('[HTTP Polling] 비디오 파일 확인 실패:', error)
        return null
      }
    }
    
    const checkJobStatus = async () => {
      if (websocketRef.current?.isConnected()) {
        console.log('[HTTP Polling] WebSocket 연결됨, 폴링 중단')
        if (jobStatusCheckTimeoutRef.current) {
          clearTimeout(jobStatusCheckTimeoutRef.current)
          jobStatusCheckTimeoutRef.current = null
        }
        return
      }
      
      checkCount++
      console.log(`[HTTP Polling] 상태 확인 시도 #${checkCount}, jobId: ${jobId}`)
      
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
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://15.164.220.105.nip.io:8080'
        const statusUrl = `${API_BASE_URL}/api/v1/studio/jobs/${jobId}`
        console.log('[HTTP Polling] 요청 URL:', statusUrl)
        
        const statusResponse = await fetch(statusUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        
        console.log('[HTTP Polling] 응답 상태:', statusResponse.status)
        
        if (statusResponse.ok) {
          const statusData = await statusResponse.json()
          console.log('[HTTP Polling] 상태 데이터:', statusData)
          
          if (statusData.progressDetail?.error || statusData.progressDetail?.errorMessage) {
            const errorMsg = statusData.progressDetail.error || statusData.progressDetail.errorMessage
            console.log('[HTTP Polling] 에러 감지:', errorMsg)
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
          }
          
          const timeSinceLastUpdate = Date.now() - lastStatusUpdateTime
          const STALE_PROCESSING_THRESHOLD = 30000 // 30초
          
          if (
            currentStatus === 'PROCESSING' && 
            timeSinceLastUpdate > STALE_PROCESSING_THRESHOLD &&
            checkCount >= 6
          ) {
            console.log('[HTTP Polling] PROCESSING 상태가 오래 지속됨, 파일 존재 여부 확인 시도')
            const videoUrl = await checkVideoFileExists(jobId)
            
            if (videoUrl) {
              console.log('[HTTP Polling] 파일 발견, 완료 상태로 처리')
              handleStatusUpdate({
                ...statusData,
                status: 'COMPLETED',
                resultVideoUrl: videoUrl
              })
              jobStatusCheckTimeoutRef.current = null
              return
            }
          }
          
          console.log('[HTTP Polling] handleStatusUpdate 호출 전, status:', statusData.status)
          handleStatusUpdate(statusData)
          console.log('[HTTP Polling] handleStatusUpdate 호출 후')
          
          if (statusData.status !== 'COMPLETED' && statusData.status !== 'FAILED') {
            const pollingInterval = 5000
            console.log(`[HTTP Polling] 다음 확인까지 ${pollingInterval}ms 대기 (현재 상태: ${statusData.status})`)
            jobStatusCheckTimeoutRef.current = setTimeout(checkJobStatus, pollingInterval)
          } else {
            console.log('[HTTP Polling] 완료/실패 상태 도달, 폴링 중단. status:', statusData.status)
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

  // WebSocket 연결 함수 (전역 매니저 사용)
  const connectWebSocket = useCallback(async (jobId: string, startTime: number) => {
    try {
      console.log('[WebSocket] 전역 매니저를 통한 연결 시도, jobId:', jobId)
      
      const onUpdate = (update: StudioJobUpdate) => {
        console.log('[WebSocket] 메시지 수신:', update)
        handleStatusUpdate(update)
      }

      const onError = (error: Error) => {
        console.warn('[WebSocket] 연결 에러 (HTTP 폴링 계속 사용):', error.message)
      }

      const onClose = () => {
        console.log('[WebSocket] 연결 끊어짐, HTTP 폴링으로 폴백')
        setJobStatus((currentStatus) => {
          if (currentStatus !== 'COMPLETED' && currentStatus !== 'FAILED') {
            startHttpPolling(jobId, startTime)
          }
          return currentStatus
        })
      }

      // 콜백을 ref에 저장하여 나중에 구독 해제 시 사용
      websocketCallbacksRef.current = { onUpdate, onError, onClose }

      const ws = await websocketManager.connect(jobId, onUpdate, onError, onClose)
      websocketRef.current = ws
      console.log('[WebSocket] 연결 성공 (전역 매니저)')
    } catch (error) {
      console.warn('[WebSocket] 연결 실패 (HTTP 폴링 계속 사용):', error instanceof Error ? error.message : error)
    }
  }, [handleStatusUpdate, startHttpPolling])
  // 페이지 가시성 변경 감지 (다른 탭/사이트로 이동했다가 돌아올 때)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        // 페이지가 다시 보일 때 상태 확인 및 웹소켓 재연결
        const targetJobId = urlJobId || currentJobId
        if (!targetJobId) return

        // 진행 중인 작업이면 상태 확인 및 웹소켓 재연결
        if (jobStatus === 'PENDING' || jobStatus === 'PROCESSING' || !jobStatus) {
          console.log('[Visibility] 페이지가 다시 보임, 상태 확인 및 웹소켓 재연결, jobId:', targetJobId)
          
          // 먼저 현재 상태 확인
          try {
            const accessToken = authStorage.getAccessToken()
            if (!accessToken) return

            const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://15.164.220.105.nip.io:8080'
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
                setJobStatus('FAILED')
                setJobProgress(statusData.errorMessage || '영상 생성이 실패했어요.')
                return
              }
              
              // 진행 중이면 상태는 그대로 유지하고 웹소켓만 재연결
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
                
                // 웹소켓 연결 확인 및 재연결
                const existingConnection = websocketManager.getConnection(targetJobId)
                if (!existingConnection || !existingConnection.isConnected()) {
                  // 연결이 끊어졌으면 재연결 (상태 메시지 없이)
                  connectWebSocket(targetJobId, startTime)
                }
                
                // HTTP 폴링도 재시작 (웹소켓이 없을 경우를 대비)
                if (!jobStatusCheckTimeoutRef.current) {
                  startHttpPolling(targetJobId, startTime)
                }
              }
            }
          } catch (error) {
            console.error('[Visibility] 상태 확인 실패:', error)
            // 에러가 나도 웹소켓 재연결 시도
            const existingConnection = websocketManager.getConnection(targetJobId)
            if (!existingConnection || !existingConnection.isConnected()) {
              const startTime = jobStartTimeRef.current || Date.now()
              connectWebSocket(targetJobId, startTime)
            }
          }
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlJobId, currentJobId, jobStatus])

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
    
    // 중복 실행 방지: 같은 jobId이고 이미 초기화 중이면 제외
    // 하지만 페이지를 떠났다가 돌아온 경우는 항상 상태 확인 필요
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
        
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://15.164.220.105.nip.io:8080'
        const statusUrl = `${API_BASE_URL}/api/v1/studio/jobs/${targetJobId}`
        
        const statusResponse = await fetch(statusUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        
        if (statusResponse.ok) {
          const statusData = await statusResponse.json()
          console.log('[Initial Status] 상태 데이터:', statusData)
          
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
            
            // 웹소켓 연결 확인 및 재연결
            const existingConnection = websocketManager.getConnection(targetJobId)
            if (!existingConnection || !existingConnection.isConnected()) {
              console.log('[Main] 웹소켓 연결 시작')
              startHttpPolling(targetJobId, startTime)
              connectWebSocket(targetJobId, startTime)
            } else {
              // 이미 연결되어 있으면 HTTP 폴링만 확인
              console.log('[Main] 기존 웹소켓 연결 사용')
              if (!jobStatusCheckTimeoutRef.current) {
                startHttpPolling(targetJobId, startTime)
              }
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
        connectWebSocket(targetJobId, startTime)
      } finally {
        setIsInitializing(false)
      }
    }
    
    checkInitialStatus()
    
    return () => {
      // HTTP 폴링만 중단 (웹소켓은 전역 매니저에서 관리)
      if (jobStatusCheckTimeoutRef.current) {
        clearTimeout(jobStatusCheckTimeoutRef.current)
        jobStatusCheckTimeoutRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlJobId, currentJobId])

  // 컴포넌트 언마운트 시 구독 해제하지 않음 (페이지를 떠나도 웹소켓 유지)
  // 웹소켓 연결은 전역 매니저에서 관리되므로, 페이지를 떠나도 계속 상태 업데이트를 받을 수 있음
  // 완료/실패 시에만 구독 해제됨
  // 주의: 이렇게 하면 메모리 누수가 발생할 수 있으므로, 완료/실패 시 반드시 구독 해제해야 함

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

  // 제목/설명 AI 생성
  const handleGenerateTitles = async () => {
    if (!selectedProducts[0] || scenes.length === 0) {
      alert('상품과 대본 정보가 필요합니다.')
      return
    }

    setIsGenerating(true)

    try {
      const product = selectedProducts[0]
      const fullScript = scenes.map((scene) => scene.script).join('\n')

      const response = await studioTitleApi.createTitle({
        productDescription: product.description ?? '',
        script: fullScript,
      })

      const { title, description } = response

      setVideoTitle(title)
      setVideoTitleCandidates([title])

      if (!videoDescription && description) {
        setVideoDescription(description)
      }
    } catch (error) {
      console.error('제목 생성 오류:', error)
      alert('제목 생성 중 오류가 발생했어요.')
    } finally {
      setIsGenerating(false)
    }
  }

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

  const handleCustomTitle = (title: string) => {
    setVideoTitle(title)
  }

  const handleGenerateDescription = () => {
    setVideoDescription(recommendedDescription)
  }

  const handleGenerateHashtags = () => {
    setVideoHashtags(recommendedHashtags)
  }

  const handleHashtagChange = (value: string) => {
    const normalized = value
      .split(/[\s,]+/)
      .filter(Boolean)
      .map((tag) => (tag.startsWith('#') ? tag : `#${tag}`))
    setVideoHashtags(normalized)
  }

  const handleNext = () => {
    if (!videoTitle) {
      alert('영상 제목을 선택하거나 입력해주세요.')
      return
    }

    setIsCompleteDialogOpen(true)
  }

  const handleComplete = () => {
    reset()
    setIsCompleteDialogOpen(false)
    router.push('/')
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
            {jobId && (
              <div>
                <h1 className={`text-3xl font-bold mb-2 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  영상 생성 중
                </h1>
                <p className={`mt-2 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  영상이 생성되고 있어요. 잠시만 기다려주세요.
                </p>

                {/* 진행 상태 표시 */}
                <Card className={`mt-4 ${
                  theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                }`}>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        {isInitializing && (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" style={{
                              color: theme === 'dark' ? '#60a5fa' : '#2563eb'
                            }} />
                            <span className="text-sm font-medium" style={{
                              color: theme === 'dark' ? '#ffffff' : '#111827'
                            }}>
                              상태 확인 중...
                            </span>
                          </>
                        )}
                        {!isInitializing && (!jobStatus || jobStatus === 'PENDING') && (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" style={{
                                color: theme === 'dark' ? '#60a5fa' : '#2563eb'
                              }} />
                              <span className="text-sm font-medium" style={{
                                color: theme === 'dark' ? '#ffffff' : '#111827'
                              }}>
                                영상 제작을 시작합니다...
                              </span>
                            </>
                          )}
                          {jobStatus === 'PROCESSING' && (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" style={{
                                color: theme === 'dark' ? '#60a5fa' : '#2563eb'
                              }} />
                              <span className="text-sm font-medium" style={{
                                color: theme === 'dark' ? '#ffffff' : '#111827'
                              }}>
                                영상 생성 중...
                              </span>
                            </>
                          )}
                          {jobStatus === 'COMPLETED' && (
                            <>
                              <CheckCircle2 className="w-4 h-4" style={{
                                color: theme === 'dark' ? '#34d399' : '#10b981'
                              }} />
                              <span className="text-sm font-medium" style={{
                                color: theme === 'dark' ? '#34d399' : '#10b981'
                              }}>
                                생성 완료!
                              </span>
                            </>
                          )}
                          {jobStatus === 'FAILED' && (
                            <>
                              <XCircle className="w-4 h-4" style={{
                                color: theme === 'dark' ? '#f87171' : '#ef4444'
                              }} />
                              <span className="text-sm font-medium" style={{
                                color: theme === 'dark' ? '#f87171' : '#ef4444'
                              }}>
                                생성 실패
                              </span>
                            </>
                          )}
                        </div>
                        {jobProgress && (
                          <div className="mt-2 space-y-1">
                            <p className="text-xs" style={{
                              color: theme === 'dark' ? '#9ca3af' : '#6b7280'
                            }}>
                              {typeof jobProgress === 'string' ? jobProgress : JSON.stringify(jobProgress)}
                            </p>
                            {(jobStatus === 'PROCESSING' || jobStatus === 'PENDING') && timeline && timeline.scenes && (
                              <p className="text-xs" style={{
                                color: theme === 'dark' ? '#9ca3af' : '#6b7280'
                              }}>
                                {encodingSceneIndex !== null && encodingSceneIndex >= 0
                                  ? `(${encodingSceneIndex + 1}/${timeline.scenes.length})`
                                  : `(0/${timeline.scenes.length})`
                                } · 경과 {formatElapsed(elapsedSeconds)}
                              </p>
                            )}
                          </div>
                        )}
                        {jobStatus === 'COMPLETED' && resultVideoUrl && (
                          <div className="mt-4 p-4 rounded-lg border-2" style={{
                            backgroundColor: theme === 'dark' ? '#1f2937' : '#f9fafb',
                            borderColor: theme === 'dark' ? '#10b981' : '#10b981',
                            borderWidth: '2px'
                          }}>
                            <div className="flex items-center gap-2 mb-3">
                              <CheckCircle2 className="w-5 h-5" style={{
                                color: theme === 'dark' ? '#34d399' : '#10b981'
                              }} />
                              <div className="text-sm font-bold" style={{
                                color: theme === 'dark' ? '#34d399' : '#10b981'
                              }}>
                                영상 생성 완료!
                              </div>
                            </div>
                            
                            {/* 영상 플레이어 */}
                            <div className="mb-4">
                              <video
                                src={resultVideoUrl}
                                controls
                                className="w-full rounded-lg"
                                style={{ maxHeight: '400px' }}
                              />
                            </div>
                            
                            {/* 다운로드 버튼 */}
                            <Button
                              onClick={handleDownload}
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
            {jobStatus === 'COMPLETED' && (
              <>
                <div>
                  <h1 className={`text-3xl font-bold mb-2 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    유튜브 영상 제목 선택
                  </h1>
                  <p className={`mt-2 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    AI가 추천한 제목 중에서 선택하거나 직접 입력하세요
                  </p>
                </div>

                {/* 제목 작성 및 AI 추천 */}
                <Card className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}>
                  <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                        영상 제목 작성/추천
                      </CardTitle>
                      <p className={`text-sm mt-1 ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        직접 작성하거나 AI 버튼으로 추천 제목을 받아보세요.
                      </p>
                    </div>
                    <Button
                      onClick={handleGenerateTitles}
                      size="sm"
                      className="gap-2"
                      disabled={isGenerating}
                    >
                      {isGenerating ? (
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
                        value={videoTitle}
                        onChange={(e) => handleCustomTitle(e.target.value)}
                        placeholder="영상 제목을 직접 입력하거나, AI 추천을 받아 수정해보세요."
                        rows={3}
                        className={`w-full p-3 rounded-lg border resize-none ${
                          theme === 'dark'
                            ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-400'
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                        } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                      />
                      <p className={`text-sm ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {videoTitle.length}자
                      </p>
                    </div>

                    {isGenerating && (
                      <div className="flex items-center gap-2 rounded-md px-3 py-2 border border-dashed border-purple-400/60 bg-purple-50 dark:bg-purple-900/20">
                        <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                        <p className={`text-sm ${
                          theme === 'dark' ? 'text-purple-200' : 'text-purple-800'
                        }`}>
                          AI가 제목을 생성하고 있어요...
                        </p>
                      </div>
                    )}

                    {videoTitleCandidates[0] && (
                      <div className={`flex items-center gap-2 rounded-md px-3 py-2 border ${
                        theme === 'dark'
                          ? 'border-purple-700 bg-purple-900/20 text-purple-200'
                          : 'border-purple-200 bg-purple-50 text-purple-800'
                      }`}>
                        <CheckCircle2 className="w-4 h-4 text-purple-500" />
                        <p className="text-sm">
                          AI 추천 제목: {videoTitleCandidates[0]}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 선택된 제목 표시 */}
                {videoTitle && (
                  <Card className={theme === 'dark' ? 'bg-purple-900/20 border-purple-700' : 'bg-purple-50 border-purple-200'}>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className={`w-5 h-5 ${
                          theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                        }`} />
                        <p className={`font-medium ${
                          theme === 'dark' ? 'text-purple-300' : 'text-purple-800'
                        }`}>
                          선택된 제목: {videoTitle}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 영상 상세 설명 추천 */}
                <Card className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}>
                  <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                        영상 상세 설명 (AI 추천)
                      </CardTitle>
                      <p className={`text-sm mt-1 ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        쿠팡 파트너스 고지와 상품 정보를 포함한 설명을 자동으로 채워드립니다.
                      </p>
                    </div>
                    <Button
                      onClick={handleGenerateDescription}
                      size="sm"
                      className="gap-2"
                      variant="secondary"
                    >
                      <Sparkles className="w-4 h-4" />
                      AI 상세 설명 추천
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <textarea
                      value={videoDescription}
                      onChange={(e) => setVideoDescription(e.target.value)}
                      rows={10}
                      className={`w-full p-3 rounded-lg border resize-none ${
                        theme === 'dark'
                          ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-400'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      } focus:outline-none focus:ring-2 focus:ring-purple-500 whitespace-pre-line`}
                    />
                  </CardContent>
                </Card>

                {/* 해시태그 추천 */}
                <Card className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}>
                  <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                        AI 추천 해시태그
                      </CardTitle>
                      <p className={`text-sm mt-1 ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        상품명과 플랫폼을 반영한 해시태그를 한 번에 받아보세요.
                      </p>
                    </div>
                    <Button
                      onClick={handleGenerateHashtags}
                      size="sm"
                      className="gap-2"
                      variant="secondary"
                    >
                      <Sparkles className="w-4 h-4" />
                      AI 해시태그 추천
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {videoHashtags.map((tag) => (
                        <span
                          key={tag}
                          className={`px-3 py-1 text-sm rounded-full border ${
                            theme === 'dark'
                              ? 'bg-gray-900 border-gray-700 text-gray-100'
                              : 'bg-gray-50 border-gray-200 text-gray-800'
                          }`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <textarea
                      value={videoHashtags.join(' ')}
                      onChange={(e) => handleHashtagChange(e.target.value)}
                      rows={3}
                      className={`w-full p-3 rounded-lg border resize-none ${
                        theme === 'dark'
                          ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-400'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                      placeholder="#쿠팡파트너스 #제품리뷰 #핫딜 ..."
                    />
                    <p className={`text-xs ${
                      theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                    }`}>
                      해시태그는 공백 또는 쉼표로 구분해 입력/수정할 수 있어요.
                    </p>
                  </CardContent>
                </Card>

                {/* 다음 단계 버튼 */}
                <div className="flex justify-end pt-4">
                  <Button
                    onClick={handleNext}
                    size="lg"
                    className="gap-2"
                    disabled={!videoTitle}
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
      <Dialog open={isCompleteDialogOpen} onOpenChange={setIsCompleteDialogOpen}>
        <DialogContent className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}>
          <DialogHeader>
            <DialogTitle className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
              영상제작을 완료하시겠어요?
            </DialogTitle>
            <DialogDescription className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
              업로드 기능은 추가 예정이에요.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCompleteDialogOpen(false)}
              className={theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}
            >
              취소
            </Button>
            <Button onClick={handleComplete} className="gap-2">
              완료하기
              <CheckCircle2 className="w-4 h-4" />
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
