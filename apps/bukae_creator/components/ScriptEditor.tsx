'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { useThemeStore } from '@/store/useThemeStore'
import { useVideoCreateStore } from '@/store/useVideoCreateStore'

export default function ScriptEditor() {
  const theme = useThemeStore((state) => state.theme)
  const { script, setScript } = useVideoCreateStore()
  const [localScript, setLocalScript] = useState(script || '')

  useEffect(() => {
    if (!script) {
      // 더미 스크립트 생성 (400자 내외)
      const dummyScript = `안녕하세요! 오늘은 정말 대박인 제품을 소개해드릴게요. 이 제품을 사용한 지 벌써 한 달이 넘었는데, 정말 만족도가 높아서 여러분께 추천드리고 싶어요. 

제품의 첫인상은 정말 깔끔하고 세련됐어요. 디자인도 예쁘고 사용하기도 편리하답니다. 특히 이 기능이 정말 좋은데, 평소에 불편했던 점들을 완벽하게 해결해줘요.

가격도 합리적이고, 품질도 기대 이상이에요. 이 가격에 이 퀄리티는 정말 흔치 않죠. 여러분도 한번 사용해보시면 후회하지 않으실 거예요!`
      setLocalScript(dummyScript)
      setScript(dummyScript)
    } else {
      setLocalScript(script)
    }
  }, [script, setScript])

  const handleScriptChange = (value: string) => {
    setLocalScript(value)
    setScript(value)
  }

  return (
    <Card className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}>
      <CardHeader>
        <CardTitle className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
          대본 편집
        </CardTitle>
        <CardDescription>
          AI가 생성한 대본을 확인하고 수정할 수 있습니다. (약 400자 내외)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Label className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
            대본 내용
          </Label>
          <textarea
            value={localScript}
            onChange={(e) => handleScriptChange(e.target.value)}
            rows={10}
            className={`w-full p-3 rounded-md border resize-none ${
              theme === 'dark'
                ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-400'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
            } focus:outline-none focus:ring-2 focus:ring-purple-500`}
            placeholder="대본을 입력하세요..."
          />
          <p className={`text-sm ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
          }`}>
            {localScript.length}자
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

