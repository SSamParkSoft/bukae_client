'use client'

import { Headphones } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import ButtonEffect from './ButtonEffect'

export interface VoiceOption {
  id: string
  name: string
  gender?: 'male' | 'female'
}

interface VoiceSelectorProps {
  title?: string
  voices: VoiceOption[]
  selectedVoice?: string
  onSelect?: (voiceId: string) => void
  className?: string
  showSelectedVoice?: boolean
}

export default function VoiceSelector({
  title = '목소리 선택',
  voices,
  selectedVoice,
  onSelect,
  className,
  showSelectedVoice = false,
}: VoiceSelectorProps) {
  const femaleVoices = voices.filter((v) => v.gender === 'female' || !v.gender)
  const maleVoices = voices.filter((v) => v.gender === 'male')

  const renderVoiceButton = (voice: VoiceOption) => {
    const isSelected = selectedVoice === voice.id
    return (
      <div key={voice.id} className="flex items-center gap-2">
        <Headphones className="w-6 h-6 text-[#2c2c2c] shrink-0" />
        <ButtonEffect
          state={isSelected ? 'select' : 'off'}
          onClick={() => onSelect?.(voice.id)}
          size="default"
        >
          <span className="text-base font-semibold">{voice.name}</span>
        </ButtonEffect>
      </div>
    )
  }

  return (
    <Card className={cn('p-6', className)}>
      <div className="mb-4">
        <h3 className="text-2xl font-bold text-[#111111] mb-2">{title}</h3>
        {showSelectedVoice && selectedVoice && (
          <p className="text-base font-bold text-[#3b6574]">
            선택된 목소리: {voices.find((v) => v.id === selectedVoice)?.name || ''}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* 여성 목소리 */}
        {femaleVoices.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-2xl font-bold text-[#111111] text-center pb-2 border-b border-[#d9d9d9]">
              여성 목소리
            </h4>
            <div className="space-y-3">
              {femaleVoices.map(renderVoiceButton)}
            </div>
          </div>
        )}

        {/* 남성 목소리 */}
        {maleVoices.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-2xl font-bold text-[#111111] text-center pb-2 border-b border-[#d9d9d9]">
              남성 목소리
            </h4>
            <div className="space-y-3">
              {maleVoices.map(renderVoiceButton)}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
