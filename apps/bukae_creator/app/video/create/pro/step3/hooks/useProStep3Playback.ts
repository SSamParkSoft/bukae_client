'use client'

import { useState, useCallback } from 'react'
import type { ProStep3Scene } from '@/app/video/create/pro/step3/components/ProSceneListPanel'

/**
 * Pro step3 재생 상태 관리 훅
 * 
 * Pro 전용 재생 로직: 선택된 구간들을 이어붙여서 재생하는 상태와 핸들러를 제공합니다.
 * 
 * @param proStep3Scenes - ProStep3Scene 배열
 * @returns isPlaying - 재생 중 여부
 * @returns setIsPlaying - 재생 상태 설정 함수
 * @returns handleProPlayPause - 재생/일시정지 핸들러
 */
export function useProStep3Playback(proStep3Scenes: ProStep3Scene[]) {
  const [isPlaying, setIsPlaying] = useState(false)

  // Pro 전용 재생 핸들러: 선택된 구간들을 이어붙여서 재생
  const handleProPlayPause = useCallback(() => {
    if (isPlaying) {
      // 일시정지
      setIsPlaying(false)
      return
    }

    // 재생 시작: 선택된 구간들을 순차적으로 재생
    const validScenes = proStep3Scenes.filter(
      (s) =>
        s.videoUrl &&
        s.selectionStartSeconds !== undefined &&
        s.selectionEndSeconds !== undefined
    )
    if (validScenes.length === 0) {
      alert('재생할 영상이 없습니다.')
      return
    }

    setIsPlaying(true)
  }, [isPlaying, proStep3Scenes])

  return {
    isPlaying,
    setIsPlaying,
    handleProPlayPause,
  }
}
