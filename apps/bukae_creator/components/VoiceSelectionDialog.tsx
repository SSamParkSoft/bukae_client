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
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { useVideoCreateStore } from '@/store/useVideoCreateStore'
import { useThemeStore } from '@/store/useThemeStore'
import { voiceTemplates } from '@/lib/data/templates'

interface VoiceSelectionDialogProps {
  children: React.ReactNode
}

export default function VoiceSelectionDialog({ children }: VoiceSelectionDialogProps) {
  const theme = useThemeStore((state) => state.theme)
  const { voiceTemplate, setVoiceTemplate } = useVideoCreateStore()
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className={`max-w-4xl max-h-[90vh] overflow-y-auto ${
        theme === 'dark' ? 'bg-gray-800' : 'bg-white'
      }`}>
        <DialogHeader>
          <DialogTitle>목소리 선택</DialogTitle>
          <DialogDescription>
            TTS/STT를 활용한 다양한 목소리 템플릿을 선택하세요
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <RadioGroup value={voiceTemplate || ''} onValueChange={setVoiceTemplate}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {voiceTemplates.map((template) => (
                <div key={template.id}>
                  <RadioGroupItem
                    value={template.id}
                    id={template.id}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={template.id}
                    className={`flex flex-col p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      voiceTemplate === template.id
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                        : theme === 'dark'
                          ? 'border-gray-700 bg-gray-900 hover:border-gray-600'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`font-semibold ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        {template.name}
                      </span>
                      <Badge variant={template.tier === 'LIGHT' ? 'default' : 'secondary'}>
                        {template.tier}
                      </Badge>
                    </div>
                    <p className={`text-sm ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {template.description}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-2 self-start"
                      onClick={(e) => {
                        e.preventDefault()
                        // TODO: 음성 미리듣기 기능
                      }}
                    >
                      미리듣기
                    </Button>
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            취소
          </Button>
          <Button onClick={() => setOpen(false)}>
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

