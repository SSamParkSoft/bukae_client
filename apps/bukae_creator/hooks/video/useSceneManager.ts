import { useCallback, useRef } from 'react'
import * as PIXI from 'pixi.js'
import * as fabric from 'fabric'
import { gsap } from 'gsap'
import { TimelineData, TimelineScene } from '@/store/useVideoCreateStore'
import { calculateSpriteParams } from '@/utils/pixi'
import { resolveSubtitleFontFamily } from '@/lib/subtitle-fonts'

// "움직임" 효과 목록 (그룹 내 전환 효과 지속 대상)
const MOVEMENT_EFFECTS = ['slide-left', 'slide-right', 'slide-up', 'slide-down', 'zoom-in', 'zoom-out']

interface UseSceneManagerParams {
  // Refs
  appRef: React.RefObject<PIXI.Application | null>
  containerRef: React.RefObject<PIXI.Container | null>
  spritesRef: React.MutableRefObject<Map<number, PIXI.Sprite>>
  textsRef: React.MutableRefObject<Map<number, PIXI.Text>>
  currentSceneIndexRef: React.MutableRefObject<number>
  previousSceneIndexRef: React.MutableRefObject<number | null>
  activeAnimationsRef: React.MutableRefObject<Map<number, gsap.core.Timeline>>
  fabricCanvasRef: React.RefObject<fabric.Canvas | null>
  fabricScaleRatioRef: React.MutableRefObject<number>
  isSavingTransformRef: React.MutableRefObject<boolean>
  isManualSceneSelectRef: React.MutableRefObject<boolean>
  
  // State/Props
  timeline: TimelineData | null
  stageDimensions: { width: number; height: number }
  useFabricEditing: boolean
  
  // Functions
  loadPixiTextureWithCache: (url: string) => Promise<PIXI.Texture>
  applyAdvancedEffects: (sprite: PIXI.Sprite, sceneIndex: number, effects?: TimelineScene['advancedEffects']) => void
  applyEnterEffect: (
    toSprite: PIXI.Sprite | null,
    toText: PIXI.Text | null,
    transition: string,
    duration: number,
    stageWidth: number,
    stageHeight: number,
    sceneIndex: number,
    applyAdvancedEffectsFn: (sprite: PIXI.Sprite, sceneIndex: number, effects?: TimelineScene['advancedEffects']) => void,
    forceTransition?: string, // 강제로 적용할 전환 효과 (timeline 값 무시)
    onComplete?: () => void, // Timeline 완료 콜백
    previousIndex?: number | null, // 이전 씬 인덱스
    groupTransitionTimelinesRef?: React.MutableRefObject<Map<number, gsap.core.Timeline>>, // 그룹별 Timeline 추적
    sceneId?: number // 현재 씬의 sceneId
  ) => void
  onLoadComplete?: (sceneIndex: number) => void // 로드 완료 후 콜백
}

export const useSceneManager = ({
  appRef,
  containerRef,
  spritesRef,
  textsRef,
  currentSceneIndexRef,
  previousSceneIndexRef,
  activeAnimationsRef,
  fabricCanvasRef,
  fabricScaleRatioRef,
  isSavingTransformRef,
  isManualSceneSelectRef,
  timeline,
  stageDimensions,
  useFabricEditing,
  loadPixiTextureWithCache,
  applyAdvancedEffects,
  applyEnterEffect,
  onLoadComplete,
}: UseSceneManagerParams) => {
  // 그룹별 전환 효과 애니메이션 Timeline 추적 (sceneId를 키로 사용)
  const groupTransitionTimelinesRef = useRef<Map<number, gsap.core.Timeline>>(new Map())

  // 현재 씬 업데이트
  // previousIndex 파라미터: 명시적으로 이전 씬 인덱스를 전달받음 (optional, 없으면 previousSceneIndexRef 사용)
  // forceTransition: 강제로 적용할 전환 효과 (timeline 값 무시, 전환 효과 미리보기용)
  const updateCurrentScene = useCallback((skipAnimation: boolean = false, explicitPreviousIndex?: number | null, forceTransition?: string, onAnimationComplete?: (sceneIndex: number) => void) => {
    const sceneIndex = currentSceneIndexRef.current
    try {
      if (!containerRef.current || !timeline || !appRef.current) {
        return
      }

      // isManualSceneSelectRef가 true이면 handleScenePartSelect가 처리 중이므로 여기서는 업데이트하지 않음
      // 단, skipAnimation이 false이고 전환 효과를 보여줘야 하는 경우에는 계속 진행
      if (isManualSceneSelectRef.current && skipAnimation) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSceneManager.ts:78',message:'updateCurrentScene 수동 씬 선택 중 리턴 (skipAnimation)',data:{sceneIndex,isManualSceneSelect:isManualSceneSelectRef.current,skipAnimation},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        return
      }
      // #region agent log
      if (isManualSceneSelectRef.current && !skipAnimation) {
        fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSceneManager.ts:85',message:'updateCurrentScene 수동 씬 선택 중이지만 전환 효과 적용',data:{sceneIndex,isManualSceneSelect:isManualSceneSelectRef.current,skipAnimation},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
      }
      
      // handleScenePartSelect에서 이미 텍스트를 업데이트했는지 먼저 확인
      // 이 로직은 currentText를 가져오기 전에 실행하여 handleScenePartSelect에서 설정한 텍스트 객체를 찾을 수 있도록 함
      const currentScene = timeline.scenes[sceneIndex]
      if (currentScene) {
        // #region agent log
        const startCheckResults: Array<{idx: number, hasText: boolean, debugId: string | undefined, text: string, visible: boolean, alpha: number}> = []
        textsRef.current.forEach((text, idx) => {
          if (text && idx === sceneIndex) {
            const debugId = (text as PIXI.Text & { __debugId?: string }).__debugId
            startCheckResults.push({
              idx,
              hasText: !!text,
              debugId: debugId || undefined,
              text: text.text || '',
              visible: text.visible,
              alpha: text.alpha
            })
          }
        })
        fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSceneManager.ts:93',message:'시작 부분 텍스트 객체 검색 시작',data:{sceneIndex,currentSceneText:currentScene.text.content,startCheckResults},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'L'})}).catch(()=>{});
        // #endregion
        let alreadyUpdatedText: PIXI.Text | null = null
        textsRef.current.forEach((text, idx) => {
          if (text && idx === sceneIndex) {
            const debugId = (text as PIXI.Text & { __debugId?: string }).__debugId
            // debugId가 text_로 시작하는지 확인 (sceneIndex와 관계없이)
            const startsWithText = debugId ? debugId.startsWith('text_') : false
            const startsWithCheck = debugId ? debugId.startsWith(`text_${sceneIndex}_`) : false
            const textCheck = text.text ? (text.text !== '와 대박!' && text.text !== currentScene.text.content) : false
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSceneManager.ts:115',message:'시작 부분 디버그 ID 확인',data:{sceneIndex,idx,hasText:!!text,debugId:debugId || '없음',text:text.text || '',visible:text.visible,alpha:text.alpha,startsWithText,startsWithCheck,textCheck},timestamp:Date.now(),sessionId:'debug-session',runId:'run51',hypothesisId:'A'})}).catch(()=>{});
            // #endregion
            // debugId가 text_로 시작하고 텍스트가 변경된 경우 이미 업데이트된 텍스트로 간주
            if (debugId && startsWithText && textCheck) {
              // handleScenePartSelect에서 설정한 텍스트 객체를 찾음
              alreadyUpdatedText = text
              console.log(`[updateCurrentScene] ✅ 시작 부분에서 이미 업데이트된 텍스트 객체 찾음: 씬${idx}, text="${text.text}", debugId="${debugId}"`)
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSceneManager.ts:122',message:'시작 부분에서 이미 업데이트된 텍스트 객체 찾음',data:{sceneIndex,foundIdx:idx,currentText:text.text,timelineText:currentScene.text.content,visible:text.visible,alpha:text.alpha,debugId},timestamp:Date.now(),sessionId:'debug-session',runId:'run51',hypothesisId:'A'})}).catch(()=>{});
              // #endregion
            }
          }
        })
        
        if (alreadyUpdatedText !== null) {
          // 이미 업데이트된 텍스트 객체를 찾았으므로, 이를 currentText로 사용
          const updatedText: PIXI.Text = alreadyUpdatedText
          updatedText.visible = true
          updatedText.alpha = 1
          const currentSprite = spritesRef.current.get(sceneIndex)
          if (currentSprite) {
            currentSprite.visible = true
            currentSprite.alpha = 1
          }
          if (appRef.current) {
            appRef.current.render()
          }
          previousSceneIndexRef.current = sceneIndex
          return
        }
      }
    const previousIndex = explicitPreviousIndex !== undefined ? explicitPreviousIndex : previousSceneIndexRef.current
    const currentSprite = spritesRef.current.get(sceneIndex)
    let currentText = textsRef.current.get(sceneIndex)
    const previousSprite = previousIndex !== null ? spritesRef.current.get(previousIndex) : null
    const previousText = previousIndex !== null ? textsRef.current.get(previousIndex) : null
    
    // #region agent log
    // textsRef에서 가져온 텍스트 객체의 상태 확인
    const initialCurrentTextDebugId = currentText ? ((currentText as PIXI.Text & { __debugId?: string }).__debugId || '없음') : 'null'
    const initialCurrentTextText = currentText?.text || 'null'
    const initialCurrentTextAddress = currentText ? String(currentText) : 'null'
    // textsRef의 모든 텍스트 객체 상태 확인
    const allTextObjectsAtStart: Array<{idx: number, address: string, debugId: string, text: string}> = []
    textsRef.current.forEach((text, idx) => {
      if (text) {
        allTextObjectsAtStart.push({
          idx,
          address: String(text),
          debugId: (text as PIXI.Text & { __debugId?: string }).__debugId || '없음',
          text: text.text || ''
        })
      }
    })
    // handleScenePartSelect에서 저장한 텍스트 객체와 비교하기 위해 저장된 텍스트 객체 주소 확인
    const savedTextObjFromHandleScenePartSelect = textsRef.current.get(sceneIndex)
    const savedTextObjAddress = savedTextObjFromHandleScenePartSelect ? String(savedTextObjFromHandleScenePartSelect) : 'null'
    const savedTextObjDebugId = savedTextObjFromHandleScenePartSelect ? ((savedTextObjFromHandleScenePartSelect as PIXI.Text & { __debugId?: string }).__debugId || '없음') : 'null'
    const savedTextObjText = savedTextObjFromHandleScenePartSelect?.text || 'null'
    const areSameObjectAtStart = currentText === savedTextObjFromHandleScenePartSelect
    fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSceneManager.ts:164',message:'updateCurrentScene 시작 - textsRef에서 가져온 텍스트 객체',data:{sceneIndex,initialCurrentTextAddress,initialCurrentTextDebugId,initialCurrentTextText,savedTextObjAddress,savedTextObjDebugId,savedTextObjText,areSameObjectAtStart,textsRefSize:textsRef.current.size,allTextObjectsAtStart},timestamp:Date.now(),sessionId:'debug-session',runId:'run50',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    // 전환 효과 완료 후 호출될 때, 수동 업데이트된 텍스트를 확인하고 유지
    // 먼저 현재 씬 인덱스의 텍스트 객체에서 디버그 ID 확인
    if (currentText) {
      const currentTextDebugId = (currentText as PIXI.Text & { __debugId?: string }).__debugId
      if (currentTextDebugId && currentTextDebugId.startsWith('text_') && currentText.text && currentText.text !== '와 대박!') {
        // 현재 씬 인덱스의 텍스트 객체가 이미 수동 업데이트된 텍스트인 경우
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSceneManager.ts:175',message:'현재 씬 인덱스의 텍스트 객체가 수동 업데이트됨',data:{sceneIndex,currentTextDebugId,currentTextText:currentText.text,currentTextAddress:String(currentText)},timestamp:Date.now(),sessionId:'debug-session',runId:'run43',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        // currentText를 그대로 사용
      } else if (currentScene.sceneId !== undefined) {
        // 현재 씬 인덱스의 텍스트 객체가 수동 업데이트되지 않은 경우, 같은 sceneId를 가진 다른 텍스트 객체 확인
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSceneManager.ts:172',message:'수동 업데이트된 텍스트 검색 시작',data:{sceneIndex,sceneId:currentScene.sceneId,currentTextDebugId:currentTextDebugId || '없음',currentTextText:currentText?.text,textsRefSize:textsRef.current.size},timestamp:Date.now(),sessionId:'debug-session',runId:'run42',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        // textsRef의 모든 텍스트 객체 확인
        const allTextObjectsInSearch: Array<{idx: number, address: string, debugId: string, text: string, sceneId: number | undefined}> = []
        textsRef.current.forEach((text, idx) => {
          if (text) {
            const textScene = timeline.scenes[idx]
            const debugId = (text as PIXI.Text & { __debugId?: string }).__debugId || '없음'
            allTextObjectsInSearch.push({
              idx,
              address: String(text),
              debugId,
              text: text.text || '',
              sceneId: textScene?.sceneId
            })
            if (textScene?.sceneId === currentScene.sceneId) {
              if (debugId && debugId.startsWith('text_') && text.text && text.text !== '와 대박!') {
                // 수동 업데이트된 텍스트를 찾음
                currentText = text
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSceneManager.ts:196',message:'전환 효과 완료 후 수동 업데이트된 텍스트 찾음',data:{sceneIndex,foundIdx:idx,debugId,textText:text.text,visible:text.visible,alpha:text.alpha,textAddress:String(text),allTextObjects:allTextObjectsInSearch},timestamp:Date.now(),sessionId:'debug-session',runId:'run46',hypothesisId:'A'})}).catch(()=>{});
                // #endregion
              }
            }
          }
        })
        // 수동 업데이트된 텍스트를 찾지 못한 경우 로깅
        if (!currentText || !((currentText as PIXI.Text & { __debugId?: string }).__debugId && (currentText as PIXI.Text & { __debugId?: string }).__debugId?.startsWith('text_'))) {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSceneManager.ts:210',message:'수동 업데이트된 텍스트를 찾지 못함',data:{sceneIndex,currentSceneId:currentScene.sceneId,allTextObjects:allTextObjectsInSearch},timestamp:Date.now(),sessionId:'debug-session',runId:'run46',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
        }
      }
    }
    
    // 스프라이트가 없으면 경고 로그 출력
    if (!currentSprite) {
    }

      // 애니메이션 스킵 시 즉시 표시
      if (skipAnimation) {
      // 전환 효과가 진행 중이면 무시 (전환 효과를 중단하지 않음)
      // activeAnimationsRef에 있는 모든 애니메이션 확인
      // Timeline이 생성되었지만 아직 시작되지 않았을 수도 있으므로, activeAnimationsRef에 있으면 무시
      let hasActiveAnimation = false
      if (activeAnimationsRef.current.has(sceneIndex)) {
        hasActiveAnimation = true
      } else {
        activeAnimationsRef.current.forEach((anim) => {
          if (anim && !anim.paused()) {
            hasActiveAnimation = true
          }
        })
      }
      
      if (hasActiveAnimation) {
        return // 로그 제거하여 콘솔 스팸 방지
      }
      
      // 이미 같은 씬이 표시되어 있으면 무시 (불필요한 렌더링 방지)
      // 단, 텍스트 내용이 변경되었을 수 있으므로 텍스트는 업데이트해야 함
      if (previousSceneIndexRef.current === sceneIndex) {
        // 현재 씬이 이미 표시되어 있고, 스프라이트도 visible하고 alpha도 1이면
        const currentSprite = spritesRef.current.get(sceneIndex)
        if (currentSprite && currentSprite.visible && currentSprite.alpha === 1) {
          // 같은 씬이 이미 표시되어 있지만, 텍스트 내용이 변경되었을 수 있으므로 텍스트만 업데이트
          // 단, isManualSceneSelectRef가 true이면 handleScenePartSelect가 처리 중이므로 여기서는 업데이트하지 않음
          if (currentText && currentScene.text?.content) {
            // playTts나 handleScenePartSelect에서 이미 특정 구간 텍스트로 업데이트했을 수 있음
            // ||| 구분자가 없으면 이미 구간 텍스트이므로 그대로 사용
            let displayText = currentScene.text.content
            
            // ||| 구분자가 있으면 그룹 내 순서에 따라 k번째 구간만 표시
            if (displayText.includes('|||')) {
              // 같은 그룹 내에서의 순서 확인 (n-k에서 k 구하기)
              if (currentScene.sceneId !== undefined) {
                // 같은 sceneId를 가진 씬들 찾기 (원본 배열 순서 유지)
                const sameGroupScenes = timeline.scenes
                  .map((s, idx) => ({ scene: s, index: idx }))
                  .filter(({ scene }) => scene.sceneId === currentScene.sceneId)
                  .sort((a, b) => a.index - b.index) // 원본 배열 순서로 정렬
                
                // 현재 씬이 그룹 내에서 몇 번째인지 확인 (k, 0-based)
                const groupIndex = sameGroupScenes.findIndex(({ index }) => index === sceneIndex)
                
                if (groupIndex >= 0) {
                  // k번째 구간 텍스트만 표시
                  const parts = displayText.split(/\s*\|\|\|\s*/).map(p => p.trim()).filter(p => p.length > 0)
                  displayText = parts[groupIndex] || ''
                } else {
                  displayText = ''
                }
              } else {
                displayText = ''
              }
            }
            // ||| 구분자가 없으면 이미 구간 텍스트이므로 그대로 사용
            
            // handleScenePartSelect에서 이미 업데이트한 텍스트가 있는지 확인
            const debugId = (currentText as PIXI.Text & { __debugId?: string }).__debugId || ''
            const isManuallyUpdated = debugId.startsWith('text_')
            
            // 수동 업데이트된 텍스트가 있고, timeline의 텍스트와 다르면 유지
            if (isManuallyUpdated && currentText.text && currentText.text !== '와 대박!' && currentText.text !== displayText) {
              // 텍스트는 유지하지만 visible과 alpha는 확실히 설정
              currentText.visible = true
              currentText.alpha = 1
            } else if (currentText.text !== displayText) {
              // 텍스트가 실제로 변경되었을 때만 업데이트
              currentText.text = displayText
              currentText.visible = displayText.length > 0
              currentText.alpha = displayText.length > 0 ? 1 : 0
            } else {
              // 텍스트는 같지만 visible과 alpha는 확실히 설정
              currentText.visible = displayText.length > 0
              currentText.alpha = displayText.length > 0 ? 1 : 0
            }
          }
          return
        }
      }
      
      // 이전 씬 숨기기
      if (previousSprite && previousIndex !== null && previousIndex !== sceneIndex) {
        previousSprite.visible = false
        previousSprite.alpha = 0
      }
      if (previousText && previousIndex !== null && previousIndex !== sceneIndex) {
        previousText.visible = false
        previousText.alpha = 0
      }
      
      // 다른 씬들 숨기기 (previousIndex가 null일 때만 모든 다른 씬을 숨김)
      // 단, 전환 효과가 완료된 후에는 이미 표시된 씬을 유지해야 하므로 previousSceneIndexRef를 확인
      if (previousIndex === null && previousSceneIndexRef.current !== sceneIndex) {
        spritesRef.current.forEach((sprite, idx) => {
          if (sprite && idx !== sceneIndex) {
            sprite.visible = false
            sprite.alpha = 0
          }
        })
        textsRef.current.forEach((text, idx) => {
          if (text && idx !== sceneIndex) {
            text.visible = false
            text.alpha = 0
          }
        })
      }
      
      // 현재 씬 표시
      if (currentSprite) {
        currentSprite.visible = true
        currentSprite.alpha = 1
      }
      if (currentText) {
        // 텍스트 내용도 업데이트 (timeline에서 읽어옴)
        // handleScenePartSelect에서 이미 텍스트를 업데이트했을 수 있으므로, timeline의 text.content를 그대로 사용
        if (currentScene.text?.content) {
          const currentTextDebugId = (currentText as PIXI.Text & { __debugId?: string }).__debugId || '없음'
          console.log(`[updateCurrentScene] 씬${sceneIndex} 텍스트 업데이트 시작: timeline="${currentScene.text.content}", 현재객체(visible=${currentText.visible}, alpha=${currentText.alpha}, text="${currentText.text}", 디버그ID=${currentTextDebugId})`)
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSceneManager.ts:201',message:'updateCurrentScene 시작',data:{sceneIndex,currentTextAddress:String(currentText),currentTextDebugId,currentTextVisible:currentText.visible,currentTextAlpha:currentText.alpha,currentTextText:currentText.text,sceneId:currentScene.sceneId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
          
          // 전환 효과 완료 후 호출될 때, 수동 업데이트된 텍스트를 확인하고 유지
          if (currentText) {
            const debugId = (currentText as PIXI.Text & { __debugId?: string }).__debugId
            const isManuallyUpdated = debugId && debugId.startsWith('text_')
            if (isManuallyUpdated && currentText.text && currentText.text !== '와 대박!') {
              // 수동 업데이트된 텍스트가 있으면 유지하고 visible과 alpha만 설정
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSceneManager.ts:295',message:'전환 효과 완료 후 수동 업데이트된 텍스트 확인',data:{sceneIndex,debugId,textText:currentText.text,visible:currentText.visible,alpha:currentText.alpha},timestamp:Date.now(),sessionId:'debug-session',runId:'run28',hypothesisId:'A'})}).catch(()=>{});
              // #endregion
              currentText.visible = true
              currentText.alpha = 1
              // 스프라이트도 표시
              if (currentSprite) {
                currentSprite.visible = true
                currentSprite.alpha = 1
              }
              if (appRef.current) {
                appRef.current.render()
              }
              previousSceneIndexRef.current = sceneIndex
              return
            }
          }
          
          // handleScenePartSelect에서 이미 텍스트를 업데이트했는지 확인
          // 모든 텍스트 객체를 확인하여 visible하고 alpha가 0보다 크고, 텍스트가 "와 대박!"이 아닌 객체를 찾음
          let alreadyUpdatedText: PIXI.Text | null = null
          // #region agent log
          const allTextObjectsForCheck: Array<{idx: number, address: string, text: string, visible: boolean, alpha: number, sceneId: number | undefined}> = []
          textsRef.current.forEach((text, idx) => {
            if (text) {
              const textScene = timeline.scenes[idx]
              allTextObjectsForCheck.push({
                idx,
                address: String(text),
                text: text.text || '',
                visible: text.visible,
                alpha: text.alpha,
                sceneId: textScene?.sceneId
              })
            }
          })
          fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSceneManager.ts:232',message:'이미 업데이트된 텍스트 검색 시작',data:{sceneIndex,currentSceneText:currentScene.text.content,allTextObjects:allTextObjectsForCheck},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'J'})}).catch(()=>{});
          // #endregion
          // 먼저 __debugId가 있는 텍스트 객체를 찾음 (handleScenePartSelect에서 설정한 객체)
          // #region agent log
          const debugIdCheckResults: Array<{idx: number, hasText: boolean, debugId: string | undefined, text: string, visible: boolean, alpha: number}> = []
          textsRef.current.forEach((text, idx) => {
            if (text && idx === sceneIndex) {
              const debugId = (text as PIXI.Text & { __debugId?: string }).__debugId
              debugIdCheckResults.push({
                idx,
                hasText: !!text,
                debugId: debugId || undefined,
                text: text.text || '',
                visible: text.visible,
                alpha: text.alpha
              })
            }
          })
          fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSceneManager.ts:250',message:'디버그 ID 검색 전 텍스트 객체 상태',data:{sceneIndex,debugIdCheckResults},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'J'})}).catch(()=>{});
          // #endregion
          textsRef.current.forEach((text, idx) => {
            if (text && idx === sceneIndex) {
              const debugId = (text as PIXI.Text & { __debugId?: string }).__debugId
              const startsWithCheck = debugId ? debugId.startsWith(`text_${sceneIndex}_`) : false
              const textCheck = text.text ? (text.text !== '와 대박!' && text.text !== currentScene.text.content) : false
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSceneManager.ts:264',message:'디버그 ID 확인',data:{sceneIndex,idx,hasText:!!text,debugId:debugId || '없음',text:text.text || '',visible:text.visible,alpha:text.alpha,startsWithCheck,textCheck},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'J'})}).catch(()=>{});
              // #endregion
              if (debugId && startsWithCheck) {
                // handleScenePartSelect에서 설정한 텍스트 객체를 찾음
                if (textCheck) {
                  alreadyUpdatedText = text
                  console.log(`[updateCurrentScene] ✅ 디버그 ID로 이미 업데이트된 텍스트 객체 찾음: 씬${idx}, text="${text.text}", debugId="${debugId}"`)
                  // #region agent log
                  fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSceneManager.ts:270',message:'디버그 ID로 이미 업데이트된 텍스트 객체 찾음',data:{sceneIndex,foundIdx:idx,currentText:text.text,timelineText:currentScene.text.content,visible:text.visible,alpha:text.alpha,debugId},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'J'})}).catch(()=>{});
                  // #endregion
                  return
                }
              }
            }
          })
          
          // 디버그 ID로 찾지 못한 경우, visible과 alpha 조건으로 찾음
          if (!alreadyUpdatedText) {
            textsRef.current.forEach((text, idx) => {
              if (text && text.visible && text.alpha > 0 && text.text && text.text !== '와 대박!' && text.text !== currentScene.text.content) {
                const textScene = timeline.scenes[idx]
                if (textScene?.sceneId === currentScene.sceneId || idx === sceneIndex) {
                  alreadyUpdatedText = text
                  console.log(`[updateCurrentScene] ✅ 이미 업데이트된 텍스트 객체 찾음: 씬${idx}, text="${text.text}"`)
                  // #region agent log
                  fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSceneManager.ts:268',message:'이미 업데이트된 텍스트 객체 찾음',data:{sceneIndex,foundIdx:idx,currentText:text.text,timelineText:currentScene.text.content,visible:text.visible,alpha:text.alpha},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'J'})}).catch(()=>{});
                  // #endregion
                }
              }
            })
          }
          
          if (alreadyUpdatedText !== null) {
            const updatedText: PIXI.Text = alreadyUpdatedText
            console.log(`[updateCurrentScene] ⏭️ 이미 업데이트된 텍스트 유지: "${updatedText.text}" (timeline: "${currentScene.text.content}")`)
            // 텍스트는 유지하지만 visible과 alpha는 확실히 설정
            updatedText.visible = true
            updatedText.alpha = 1
            // 스프라이트도 표시
            if (currentSprite) {
              currentSprite.visible = true
              currentSprite.alpha = 1
            }
            if (appRef.current) {
              appRef.current.render()
            }
            previousSceneIndexRef.current = sceneIndex
            return
          }
          
          // 같은 그룹 내 씬인 경우, 실제로 표시되고 있는 텍스트 객체를 찾아서 업데이트
          let textToUpdate = currentText
          if (currentScene.sceneId !== undefined) {
            // 같은 그룹 내 씬들은 첫 번째 씬의 텍스트 객체를 공유할 수 있음
            // 실제로 표시되고 있는 텍스트 객체 찾기 (visible=true, alpha>0)
            let visibleText: PIXI.Text | null = null
            textsRef.current.forEach((text, idx) => {
              if (text && text.visible && text.alpha > 0) {
                const textScene = timeline.scenes[idx]
                if (textScene?.sceneId === currentScene.sceneId) {
                  visibleText = text
                  const debugId = (text as PIXI.Text & { __debugId?: string }).__debugId || '없음'
                  console.log(`[updateCurrentScene] ✅ 표시 중인 텍스트 객체 찾음: 씬${idx}, 디버그ID=${debugId}`)
                }
              }
            })
            
            // 먼저 디버그 ID가 있는 객체를 찾기 (handleScenePartSelect에서 업데이트한 객체)
            // 이렇게 하면 visible 상태와 관계없이 최근에 업데이트된 객체를 찾을 수 있음
            let textWithDebugId: PIXI.Text | null = null
            let maxDebugId: string = ''
            
            console.log(`[updateCurrentScene] 디버그 ID 검색 시작 (sceneId: ${currentScene.sceneId})`)
            // #region agent log
            const allTextObjectsInUpdate: Array<{idx: number, address: string, debugId: string, sceneId: number | undefined}> = []
            textsRef.current.forEach((text, idx) => {
              if (text) {
                const textScene = timeline.scenes[idx]
                allTextObjectsInUpdate.push({
                  idx,
                  address: String(text),
                  debugId: (text as PIXI.Text & { __debugId?: string }).__debugId || '없음',
                  sceneId: textScene?.sceneId
                })
              }
            })
            fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSceneManager.ts:225',message:'디버그 ID 검색 시작',data:{sceneId:currentScene.sceneId,textsRefSize:textsRef.current.size,allTextObjectsInUpdate},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'E'})}).catch(()=>{});
            // #endregion
            textsRef.current.forEach((text, idx) => {
              if (text) {
                const textScene = timeline.scenes[idx]
                const debugId = (text as PIXI.Text & { __debugId?: string }).__debugId
                console.log(`[updateCurrentScene] 텍스트 객체 확인: 씬${idx}, sceneId=${textScene?.sceneId}, 디버그ID=${debugId || '없음'}, visible=${text.visible}, alpha=${text.alpha}`)
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSceneManager.ts:230',message:'텍스트 객체 확인',data:{idx,textAddress:String(text),textSceneId:textScene?.sceneId,debugId:debugId || '없음',visible:text.visible,alpha:text.alpha,matchesSceneId:textScene?.sceneId === currentScene.sceneId},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'E'})}).catch(()=>{});
                // #endregion
                if (textScene?.sceneId === currentScene.sceneId) {
                  if (debugId && debugId.startsWith('text_')) {
                    // 가장 최근에 업데이트된 객체를 찾기 위해 타임스탬프 비교
                    if (debugId > maxDebugId) {
                      maxDebugId = debugId
                      textWithDebugId = text
                      console.log(`[updateCurrentScene] 디버그 ID 매칭: 씬${idx}, 디버그ID=${debugId}`)
                      // #region agent log
                      fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSceneManager.ts:237',message:'디버그 ID 매칭 발견',data:{idx,textAddress:String(text),debugId,maxDebugId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
                      // #endregion
                    }
                  }
                }
              }
            })
            console.log(`[updateCurrentScene] 디버그 ID 검색 완료: 찾은 객체=${textWithDebugId !== null ? '있음' : '없음'}, 최대 디버그ID=${maxDebugId || '없음'}`)
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSceneManager.ts:243',message:'디버그 ID 검색 완료',data:{found:textWithDebugId !== null,textWithDebugIdAddress:textWithDebugId ? String(textWithDebugId) : null,maxDebugId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
            // #endregion
            
            if (textWithDebugId !== null) {
              // 디버그 ID가 있는 객체를 우선 사용
              const debugText = textWithDebugId as PIXI.Text
              textToUpdate = debugText
              const debugId = (debugText as PIXI.Text & { __debugId?: string }).__debugId || '없음'
              console.log(`[updateCurrentScene] ✅ 디버그 ID가 있는 텍스트 객체 찾음: 디버그ID=${debugId}, visible=${debugText.visible}, alpha=${debugText.alpha}, text="${debugText.text}"`)
            } else if (visibleText) {
              // 디버그 ID가 없으면 visible한 텍스트 객체 사용
              textToUpdate = visibleText
              const debugId = (visibleText as PIXI.Text & { __debugId?: string }).__debugId || '없음'
              console.log(`[updateCurrentScene] ✅ 표시 중인 텍스트 객체 찾음: 디버그ID=${debugId}`)
            } else {
              // 디버그 ID가 있는 객체도 없고 visible한 객체도 없으면, 같은 그룹 내 첫 번째 씬의 텍스트 객체 사용
              const firstSceneIndexInGroup = timeline.scenes.findIndex((s) => s.sceneId === currentScene.sceneId)
              if (firstSceneIndexInGroup >= 0) {
                const firstText = textsRef.current.get(firstSceneIndexInGroup)
                if (firstText) {
                  textToUpdate = firstText
                  const debugId = (firstText as PIXI.Text & { __debugId?: string }).__debugId || '없음'
                  console.log(`[updateCurrentScene] ⚠️ 표시 중인 객체 없음, 첫번째 씬${firstSceneIndexInGroup} 사용, 디버그ID=${debugId}`)
                }
              }
            }
          }
          
          let displayText = currentScene.text.content
          
          // ||| 구분자가 있으면 그룹 내 순서에 따라 k번째 구간만 표시
          // 단, handleScenePartSelect에서 이미 구간 텍스트로 업데이트했을 수 있으므로 |||가 없으면 그대로 사용
          if (displayText.includes('|||')) {
            console.log(`[updateCurrentScene] ||| 구분자 발견, 그룹 내 순서 계산 중...`)
            // 같은 그룹 내에서의 순서 확인 (n-k에서 k 구하기)
            if (currentScene.sceneId !== undefined) {
              // 같은 sceneId를 가진 씬들 찾기 (원본 배열 순서 유지)
              const sameGroupScenes = timeline.scenes
                .map((s, idx) => ({ scene: s, index: idx }))
                .filter(({ scene }) => scene.sceneId === currentScene.sceneId)
                .sort((a, b) => a.index - b.index) // 원본 배열 순서로 정렬
              
              // 현재 씬이 그룹 내에서 몇 번째인지 확인 (k, 0-based)
              const groupIndex = sameGroupScenes.findIndex(({ index }) => index === sceneIndex)
              
              console.log(`[updateCurrentScene] 같은 그룹 씬 개수: ${sameGroupScenes.length}, 현재 씬의 그룹 인덱스: ${groupIndex}`)
              
              if (groupIndex >= 0) {
                // k번째 구간 텍스트만 표시
                const parts = displayText.split(/\s*\|\|\|\s*/).map(p => p.trim()).filter(p => p.length > 0)
                displayText = parts[groupIndex] || ''
                console.log(`[updateCurrentScene] 그룹 인덱스 ${groupIndex}에 해당하는 구간 텍스트: "${displayText}"`)
              } else {
                displayText = ''
                console.log(`[updateCurrentScene] 그룹 인덱스를 찾을 수 없음, 빈 텍스트로 설정`)
              }
            } else {
              displayText = ''
              console.log(`[updateCurrentScene] sceneId가 undefined, 빈 텍스트로 설정`)
            }
          } else {
            console.log(`[updateCurrentScene] ||| 구분자 없음, timeline의 텍스트 그대로 사용: "${displayText}"`)
          }
          // ||| 구분자가 없으면 이미 구간 텍스트이므로 그대로 사용
          
          // 실제로 표시되고 있는 텍스트 객체 업데이트
          const textToUpdateDebugId = (textToUpdate as PIXI.Text & { __debugId?: string }).__debugId || '없음'
          const isManuallyUpdated = textToUpdateDebugId.startsWith('text_')
          
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSceneManager.ts:345',message:'텍스트 업데이트 전 상태 확인',data:{sceneIndex,currentText:textToUpdate.text,displayText,debugId:textToUpdateDebugId,isManuallyUpdated,visible:textToUpdate.visible,alpha:textToUpdate.alpha},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'I'})}).catch(()=>{});
          // #endregion
          
          // handleScenePartSelect에서 이미 업데이트한 텍스트가 있고, timeline의 텍스트와 다르면
          // 이미 업데이트된 텍스트를 유지 (timeline이 아직 업데이트되지 않았을 수 있음)
          if (isManuallyUpdated && textToUpdate.text && textToUpdate.text !== '와 대박!' && textToUpdate.text !== displayText) {
            console.log(`[updateCurrentScene] ⏭️ 수동 업데이트된 텍스트 유지: "${textToUpdate.text}" (timeline: "${displayText}")`)
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSceneManager.ts:352',message:'수동 업데이트된 텍스트 유지',data:{sceneIndex,currentText:textToUpdate.text,timelineText:displayText,debugId:textToUpdateDebugId},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'I'})}).catch(()=>{});
            // #endregion
            // 텍스트는 유지하지만 visible과 alpha는 확실히 설정
            textToUpdate.visible = true
            textToUpdate.alpha = 1
          } else if (textToUpdate.text !== displayText) {
            console.log(`[updateCurrentScene] ✅ 텍스트 업데이트: "${textToUpdate.text}" -> "${displayText}" (디버그ID: ${textToUpdateDebugId})`)
            textToUpdate.text = displayText
            textToUpdate.visible = displayText.length > 0
            textToUpdate.alpha = displayText.length > 0 ? 1 : 0
          } else {
            console.log(`[updateCurrentScene] ⏭️ 텍스트 변경 없음: "${textToUpdate.text}" (디버그ID: ${textToUpdateDebugId})`)
            textToUpdate.visible = displayText.length > 0
            textToUpdate.alpha = displayText.length > 0 ? 1 : 0
          }
        }
      }
      if (appRef.current) {
        appRef.current.render()
      }
      previousSceneIndexRef.current = sceneIndex
      return
    }
    
    // 전환 효과 적용을 위한 wrappedOnComplete 미리 정의
    // 같은 그룹 내 씬 전환 시에도 호출할 수 있도록 상위 스코프에서 정의
    // toText 객체를 전달받아서 사용할 수 있도록 수정
    let savedToText: PIXI.Text | null = null
    const wrappedOnComplete = onAnimationComplete ? (toTextFromEffect?: PIXI.Text | null) => {
      // applyEnterEffect에서 전달된 toText 객체 사용
      const textToUse = toTextFromEffect || savedToText
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSceneManager.ts:608',message:'wrappedOnComplete 시작 - toTextFromEffect 확인',data:{sceneIndex,toTextFromEffectAddress:toTextFromEffect ? String(toTextFromEffect) : 'null',toTextFromEffectDebugId:toTextFromEffect ? ((toTextFromEffect as PIXI.Text & { __debugId?: string }).__debugId || '없음') : 'null',toTextFromEffectText:toTextFromEffect?.text || 'null',savedToTextAddress:savedToText ? String(savedToText) : 'null',textToUseAddress:textToUse ? String(textToUse) : 'null'},timestamp:Date.now(),sessionId:'debug-session',runId:'run37',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      // 전환 효과 완료 후 이전 씬 숨기기
      if (!skipAnimation && previousIndex !== null && previousIndex !== sceneIndex) {
        const prevSprite = spritesRef.current.get(previousIndex)
        const prevText = textsRef.current.get(previousIndex)
        
        if (prevSprite) {
          prevSprite.visible = false
          prevSprite.alpha = 0
        }
        
        if (prevText) {
          prevText.visible = false
          prevText.alpha = 0
        }
      }
      
      // 이전 씬이 없거나 null인 경우에도 다른 모든 씬들을 다시 한 번 확인하여 숨김
      spritesRef.current.forEach((sprite, idx) => {
        if (sprite && idx !== sceneIndex) {
          sprite.visible = false
          sprite.alpha = 0
        }
      })
      textsRef.current.forEach((text, idx) => {
        if (text && idx !== sceneIndex) {
          text.visible = false
          text.alpha = 0
        }
      })
      
      // 전환 효과 완료 후 handleScenePartSelect에서 설정한 텍스트 복원
      // applyEnterEffect에서 전달된 toText 객체를 우선 사용
      const currentText = textToUse || textsRef.current.get(sceneIndex)
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSceneManager.ts:642',message:'wrappedOnComplete currentText 결정',data:{sceneIndex,textToUseAddress:textToUse ? String(textToUse) : 'null',textToUseDebugId:textToUse ? ((textToUse as PIXI.Text & { __debugId?: string }).__debugId || '없음') : 'null',textToUseText:textToUse?.text || 'null',currentTextAddress:currentText ? String(currentText) : 'null',currentTextDebugId:currentText ? ((currentText as PIXI.Text & { __debugId?: string }).__debugId || '없음') : 'null',currentTextText:currentText?.text || 'null'},timestamp:Date.now(),sessionId:'debug-session',runId:'run37',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      // #region agent log
      const allTextObjectsInWrappedOnComplete: Array<{idx: number, address: string, debugId: string, text: string, visible: boolean, alpha: number}> = []
      textsRef.current.forEach((text, idx) => {
        if (text) {
          allTextObjectsInWrappedOnComplete.push({
            idx,
            address: String(text),
            debugId: (text as PIXI.Text & { __debugId?: string }).__debugId || '없음',
            text: text.text || '',
            visible: text.visible,
            alpha: text.alpha
          })
        }
      })
      // applyEnterEffect에서 전달된 toText 객체를 찾기 위해 currentText와 비교
      // 같은 sceneIndex의 텍스트 객체가 여러 개일 수 있으므로 주소 비교
      // 하지만 toText 객체는 applyEnterEffect의 클로저에 있으므로 직접 접근할 수 없음
      // 대신 textsRef에서 같은 sceneId를 가진 모든 텍스트 객체를 확인하여 디버그 ID가 있는 것을 찾음
      fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSceneManager.ts:636',message:'wrappedOnComplete 시작 - 모든 텍스트 객체 상태',data:{sceneIndex,currentTextAddress:String(currentText),currentTextDebugId:(currentText as PIXI.Text & { __debugId?: string }).__debugId || '없음',currentTextText:currentText?.text,allTextObjects:allTextObjectsInWrappedOnComplete},timestamp:Date.now(),sessionId:'debug-session',runId:'run34',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      if (currentText && currentScene.sceneId !== undefined) {
        // currentText가 이미 applyEnterEffect에서 전달된 toText 객체이므로 직접 사용
        const targetTextObj = currentText
        const debugId = (targetTextObj as PIXI.Text & { __debugId?: string }).__debugId
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSceneManager.ts:666',message:'wrappedOnComplete currentText 직접 사용',data:{sceneIndex,targetTextObjAddress:String(targetTextObj),debugId:debugId || '없음',textText:targetTextObj.text},timestamp:Date.now(),sessionId:'debug-session',runId:'run38',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        // 디버그 ID가 있고, 텍스트가 timeline의 첫 번째 구간과 다르면 복원
        if (debugId && debugId.startsWith('text_')) {
          const timelineFirstPart = currentScene.text?.content?.split(/\s*\|\|\|\s*/)[0]?.trim() || ''
          if (targetTextObj.text && targetTextObj.text !== '와 대박!' && targetTextObj.text !== timelineFirstPart) {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSceneManager.ts:673',message:'전환 효과 완료 후 수동 업데이트된 텍스트 복원',data:{sceneIndex,targetTextObjAddress:String(targetTextObj),debugId,textText:targetTextObj.text,timelineFirstPart},timestamp:Date.now(),sessionId:'debug-session',runId:'run38',hypothesisId:'A'})}).catch(()=>{});
            // #endregion
            // 텍스트는 이미 설정되어 있으므로 visible과 alpha만 확인
            if (!targetTextObj.visible || targetTextObj.alpha < 1) {
              targetTextObj.visible = true
              targetTextObj.alpha = 1
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSceneManager.ts:677',message:'텍스트 visible/alpha 설정',data:{sceneIndex,targetTextObjAddress:String(targetTextObj),debugId,textText:targetTextObj.text,visible:targetTextObj.visible,alpha:targetTextObj.alpha},timestamp:Date.now(),sessionId:'debug-session',runId:'run41',hypothesisId:'A'})}).catch(()=>{});
              // #endregion
            }
            // textsRef에 올바른 텍스트 객체를 저장하여 이후 updateCurrentScene 호출 시 올바른 객체를 사용하도록 함
            const targetTextObjAddressBeforeSet = String(targetTextObj)
            const targetTextObjDebugIdBeforeSet = debugId || '없음'
            textsRef.current.set(sceneIndex, targetTextObj)
            // 저장 후 확인
            const savedTextObj = textsRef.current.get(sceneIndex)
            const savedTextObjDebugId = savedTextObj ? ((savedTextObj as PIXI.Text & { __debugId?: string }).__debugId || '없음') : 'null'
            const savedTextObjText = savedTextObj?.text || 'null'
            const savedTextObjAddress = savedTextObj ? String(savedTextObj) : 'null'
            const areSameObject = targetTextObj === savedTextObj
            // 저장 후 textsRef의 모든 텍스트 객체 상태 확인
            const allTextObjectsAfterSet: Array<{idx: number, address: string, debugId: string, text: string}> = []
            textsRef.current.forEach((text, idx) => {
              if (text) {
                allTextObjectsAfterSet.push({
                  idx,
                  address: String(text),
                  debugId: (text as PIXI.Text & { __debugId?: string }).__debugId || '없음',
                  text: text.text || ''
                })
              }
            })
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSceneManager.ts:722',message:'textsRef에 텍스트 객체 저장',data:{sceneIndex,targetTextObjAddressBeforeSet,savedTextObjAddress,targetTextObjDebugIdBeforeSet,savedTextObjDebugId,savedTextObjText,areSameObject,debugId,textText:targetTextObj.text,textsRefSize:textsRef.current.size,allTextObjectsAfterSet},timestamp:Date.now(),sessionId:'debug-session',runId:'run47',hypothesisId:'A'})}).catch(()=>{});
            // #endregion
          }
        }
      }
      
      // 최종 렌더링
      if (appRef.current) {
        appRef.current.render()
        // #region agent log
        // 렌더링 후 텍스트 상태 확인 (targetTextObj 사용)
        if (currentText && currentScene.sceneId !== undefined) {
          const debugId = (currentText as PIXI.Text & { __debugId?: string }).__debugId
          if (debugId && debugId.startsWith('text_')) {
            fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSceneManager.ts:695',message:'렌더링 후 텍스트 상태',data:{sceneIndex,currentTextAddress:String(currentText),currentTextDebugId:debugId || '없음',currentTextText:currentText.text,currentTextVisible:currentText.visible,currentTextAlpha:currentText.alpha},timestamp:Date.now(),sessionId:'debug-session',runId:'run40',hypothesisId:'A'})}).catch(()=>{});
          }
        }
        // #endregion
      }
      
      // 원래 onAnimationComplete 콜백 호출
      onAnimationComplete(sceneIndex)
    } : (() => {
      // onAnimationComplete가 없어도 이전 씬을 숨겨야 함
      if (!skipAnimation && previousIndex !== null && previousIndex !== sceneIndex) {
        const prevSprite = spritesRef.current.get(previousIndex)
        const prevText = textsRef.current.get(previousIndex)
        
        if (prevSprite) {
          prevSprite.visible = false
          prevSprite.alpha = 0
        }
        
        if (prevText) {
          prevText.visible = false
          prevText.alpha = 0
        }
        
        // 다른 모든 씬들도 숨김
        spritesRef.current.forEach((sprite, idx) => {
          if (sprite && idx !== sceneIndex) {
            sprite.visible = false
            sprite.alpha = 0
          }
        })
        textsRef.current.forEach((text, idx) => {
          if (text && idx !== sceneIndex) {
            text.visible = false
            text.alpha = 0
          }
        })
        
        if (appRef.current) {
          appRef.current.render()
        }
      }
    })
    
    // 현재 씬 등장 효과 적용
    if (currentSprite) {
      // 그룹의 첫 번째 씬 찾기 (같은 sceneId를 가진 씬들 중 첫 번째)
      const firstSceneIndex = currentScene.sceneId !== undefined 
        ? timeline.scenes.findIndex((s) => s.sceneId === currentScene.sceneId)
        : -1
      const firstSceneSprite = firstSceneIndex >= 0 ? spritesRef.current.get(firstSceneIndex) : null
      const isFirstSceneInGroup = firstSceneIndex === sceneIndex
      
      // 같은 그룹 내 씬인지 확인 (이전 씬이 같은 그룹인 경우 또는 같은 씬 내 구간 전환)
      const previousScene = previousIndex !== null ? timeline.scenes[previousIndex] : null
      // 같은 씬 내 구간 전환도 같은 그룹으로 처리 (previousIndex === sceneIndex인 경우)
      const isInSameGroup = firstSceneIndex >= 0 && 
                            currentScene.sceneId !== undefined && 
                            previousIndex !== null &&
                            previousScene !== null &&
                            (previousScene.sceneId === currentScene.sceneId || previousIndex === sceneIndex)
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSceneManager.ts:640',message:'같은 그룹 확인',data:{sceneIndex,previousIndex,currentSceneId:currentScene.sceneId,previousSceneId:previousScene?.sceneId,firstSceneIndex,isInSameGroup,isFirstSceneInGroup},timestamp:Date.now(),sessionId:'debug-session',runId:'run7',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      // 같은 그룹 내 씬들은 항상 첫 번째 씬의 스프라이트 사용
      // 같은 그룹 내 씬인 경우 (이전 씬이 같은 그룹이거나 첫 번째 씬인 경우)
      let spriteToUse = currentSprite
      if (firstSceneIndex >= 0 && currentScene.sceneId !== undefined) {
        // 같은 그룹 내 씬인 경우 항상 첫 번째 씬의 스프라이트 사용
        const firstSprite = spritesRef.current.get(firstSceneIndex)
        if (firstSprite) {
          spriteToUse = firstSprite
        }
      }
      
      // transition 결정
      // 같은 그룹 내 씬들은 첫 번째 씬의 transition과 transitionDuration을 공유
      // 각 씬은 자신의 duration만큼만 전환 효과 사용
      let transition: string
      let transitionDuration: number
      
      if (firstSceneIndex >= 0 && currentScene.sceneId !== undefined) {
        // 같은 그룹 내 씬: 첫 번째 씬의 transition과 transitionDuration 사용
        const firstSceneInGroup = timeline.scenes[firstSceneIndex]
        transition = forceTransition || firstSceneInGroup?.transition || 'fade'
        
        // 각 씬은 자신의 duration만큼만 전환 효과 사용
        transitionDuration = currentScene.duration && currentScene.duration > 0
          ? currentScene.duration
          : 0.5
      } else {
        // 다른 그룹으로 넘어가는 경우
        transition = forceTransition || currentScene.transition || 'fade'
        transitionDuration = currentScene.transitionDuration && currentScene.transitionDuration > 0
          ? currentScene.transitionDuration
          : 0.5
      }
      
      const { width, height } = stageDimensions
      
      // transition이 'none'이면 애니메이션 없이 즉시 표시
      if (transition === 'none') {
        // 이전 씬 숨기기
        if (previousSprite && previousIndex !== null && previousIndex !== sceneIndex) {
          previousSprite.visible = false
          previousSprite.alpha = 0
        }
        if (previousText && previousIndex !== null && previousIndex !== sceneIndex) {
          previousText.visible = false
          previousText.alpha = 0
        }
        
        // 현재 씬 표시
        if (currentSprite.parent !== containerRef.current) {
          if (currentSprite.parent) {
            currentSprite.parent.removeChild(currentSprite)
          }
          containerRef.current.addChild(currentSprite)
        }
        currentSprite.visible = true
        currentSprite.alpha = 1
        
        if (currentText) {
          if (currentText.parent !== containerRef.current) {
            if (currentText.parent) {
              currentText.parent.removeChild(currentText)
            }
            containerRef.current.addChild(currentText)
          }
          currentText.visible = true
          currentText.alpha = 1
        }
        
        if (appRef.current) {
          appRef.current.render()
        }
        
        previousSceneIndexRef.current = sceneIndex
        
        setTimeout(() => {
          wrappedOnComplete(currentText || null)
        }, 50)
        
        return
      }
      
      // 현재 씬을 컨테이너에 추가
      if (!containerRef.current) {
        console.error(`[updateCurrentScene] containerRef.current가 null - sceneIndex: ${sceneIndex}`)
        return
      }
      
      // 같은 그룹 내에서는 첫 번째 씬의 스프라이트 사용
      // 같은 그룹 내 씬인 경우 먼저 spriteToUse를 확실히 표시하여 검은 화면 방지
      if (isInSameGroup) {
        // 컨테이너에 추가되어 있는지 확인
        if (spriteToUse.parent !== containerRef.current) {
          if (spriteToUse.parent) {
            spriteToUse.parent.removeChild(spriteToUse)
          }
          containerRef.current.addChild(spriteToUse)
        }
        // 즉시 visible/alpha 설정하여 검은 화면 방지
        spriteToUse.visible = true
        spriteToUse.alpha = 1
        // 먼저 렌더링하여 이미지가 보이도록 보장
        if (appRef.current) {
          appRef.current.render()
        }
      } else {
        // 다른 그룹인 경우
        if (spriteToUse.parent !== containerRef.current) {
          if (spriteToUse.parent) {
            spriteToUse.parent.removeChild(spriteToUse)
          }
          containerRef.current.addChild(spriteToUse)
        }
      }
      
      // 현재 씬의 스프라이트는 숨기기 (같은 그룹 내에서는 첫 번째 씬의 스프라이트만 사용)
      // 같은 그룹 내 씬인 경우 currentSprite를 숨기지 않음 (spriteToUse와 같을 수 있음)
      if (currentSprite && currentSprite !== spriteToUse) {
        // 같은 그룹 내 씬인 경우 currentSprite가 spriteToUse와 다르더라도 숨기지 않음
        // 왜냐하면 같은 그룹 내에서는 spriteToUse만 사용하므로
        if (!isInSameGroup) {
          currentSprite.visible = false
          currentSprite.alpha = 0
        }
      }
      
      if (currentText && currentText.parent !== containerRef.current) {
        if (currentText.parent) {
          currentText.parent.removeChild(currentText)
        }
        containerRef.current.addChild(currentText)
      }
      
      // 모든 다른 씬들 숨기기
      // 같은 그룹 내 씬인 경우 spriteToUse(firstSceneSprite)는 절대 숨기지 않음
      spritesRef.current.forEach((sprite, idx) => {
        if (!sprite) return
        
        // spriteToUse는 절대 숨기지 않음
        if (sprite === spriteToUse) {
          return
        }
        
        // 같은 그룹 내 씬인 경우 firstSceneSprite도 절대 숨기지 않음
        if (isInSameGroup && firstSceneSprite && sprite === firstSceneSprite) {
          return
        }
        
        // 현재 씬 인덱스가 아니고 spriteToUse가 아닌 경우에만 숨기기
        if (idx !== sceneIndex) {
          sprite.visible = false
          sprite.alpha = 0
        }
      })
      textsRef.current.forEach((text, idx) => {
        if (text && idx !== sceneIndex) {
          text.visible = false
          text.alpha = 0
        }
      })
      
      // 현재 씬 visible 설정 및 alpha 초기화
      // 같은 그룹 내 씬이 아닌 경우에만 alpha를 0으로 설정 (전환 효과를 위해)
      if (!isInSameGroup) {
        spriteToUse.visible = true
        spriteToUse.alpha = 0
      }
      // 같은 그룹 내 씬인 경우는 위에서 이미 설정했으므로 여기서는 건드리지 않음
      
      if (currentText) {
        currentText.visible = true
        currentText.alpha = 0
      }

      // 고급 효과 적용
      if (currentScene.advancedEffects) {
        applyAdvancedEffects(spriteToUse, sceneIndex, currentScene.advancedEffects)
      }
      
      // 고급 효과 적용 후에도 스프라이트가 컨테이너에 있는지 확인
      if (!spriteToUse.parent && containerRef.current) {
        containerRef.current.addChild(spriteToUse)
      }
      if (currentText && !currentText.parent && containerRef.current) {
        containerRef.current.addChild(currentText)
      }

      // 전환 효과 적용 전에 한 번 렌더링
      if (appRef.current) {
        appRef.current.render()
      }
      
      // "움직임" 효과인 경우 그룹의 첫 번째 씬인지 확인
      const isCurrentTransitionMovement = MOVEMENT_EFFECTS.includes(transition)
      const isFirstInGroup = isCurrentTransitionMovement && currentScene.sceneId && isFirstSceneInGroup
      
      // 그룹이 끝나고 다음 그룹으로 넘어갈 때 이전 그룹의 Timeline 정리
      if (previousScene && previousScene.sceneId !== currentScene.sceneId) {
        const previousGroupTimeline = groupTransitionTimelinesRef.current.get(previousScene.sceneId)
        if (previousGroupTimeline) {
          previousGroupTimeline.kill()
          groupTransitionTimelinesRef.current.delete(previousScene.sceneId)
        }
      }
      
      // 전환 효과 적용
      // 같은 그룹 내 씬인 경우: 같은 이미지와 전환 효과를 공유하고 자막만 변경
      // 같은 씬 내 구간 전환(previousIndex === sceneIndex)도 자막만 변경
      const isSameScenePartTransition = previousIndex === sceneIndex && currentScene.sceneId !== undefined
      if ((isInSameGroup && !isFirstSceneInGroup) || isSameScenePartTransition) {
        // 같은 그룹 내 씬: 이미지와 전환 효과는 첫 번째 씬에서 이미 적용됨, 자막만 변경
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSceneManager.ts:856',message:'같은 그룹 내 씬 전환 또는 같은 씬 내 구간 전환 - 자막만 변경',data:{sceneIndex,previousIndex,firstSceneIndex,isInSameGroup,isFirstSceneInGroup,isSameScenePartTransition,hasCurrentText:!!currentText,currentTextText:currentText?.text,currentSceneId:currentScene.sceneId},timestamp:Date.now(),sessionId:'debug-session',runId:'run7',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        
        // 같은 그룹 내 씬 전환 시 실제로 표시되고 있는 텍스트 객체 찾기
        // handleScenePartSelect에서 이미 업데이트한 텍스트 객체를 우선 찾기
        let textToUpdate = currentText
        if (currentScene.sceneId !== undefined) {
          // 디버그 ID가 있는 객체를 먼저 찾기 (handleScenePartSelect에서 업데이트한 객체)
          // 같은 씬 내 구간 전환 시 sceneId 조건 없이도 찾을 수 있도록 개선
          let textWithDebugId: PIXI.Text | null = null
          let maxDebugId: string = ''
          // #region agent log
          const allTextObjectsForDebugId: Array<{idx: number, debugId: string, text: string, sceneId: number | undefined, matchesSceneId: boolean, matchesIndex: boolean, address: string}> = []
          const debugIdSearchResults: Array<{idx: number, debugId: string, text: string, sceneId: number | undefined, matchesSceneId: boolean}> = []
          // #endregion
          textsRef.current.forEach((text, idx) => {
            if (text) {
              const textScene = timeline.scenes[idx]
              const debugId = (text as PIXI.Text & { __debugId?: string }).__debugId
              const matchesSceneId = textScene?.sceneId === currentScene.sceneId
              const matchesIndex = idx === sceneIndex
              // #region agent log
              allTextObjectsForDebugId.push({
                idx,
                debugId: debugId || '없음',
                text: text.text || '',
                sceneId: textScene?.sceneId,
                matchesSceneId,
                matchesIndex,
                address: String(text)
              })
              if (debugId && debugId.startsWith('text_')) {
                debugIdSearchResults.push({
                  idx,
                  debugId,
                  text: text.text || '',
                  sceneId: textScene?.sceneId,
                  matchesSceneId
                })
              }
              // #endregion
              // 같은 씬 내 구간 전환 시 sceneId 조건 없이도 찾을 수 있도록 개선
              // 같은 씬 인덱스이거나 같은 sceneId를 가진 경우
              if (matchesIndex || matchesSceneId) {
                if (debugId && debugId.startsWith('text_')) {
                  if (debugId > maxDebugId) {
                    maxDebugId = debugId
                    textWithDebugId = text
                  }
                }
              }
            }
          })
          // #region agent log
          const textWithDebugIdText = textWithDebugId ? (textWithDebugId as PIXI.Text).text || '' : ''
          fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSceneManager.ts:895',message:'디버그 ID 검색 결과',data:{sceneIndex,currentSceneId:currentScene.sceneId,allTextObjects:allTextObjectsForDebugId,debugIdSearchResults,found:textWithDebugId !== null,maxDebugId,textWithDebugIdText},timestamp:Date.now(),sessionId:'debug-session',runId:'run12',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
          
          if (textWithDebugId !== null) {
            textToUpdate = textWithDebugId
            const debugText = textWithDebugId as PIXI.Text
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSceneManager.ts:888',message:'디버그 ID가 있는 텍스트 객체 사용',data:{debugId:maxDebugId,textText:debugText.text || ''},timestamp:Date.now(),sessionId:'debug-session',runId:'run12',hypothesisId:'A'})}).catch(()=>{});
            // #endregion
          } else {
            // 디버그 ID가 없으면 실제로 표시되고 있는 텍스트 객체 찾기 (visible=true, alpha>0)
            let visibleText: PIXI.Text | null = null
            textsRef.current.forEach((text, idx) => {
              if (text && text.visible && text.alpha > 0) {
                const textScene = timeline.scenes[idx]
                if (textScene?.sceneId === currentScene.sceneId || idx === sceneIndex) {
                  visibleText = text
                  // #region agent log
                  fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSceneManager.ts:862',message:'표시 중인 텍스트 객체 찾음',data:{idx,textText:text.text,sceneId:textScene.sceneId},timestamp:Date.now(),sessionId:'debug-session',runId:'run12',hypothesisId:'A'})}).catch(()=>{});
                  // #endregion
                }
              }
            })
            
            if (visibleText) {
              textToUpdate = visibleText
              const visibleTextObj = visibleText as PIXI.Text
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSceneManager.ts:894',message:'표시 중인 텍스트 객체 사용',data:{textText:visibleTextObj.text || ''},timestamp:Date.now(),sessionId:'debug-session',runId:'run12',hypothesisId:'A'})}).catch(()=>{});
              // #endregion
            } else if (firstSceneIndex >= 0) {
              // 같은 그룹 내 첫 번째 씬의 텍스트 객체 사용
              const firstText = textsRef.current.get(firstSceneIndex)
              if (firstText) {
                textToUpdate = firstText
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSceneManager.ts:901',message:'첫 번째 씬의 텍스트 객체 사용',data:{firstSceneIndex,textText:firstText?.text || ''},timestamp:Date.now(),sessionId:'debug-session',runId:'run12',hypothesisId:'A'})}).catch(()=>{});
                // #endregion
              }
            }
          }
        }
        
        // 자막 내용이 수정되었을 수 있으므로 텍스트 내용 업데이트
        // handleScenePartSelect에서 이미 텍스트 객체를 업데이트했을 수 있으므로, 
        // 디버그 ID가 있는 텍스트 객체의 텍스트를 우선 사용
        if (textToUpdate) {
          let textToDisplay: string | null = null
          
          // 디버그 ID가 있는 텍스트 객체의 텍스트를 우선 사용 (handleScenePartSelect에서 업데이트한 텍스트)
          const debugId = (textToUpdate as PIXI.Text & { __debugId?: string }).__debugId
          // handleScenePartSelect에서 이미 업데이트한 텍스트인지 확인
          // 디버그 ID가 있거나, 텍스트가 "와 대박!"이 아니고 timeline의 첫 번째 구간 텍스트와 다른 경우
          const timelineFirstPart = currentScene.text?.content?.split(/\s*\|\|\|\s*/)[0]?.trim() || ''
          // 텍스트 객체의 실제 텍스트가 timeline의 첫 번째 구간과 다르면 수동 업데이트된 것으로 간주
          const isManuallyUpdated = (debugId && debugId.startsWith('text_')) || 
            (textToUpdate.text && textToUpdate.text !== '와 대박!' && textToUpdate.text !== timelineFirstPart && textToUpdate.text.trim().length > 0)
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSceneManager.ts:968',message:'isManuallyUpdated 계산',data:{sceneIndex,debugId:debugId || '없음',textToUpdateText:textToUpdate.text,timelineFirstPart,isManuallyUpdated,hasDebugId:!!(debugId && debugId.startsWith('text_')),textDifferent:!(textToUpdate.text === '와 대박!' || textToUpdate.text === timelineFirstPart)},timestamp:Date.now(),sessionId:'debug-session',runId:'run19',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
          
          if (isManuallyUpdated && textToUpdate.text) {
            // handleScenePartSelect에서 이미 업데이트한 텍스트 사용
            textToDisplay = textToUpdate.text
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSceneManager.ts:925',message:'수동 업데이트된 텍스트 사용',data:{sceneIndex,debugId:debugId || '없음',text:textToDisplay,timelineFirstPart,textToUpdateText:textToUpdate.text},timestamp:Date.now(),sessionId:'debug-session',runId:'run15',hypothesisId:'A'})}).catch(()=>{});
            // #endregion
          } else if (currentScene.text?.content) {
            // 디버그 ID가 없으면 timeline의 text.content 사용
            textToDisplay = currentScene.text.content
            
            // playTts에서 이미 특정 구간 텍스트로 업데이트했을 수 있음 (|||가 없으면 이미 구간 텍스트)
            // ||| 구분자가 있으면 그룹 내 순서에 따라 k번째 구간만 표시
            if (textToDisplay.includes('|||')) {
              // 같은 그룹 내에서의 순서 확인 (n-k에서 k 구하기)
              if (currentScene.sceneId !== undefined) {
                // 같은 sceneId를 가진 씬들 찾기 (원본 배열 순서 유지)
                const sameGroupScenes = timeline.scenes
                  .map((s, idx) => ({ scene: s, index: idx }))
                  .filter(({ scene }) => scene.sceneId === currentScene.sceneId)
                  .sort((a, b) => a.index - b.index) // 원본 배열 순서로 정렬
                
                // 현재 씬이 그룹 내에서 몇 번째인지 확인 (k, 0-based)
                const groupIndex = sameGroupScenes.findIndex(({ index }) => index === sceneIndex)
                
                if (groupIndex >= 0) {
                  // k번째 구간 텍스트만 표시
                  const parts = textToDisplay.split(/\s*\|\|\|\s*/).map(p => p.trim()).filter(p => p.length > 0)
                  textToDisplay = parts[groupIndex] || ''
                } else {
                  textToDisplay = ''
                }
              } else {
                textToDisplay = ''
              }
            }
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSceneManager.ts:960',message:'timeline의 text.content 사용',data:{sceneIndex,textToDisplay,hasDelimiters:currentScene.text.content.includes('|||')},timestamp:Date.now(),sessionId:'debug-session',runId:'run9',hypothesisId:'A'})}).catch(()=>{});
            // #endregion
          }
          
          if (textToDisplay !== null) {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSceneManager.ts:970',message:'텍스트 업데이트',data:{sceneIndex,oldText:textToUpdate.text,newText:textToDisplay,willUpdate:textToUpdate.text !== textToDisplay,isManuallyUpdated},timestamp:Date.now(),sessionId:'debug-session',runId:'run18',hypothesisId:'A'})}).catch(()=>{});
            // #endregion
            
            // 수동 업데이트된 텍스트는 덮어쓰지 않음 (전환 효과 완료 후에도 유지)
            if (isManuallyUpdated) {
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSceneManager.ts:1018',message:'수동 업데이트된 텍스트 유지 - 덮어쓰기 스킵',data:{sceneIndex,textToUpdateText:textToUpdate.text,textToDisplay},timestamp:Date.now(),sessionId:'debug-session',runId:'run21',hypothesisId:'A'})}).catch(()=>{});
              // #endregion
              // 텍스트는 유지하지만 visible과 alpha는 확실히 설정
              if (!textToUpdate.visible || textToUpdate.alpha < 1) {
                textToUpdate.visible = true
                textToUpdate.alpha = 1
              }
            } else if (textToUpdate.text !== textToDisplay) {
              textToUpdate.text = textToDisplay
              // 같은 그룹 내 씬 전환 시 텍스트는 즉시 표시 (깜빡임 방지)
              textToUpdate.visible = textToDisplay.length > 0
              textToUpdate.alpha = textToDisplay.length > 0 ? 1 : 0
            } else {
              // 텍스트가 이미 올바르게 설정되어 있으면 visible과 alpha만 확인
              if (textToDisplay.length > 0) {
                textToUpdate.visible = true
                textToUpdate.alpha = 1
              }
            }
          } else {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSceneManager.ts:978',message:'텍스트를 찾을 수 없음',data:{sceneIndex,hasTextToUpdate:!!textToUpdate,hasTextContent:!!currentScene.text?.content},timestamp:Date.now(),sessionId:'debug-session',runId:'run9',hypothesisId:'A'})}).catch(()=>{});
            // #endregion
          }
        } else {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSceneManager.ts:983',message:'텍스트 객체를 찾을 수 없음',data:{sceneIndex,hasTextToUpdate:!!textToUpdate},timestamp:Date.now(),sessionId:'debug-session',runId:'run9',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
        }
        
        // 이전 텍스트 숨기기 (새 텍스트를 보여준 후)
        if (previousText && previousIndex !== null && previousIndex !== sceneIndex) {
          previousText.visible = false
          previousText.alpha = 0
        }
        
        // 이미지는 이미 표시되어 있으므로 그대로 유지 (전환 효과 적용 안 함)
        // 텍스트만 변경하고 렌더링
        if (appRef.current) {
          appRef.current.render()
        }
        
        // 전환 효과는 적용하지 않음 (첫 번째 씬에서 이미 적용됨)
        // 완료 콜백만 호출
        previousSceneIndexRef.current = sceneIndex
        if (wrappedOnComplete) {
          wrappedOnComplete(currentText || null)
        }
      } else {
        // 첫 번째 씬이거나 다른 그룹: 전환 효과 적용
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSceneManager.ts:931',message:'첫 번째 씬 또는 다른 그룹 - 전환 효과 적용',data:{sceneIndex,isFirstSceneInGroup,isInSameGroup,transition,transitionDuration},timestamp:Date.now(),sessionId:'debug-session',runId:'run5',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        
        // 자막 내용이 수정되었을 수 있으므로 텍스트 내용 업데이트
        // 단, handleScenePartSelect에서 수동 업데이트된 텍스트인 경우 덮어쓰지 않음
        if (currentText && currentScene.text?.content) {
          // 수동 업데이트된 텍스트인지 확인
          const currentTextDebugId = (currentText as PIXI.Text & { __debugId?: string }).__debugId
          const isManuallyUpdated = currentTextDebugId && currentTextDebugId.startsWith('text_') && 
            currentText.text && currentText.text !== '와 대박!'
          
          if (!isManuallyUpdated) {
            // 수동 업데이트되지 않은 경우에만 텍스트 업데이트
            let textToDisplay = ''
            
            // 같은 그룹 내에서의 순서 확인 (n-k에서 k 구하기)
            if (currentScene.sceneId !== undefined && currentScene.text.content.includes('|||')) {
              // 같은 sceneId를 가진 씬들 찾기 (원본 배열 순서 유지)
              const sameGroupScenes = timeline.scenes
                .map((s, idx) => ({ scene: s, index: idx }))
                .filter(({ scene }) => scene.sceneId === currentScene.sceneId)
                .sort((a, b) => a.index - b.index) // 원본 배열 순서로 정렬
              
              // 현재 씬이 그룹 내에서 몇 번째인지 확인 (k, 0-based)
              const groupIndex = sameGroupScenes.findIndex(({ index }) => index === sceneIndex)
              
              if (groupIndex >= 0) {
                // k번째 구간 텍스트만 표시
                const parts = currentScene.text.content.split(/\s*\|\|\|\s*/).map(p => p.trim()).filter(p => p.length > 0)
                textToDisplay = parts[groupIndex] || ''
              }
            } else {
              // ||| 구분자가 없으면 전체 텍스트 사용
              textToDisplay = currentScene.text.content || ''
            }
            
            if (currentText.text !== textToDisplay) {
              currentText.text = textToDisplay
            }
            currentText.visible = textToDisplay.length > 0
            currentText.alpha = textToDisplay.length > 0 ? 1 : 0
          } else {
            // 수동 업데이트된 텍스트인 경우 visible과 alpha만 확인
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSceneManager.ts:1230',message:'수동 업데이트된 텍스트 유지 - 텍스트 덮어쓰기 스킵',data:{sceneIndex,currentTextDebugId,currentTextText:currentText.text},timestamp:Date.now(),sessionId:'debug-session',runId:'run45',hypothesisId:'A'})}).catch(()=>{});
            // #endregion
            if (!currentText.visible || currentText.alpha < 1) {
              currentText.visible = true
              currentText.alpha = 1
            }
          }
        }
        
        // applyEnterEffect 호출 전에 currentText 객체의 상태를 로깅
        // #region agent log
        if (currentText) {
          const currentTextDebugIdBeforeApply = (currentText as PIXI.Text & { __debugId?: string }).__debugId || '없음'
          fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSceneManager.ts:1209',message:'applyEnterEffect 호출 전 currentText 상태',data:{sceneIndex,currentTextAddress:String(currentText),debugId:currentTextDebugIdBeforeApply,textText:currentText.text,visible:currentText.visible,alpha:currentText.alpha},timestamp:Date.now(),sessionId:'debug-session',runId:'run34',hypothesisId:'A'})}).catch(()=>{});
        }
        // #endregion
        
        // applyEnterEffect에 전달할 currentText 저장
        savedToText = currentText || null
        
        applyEnterEffect(
          spriteToUse,
          currentText || null,
          transition,
          transitionDuration,
          width,
          height,
          sceneIndex,
          applyAdvancedEffects,
          forceTransition,
          (toTextFromEffect?: PIXI.Text | null) => {
            previousSceneIndexRef.current = sceneIndex
            wrappedOnComplete(toTextFromEffect)
          },
          previousIndex,
          isFirstInGroup ? groupTransitionTimelinesRef : undefined,
          currentScene.sceneId
        )
      }
    } else {
      // 스프라이트가 없으면 즉시 표시
      spritesRef.current.forEach((sprite, index) => {
        if (sprite?.parent) {
          sprite.visible = index === sceneIndex
          sprite.alpha = index === sceneIndex ? 1 : 0
        }
      })
      textsRef.current.forEach((text, index) => {
        if (text?.parent) {
          text.visible = index === sceneIndex
          text.alpha = index === sceneIndex ? 1 : 0
        }
      })

      if (appRef.current) {
        appRef.current.render()
      }
    }

      previousSceneIndexRef.current = sceneIndex
    } catch (error) {
      console.error('updateCurrentScene error:', error)
    }
  }, [timeline, stageDimensions, applyEnterEffect, applyAdvancedEffects, appRef, containerRef, spritesRef, textsRef, currentSceneIndexRef, previousSceneIndexRef, activeAnimationsRef, isManualSceneSelectRef])

  // Fabric 오브젝트를 현재 씬 상태에 맞게 동기화
  const syncFabricWithScene = useCallback(async () => {
    if (!useFabricEditing || !fabricCanvasRef.current || !timeline) return
    const fabricCanvas = fabricCanvasRef.current
    const sceneIndex = currentSceneIndexRef.current
    const scene = timeline.scenes[sceneIndex]
    if (!scene) return
    const scale = fabricScaleRatioRef.current
    fabricCanvas.clear()

    const { width, height } = stageDimensions

    // 이미지 (좌표를 스케일 비율에 맞게 조정)
    if (scene.image) {
      const img = await (fabric.Image.fromURL as (url: string, options?: { crossOrigin?: string }) => Promise<fabric.Image>)(scene.image, { crossOrigin: 'anonymous' }) as fabric.Image
      if (img) {
        const transform = scene.imageTransform
        let left: number, top: number, imgScaleX: number, imgScaleY: number, angleDeg: number
        
        if (transform) {
          angleDeg = (transform.rotation || 0) * (180 / Math.PI)
          const effectiveWidth = transform.width * (transform.scaleX || 1)
          const effectiveHeight = transform.height * (transform.scaleY || 1)
          imgScaleX = (effectiveWidth / img.width) * scale
          imgScaleY = (effectiveHeight / img.height) * scale
          left = transform.x * scale
          top = transform.y * scale
        } else {
          // 초기 contain/cover 계산과 동일하게 배치
          const params = calculateSpriteParams(img.width, img.height, width, height, scene.imageFit || 'contain')
          imgScaleX = (params.width / img.width) * scale
          imgScaleY = (params.height / img.height) * scale
          left = params.x * scale
          top = params.y * scale
          angleDeg = 0
        }
        
        img.set({
          originX: 'left',
          originY: 'top',
          left,
          top,
          scaleX: imgScaleX,
          scaleY: imgScaleY,
          angle: angleDeg,
          selectable: true,
          evented: true,
        })
        ;(img as fabric.Image & { dataType?: 'image' | 'text' }).dataType = 'image'
        fabricCanvas.add(img)
      }
    }

    // 텍스트 (좌표를 스케일 비율에 맞게 조정)
    if (scene.text?.content) {
      const transform = scene.text.transform
      const angleDeg = (transform?.rotation || 0) * (180 / Math.PI)
      const baseFontSize = scene.text.fontSize || 48
      const scaledFontSize = baseFontSize * scale
      const fontFamily = resolveSubtitleFontFamily(scene.text.font)
      const fontWeight = scene.text.fontWeight ?? (scene.text.style?.bold ? 700 : 400)
      
      const textObj = new fabric.Textbox(scene.text.content, {
        left: (transform?.x ?? width / 2) * scale,
        top: (transform?.y ?? height * 0.9) * scale,
        originX: 'center',
        originY: 'center',
        fontFamily,
        fontSize: scaledFontSize,
        fill: scene.text.color || '#ffffff',
        fontWeight,
        fontStyle: scene.text.style?.italic ? 'italic' : 'normal',
        underline: scene.text.style?.underline || false,
        textAlign: scene.text.style?.align || 'center',
        selectable: true,
        evented: true,
        angle: angleDeg,
      })
      if (transform) {
        // width가 있으면 박스 크기 반영
        if (transform.width) {
          textObj.set({ width: transform.width * scale })
        }
        // scaleX/scaleY는 이미 fontSize와 width에 반영됨
      }
      ;(textObj as fabric.Textbox & { dataType?: 'image' | 'text' }).dataType = 'text'
      fabricCanvas.add(textObj)
    }

    fabricCanvas.renderAll()
  }, [useFabricEditing, fabricCanvasRef, fabricScaleRatioRef, currentSceneIndexRef, timeline, stageDimensions])

  // 모든 씬 로드
  const loadAllScenes = useCallback(async () => {
    if (!appRef.current || !containerRef.current || !timeline) {
      return
    }

    const container = containerRef.current
    const { width, height } = stageDimensions

    container.removeChildren()
    spritesRef.current.clear()
    // textsRef를 clear하기 전에 기존 텍스트 객체의 __debugId와 텍스트 내용을 저장
    const savedTextData = new Map<number, { debugId?: string, text: string }>()
    textsRef.current.forEach((text, idx) => {
      if (text) {
        const debugId = (text as PIXI.Text & { __debugId?: string }).__debugId
        savedTextData.set(idx, {
          debugId: debugId || undefined,
          text: text.text || ''
        })
      }
    })
    textsRef.current.clear()

    const loadScene = async (sceneIndex: number) => {
      const scene = timeline.scenes[sceneIndex]
      if (!scene || !scene.image) {
        return
      }

      try {
        // 같은 그룹 내 씬들은 첫 번째 씬의 이미지와 스프라이트를 공유
        const firstSceneIndexInGroup = scene.sceneId !== undefined
          ? timeline.scenes.findIndex((s) => s.sceneId === scene.sceneId)
          : -1
        const isFirstSceneInGroup = firstSceneIndexInGroup === sceneIndex
        
        // 첫 번째 씬이 아니고 같은 그룹 내에 스프라이트가 이미 있으면 공유
        if (!isFirstSceneInGroup && firstSceneIndexInGroup >= 0) {
          const firstSceneSprite = spritesRef.current.get(firstSceneIndexInGroup)
          if (firstSceneSprite) {
            // 같은 그룹 내 씬들은 첫 번째 씬의 스프라이트를 참조
            spritesRef.current.set(sceneIndex, firstSceneSprite)
            return
          }
        }
        
        // 같은 그룹 내 씬들은 첫 번째 씬의 이미지를 사용
        const firstSceneInGroup = firstSceneIndexInGroup >= 0 
          ? timeline.scenes[firstSceneIndexInGroup] 
          : null
        const imageToUse = firstSceneInGroup?.image || scene.image
        const baseScene = firstSceneInGroup || scene
        
        // 첫 번째 씬이거나 같은 그룹 내 스프라이트가 없으면 새로 생성
        // 같은 그룹 내 씬들은 첫 번째 씬의 이미지를 사용
        const texture = await loadPixiTextureWithCache(imageToUse)
        const sprite = new PIXI.Sprite(texture)
        
        const imageFit = baseScene.imageFit || 'contain'
        const params = calculateSpriteParams(
          texture.width,
          texture.height,
          width,
          height,
          imageFit
        )

        sprite.x = params.x
        sprite.y = params.y
        sprite.width = params.width
        sprite.height = params.height
        sprite.anchor.set(0, 0)
        sprite.visible = false
        sprite.alpha = 0

        // Transform 데이터 적용 (첫 번째 씬의 transform 사용)
        if (baseScene.imageTransform) {
          sprite.x = baseScene.imageTransform.x
          sprite.y = baseScene.imageTransform.y
          sprite.width = baseScene.imageTransform.width
          sprite.height = baseScene.imageTransform.height
          sprite.rotation = baseScene.imageTransform.rotation
        }

        container.addChild(sprite)
        spritesRef.current.set(sceneIndex, sprite)

        if (scene.text?.content) {
          const fontFamily = resolveSubtitleFontFamily(scene.text.font)
          const fontWeight = scene.text.fontWeight ?? (scene.text.style?.bold ? 700 : 400)
          // 텍스트 너비 계산 (Transform이 있으면 그 너비 사용, 없으면 기본값)
          let textWidth = width * 0.75 // 기본값: 화면 너비의 75%
          if (scene.text.transform?.width) {
            textWidth = scene.text.transform.width / (scene.text.transform.scaleX || 1)
          }

          // ||| 구분자 제거: 첫 번째 구간만 표시하거나 구분자를 공백으로 대체
          const textContent = scene.text.content.split(/\s*\|\|\|\s*/).map(part => part.trim()).filter(part => part.length > 0)
          const displayText = textContent.length > 0 ? textContent[0] : scene.text.content

          // strokeThickness를 포함한 스타일 객체 생성
          const styleConfig: Record<string, unknown> = {
            fontFamily,
            fontSize: scene.text.fontSize || 80, // 기본 크기 32 -> 48로 증가
            fill: scene.text.color || '#ffffff',
            align: scene.text.style?.align || 'center',
            fontWeight: String(fontWeight) as PIXI.TextStyleFontWeight,
            fontStyle: scene.text.style?.italic ? 'italic' : 'normal',
            wordWrap: true, // 자동 줄바꿈 활성화
            wordWrapWidth: textWidth, // 줄바꿈 너비 설정
            breakWords: true, // 단어 중간에서도 줄바꿈 가능
            stroke: '#000000', // 쉐도우 대신 테두리(border) 사용
            strokeThickness: 10, // 테두리 두께 10픽셀 (서버 인코딩과 동일)
          }
          const textStyle = new PIXI.TextStyle(styleConfig as Partial<PIXI.TextStyle>)

          const text = new PIXI.Text({
            text: displayText,
            style: textStyle,
          })

          text.anchor.set(0.5, 0.5)
          let textY = height / 2
          if (scene.text.position === 'top') {
            textY = 200
          } else if (scene.text.position === 'bottom') {
            textY = height - 200
          }
          text.x = width / 2
          text.y = textY
          text.visible = false
          text.alpha = 0

          // 텍스트 Transform 적용
          if (scene.text.transform) {
            const scaleX = scene.text.transform.scaleX ?? 1
            const scaleY = scene.text.transform.scaleY ?? 1
            text.x = scene.text.transform.x
            text.y = scene.text.transform.y
            text.scale.set(scaleX, scaleY)
            text.rotation = scene.text.transform.rotation
            
            // Transform이 있으면 wordWrapWidth도 업데이트
            if (text.style && scene.text.transform.width) {
              const baseWidth = scene.text.transform.width / scaleX
              text.style.wordWrapWidth = baseWidth
              text.text = text.text // 스타일 변경 적용
            }
          }

          container.addChild(text)
          // 기존 텍스트 객체의 __debugId와 텍스트 내용을 복원
          const savedData = savedTextData.get(sceneIndex)
          if (savedData) {
            if (savedData.debugId && savedData.debugId.startsWith('text_')) {
              ;(text as PIXI.Text & { __debugId?: string }).__debugId = savedData.debugId
              // 수동 업데이트된 텍스트인 경우 텍스트 내용도 복원
              if (savedData.text && savedData.text !== '와 대박!') {
                text.text = savedData.text
              }
            }
          }
          textsRef.current.set(sceneIndex, text)
        }
      } catch (error) {
        console.error(`Failed to load scene ${sceneIndex}:`, error)
      }
    }

    await Promise.all(timeline.scenes.map((_, index) => loadScene(index)))
    
    // 렌더링 강제 실행
    requestAnimationFrame(() => {
      const sceneIndex = currentSceneIndexRef.current
      if (isSavingTransformRef.current) {
        const currentSprite = spritesRef.current.get(sceneIndex)
        const currentText = textsRef.current.get(sceneIndex)
        if (currentSprite) {
          currentSprite.visible = true
          currentSprite.alpha = 1
        }
        if (currentText) {
          currentText.visible = true
          currentText.alpha = 1
        }
        if (appRef.current) {
          appRef.current.render()
        }
      } else {
        updateCurrentScene(true)
      }
      if (appRef.current) {
        appRef.current.render()
      }
      
      if (onLoadComplete) {
        onLoadComplete(sceneIndex)
      }
    })
  }, [timeline, stageDimensions, updateCurrentScene, appRef, containerRef, spritesRef, textsRef, currentSceneIndexRef, isSavingTransformRef, loadPixiTextureWithCache, onLoadComplete])

  return {
    updateCurrentScene,
    syncFabricWithScene,
    loadAllScenes,
  }
}
