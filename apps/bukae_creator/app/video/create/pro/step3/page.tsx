'use client'

import { motion } from 'framer-motion'
import { ProPreviewPanel } from './components/ProPreviewPanel'
import { ProSceneListPanel, type ProStep3Scene } from './components/ProSceneListPanel'
import { ProEffectsPanel } from './components/ProEffectsPanel'
import { useVideoCreateStore, type SceneScript, type TimelineData } from '@/store/useVideoCreateStore'
import { useMemo, useCallback, useEffect, useRef, useState } from 'react'
import { voiceTemplateHelpers } from '@/store/useVideoCreateStore'
import { allTransitions, transitions, movements } from '@/lib/data/transitions'

// Pro step2에서 사용하는 확장된 Scene 타입
type ProScene = {
  id: string
  script: string
  voiceLabel?: string
  voiceTemplate?: string | null
  ttsDuration?: number
  videoUrl?: string | null
  selectionStartSeconds?: number
  selectionEndSeconds?: number
}

// SceneScript를 ProScene으로 변환
function sceneScriptToProScene(s: SceneScript, index: number): ProScene {
  // SceneScript의 확장된 필드 확인 (localStorage에서 복원된 데이터)
  const extended = s as SceneScript & {
    id?: string
    voiceLabel?: string
    voiceTemplate?: string | null
    ttsDuration?: number
    videoUrl?: string | null
    selectionStartSeconds?: number
    selectionEndSeconds?: number
  }

  return {
    id: extended.id || `scene-${index}`,
    script: s.script || '',
    voiceLabel: extended.voiceLabel,
    voiceTemplate: extended.voiceTemplate,
    ttsDuration: extended.ttsDuration,
    videoUrl: extended.videoUrl,
    selectionStartSeconds: extended.selectionStartSeconds,
    selectionEndSeconds: extended.selectionEndSeconds,
  }
}

export default function ProStep3Page() {
  const { scenes: storeScenes, setScenes, bgmTemplate, setBgmTemplate } = useVideoCreateStore()
  
  // 현재 선택된 씬 인덱스
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0)
  
  // 재생 상태 관리 (Pro 전용: 비디오 구간 이어붙여서 재생)
  const [isPlaying, setIsPlaying] = useState(false)
  
  // 효과 패널 관련 상태
  const [rightPanelTab, setRightPanelTab] = useState<string>('animation')
  const [confirmedBgmTemplate, setConfirmedBgmTemplate] = useState<string | null>(null)
  const [soundEffect, setSoundEffect] = useState<string | null>(null)
  const [confirmedSoundEffect, setConfirmedSoundEffect] = useState<string | null>(null)

  // 디버깅: storeScenes 변경 추적
  useEffect(() => {
    console.log('[ProStep3Page] storeScenes 변경:', {
      isArray: Array.isArray(storeScenes),
      length: Array.isArray(storeScenes) ? storeScenes.length : 'N/A',
      scenes: storeScenes,
    })
  }, [storeScenes])

  // store의 scenes를 ProScene으로 변환
  const proScenes: ProScene[] = useMemo(() => {
    // storeScenes가 배열이 아니면 빈 배열 반환
    if (!Array.isArray(storeScenes) || storeScenes.length === 0) {
      console.warn('[ProStep3Page] proScenes: storeScenes가 배열이 아니거나 빈 배열입니다.', {
        storeScenes,
        isArray: Array.isArray(storeScenes),
        length: Array.isArray(storeScenes) ? storeScenes.length : 'N/A',
      })
      return []
    }
    const result = storeScenes.map((s, index) => sceneScriptToProScene(s, index))
    console.log('[ProStep3Page] proScenes 변환 완료:', {
      count: result.length,
      scenes: result,
    })
    return result
  }, [storeScenes])

  // ProStep3Scene으로 변환 (selectionStartSeconds, selectionEndSeconds는 기본값 사용)
  const proStep3Scenes: ProStep3Scene[] = useMemo(() => {
    // proScenes가 배열이 아니거나 빈 배열이면 빈 배열 반환
    if (!Array.isArray(proScenes) || proScenes.length === 0) {
      return []
    }
    return proScenes.map((scene, index) => {
      const extended = scene as ProScene & {
        selectionStartSeconds?: number
        selectionEndSeconds?: number
      }

      // selectionStartSeconds와 selectionEndSeconds가 없으면 기본값 사용
      // ttsDuration을 기준으로 선택 영역 설정 (0부터 ttsDuration까지)
      const ttsDuration = scene.ttsDuration || 10
      const selectionStartSeconds = extended.selectionStartSeconds ?? 0
      const selectionEndSeconds = extended.selectionEndSeconds ?? ttsDuration

      return {
        id: scene.id,
        script: scene.script,
        videoUrl: scene.videoUrl,
        selectionStartSeconds,
        selectionEndSeconds,
        voiceLabel: scene.voiceLabel,
        voiceTemplate: scene.voiceTemplate,
        ttsDuration: scene.ttsDuration,
      }
    })
  }, [proScenes])

  // 격자 선택 영역 변경 핸들러
  const handleSelectionChange = useCallback((sceneIndex: number, startSeconds: number, endSeconds: number) => {
    // storeScenes가 배열인지 확인하고, 배열이 아니면 업데이트하지 않음
    if (!Array.isArray(storeScenes) || storeScenes.length === 0) {
      console.warn('[ProStep3Page] handleSelectionChange: storeScenes가 배열이 아니거나 빈 배열입니다.', {
        storeScenes,
        sceneIndex,
      })
      return
    }
    
    // 배열 복사 후 업데이트
    const next = [...storeScenes]
    if (next[sceneIndex]) {
      next[sceneIndex] = {
        ...next[sceneIndex],
        selectionStartSeconds: startSeconds,
        selectionEndSeconds: endSeconds,
      } as SceneScript
      setScenes(next)
    }
  }, [setScenes, storeScenes])

  // 현재 선택된 씬의 비디오 URL과 선택 영역
  const currentScene = proStep3Scenes[currentSceneIndex]
  const currentVideoUrl = currentScene?.videoUrl || null
  const currentSelectionStartSeconds = currentScene?.selectionStartSeconds || 0

  // Pro 전용 재생 핸들러: 선택된 구간들을 이어붙여서 재생
  const handleProPlayPause = useCallback(() => {
    if (isPlaying) {
      // 일시정지
      setIsPlaying(false)
      return
    }

    // 재생 시작: 선택된 구간들을 순차적으로 재생
    const validScenes = proStep3Scenes.filter(s => s.videoUrl && s.selectionStartSeconds !== undefined && s.selectionEndSeconds !== undefined)
    if (validScenes.length === 0) {
      alert('재생할 영상이 없습니다.')
      return
    }

    setIsPlaying(true)
  }, [isPlaying, proStep3Scenes])

  // 씬 선택 핸들러
  const handleSceneSelect = useCallback((index: number) => {
    setCurrentSceneIndex(index)
  }, [])

  // 씬 재정렬 핸들러
  const handleSceneReorder = useCallback((newOrder: number[]) => {
    if (!Array.isArray(storeScenes) || storeScenes.length === 0) {
      return
    }
    const reordered = newOrder.map(index => storeScenes[index])
    setScenes(reordered)
  }, [setScenes, storeScenes])

  // 전환 효과 변경 핸들러 (Pro에서는 timeline이 없으므로 빈 함수)
  const handleTransitionChange = useCallback((sceneIndex: number, value: string) => {
    // Pro에서는 전환 효과를 나중에 구현
    console.log('전환 효과 변경:', sceneIndex, value)
  }, [])

  // 모션 변경 핸들러 (Pro에서는 timeline이 없으므로 빈 함수)
  const handleMotionChange = useCallback((sceneIndex: number, motion: any) => {
    // Pro에서는 모션 효과를 나중에 구현
    console.log('모션 변경:', sceneIndex, motion)
  }, [])

  // BGM 확인 핸들러
  const handleBgmConfirm = useCallback((templateId: string | null) => {
    setConfirmedBgmTemplate(templateId)
  }, [])

  // 사운드 효과 확인 핸들러
  const handleSoundEffectConfirm = useCallback((effectId: string | null) => {
    setConfirmedSoundEffect(effectId)
  }, [])

  // Timeline 설정 핸들러 (Pro에서는 timeline이 없으므로 빈 함수)
  const handleSetTimeline = useCallback((timeline: TimelineData) => {
    // Pro에서는 timeline을 사용하지 않음
    console.log('Timeline 설정:', timeline)
  }, [])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* 고정 80px 양옆 마진 + 최대 1760px 컨테이너 */}
      <div
        className="w-full h-full mx-auto"
        style={{ maxWidth: '1760px', paddingLeft: '80px', paddingRight: '80px' }}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col lg:flex-row h-full overflow-hidden w-full gap-4 lg:gap-3 xl:gap-4 2xl:gap-5"
        >
          {/* 왼쪽 패널: 미리보기 (Pro 전용 - 썸네일만 표시) */}
          <div className="w-full lg:w-[25%] min-w-[250px] flex flex-col overflow-hidden lg:h-full">
            <ProPreviewPanel
              currentVideoUrl={currentVideoUrl}
              currentSelectionStartSeconds={currentSelectionStartSeconds}
              currentSceneIndex={currentSceneIndex}
              scenes={proStep3Scenes}
              isPlaying={isPlaying}
              onPlayPause={handleProPlayPause}
              bgmTemplate={bgmTemplate}
              onExport={() => {
                // 내보내기 기능은 나중에 구현
                alert('내보내기 기능은 준비 중입니다.')
              }}
              isExporting={false}
            />
          </div>

          {/* 중앙 패널: 씬 리스트 */}
          <div className="w-full lg:w-[45%] min-w-[480px] flex flex-col overflow-hidden lg:h-full shrink-0 lg:mr-2">
            <ProSceneListPanel
              theme="light"
              scenes={proStep3Scenes}
              timeline={null}
              currentSceneIndex={currentSceneIndex}
              playingSceneIndex={null}
              isPreparing={false}
              isTtsBootstrapping={false}
              onSelect={handleSceneSelect}
              onReorder={handleSceneReorder}
              onPlayScene={async () => {
                // 개별 씬 재생은 ProPreviewPanel의 전체 재생으로 대체
                handleProPlayPause()
              }}
              onOpenEffectPanel={() => {
                // 효과 패널은 나중에 구현
              }}
              onSelectionChange={handleSelectionChange}
            />
          </div>

          {/* 오른쪽 패널: 효과 설정 */}
          <div className="w-full lg:w-[30%] min-w-[350px] flex flex-col overflow-hidden lg:h-full shrink-0">
            <ProEffectsPanel
              theme="light"
              rightPanelTab={rightPanelTab}
              setRightPanelTab={setRightPanelTab}
              timeline={null}
              currentSceneIndex={currentSceneIndex}
              allTransitions={allTransitions}
              transitions={transitions}
              movements={movements}
              onTransitionChange={handleTransitionChange}
              bgmTemplate={bgmTemplate}
              setBgmTemplate={setBgmTemplate}
              confirmedBgmTemplate={confirmedBgmTemplate}
              onBgmConfirm={handleBgmConfirm}
              soundEffect={soundEffect}
              setSoundEffect={setSoundEffect}
              confirmedSoundEffect={confirmedSoundEffect}
              onSoundEffectConfirm={handleSoundEffectConfirm}
              setTimeline={handleSetTimeline}
              onMotionChange={handleMotionChange}
            />
          </div>
        </motion.div>
      </div>
    </div>
  )
}
