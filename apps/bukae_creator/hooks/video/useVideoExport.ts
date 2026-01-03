import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { authStorage } from '@/lib/api/auth-storage'
import { groupScenesForExport, createTransitionMap } from '@/lib/utils/video-export'
import { getFontFileName, SUBTITLE_DEFAULT_FONT_ID } from '@/lib/subtitle-fonts'
import { buildSceneMarkup, makeTtsKey } from '@/lib/utils/tts'
import { bgmTemplates, getBgmTemplateUrlSync } from '@/lib/data/templates'
import type { TimelineData } from '@/store/useVideoCreateStore'
import type { SceneScript } from '@/lib/types/domain/script'

interface UseVideoExportParams {
  timeline: TimelineData | null
  scenes: SceneScript[]
  videoTitle: string
  videoDescription: string
  voiceTemplate: string | null
  bgmTemplate: string | null
  subtitleFont: string | null
  selectedProducts: Array<{ id: string; name: string; price: number; image: string; platform: string; url: string }>
  ttsCacheRef: React.MutableRefObject<Map<string, { blob: Blob; durationSec: number; markup: string; url?: string | null }>>
  ensureSceneTts: (sceneIndex: number, signal?: AbortSignal, forceRegenerate?: boolean) => Promise<{
    sceneIndex: number
    parts: Array<{
      blob: Blob
      durationSec: number
      url: string | null
      partIndex: number
      markup: string
    }>
  }>
}

/**
 * 비디오 내보내기 hook
 * 비디오 내보내기 처리, 씬 그룹화 및 변환, 인코딩 요청 생성을 담당합니다.
 */
export function useVideoExport({
  timeline,
  scenes,
  videoTitle,
  videoDescription,
  voiceTemplate,
  bgmTemplate,
  subtitleFont,
  selectedProducts,
  ttsCacheRef,
  ensureSceneTts,
}: UseVideoExportParams) {
  const router = useRouter()
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = useCallback(async () => {
    // 이미 진행 중이면 중복 실행 방지
    if (isExporting) {
      return
    }

    if (!timeline) {
      alert('타임라인 데이터가 없어요.')
      return
    }

    if (!voiceTemplate) {
      alert('목소리를 먼저 선택해주세요.')
      return
    }

    // 내보내기 시작
    setIsExporting(true)

    try {
      const accessToken = authStorage.getAccessToken()
      if (!accessToken) {
        throw new Error('로그인이 필요합니다.')
      }

      // 1. 모든 씬의 TTS Blob을 가져와서 서버에 업로드
      // 캐시된 것과 합성이 필요한 것을 분리하여 레이트 리밋 방지
      const ttsResults: Array<{ sceneIndex: number; blob: Blob; durationSec: number } | null> = []

      // 먼저 캐시된 것만 수집
      for (let index = 0; index < timeline.scenes.length; index++) {
        const markups = buildSceneMarkup(timeline, index)
        if (markups.length === 0) {
          ttsResults.push(null)
          continue
        }

        // 모든 구간이 캐시되어 있는지 확인
        const allCached = markups.every(markup => {
          const key = makeTtsKey(voiceTemplate, markup)
          return ttsCacheRef.current.has(key)
        })

        if (allCached) {
          // 모든 구간의 duration 합산
          const totalDuration = markups.reduce((sum, markup) => {
            const key = makeTtsKey(voiceTemplate, markup)
            const cached = ttsCacheRef.current.get(key)
            return sum + (cached?.durationSec || 0)
          }, 0)
          
          // 첫 번째 구간의 blob 사용 (임시, 나중에 수정 필요)
          const firstKey = makeTtsKey(voiceTemplate, markups[0])
          const firstCached = ttsCacheRef.current.get(firstKey)
          
          if (firstCached && firstCached.blob) {
            ttsResults.push({ 
              sceneIndex: index, 
              blob: firstCached.blob,
              durationSec: totalDuration || timeline.scenes[index]?.duration || 2.5
            })
          } else {
            ttsResults.push(null)
          }
        } else {
          // 합성이 필요한 것들은 나중에 순차 처리
          ttsResults.push(null)
        }
      }

      // 합성이 필요한 씬들만 순차적으로 처리 (레이트 리밋 방지)
      const scenesToSynthesize: number[] = []
      for (let index = 0; index < timeline.scenes.length; index++) {
        if (ttsResults[index] === null) {
          scenesToSynthesize.push(index)
        }
      }

      // 순차적으로 합성 (배치 처리 + 딜레이)
      const batchSize = 2 // 한 번에 2개씩
      const batchDelay = 1000 // 배치 간 1초 딜레이

      for (let i = 0; i < scenesToSynthesize.length; i += batchSize) {
        const batch = scenesToSynthesize.slice(i, i + batchSize)
        
        // 배치 내에서는 병렬 처리
        const batchPromises = batch.map(async (sceneIndex) => {
          try {
            const result = await ensureSceneTts(sceneIndex)
            // TODO: 각 구간별로 처리하도록 수정 필요
            const firstPart = result.parts[0]
            if (firstPart) {
              ttsResults[sceneIndex] = { 
                sceneIndex, 
                blob: firstPart.blob,
                durationSec: result.parts.reduce((sum, part) => sum + part.durationSec, 0) || timeline.scenes[sceneIndex]?.duration || 2.5
              }
            }
          } catch (error) {
            // 레이트 리밋 에러인 경우 재시도
            const isRateLimit = (error instanceof Error && (
              error.message.includes('요청이 너무 많습니다') ||
              error.message.includes('Too many requests') ||
              ('isRateLimit' in error && (error as { isRateLimit?: boolean }).isRateLimit === true)
            ))
            
            if (isRateLimit) {
              // 1초 후 재시도
              await new Promise(resolve => setTimeout(resolve, 1000))
              try {
                const result = await ensureSceneTts(sceneIndex)
                // TODO: 각 구간별로 처리하도록 수정 필요
                const firstPart = result.parts[0]
                if (firstPart) {
                  ttsResults[sceneIndex] = { 
                    sceneIndex, 
                    blob: firstPart.blob,
                    durationSec: result.parts.reduce((sum, part) => sum + part.durationSec, 0) || timeline.scenes[sceneIndex]?.duration || 2.5
                  }
                }
              } catch {
                // 재시도 실패 시 무시
              }
            }
          }
        })
        
        await Promise.allSettled(batchPromises)
        
        // 마지막 배치가 아니면 딜레이
        if (i + batchSize < scenesToSynthesize.length) {
          await new Promise(resolve => setTimeout(resolve, batchDelay))
        }
      }
      
      // 2. 각 TTS Blob을 서버에 업로드하고 URL 받기
      const ttsUrlPromises = ttsResults.map(async (result, index) => {
        if (!result || !result.blob) return null

        const formData = new FormData()
        formData.append('file', result.blob, `scene_${index}_voice.mp3`)
        formData.append('sceneIndex', String(index))

        // TTS 파일 업로드 API 호출
        const uploadRes = await fetch('/api/media/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
          body: formData,
        })

        if (!uploadRes.ok) {
          const errorData = await uploadRes.json().catch(() => ({}))
          throw new Error(`씬 ${index + 1}의 음성 파일 업로드 실패: ${errorData.error || '알 수 없는 오류'}`)
        }

        const uploadData = await uploadRes.json()
        return uploadData.url // 서버에서 반환하는 URL
      })

      const ttsUrls = await Promise.all(ttsUrlPromises)

      // 3. resolution 파싱 (예: "1080x1920" -> {width: 1080, height: 1920})
      const [width, height] = timeline.resolution.split('x').map(Number)
      
      // 4. 첫 번째 상품 정보 가져오기 (metadata용)
      const firstProduct = selectedProducts[0]
      
      // 5. BGM 템플릿 URL 가져오기
      const bgmTemplateObj = bgmTemplate ? bgmTemplates.find(t => t.id === bgmTemplate) : null
      const bgmUrl = bgmTemplateObj ? getBgmTemplateUrlSync(bgmTemplateObj) : null
      
      // 6. API 문서 형태로 변환
      const sceneGroups = groupScenesForExport(timeline.scenes, scenes, ttsResults, ttsUrls)
      
      // 씬 그룹이 비어있는지 확인
      if (sceneGroups.size === 0) {
        throw new Error('내보낼 씬이 없습니다. 씬을 추가해주세요.')
      }

      const encodingRequest = {
        videoId: crypto.randomUUID(),
        videoTitle: videoTitle || '제목 없음',
        description: videoDescription || '',
        sequence: 1,
        renderSettings: {
          resolution: {
            width,
            height,
          },
          fps: timeline.fps,
          playbackSpeed: timeline.playbackSpeed || 1,
          outputFormat: 'mp4',
          codec: 'libx264',
          bitrate: '8M',
          backgroundColor: '#000000',
        },
        audio: {
          bgm: {
            enabled: !!bgmTemplate,
            templateId: bgmTemplate || null,
            url: bgmUrl || null,
            volume: 1, // 내보내기 시 볼륨 1
            fadeIn: 2,
            fadeOut: 2,
          },
          voice: {
            enabled: !!voiceTemplate,
            templateId: voiceTemplate || null,
            volume: 1,
          },
        },
        scenes: Array.from(sceneGroups.entries())
          .map(([sceneId, group], groupIndex) => {
            // 임시 ID인 경우 개별 씬으로 처리 (그룹이 1개인 경우)
            const isTempId = typeof sceneId === 'string' && sceneId.startsWith('temp_')
            const actualSceneId = isTempId ? groupIndex + 1 : (sceneId as number) + 1
            
            // 같은 그룹 내에서는 첫 번째 씬의 이미지 사용
            const firstScene = group[0].scene
            // 마지막 씬의 정보 사용 (transition 등)
            const lastScene = group[group.length - 1].scene
            
            // 자막을 특수기호로 연결 (씬마다 자막을 |||로 구분)
            const mergedText = group
              .map(item => item.scene.text.content.trim())
              .filter(text => text.length > 0) // 빈 자막 제거
              .join('|||')

            // duration 합산
            const totalDuration = group.reduce((sum, item) => {
              const ttsDuration = item.ttsResult?.durationSec || item.scene.duration || 2.5
              return sum + ttsDuration
            }, 0)

            // TTS 처리: 첫 번째 TTS URL 사용 (또는 서버에서 합쳐진 텍스트로 새로 생성)
            const mergedTtsUrl = group[0].ttsUrl || null
            const mergedVoiceText = mergedText

            // transition 파싱 (마지막 씬의 transition 사용)
            const transitionType = lastScene.transition || 'none'
            const transition = createTransitionMap(transitionType, lastScene.transitionDuration || 0.5)

            // 폰트 정보 (마지막 씬의 폰트 사용)
            const sceneFontId = lastScene.text.font || subtitleFont || SUBTITLE_DEFAULT_FONT_ID
            const sceneFontWeight = lastScene.text.fontWeight || 700
            const fontSize = lastScene.text.fontSize || 48
            const fontFileName = getFontFileName(sceneFontId, sceneFontWeight) || 'NanumGothic-Regular'

            // 이미지 URL 검증
            if (!firstScene.image || firstScene.image.trim() === '') {
              throw new Error(`씬 ${actualSceneId}의 이미지 URL이 없습니다.`)
            }

            return {
              sceneId: actualSceneId, // API는 1부터 시작
              order: groupIndex,
              duration: Math.max(0.1, totalDuration), // duration이 0보다 커야 함
              transition: transition,
              image: {
                url: firstScene.image, // 같은 그룹 내에서는 첫 번째 씬의 이미지 사용
                fit: firstScene.imageFit || 'contain',
                transform: firstScene.imageTransform ? {
                  ...firstScene.imageTransform,
                  anchor: {
                    x: 0.5,
                    y: 0.5,
                  },
                } : {
                  x: width / 2,
                  y: height / 2,
                  width: width,
                  height: height,
                  scaleX: 1,
                  scaleY: 1,
                  rotation: 0,
                  anchor: { x: 0.5, y: 0.5 },
                },
              },
              text: {
                content: mergedText || ' ', // 빈 자막도 공백으로 처리
                visible: true,
                font: {
                  family: fontFileName,
                  size: fontSize,
                  weight: String(sceneFontWeight),
                  style: lastScene.text.style?.italic ? 'italic' : 'normal',
                },
                color: lastScene.text.color || '#FFFFFF',
                stroke: {
                  enabled: true,
                  color: '#000000',
                  width: 10,
                },
                shadow: {
                  enabled: false,
                  color: '#000000',
                  blur: 0,
                  offsetX: 0,
                  offsetY: 0,
                },
                decoration: {
                  underline: lastScene.text.style?.underline || false,
                  italic: lastScene.text.style?.italic || false,
                },
                alignment: lastScene.text.position || 'center',
                transform: lastScene.text.transform ? {
                  ...lastScene.text.transform,
                  anchor: {
                    x: 0.5,
                    y: 0.5,
                  },
                } : {
                  x: width / 2,
                  y: height * 0.85,
                  width: width * 0.75,
                  height: height * 0.07,
                  scaleX: 1,
                  scaleY: 1,
                  rotation: 0,
                  anchor: { x: 0.5, y: 0.5 },
                },
              },
              tts: {
                enabled: !!mergedTtsUrl,
                url: mergedTtsUrl,
                voiceText: mergedVoiceText || ' ', // 빈 텍스트도 공백으로 처리
              },
            }
          })
          .filter(scene => scene !== null), // null 체크
        metadata: firstProduct ? {
          productName: firstProduct.name || '상품명 없음',
          productImage: firstProduct.image || '',
          productUrl: firstProduct.url || '',
          platform: firstProduct.platform || 'coupang',
          mallType: firstProduct.platform || 'coupang', // mallType은 platform과 동일하게 설정
          originalUrl: firstProduct.url || 'https://www.coupang.com', // originalUrl은 productUrl과 동일하게 설정
        } : {
          // 상품이 없을 때 기본값
          productName: '상품명 없음',
          productImage: '',
          productUrl: 'https://www.coupang.com',
          platform: 'coupang',
          mallType: 'coupang', // 필수 필드
          originalUrl: 'https://www.coupang.com', // 필수 필드
        },
      }

      const exportData = {
        jobType: 'AUTO_CREATE_VIDEO_FROM_DATA',
        encodingRequest,
      }

      // 서버로 전송하는 JSON 바디 로그 출력
      console.log('=== 인코딩 요청 JSON 바디 ===')
      console.log(JSON.stringify(exportData, null, 2))
      console.log('===========================')

      // 7. 최종 인코딩 요청 전송
      const response = await fetch('/api/videos/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(exportData),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || errorData.message || `영상 생성 실패 (${response.status})`
        console.error('=== 내보내기 에러 ===')
        console.error('Status:', response.status)
        console.error('Error Data:', errorData)
        console.error('Request Body:', JSON.stringify(exportData, null, 2))
        console.error('==================')
        throw new Error(errorMessage)
      }

      const result = await response.json()
      
      // jobId를 받아서 step5로 이동
      if (result.jobId) {
        setIsExporting(false)
        router.push(`/video/create/step5?jobId=${result.jobId}`)
      } else {
        setIsExporting(false)
        alert('영상 생성이 시작되었어요. 완료되면 알림을 받으실 수 있어요.')
      }
    } catch (error) {
      setIsExporting(false)
      alert(`영상 생성 중 오류가 발생했어요: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    }
  }, [
    isExporting,
    timeline,
    scenes,
    voiceTemplate,
    bgmTemplate,
    subtitleFont,
    selectedProducts,
    videoTitle,
    videoDescription,
    ttsCacheRef,
    ensureSceneTts,
    router,
  ])

  return {
    isExporting,
    handleExport,
  }
}
