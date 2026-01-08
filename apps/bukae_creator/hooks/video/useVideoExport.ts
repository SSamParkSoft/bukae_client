import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { authStorage } from '@/lib/api/auth-storage'
import { groupScenesForExport, createTransitionMap } from '@/lib/utils/video-export'
import { getFontFileName, SUBTITLE_DEFAULT_FONT_ID } from '@/lib/subtitle-fonts'
import { buildSceneMarkup, makeTtsKey } from '@/lib/utils/tts'
import { bgmTemplates, getBgmTemplateUrlSync } from '@/lib/data/templates'
import type { TimelineData } from '@/store/useVideoCreateStore'
import type { SceneScript } from '@/lib/types/domain/script'
import * as PIXI from 'pixi.js'

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
  spritesRef: React.MutableRefObject<Map<number, PIXI.Sprite>>
  textsRef: React.MutableRefObject<Map<number, PIXI.Text>>
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
  spritesRef,
  textsRef,
}: UseVideoExportParams) {
  const router = useRouter()
  const [isExporting, setIsExporting] = useState(false)

  /**
   * 모든 씬의 캔버스 상태를 읽어서 transform 정보를 반환합니다.
   * PixiJS의 실제 객체 상태를 읽어서 최신 위치/크기/회전 정보를 가져옵니다.
   */
  const getAllCanvasTransforms = useCallback((): Map<number, { imageTransform?: { x: number; y: number; width: number; height: number; scaleX: number; scaleY: number; rotation: number }; textTransform?: { x: number; y: number; width: number; height: number; scaleX: number; scaleY: number; rotation: number } }> => {
    const transforms = new Map<number, { imageTransform?: { x: number; y: number; width: number; height: number; scaleX: number; scaleY: number; rotation: number }; textTransform?: { x: number; y: number; width: number; height: number; scaleX: number; scaleY: number; rotation: number } }>()
    
    if (!timeline) {
      return transforms
    }

    // 모든 씬의 상태를 병렬로 읽기
    timeline.scenes.forEach((scene, sceneIndex) => {
      const sprite = spritesRef.current.get(sceneIndex)
      const text = textsRef.current.get(sceneIndex)
      
      const sceneTransforms: { imageTransform?: { x: number; y: number; width: number; height: number; scaleX: number; scaleY: number; rotation: number }; textTransform?: { x: number; y: number; width: number; height: number; scaleX: number; scaleY: number; rotation: number } } = {}
      
      // 이미지 transform 읽기
      if (sprite && sprite.parent) {
        const bounds = sprite.getBounds()
        sceneTransforms.imageTransform = {
          x: sprite.x,
          y: sprite.y,
          width: bounds.width,
          height: bounds.height,
          scaleX: sprite.scale.x,
          scaleY: sprite.scale.y,
          rotation: sprite.rotation,
        }
      }
      
      // 텍스트 transform 읽기
      if (text && text.parent) {
        const bounds = text.getBounds()
        sceneTransforms.textTransform = {
          x: text.x,
          y: text.y,
          width: bounds.width,
          height: bounds.height,
          scaleX: text.scale.x,
          scaleY: text.scale.y,
          rotation: text.rotation,
        }
      }
      
      if (sceneTransforms.imageTransform || sceneTransforms.textTransform) {
        transforms.set(sceneIndex, sceneTransforms)
      }
    })
    
    return transforms
  }, [timeline, spritesRef, textsRef])

  const handleExport = useCallback(async () => {
    // 이미 진행 중이면 중복 실행 방지
    if (isExporting) {
      return
    }

    // 디버깅: voiceTemplate 값 확인
    console.log('[useVideoExport] voiceTemplate 값:', voiceTemplate, '타입:', typeof voiceTemplate)

    if (!timeline) {
      alert('타임라인 데이터가 없어요.')
      return
    }

    if (!voiceTemplate || voiceTemplate.trim() === '') {
      console.warn('[useVideoExport] voiceTemplate이 없거나 빈 문자열입니다:', voiceTemplate)
      // 개발 환경에서는 alert를 비활성화하여 MCP 테스트 가능하도록 함
      const isDevelopment = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      if (!isDevelopment) {
      alert('목소리를 먼저 선택해주세요.')
      } else {
        console.error('[useVideoExport] 목소리를 먼저 선택해주세요.')
      }
      return
    }

    // 내보내기 시작
    setIsExporting(true)

    try {
      const accessToken = authStorage.getAccessToken()
      if (!accessToken) {
        throw new Error('로그인이 필요합니다.')
      }

      // 0. 모든 씬의 캔버스 상태 읽기 (최신 transform 정보)
      const canvasTransforms = getAllCanvasTransforms()
      console.log('[useVideoExport] 캔버스 상태 읽기 완료:', canvasTransforms.size, '개 씬')

      // 1. 모든 씬의 TTS Blob을 가져와서 서버에 업로드
      // 캐시된 것과 합성이 필요한 것을 분리하여 레이트 리밋 방지
      // 병렬 처리로 속도 향상
      const ttsResults: Array<{ sceneIndex: number; blob: Blob; durationSec: number } | null> = []

      // 모든 씬의 캐시 상태를 병렬로 확인
      const cacheCheckPromises = timeline.scenes.map(async (scene, index) => {
        const markups = buildSceneMarkup(timeline, index)
        if (markups.length === 0) {
          return { sceneIndex: index, result: null }
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
            return {
              sceneIndex: index,
              result: {
              sceneIndex: index, 
              blob: firstCached.blob,
              durationSec: totalDuration || timeline.scenes[index]?.duration || 2.5
              }
            }
          }
        }
        
        return { sceneIndex: index, result: null }
      })

      const cacheCheckResults = await Promise.all(cacheCheckPromises)
      
      // 결과를 인덱스 순서대로 정렬하여 ttsResults에 추가
      cacheCheckResults.sort((a, b) => a.sceneIndex - b.sceneIndex)
      cacheCheckResults.forEach(({ result }) => {
        ttsResults.push(result)
      })

      // 합성이 필요한 씬들만 순차적으로 처리 (레이트 리밋 방지)
      const scenesToSynthesize: number[] = []
      for (let index = 0; index < timeline.scenes.length; index++) {
        if (ttsResults[index] === null) {
          scenesToSynthesize.push(index)
        }
      }

      // 순차적으로 합성 (배치 처리 + 동적 딜레이)
      const batchSize = 4 // 한 번에 4개씩 (2 → 4로 증가)
      let batchDelay = 500 // 배치 간 기본 딜레이 0.5초 (1초 → 0.5초로 감소)
      let hasRateLimitError = false
      
      // 업로드 스트리밍: 합성 완료 즉시 업로드 시작
      const uploadPromises: Map<number, Promise<string | null>> = new Map()

      for (let i = 0; i < scenesToSynthesize.length; i += batchSize) {
        const batch = scenesToSynthesize.slice(i, i + batchSize)
        
        // 배치 내에서는 병렬 처리
        const batchPromises = batch.map(async (sceneIndex) => {
          try {
            const result = await ensureSceneTts(sceneIndex)
            // TODO: 각 구간별로 처리하도록 수정 필요
            const firstPart = result.parts[0]
            if (firstPart) {
              const ttsResult = { 
                sceneIndex, 
                blob: firstPart.blob,
                durationSec: result.parts.reduce((sum, part) => sum + part.durationSec, 0) || timeline.scenes[sceneIndex]?.duration || 2.5
              }
              ttsResults[sceneIndex] = ttsResult
              
              // 합성 완료 즉시 업로드 시작 (스트리밍)
              const uploadPromise = (async () => {
                const formData = new FormData()
                formData.append('file', ttsResult.blob, `scene_${sceneIndex}_voice.mp3`)
                formData.append('sceneIndex', String(sceneIndex))

                try {
                  const uploadRes = await fetch('/api/media/upload', {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${accessToken}` },
                    body: formData,
                  })

                  if (!uploadRes.ok) {
                    const errorData = await uploadRes.json().catch(() => ({}))
                    throw new Error(`씬 ${sceneIndex + 1}의 음성 파일 업로드 실패: ${errorData.error || '알 수 없는 오류'}`)
                  }

                  const uploadData = await uploadRes.json()
                  return uploadData.url // 서버에서 반환하는 URL
                } catch (error) {
                  console.error(`[useVideoExport] 씬 ${sceneIndex} 업로드 실패:`, error)
                  return null
                }
              })()
              
              uploadPromises.set(sceneIndex, uploadPromise)
            }
          } catch (error) {
            // 레이트 리밋 에러인 경우 재시도
            const isRateLimit = (error instanceof Error && (
              error.message.includes('요청이 너무 많습니다') ||
              error.message.includes('Too many requests') ||
              ('isRateLimit' in error && (error as { isRateLimit?: boolean }).isRateLimit === true)
            ))
            
            if (isRateLimit) {
              hasRateLimitError = true
              batchDelay = 2000 // 레이트 리밋 발생 시 딜레이 2초로 증가
              // 1초 후 재시도
              await new Promise(resolve => setTimeout(resolve, 1000))
              try {
                const result = await ensureSceneTts(sceneIndex)
                // TODO: 각 구간별로 처리하도록 수정 필요
                const firstPart = result.parts[0]
                if (firstPart) {
                  const ttsResult = { 
                    sceneIndex, 
                    blob: firstPart.blob,
                    durationSec: result.parts.reduce((sum, part) => sum + part.durationSec, 0) || timeline.scenes[sceneIndex]?.duration || 2.5
                  }
                  ttsResults[sceneIndex] = ttsResult
                  
                  // 재시도 성공 시 업로드 시작
                  const uploadPromise = (async () => {
                    const formData = new FormData()
                    formData.append('file', ttsResult.blob, `scene_${sceneIndex}_voice.mp3`)
                    formData.append('sceneIndex', String(sceneIndex))

                    try {
                      const uploadRes = await fetch('/api/media/upload', {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${accessToken}` },
                        body: formData,
                      })

                      if (!uploadRes.ok) {
                        const errorData = await uploadRes.json().catch(() => ({}))
                        throw new Error(`씬 ${sceneIndex + 1}의 음성 파일 업로드 실패: ${errorData.error || '알 수 없는 오류'}`)
                      }

                      const uploadData = await uploadRes.json()
                      return uploadData.url
                    } catch (error) {
                      console.error(`[useVideoExport] 씬 ${sceneIndex} 업로드 실패:`, error)
                      return null
                    }
                  })()
                  
                  uploadPromises.set(sceneIndex, uploadPromise)
                }
              } catch {
                // 재시도 실패 시 무시
              }
            }
          }
        })
        
        await Promise.allSettled(batchPromises)
        
        // 마지막 배치가 아니면 딜레이 (마지막 배치에서는 딜레이 제거)
        const isLastBatch = i + batchSize >= scenesToSynthesize.length
        if (!isLastBatch) {
          await new Promise(resolve => setTimeout(resolve, batchDelay))
        }
        
        // 레이트 리밋 에러가 없으면 딜레이를 다시 기본값으로 복원
        if (!hasRateLimitError && batchDelay > 500) {
          batchDelay = 500
        }
      }
      
      // 2. 캐시된 씬들도 업로드 (이미 합성 완료된 것들)
      for (let index = 0; index < timeline.scenes.length; index++) {
        const result = ttsResults[index]
        if (result && result.blob && !uploadPromises.has(index)) {
          const uploadPromise = (async () => {
        const formData = new FormData()
        formData.append('file', result.blob, `scene_${index}_voice.mp3`)
        formData.append('sceneIndex', String(index))

            try {
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
              return uploadData.url
            } catch (error) {
              console.error(`[useVideoExport] 씬 ${index} 업로드 실패:`, error)
              return null
            }
          })()
          
          uploadPromises.set(index, uploadPromise)
        }
      }
      
      // 모든 업로드 완료 대기
      const ttsUrls: (string | null)[] = []
      for (let index = 0; index < timeline.scenes.length; index++) {
        const uploadPromise = uploadPromises.get(index)
        if (uploadPromise) {
          ttsUrls[index] = await uploadPromise
        } else {
          ttsUrls[index] = null
        }
      }

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
            enabled: !!voiceTemplate && voiceTemplate.trim() !== '',
            templateId: voiceTemplate && voiceTemplate.trim() !== '' ? voiceTemplate : null,
            volume: 1,
          },
        },
        scenes: Array.from(sceneGroups.entries())
          .map(([sceneId, group], groupIndex) => {
            // 임시 ID인 경우 개별 씬으로 처리 (그룹이 1개인 경우)
            const isTempId = typeof sceneId === 'string' && sceneId.startsWith('temp_')
            const actualSceneId = isTempId ? groupIndex + 1 : (sceneId as number) + 1
            
            // 같은 그룹 내에서는 첫 번째 씬의 이미지 사용
            const firstSceneIndex = group[0].index
            const firstScene = group[0].scene
            // 마지막 씬의 정보 사용 (transition 등)
            const lastSceneIndex = group[group.length - 1].index
            const lastScene = group[group.length - 1].scene
            
            // 캔버스에서 읽은 transform 사용 (없으면 timeline의 transform 사용)
            const firstSceneCanvasTransform = canvasTransforms.get(firstSceneIndex)
            const lastSceneCanvasTransform = canvasTransforms.get(lastSceneIndex)
            
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

            // 이미지 transform: 캔버스 상태 우선, 없으면 timeline의 transform 사용
            const imageTransform = firstSceneCanvasTransform?.imageTransform || firstScene.imageTransform || {
              x: width / 2,
              y: height / 2,
              width: width,
              height: height,
              scaleX: 1,
              scaleY: 1,
              rotation: 0,
            }

            return {
              sceneId: actualSceneId, // API는 1부터 시작
              order: groupIndex,
              duration: Math.max(0.1, totalDuration), // duration이 0보다 커야 함
              transition: transition,
              image: {
                url: firstScene.image, // 같은 그룹 내에서는 첫 번째 씬의 이미지 사용
                fit: firstScene.imageFit || 'contain',
                transform: {
                  ...imageTransform,
                  anchor: {
                    x: 0.5,
                    y: 0.5,
                  },
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
                transform: (() => {
                  // 캔버스 상태 우선, 없으면 timeline의 transform 사용
                  const textTransform = lastSceneCanvasTransform?.textTransform || lastScene.text.transform
                  
                  if (textTransform) {
                    return {
                      ...textTransform,
                  anchor: {
                    x: 0.5,
                    y: 0.5,
                  },
                    }
                  }
                  
                  // transform이 없으면 position 기반으로 Y 좌표 계산
                  const position = lastScene.text.position || 'center'
                  let textY = height / 2 // center 기본값
                  if (position === 'top') {
                    textY = 200
                  } else if (position === 'bottom') {
                    textY = height - 200 // 1920 - 200 = 1720
                  }
                  
                  return {
                  x: width / 2,
                    y: textY,
                  width: width * 0.75,
                  height: height * 0.07,
                  scaleX: 1,
                  scaleY: 1,
                  rotation: 0,
                  anchor: { x: 0.5, y: 0.5 },
                  }
                })(),
              },
              voice: {
                enabled: !!mergedTtsUrl,
                url: mergedTtsUrl,
                text: mergedVoiceText || ' ', // 빈 텍스트도 공백으로 처리
                startTime: 0, // TTS 시작 시간 (초)
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
      console.log('voiceTemplate 원본 값:', voiceTemplate)
      console.log('audio.voice 값:', encodingRequest.audio.voice)
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
      
      // jobId를 받아서 step4로 이동
      if (result.jobId) {
        setIsExporting(false)
        router.push(`/video/create/step4?jobId=${result.jobId}`)
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
    getAllCanvasTransforms,
    router,
  ])

  return {
    isExporting,
    handleExport,
  }
}
