'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowUpRight, User, ExternalLink, LogIn } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { useThemeStore } from '@/store/useThemeStore'
import { useUserStore } from '@/store/useUserStore'
import { useState } from 'react'

const PERSONAL_HOME_URL = 'https://bookae-client-bookae-viewer.vercel.app/ssambak'

export default function HomeShortcut() {
  const theme = useThemeStore((state) => state.theme)
  const { user, isAuthenticated } = useUserStore()
  const [imageError, setImageError] = useState(false)

  const isLoggedIn = isAuthenticated && user
  const showProfileImage = isLoggedIn && user?.profileImage && !imageError

  return (
    <Link
      href={isLoggedIn ? PERSONAL_HOME_URL : '/login'}
      target={isLoggedIn ? '_blank' : undefined}
      rel={isLoggedIn ? 'noopener noreferrer' : undefined}
      className="block"
    >
      <Card
        className={`group border-2 border-gray-200 transition-all cursor-pointer hover:shadow-lg ${
          theme === 'dark'
            ? 'bg-gradient-to-r from-purple-950/40 to-purple-900/20 hover:from-purple-950/60 hover:to-purple-900/40'
            : 'bg-gradient-to-r from-purple-50 to-white hover:from-purple-100 hover:to-purple-50'
        }`}
      >
        <CardContent className="flex items-center gap-6 p-6">
          {/* 프로필 이미지 */}
          <div className={`relative w-[72px] h-[72px] rounded-full flex items-center justify-center shrink-0 overflow-hidden ${
            theme === 'dark' ? 'bg-purple-900/40' : 'bg-purple-100'
          }`}>
            {showProfileImage && user.profileImage ? (
              <Image
                key={user.profileImage}
                src={user.profileImage}
                alt={user.name || '프로필'}
                fill
                sizes="72px"
                className="rounded-full object-cover"
                onError={() => setImageError(true)}
                onLoad={() => setImageError(false)}
              />
            ) : (
              isLoggedIn ? (
                <User className={`w-9 h-9 ${
                  theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                }`} />
              ) : (
                <LogIn className={`w-9 h-9 ${
                  theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                }`} />
              )
            )}
          </div>

          {/* 프로필 정보 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h3 className={`font-bold text-2xl ${
                theme === 'dark' ? 'text-purple-200' : 'text-purple-700'
              }`}>
                {isLoggedIn ? '내 프로필 보기' : '로그인하기'}
              </h3>
              {isLoggedIn && (
                <ExternalLink className={`w-6 h-6 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${
                  theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                }`} />
              )}
            </div>
            <p className={`text-lg font-semibold truncate ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            }`}>
              {isLoggedIn 
                ? `${user?.name || '사용자'}님의 공개 프로필 페이지로 이동`
                : '로그인하여 서비스를 이용하세요'
              }
            </p>
          </div>

          {/* 화살표 아이콘 */}
          <div className={`shrink-0 transition-transform group-hover:translate-x-1 ${
            theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
          }`}>
            <ArrowUpRight className="w-7 h-7" />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

