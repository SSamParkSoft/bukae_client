'use client'

import { useState, useEffect } from 'react'
import { MessageSquare } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useVideoCreateStore } from '@/store/useVideoCreateStore'
import { useThemeStore } from '@/store/useThemeStore'
import { conceptOptions, conceptTones, type ConceptType } from '@/lib/data/templates'

interface ConceptToneDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function ConceptToneDialog({ open, onOpenChange }: ConceptToneDialogProps) {
  const { concept, tone, setConcept, setTone } = useVideoCreateStore()
  const theme = useThemeStore((state) => state.theme)
  const [selectedConcept, setSelectedConcept] = useState<ConceptType>(
    (concept as ConceptType) || 'viral'
  )
  const [selectedTone, setSelectedTone] = useState<string>(tone || '')

  useEffect(() => {
    if (concept) {
      setSelectedConcept(concept)
    }
    if (tone) {
      setSelectedTone(tone)
    }
  }, [concept, tone])

  const handleConceptChange = (newConcept: ConceptType) => {
    setSelectedConcept(newConcept)
    // 컨셉 변경 시 첫 번째 말투로 자동 선택
    const tones = conceptTones[newConcept]
    if (tones.length > 0) {
      setSelectedTone(tones[0].id)
    }
  }

  const handleSave = () => {
    setConcept(selectedConcept)
    setTone(selectedTone)
    onOpenChange(false)
  }

  const currentTones = conceptTones[selectedConcept]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-4xl max-h-[90vh] overflow-y-auto ${
        theme === 'dark' ? 'bg-gray-800' : 'bg-white'
      }`}>
        <DialogHeader>
          <DialogTitle className="text-2xl">대본 컨셉 및 말투 선택</DialogTitle>
          <DialogDescription>
            영상에 맞는 컨셉과 말투를 선택해주세요
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 컨셉 선택 */}
          <div>
            <h3 className={`text-lg font-semibold mb-4 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              대본 컨셉
            </h3>
            <Tabs value={selectedConcept} onValueChange={(value) => handleConceptChange(value as ConceptType)}>
              <TabsList className="grid w-full grid-cols-3">
                {conceptOptions.map((option) => (
                  <TabsTrigger key={option.id} value={option.id} className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    <span>{option.label}</span>
                    <Badge
                      variant={option.tier === 'LIGHT' ? 'default' : 'secondary'}
                      className="ml-auto"
                    >
                      {option.tier}
                    </Badge>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {/* 말투 선택 */}
          <div>
            <h3 className={`text-lg font-semibold mb-4 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              {conceptOptions.find((c) => c.id === selectedConcept)?.label} 나레이션 말투
            </h3>
            <RadioGroup value={selectedTone} onValueChange={setSelectedTone}>
              <div className="grid grid-cols-2 gap-4">
                {currentTones.map((toneOption) => (
                  <div key={toneOption.id}>
                    <RadioGroupItem
                      value={toneOption.id}
                      id={toneOption.id}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={toneOption.id}
                      className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedTone === toneOption.id
                          ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                          : theme === 'dark'
                            ? 'border-gray-700 bg-gray-900 hover:border-gray-600'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <MessageSquare className={`h-5 w-5 ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`} />
                      <span className={`flex-1 ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        {toneOption.label}
                      </span>
                      <Badge
                        variant={toneOption.tier === 'LIGHT' ? 'default' : 'secondary'}
                      >
                        {toneOption.tier}
                      </Badge>
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
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

