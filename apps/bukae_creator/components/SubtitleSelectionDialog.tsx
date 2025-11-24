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
import { subtitlePositions, fontTemplates, colorTemplates } from '@/lib/data/templates'

interface SubtitleSelectionDialogProps {
  children: React.ReactNode
}

export default function SubtitleSelectionDialog({ children }: SubtitleSelectionDialogProps) {
  const theme = useThemeStore((state) => state.theme)
  const { subtitlePosition, subtitleFont, subtitleColor, setSubtitlePosition, setSubtitleFont, setSubtitleColor } = useVideoCreateStore()
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
          <DialogTitle>자막 선택</DialogTitle>
          <DialogDescription>
            자막의 위치, 폰트, 색상을 선택하세요
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 자막 위치 선택 */}
          <div>
            <Label className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
              자막 위치
            </Label>
            <RadioGroup value={subtitlePosition || ''} onValueChange={setSubtitlePosition} className="mt-2">
              <div className="grid grid-cols-3 gap-4">
                {subtitlePositions.map((position) => (
                  <div key={position.id}>
                    <RadioGroupItem
                      value={position.id}
                      id={position.id}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={position.id}
                      className={`flex items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        subtitlePosition === position.id
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                          : theme === 'dark'
                            ? 'border-gray-700 bg-gray-900 hover:border-gray-600'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      {position.label}
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>

          {/* 폰트 선택 */}
          <div>
            <Label className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
              폰트 템플릿
            </Label>
            <RadioGroup value={subtitleFont || ''} onValueChange={setSubtitleFont} className="mt-2">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {fontTemplates.map((font) => (
                  <div key={font.id}>
                    <RadioGroupItem
                      value={font.id}
                      id={font.id}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={font.id}
                      className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        subtitleFont === font.id
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                          : theme === 'dark'
                            ? 'border-gray-700 bg-gray-900 hover:border-gray-600'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <span className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                        {font.name}
                      </span>
                      <Badge variant={font.tier === 'LIGHT' ? 'default' : 'secondary'}>
                        {font.tier}
                      </Badge>
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>

          {/* 색상 선택 */}
          <div>
            <Label className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
              자막 색상
            </Label>
            <RadioGroup value={subtitleColor || ''} onValueChange={setSubtitleColor} className="mt-2">
              <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                {colorTemplates.map((color) => (
                  <div key={color.id}>
                    <RadioGroupItem
                      value={color.id}
                      id={color.id}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={color.id}
                      className={`flex flex-col items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        subtitleColor === color.id
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                          : theme === 'dark'
                            ? 'border-gray-700 bg-gray-900 hover:border-gray-600'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div
                        className="w-12 h-12 rounded-full mb-2 border-2 border-gray-300"
                        style={{ backgroundColor: color.color }}
                      />
                      <span className={`text-sm ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        {color.name}
                      </span>
                      <Badge variant={color.tier === 'LIGHT' ? 'default' : 'secondary'} className="mt-1">
                        {color.tier}
                      </Badge>
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>
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

