'use client'

import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useThemeStore } from '@/store/useThemeStore'

interface AIRecommendButtonProps {
  onSelect?: (recommendation: string) => void
  recommendations?: string[]
  title?: string
  description?: string
}

export default function AIRecommendButton({
  onSelect,
  recommendations = [],
  title = 'AI 추천',
  description = 'AI가 추천하는 옵션을 선택하세요',
}: AIRecommendButtonProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [aiRecommendations, setAiRecommendations] = useState<string[]>(recommendations)
  const theme = useThemeStore((state) => state.theme)

  const handleClick = async () => {
    if (aiRecommendations.length > 0) {
      setOpen(true)
      return
    }

    setIsLoading(true)
    // TODO: 실제 AI API 호출
    // 지금은 더미 데이터 반환
    setTimeout(() => {
      const dummyRecommendations = [
        '추천 옵션 1',
        '추천 옵션 2',
        '추천 옵션 3',
        '추천 옵션 4',
        '추천 옵션 5',
      ]
      setAiRecommendations(dummyRecommendations)
      setIsLoading(false)
      setOpen(true)
    }, 1000)
  }

  const handleSelect = (recommendation: string) => {
    onSelect?.(recommendation)
    setOpen(false)
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={isLoading}
        className="gap-2 border-purple-500 text-purple-600 hover:bg-purple-50 hover:text-purple-700 dark:border-purple-400 dark:text-purple-400 dark:hover:bg-purple-900/20"
      >
        <Sparkles className={`h-4 w-4 ${
          theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
        }`} />
        {isLoading ? '추천 중...' : 'AI 추천'}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={theme === 'dark' ? 'bg-gray-800' : 'bg-white'}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {aiRecommendations.map((rec, index) => (
              <button
                key={index}
                onClick={() => handleSelect(rec)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  theme === 'dark'
                    ? 'border-gray-700 hover:bg-gray-700 text-white'
                    : 'border-gray-200 hover:bg-gray-50 text-gray-900'
                }`}
              >
                {rec}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

