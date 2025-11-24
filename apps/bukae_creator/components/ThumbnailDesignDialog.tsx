'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useVideoCreateStore } from '@/store/useVideoCreateStore'
import { useThemeStore } from '@/store/useThemeStore'
import { thumbnailTemplates } from '@/lib/data/templates'
import AIRecommendButton from './AIRecommendButton'

interface ThumbnailDesignDialogProps {
  children: React.ReactNode
}

export default function ThumbnailDesignDialog({ children }: ThumbnailDesignDialogProps) {
  const theme = useThemeStore((state) => state.theme)
  const { thumbnailTemplate, thumbnailTitle, thumbnailSubtitle, setThumbnailTemplate, setThumbnailTitle, setThumbnailSubtitle } = useVideoCreateStore()
  const [open, setOpen] = useState(false)
  const [localTitle, setLocalTitle] = useState(thumbnailTitle)
  const [localSubtitle, setLocalSubtitle] = useState(thumbnailSubtitle)

  const handleSave = () => {
    setThumbnailTitle(localTitle)
    setThumbnailSubtitle(localSubtitle)
    setOpen(false)
  }

  const handleTitleRecommend = (recommendation: string) => {
    setLocalTitle(recommendation)
  }

  const handleSubtitleRecommend = (recommendation: string) => {
    setLocalSubtitle(recommendation)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className={`max-w-4xl max-h-[90vh] overflow-y-auto ${
        theme === 'dark' ? 'bg-gray-800' : 'bg-white'
      }`}>
        <DialogHeader>
          <DialogTitle>썸네일 디자인 선택</DialogTitle>
          <DialogDescription>
            썸네일 템플릿을 선택하고 제목과 부제목을 입력하세요
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 템플릿 선택 */}
          <div>
            <Label className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
              썸네일 템플릿
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
              {thumbnailTemplates.map((template) => (
                <Card
                  key={template.id}
                  className={`cursor-pointer transition-all ${
                    thumbnailTemplate === template.id
                      ? 'border-2 border-purple-500'
                      : theme === 'dark'
                        ? 'border-gray-700'
                        : 'border-gray-200'
                  }`}
                  onClick={() => setThumbnailTemplate(template.id)}
                >
                  <CardContent className="p-4">
                    <div className="aspect-video bg-gray-100 dark:bg-gray-700 rounded-lg mb-2 flex items-center justify-center">
                      <span className="text-xs text-gray-500">템플릿 {template.id}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                        {template.name}
                      </span>
                      <Badge variant={template.tier === 'LIGHT' ? 'default' : 'secondary'}>
                        {template.tier}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* 제목 입력 */}
          <div>
            <Label className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
              제목
            </Label>
            <div className="flex gap-2 mt-2">
              <Input
                value={localTitle}
                onChange={(e) => setLocalTitle(e.target.value)}
                placeholder="썸네일 제목을 입력하세요"
                className="flex-1"
              />
              <AIRecommendButton
                onSelect={handleTitleRecommend}
                title="제목 AI 추천"
                description="AI가 추천하는 제목을 선택하세요"
              />
            </div>
          </div>

          {/* 부제목 입력 */}
          <div>
            <Label className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
              부제목
            </Label>
            <div className="flex gap-2 mt-2">
              <Input
                value={localSubtitle}
                onChange={(e) => setLocalSubtitle(e.target.value)}
                placeholder="썸네일 부제목을 입력하세요"
                className="flex-1"
              />
              <AIRecommendButton
                onSelect={handleSubtitleRecommend}
                title="부제목 AI 추천"
                description="AI가 추천하는 부제목을 선택하세요"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            취소
          </Button>
          <Button onClick={handleSave}>
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

