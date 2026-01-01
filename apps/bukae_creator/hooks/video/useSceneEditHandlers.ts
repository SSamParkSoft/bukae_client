import { useCallback } from 'react'
import { insertSceneDelimiters } from '@/lib/utils/scene-splitter'
import { makeMarkupFromPlainText } from '@/lib/tts/auto-pause'
import { buildSceneMarkup, makeTtsKey } from '@/lib/utils/tts'
import type { TimelineData, SceneScript, TimelineScene } from '@/store/useVideoCreateStore'

interface UseSceneEditHandlersParams {
  scenes: SceneScript[]
  timeline: TimelineData | null
  setScenes: (scenes: SceneScript[]) => void
  setTimeline: (timeline: TimelineData) => void
  currentSceneIndex: number
  setCurrentSceneIndex: (index: number) => void
  currentSceneIndexRef: React.MutableRefObject<number>
  voiceTemplate: string | null
  invalidateSceneTtsCache: (sceneIndex: number) => void
  changedScenesRef: React.MutableRefObject<Set<number>>
  originalHandleSceneScriptChange: (index: number, value: string) => void
  ttsCacheRef: React.MutableRefObject<Map<string, { blob: Blob; durationSec: number; markup: string; url?: string | null }>>
  selectedImages: string[]
  setSelectedImages: (images: string[]) => void
}

/**
 * 씬 편집 핸들러 hook
 * 씬 스크립트 변경, 분할, 삭제, 복제를 담당합니다.
 */
export function useSceneEditHandlers({
  scenes,
  timeline,
  setScenes,
  setTimeline,
  currentSceneIndex,
  setCurrentSceneIndex,
  currentSceneIndexRef,
  voiceTemplate,
  invalidateSceneTtsCache,
  changedScenesRef,
  originalHandleSceneScriptChange,
  ttsCacheRef,
  selectedImages,
  setSelectedImages,
}: UseSceneEditHandlersParams) {
  // 스크립트 변경 시 캐시 무효화를 포함한 래퍼
  const handleSceneScriptChange = useCallback(
    (index: number, value: string) => {
      // 기존 스크립트와 비교하여 변경되었는지 확인
      const currentScript = scenes[index]?.script || ''
      if (currentScript !== value) {
        console.log(`[스크립트 변경 감지] 씬 ${index}: "${currentScript.substring(0, 30)}..." → "${value.substring(0, 30)}..."`)
        
        // 변경된 씬으로 표시 (재생 시 강제 재생성)
        changedScenesRef.current.add(index)
        console.log(`[스크립트 변경] 씬 ${index} 변경 상태로 표시 (재생 시 강제 재생성)`)
        
        // 변경 전 스크립트로 생성된 캐시 키 찾기
        if (currentScript && voiceTemplate && timeline) {
          const oldScene = timeline.scenes[index]
          if (oldScene) {
            // 변경 전 스크립트로 markup 생성
            const oldScriptParts = currentScript.split(/\s*\|\|\|\s*/).map(p => p.trim()).filter(p => p.length > 0)
            const oldMarkups = oldScriptParts.map((part, partIndex) => {
              const isLast = index >= timeline.scenes.length - 1
              const isLastPart = isLast && partIndex === oldScriptParts.length - 1
              return makeMarkupFromPlainText(part, {
                addSceneTransitionPause: !isLastPart,
                enablePause: false
              })
            })
            
            // 변경 전 스크립트로 생성된 모든 캐시 키 무효화
            oldMarkups.forEach((markup) => {
              const key = makeTtsKey(voiceTemplate, markup)
              if (ttsCacheRef.current.has(key)) {
                console.log(`[캐시 무효화] 씬 ${index} 변경 전 스크립트 캐시 삭제: ${key.substring(0, 50)}...`)
                ttsCacheRef.current.delete(key)
              }
            })
          }
        }
        
        // 스크립트가 변경되었으므로 해당 씬의 TTS 캐시 무효화
        invalidateSceneTtsCache(index)
      }
      // 원본 핸들러 호출
      originalHandleSceneScriptChange(index, value)
    },
    [scenes, timeline, voiceTemplate, originalHandleSceneScriptChange, invalidateSceneTtsCache, changedScenesRef, ttsCacheRef]
  )

  // 씬 분할: 같은 이미지로 유지하면서 스크립트에 ||| 구분자 삽입 (객체 분할 없이)
  const handleSceneSplit = useCallback(
    (index: number) => {
      if (!timeline || scenes.length === 0) return

      const targetSceneScript = scenes[index]
      const targetTimelineScene = timeline.scenes[index]

      const { sceneScript: updatedSceneScript, timelineScene: updatedTimelineScene } =
        insertSceneDelimiters({
          sceneScript: targetSceneScript,
          timelineScene: targetTimelineScene,
        })

      // 분할 불가(문장 1개 이하)이면 아무 것도 하지 않음
      if (updatedSceneScript.script === targetSceneScript.script) {
        console.log(`[SceneSplit] 씬 ${index} 분할 불가: 문장 1개 이하`)
        return
      }

      console.log(`[SceneSplit] 씬 ${index} 구분자 삽입 완료:`, {
        원본: targetSceneScript.script.substring(0, 50),
        변경: updatedSceneScript.script.substring(0, 100),
        구간수: updatedSceneScript.script.split(' ||| ').length
      })

      // 변경된 씬으로 표시 (재생 시 강제 재생성)
      changedScenesRef.current.add(index)
      console.log(`[SceneSplit] 씬 ${index} 변경 상태로 표시 (재생 시 강제 재생성)`)

      // 스크립트가 변경되었으므로 해당 씬의 TTS 캐시 무효화
      invalidateSceneTtsCache(index)

      // scenes 배열 업데이트 (하나의 씬만 업데이트)
      const newScenes = scenes.map((scene, i) =>
        i === index ? updatedSceneScript : scene
      )

      // timeline.scenes 배열도 업데이트
      const newTimelineScenes = timeline.scenes.map((scene, i) =>
        i === index && updatedTimelineScene ? updatedTimelineScene : scene
      )

      setScenes(newScenes)
      setTimeline({
        ...timeline,
        scenes: newTimelineScenes,
      })
    },
    [scenes, timeline, setScenes, setTimeline, invalidateSceneTtsCache, changedScenesRef]
  )

  // 씬 삭제
  const handleSceneDelete = useCallback(
    (index: number) => {
      if (!timeline || scenes.length <= 1) {
        alert('최소 1개의 씬이 필요합니다.')
        return
      }

      // scenes 배열에서 삭제
      const newScenes = scenes
        .filter((_, i) => i !== index)
        .map((scene, i) => ({
          ...scene,
          sceneId: i + 1, // sceneId 재할당
        }))

      // timeline.scenes 배열에서도 삭제
      const newTimelineScenes = timeline.scenes
        .filter((_, i) => i !== index)
        .map((scene, i) => ({
          ...scene,
          sceneId: i + 1,
        }))

      setScenes(newScenes)
      setTimeline({
        ...timeline,
        scenes: newTimelineScenes,
      })

      // 현재 선택된 씬 인덱스 조정
      if (currentSceneIndex >= newScenes.length) {
        // 삭제된 씬이 마지막이었으면 이전 씬 선택
        setCurrentSceneIndex(Math.max(0, newScenes.length - 1))
        currentSceneIndexRef.current = Math.max(0, newScenes.length - 1)
      } else if (currentSceneIndex === index) {
        // 삭제된 씬이 현재 선택된 씬이면 다음 씬 선택 (없으면 이전 씬)
        setCurrentSceneIndex(Math.min(index, newScenes.length - 1))
        currentSceneIndexRef.current = Math.min(index, newScenes.length - 1)
      }
    },
    [scenes, timeline, currentSceneIndex, setScenes, setTimeline, setCurrentSceneIndex, currentSceneIndexRef]
  )

  // 씬 복사 - 그룹화되지 않은 독립적인 씬으로 복사하고 자동으로 자막 씬 분할 실행
  const handleSceneDuplicate = useCallback(
    (index: number) => {
      if (!timeline || scenes.length === 0) return

      const targetSceneScript = scenes[index]
      const targetTimelineScene = timeline.scenes[index]

      // ||| 구분자가 있는 씬인지 확인
      const scriptParts = targetSceneScript.script.split(/\s*\|\|\|\s*/).map(part => part.trim()).filter(part => part.length > 0)
      const hasDelimiters = scriptParts.length > 1

      // 새로운 sceneId 할당 (최대 sceneId + 1)
      const maxSceneId = Math.max(...scenes.map(s => s.sceneId || 0), ...timeline.scenes.map(s => s.sceneId || 0))
      const newSceneId = maxSceneId + 1

      // 복제된 씬 생성 (새로운 sceneId, splitIndex 제거하여 독립적인 씬으로)
      let duplicatedSceneScript: SceneScript = {
        ...targetSceneScript,
        sceneId: newSceneId, // 새로운 sceneId 할당
        splitIndex: undefined, // splitIndex 제거하여 독립적인 씬으로
      }

      let duplicatedTimelineScene: TimelineScene = {
        ...targetTimelineScene,
        sceneId: newSceneId, // 새로운 sceneId 할당
      }

      // 구분자가 없으면 자동으로 자막 씬 분할 실행
      if (!hasDelimiters) {
        const { sceneScript: updatedSceneScript, timelineScene: updatedTimelineScene } =
          insertSceneDelimiters({
            sceneScript: duplicatedSceneScript,
            timelineScene: duplicatedTimelineScene,
          })
        
        // 분할이 가능한 경우 (문장이 2개 이상)
        if (updatedSceneScript.script !== duplicatedSceneScript.script && updatedTimelineScene) {
          duplicatedSceneScript = updatedSceneScript
          duplicatedTimelineScene = updatedTimelineScene
          console.log(`[SceneDuplicate] 씬 ${index} 복사 후 자동 분할 완료`)
        }
      }

      // 복사된 씬을 원본 씬 다음에 삽입
      const insertIndex = index + 1

      // scenes 배열에 삽입
      const newScenes = [
        ...scenes.slice(0, insertIndex),
        duplicatedSceneScript,
        ...scenes.slice(insertIndex),
      ]

      // timeline.scenes 배열에도 삽입
      const newTimelineScenes = [
        ...timeline.scenes.slice(0, insertIndex),
        duplicatedTimelineScene,
        ...timeline.scenes.slice(insertIndex),
      ]

      setScenes(newScenes)
      setTimeline({
        ...timeline,
        scenes: newTimelineScenes,
      })

      // 복제된 씬을 선택
      setCurrentSceneIndex(insertIndex)
      currentSceneIndexRef.current = insertIndex

      // 복사된 씬을 변경 상태로 표시 (재생 시 강제 재생성)
      changedScenesRef.current.add(insertIndex)
      console.log(`[SceneDuplicate] 씬 ${insertIndex} 변경 상태로 표시 (재생 시 강제 재생성)`)

      // 스크립트가 변경되었으므로 해당 씬의 TTS 캐시 무효화
      invalidateSceneTtsCache(insertIndex)
    },
    [scenes, timeline, setScenes, setTimeline, setCurrentSceneIndex, currentSceneIndexRef, invalidateSceneTtsCache, changedScenesRef]
  )

  // 씬 순서 변경 핸들러
  const handleSceneReorder = useCallback((newOrder: number[]) => {
    if (!timeline) return

    // 재정렬된 씬들
    const reorderedScenes = newOrder.map((oldIndex) => scenes[oldIndex])
    const reorderedTimelineScenes = newOrder.map((oldIndex) => timeline.scenes[oldIndex])

    // 같은 sceneId를 가진 씬들을 그룹별로 처리하여 splitIndex 업데이트
    const updatedScenes = reorderedScenes.map((scene, index) => {
      // 원본 씬인지 확인 (원래 splitIndex가 없었던 씬)
      const originalScene = scenes[newOrder[index]]
      const isOriginalScene = !originalScene.splitIndex

      // 원본 씬은 항상 splitIndex 없음 유지
      if (isOriginalScene) {
        return {
          ...scene,
          splitIndex: undefined,
        }
      }

      // 분할된 씬들: 같은 그룹 내에서 원본 씬을 제외한 순서로 splitIndex 할당
      const sameGroupScenes = reorderedScenes.filter((s, i) => {
        const origScene = scenes[newOrder[i]]
        return s.sceneId === scene.sceneId && origScene.splitIndex // 분할된 씬들만
      })

      // 현재 씬이 분할된 씬들 중 몇 번째인지 계산
      let splitPosition = 0
      for (let i = 0; i < index; i++) {
        const prevOrigScene = scenes[newOrder[i]]
        if (reorderedScenes[i].sceneId === scene.sceneId && prevOrigScene.splitIndex) {
          splitPosition++
        }
      }

      return {
        ...scene,
        splitIndex: splitPosition + 1, // 분할된 씬들은 1부터 시작
      }
    })

    // timeline의 scenes도 동일하게 업데이트 (sceneId는 유지)
    const updatedTimelineScenes = reorderedTimelineScenes.map((timelineScene, index) => {
      const scene = updatedScenes[index]
      return {
        ...timelineScene,
        sceneId: scene.sceneId, // sceneId 유지
      }
    })

    setScenes(updatedScenes)

    // selectedImages도 같은 순서로 재정렬
    const reorderedImages = newOrder.map((oldIndex) => selectedImages[oldIndex]).filter(Boolean)
    if (reorderedImages.length > 0) {
      setSelectedImages(reorderedImages)
    }

    setTimeline({
      ...timeline,
      scenes: updatedTimelineScenes,
    })

    // 현재 선택된 씬 인덱스 업데이트
    const currentOldIndex = newOrder.indexOf(currentSceneIndex)
    if (currentOldIndex !== -1) {
      setCurrentSceneIndex(currentOldIndex)
      currentSceneIndexRef.current = currentOldIndex
    }
  }, [scenes, selectedImages, timeline, currentSceneIndex, setScenes, setSelectedImages, setTimeline, setCurrentSceneIndex, currentSceneIndexRef])

  return {
    handleSceneScriptChange,
    handleSceneSplit,
    handleSceneDelete,
    handleSceneDuplicate,
    handleSceneReorder,
  }
}

