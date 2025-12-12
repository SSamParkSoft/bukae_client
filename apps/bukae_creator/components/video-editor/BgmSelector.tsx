'use client'

import { Image as ImageIcon, Volume2 } from 'lucide-react'

interface BgmSelectorProps {
  bgmTemplate: string | null
  theme: string
  setBgmTemplate: (template: string | null) => void
}

export function BgmSelector({ bgmTemplate, theme, setBgmTemplate }: BgmSelectorProps) {
  return (
    <div>
      <h3
        className="text-sm font-semibold mb-2"
        style={{
          color: theme === 'dark' ? '#ffffff' : '#111827',
        }}
      >
        배경음악
      </h3>
      <div className="space-y-2">
        <button
          onClick={() => setBgmTemplate('library')}
          className={`w-full p-3 rounded-lg border text-sm text-left transition-colors ${
            bgmTemplate === 'library' ? 'bg-purple-100 dark:bg-purple-900/30 border-purple-500' : ''
          } hover:bg-purple-50 dark:hover:bg-purple-900/20`}
          style={{
            borderColor: bgmTemplate === 'library' ? '#8b5cf6' : theme === 'dark' ? '#374151' : '#e5e7eb',
            color: theme === 'dark' ? '#d1d5db' : '#374151',
          }}
        >
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4" />
            <span>무료 음악 라이브러리</span>
          </div>
        </button>
        <button
          onClick={() => setBgmTemplate('custom')}
          className={`w-full p-3 rounded-lg border text-sm text-left transition-colors ${
            bgmTemplate === 'custom' ? 'bg-purple-100 dark:bg-purple-900/30 border-purple-500' : ''
          } hover:bg-purple-50 dark:hover:bg-purple-900/20`}
          style={{
            borderColor: bgmTemplate === 'custom' ? '#8b5cf6' : theme === 'dark' ? '#374151' : '#e5e7eb',
            color: theme === 'dark' ? '#d1d5db' : '#374151',
          }}
        >
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            <span>내 음악</span>
          </div>
        </button>
      </div>
    </div>
  )
}

