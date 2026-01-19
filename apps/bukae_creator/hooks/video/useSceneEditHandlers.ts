import { useCallback } from 'react'
import { insertSceneDelimiters, splitSceneBySentences } from '@/lib/utils/scene-splitter'
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
        // 변경된 씬으로 표시 (재생 시 강제 재생성)
        changedScenesRef.current.add(index)
        
        // 스크립트가 변경되었으므로 실제 재생 시간 초기화 (새로운 스크립트로 재생해야 함)
        if (timeline) {
          const updatedScenes = timeline.scenes.map((s, idx) => {
            if (idx === index) {
              return { ...s, actualPlaybackDuration: undefined }
            }
            return s
          })
          setTimeline({ ...timeline, scenes: updatedScenes })
        }
        
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
    [scenes, timeline, setTimeline, voiceTemplate, originalHandleSceneScriptChange, invalidateSceneTtsCache, changedScenesRef, ttsCacheRef]
  )

  // 씬 분할: 하나의 씬을 여러 개의 독립적인 씬으로 분할 (씬 1-1 -> 씬 1-2 -> 씬 1-3)
  const handleSceneSplit = useCallback(
    (index: number) => {
      if (!timeline || scenes.length === 0) return

      const targetSceneScript = scenes[index]
      const targetTimelineScene = timeline.scenes[index]

      // splitSceneBySentences를 사용하여 실제로 씬을 여러 개로 분할
      const { sceneScripts: splitSceneScripts, timelineScenes: splitTimelineScenes } =
        splitSceneBySentences({
          sceneScript: targetSceneScript,
          timelineScene: targetTimelineScene,
        })

      // 분할 불가(문장 1개 이하)이면 아무 것도 하지 않음
      if (splitSceneScripts.length <= 1) {
        return
      }

      // 분할된 씬들은 같은 sceneId를 유지하여 UI에서 그룹화되도록 함
      // splitIndex로 구분되므로 재생 시에는 각각 독립적인 씬으로 처리됨
      // splitSceneBySentences가 이미 같은 sceneId를 유지하고 splitIndex를 설정하므로 그대로 사용
      const updatedSplitSceneScripts = splitSceneScripts
      const updatedSplitTimelineScenes = splitTimelineScenes

      // 변경된 씬으로 표시 (재생 시 강제 재생성)
      // 분할된 모든 씬을 변경 상태로 표시
      updatedSplitTimelineScenes.forEach((_, idx) => {
        changedScenesRef.current.add(index + idx)
      })

      // 스크립트가 변경되었으므로 해당 씬의 TTS 캐시 무효화
      invalidateSceneTtsCache(index)

      // scenes 배열 업데이트: 기존 씬을 분할된 씬들로 교체
      const newScenes = [
        ...scenes.slice(0, index),
        ...updatedSplitSceneScripts,
        ...scenes.slice(index + 1),
      ]

      // timeline.scenes 배열도 업데이트
      const newTimelineScenes = [
        ...timeline.scenes.slice(0, index),
        ...updatedSplitTimelineScenes,
        ...timeline.scenes.slice(index + 1),
      ]

      setScenes(newScenes)
      setTimeline({
        ...timeline,
        scenes: newTimelineScenes,
      })
      
      // 현재 씬 인덱스가 분할된 씬 범위에 있으면 첫 번째 분할 씬으로 조정
      if (currentSceneIndex >= index) {
        // 분할된 씬의 첫 번째로 이동
        setCurrentSceneIndex(index)
        currentSceneIndexRef.current = index
      }
    },
    [scenes, timeline, setScenes, setTimeline, invalidateSceneTtsCache, changedScenesRef, currentSceneIndex, setCurrentSceneIndex, currentSceneIndexRef]
  )

  // 씬 삭제
  const handleSceneDelete = useCallback(
    (index: number) => {
      if (!timeline || scenes.length <= 1) {
        alert('최소 1개의 씬이 필요합니다.')
        return
      }

      const deletedScene = scenes[index]
      const deletedSceneId = deletedScene.sceneId

      // 같은 그룹 내 씬들 찾기 (같은 sceneId를 가진 씬들, 삭제할 씬 제외)
      const sameGroupScenes = scenes.filter((s, i) => s.sceneId === deletedSceneId && i !== index)

      // scenes 배열에서 삭제
      let newScenes = scenes.filter((_, i) => i !== index)
      let newTimelineScenes = timeline.scenes.filter((_, i) => i !== index)

      // 같은 그룹 내 씬이 남아있으면 그룹화 유지 (splitIndex 재정렬)
      if (sameGroupScenes.length > 0) {
        // 같은 그룹 내 씬들의 splitIndex 재정렬
        const groupSceneIndices: number[] = []
        newScenes.forEach((scene, i) => {
          if (scene.sceneId === deletedSceneId && scene.splitIndex !== undefined) {
            groupSceneIndices.push(i)
          }
        })

        // splitIndex 재할당 (1부터 시작)
        groupSceneIndices.sort((a, b) => (newScenes[a].splitIndex || 0) - (newScenes[b].splitIndex || 0))
        groupSceneIndices.forEach((sceneIndex, idx) => {
          const newSplitIndex = idx + 1
          newScenes[sceneIndex] = {
            ...newScenes[sceneIndex],
            splitIndex: newSplitIndex,
          }
          
          // timeline도 동일하게 업데이트
          if (sceneIndex < newTimelineScenes.length) {
            newTimelineScenes[sceneIndex] = {
              ...newTimelineScenes[sceneIndex],
              splitIndex: newSplitIndex,
            }
          }
        })
      } else {
        // 그룹 내 씬이 하나만 남으면 원래 씬으로 복원: splitIndex 제거
        const remainingSceneIndex = newScenes.findIndex(s => s.sceneId === deletedSceneId)
        if (remainingSceneIndex >= 0) {
          const remainingScene = newScenes[remainingSceneIndex]
          // splitIndex가 있으면 제거하여 원래 씬으로 복원
          if (remainingScene.splitIndex !== undefined) {
            const { splitIndex, ...sceneWithoutSplitIndex } = remainingScene
            newScenes[remainingSceneIndex] = sceneWithoutSplitIndex
            
            // timeline도 동일하게 업데이트
            if (remainingSceneIndex < newTimelineScenes.length) {
              const { splitIndex: timelineSplitIndex, ...timelineSceneWithoutSplitIndex } = newTimelineScenes[remainingSceneIndex]
              newTimelineScenes[remainingSceneIndex] = timelineSceneWithoutSplitIndex
            }
          }
        }
      }

      // sceneId는 그대로 유지 (그룹화 유지를 위해)

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

  // 씬 복사 - 그룹 내 씬이면 같은 그룹으로 복사, 아니면 독립적인 씬으로 복사
  const handleSceneDuplicate = useCallback(
    (index: number) => {
      if (!timeline || scenes.length === 0) return

      const targetSceneScript = scenes[index]
      const targetTimelineScene = timeline.scenes[index]

      // 그룹 내 세부 씬인지 확인 (splitIndex가 있는지 확인)
      const isGroupedScene = targetSceneScript.splitIndex !== undefined

      if (isGroupedScene) {
        // 그룹 내 세부 씬을 복사하는 경우: 같은 그룹 내에 새로운 세부 씬으로 추가
        const groupSceneId = targetSceneScript.sceneId

        // 같은 그룹 내의 모든 세부 씬들 찾기
        const sameGroupScenes = scenes
          .map((s, i) => ({ scene: s, index: i }))
          .filter(({ scene }) => scene.sceneId === groupSceneId && scene.splitIndex !== undefined)

        // 최대 splitIndex 구하기
        const maxSplitIndex = sameGroupScenes.reduce((max, { scene }) => {
          return Math.max(max, scene.splitIndex || 0)
        }, 0)

        // 새로운 splitIndex 할당
        const newSplitIndex = maxSplitIndex + 1

        // 그룹의 마지막 세부 씬 다음 위치 찾기
        const lastGroupSceneIndex = Math.max(...sameGroupScenes.map(({ index }) => index))
        const insertIndex = lastGroupSceneIndex + 1

        const duplicatedSceneScript: SceneScript = {
          ...targetSceneScript,
          sceneId: groupSceneId, // 같은 그룹의 sceneId 유지
          splitIndex: newSplitIndex, // 새로운 splitIndex 할당
        }

        const duplicatedTimelineScene: TimelineScene = {
          ...targetTimelineScene,
          sceneId: groupSceneId, // 같은 그룹의 sceneId 유지
          splitIndex: newSplitIndex, // 새로운 splitIndex 할당
        }

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

        // 스크립트가 변경되었으므로 해당 씬의 TTS 캐시 무효화
        invalidateSceneTtsCache(insertIndex)
      } else {
        // 독립적인 씬을 복사하는 경우: 새로운 독립적인 씬으로 복사
        // 새로운 sceneId 할당 (최대 sceneId + 1)
        const maxSceneId = Math.max(...scenes.map(s => s.sceneId || 0), ...timeline.scenes.map(s => s.sceneId || 0))
        const newSceneId = maxSceneId + 1

        const duplicatedSceneScript: SceneScript = {
          ...targetSceneScript,
          sceneId: newSceneId, // 새로운 sceneId 할당
          splitIndex: undefined, // splitIndex 제거하여 독립적인 씬으로
        }

        const duplicatedTimelineScene: TimelineScene = {
          ...targetTimelineScene,
          sceneId: newSceneId, // 새로운 sceneId 할당
        }

        // 원본 씬 바로 다음 위치에 삽입
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

        // 스크립트가 변경되었으므로 해당 씬의 TTS 캐시 무효화
        invalidateSceneTtsCache(insertIndex)
      }
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

