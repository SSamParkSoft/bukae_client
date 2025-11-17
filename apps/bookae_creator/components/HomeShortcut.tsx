'use client'

import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useThemeStore } from '@/store/useThemeStore'

const PERSONAL_HOME_URL = 'https://bookae-client-bookae-viewer.vercel.app/ssambak'

export default function HomeShortcut() {
  const theme = useThemeStore((state) => state.theme)

  return (
    <Card
      className={`border-2 border-gray-200 ${
        theme === 'dark'
          ? 'bg-gradient-to-r from-purple-950/40 to-purple-900/20'
          : 'bg-gradient-to-r from-purple-50 to-white'
      }`}
    >
      <CardHeader className="pb-3">
        <CardTitle
          className={`text-base ${
            theme === 'dark' ? 'text-purple-200' : 'text-purple-700'
          }`}
        >
          내 홈페이지 바로가기
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <p
          className={`text-sm ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
          }`}
        >
          클릭하면 내 북애 뷰어 페이지가 새 탭에서 열립니다.
        </p>
        <Link
          href={PERSONAL_HOME_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-purple-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-purple-500"
        >
          방문하기
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </CardContent>
    </Card>
  )
}

