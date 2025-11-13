'use client'

import { useState, useEffect } from 'react'
import { useThemeStore } from '@/store/useThemeStore'

interface ScriptTypingEffectProps {
  onComplete: (script: string) => void
  scriptStyle?: string
  mode?: 'manual' | 'auto'
}

export default function ScriptTypingEffect({ onComplete, scriptStyle, mode = 'manual' }: ScriptTypingEffectProps) {
  const theme = useThemeStore((state) => state.theme)
  const [displayedText, setDisplayedText] = useState('')
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const [sentences] = useState(() => generateDummyScript(mode))

  const fullScript = sentences.join('\n')

  useEffect(() => {
    if (isComplete) {
      onComplete(fullScript)
      return
    }

    if (currentSentenceIndex >= sentences.length) {
      setIsComplete(true)
      return
    }

    const currentSentence = sentences[currentSentenceIndex]
    let charIndex = 0

    const typingInterval = setInterval(() => {
      if (charIndex < currentSentence.length) {
        setDisplayedText((prev) => {
          const newText = prev + currentSentence[charIndex]
          return newText
        })
        charIndex++
      } else {
        // 문장 완료 후 잠시 대기
        clearInterval(typingInterval)
        setTimeout(() => {
          setDisplayedText((prev) => prev + (currentSentenceIndex < sentences.length - 1 ? '\n' : ''))
          setCurrentSentenceIndex((prev) => prev + 1)
        }, 300) // 문장 간 대기 시간
      }
    }, 30) // 타이핑 속도 (ms)

    return () => clearInterval(typingInterval)
  }, [currentSentenceIndex, isComplete, sentences, fullScript, onComplete])

  return (
    <div className={`w-full p-6 rounded-lg border ${
      theme === 'dark' 
        ? 'bg-gray-800 border-gray-700' 
        : 'bg-gray-50 border-gray-200'
    }`}>
      <div className="mb-4">
        <h3 className={`text-lg font-semibold mb-2 ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>
          AI가 대본을 생성하고 있어요...
        </h3>
        {!isComplete && (
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full animate-pulse ${
              theme === 'dark' ? 'bg-purple-400' : 'bg-purple-600'
            }`} />
            <span className={`text-sm ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              생성 중...
            </span>
          </div>
        )}
      </div>
      <div className={`min-h-[200px] p-4 rounded-md ${
        theme === 'dark'
          ? 'bg-gray-900 text-white'
          : 'bg-white text-gray-900'
      }`}>
        <p className="whitespace-pre-wrap leading-relaxed">
          {displayedText}
          {!isComplete && (
            <span className={`animate-pulse ${
              theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
            }`}>
              |
            </span>
          )}
        </p>
      </div>
      {isComplete && (
        <div className="mt-4 flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            theme === 'dark' ? 'bg-green-400' : 'bg-green-600'
          }`} />
          <span className={`text-sm font-medium ${
            theme === 'dark' ? 'text-green-400' : 'text-green-600'
          }`}>
            대본 생성 완료
          </span>
        </div>
      )}
    </div>
  )
}

function generateDummyScript(mode: 'manual' | 'auto' = 'manual'): string[] {
  const topics = [
    '제품 언박싱 장면은',
    '제품 사용 전후 비교는',
    '핵심 기능 클로즈업은',
    '마지막 추천 멘트는',
  ]

  const durations = ['7초 이내', '10초 이내', '12초 이내', '15초 이내']
  const styles = [
    '자연광이 들어오는 곳에서',
    '밝은 조명 아래에서',
    '가능하면 손이 보이도록',
    '제품 디테일이 잘 보이게',
    '간단한 배경 음악과 함께',
    '짧은 멘트와 함께',
  ]

  // manual 모드: 촬영 지시문
  const manualEndings = [
    '찍어주세요.',
    '촬영해주세요.',
    '담아주세요.',
    '보여주세요.',
  ]

  // auto 모드: AI가 만들겠다는 말투
  const autoEndings = [
    '만들게요.',
    '제작할게요.',
    '구성할게요.',
    '만들어드릴게요.',
  ]

  const getRandom = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)]

  return topics.map((topic, index) => {
    const duration = getRandom(durations)
    const style = getRandom(styles)
    const ending = mode === 'auto' 
      ? getRandom(autoEndings)
      : getRandom(manualEndings)
    return `${index + 1}. ${topic} ${duration} ${style} ${ending}`
  })
}

