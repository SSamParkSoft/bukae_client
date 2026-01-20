'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, BarChart3, Ticket } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { isAdminEmail } from '@/lib/utils/admin'
import { useUserStore } from '@/store/useUserStore'
import { authApi } from '@/lib/api/auth'
import Image from 'next/image'

interface ProfileDropdownProps {
  className?: string
}

export default function ProfileDropdown({ className }: ProfileDropdownProps) {
  const router = useRouter()
  const { user, reset } = useUserStore()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [credits, setCredits] = useState<number | null>(null)
  const [dropdownWidth, setDropdownWidth] = useState<number | undefined>(undefined)

  // 프로필 버튼의 너비를 측정하여 드롭다운 너비에 적용
  useEffect(() => {
    if (buttonRef.current) {
      setDropdownWidth(buttonRef.current.offsetWidth)
    }
  }, [isOpen, user])

  // 크레딧 정보 가져오기
  useEffect(() => {
    if (user && isOpen) {
      // TODO: API를 통해 크레딧 정보 가져오기
      // 임시로 9999로 설정
      setCredits(9999)
    }
  }, [user, isOpen])

  const handleLogout = async () => {
    try {
      await authApi.logout()
      reset()
      router.push('/login')
    } catch (error) {
      console.error('로그아웃 실패:', error)
    }
  }

  const handleStatistics = () => {
    router.push('/statistics')
  }

  const handleMouseEnter = () => {
    setIsOpen(true)
  }

  const handleMouseLeave = () => {
    setIsOpen(false)
  }

  if (!user) return null

  const subscriptionPlan = user.subscriptionPlan || 'Free'
  const displayPlan = subscriptionPlan === 'none' ? 'Free' : subscriptionPlan
  const isAdmin = isAdminEmail(user.email)

  // 크레딧 표시 포맷팅
  const formatCredits = (credits: number | null) => {
    if (credits === null) return '9999'
    return credits.toLocaleString()
  }

  return (
    <div 
      className={cn('relative', className)} 
      ref={dropdownRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        ref={buttonRef}
        className="flex items-center h-[58px] px-5 rounded-3xl bg-white/10 gap-3 shadow-md hover:bg-white/20 transition-colors"
      >
        {/* 프로필 사진 */}
        {user.profileImage ? (
          <Image
            src={user.profileImage}
            alt={user.name}
            width={36}
            height={36}
            className="w-9 h-9 rounded-xl object-cover"
          />
        ) : (
          <div className="w-9 h-9 rounded-xl bg-[#e3b8ff] flex items-center justify-center shrink-0">
            <span className="text-white text-sm font-bold">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        
        {/* 사용자 이름 */}
        <span className="text-sm font-bold text-[#454545] whitespace-nowrap">
          {user.name}
        </span>
        
        {/* 요금제 (Pro Track) - Admin이 아닐 때만 표시 */}
        {!isAdmin && (
          <span className="text-sm font-bold text-[#5e8790] whitespace-nowrap">
            {displayPlan}
          </span>
        )}
        
        {/* Admin 표시 */}
        {isAdmin && (
          <span className="text-sm font-bold text-red-500 whitespace-nowrap">
            Admin
          </span>
        )}
      </button>

      {/* 드롭다운 메뉴 - 프로필 버튼 너비에 맞춤 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute top-full left-0 mt-2 rounded-2xl bg-white/60 backdrop-blur-sm shadow-lg z-50 overflow-hidden"
            style={{ width: dropdownWidth ? `${dropdownWidth}px` : 'auto' }}
          >
          <div className="p-3 space-y-2.5">
            {/* 상단 프로필 영역 */}
            <div className="flex items-center gap-2.5 h-8">
              {/* 프로필 이미지 */}
              {user.profileImage ? (
                <Image
                  src={user.profileImage}
                  alt={user.name}
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded-lg object-cover shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-[#e3b8ff] flex items-center justify-center shrink-0">
                  <span className="text-white text-xs font-bold">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              
              {/* 프로필 텍스트와 요금제 */}
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <span className="text-xs font-bold text-[#454545] whitespace-nowrap">
                  프로필
                </span>
                {/* 요금제 - Admin이 아닐 때만 표시 */}
                {!isAdmin && (
                  <div className="px-1.5 py-0.5 rounded-lg bg-transparent">
                    <span className="text-xs font-bold text-[#5e8790] whitespace-nowrap">
                      {displayPlan}
                    </span>
                  </div>
                )}
                {/* Admin 표시 */}
                {isAdmin && (
                  <div className="px-1.5 py-0.5 rounded-lg bg-transparent">
                    <span className="text-xs font-bold text-red-500 whitespace-nowrap">
                      Admin
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 크레딧 영역 */}
            <div className="h-8 rounded-lg bg-transparent flex items-center gap-2 px-0">
              <Ticket className="w-5 h-5 text-[#454545] shrink-0" />
              <div className="flex items-baseline gap-1 flex-1 min-w-0">
                <span className="text-xl font-bold text-[#454545] leading-none">
                  {formatCredits(credits)}
                </span>
                <span className="text-[10px] font-bold text-[#454545] leading-none">
                  /1만 크레딧
                </span>
              </div>
            </div>

            {/* 메뉴 버튼들 */}
            <div className="space-y-1.5 pt-1">
              {/* 업그레이드 버튼 */}
              <button
                onClick={() => {
                  // TODO: 업그레이드 페이지로 이동
                }}
                className="w-full h-9 rounded-lg bg-[#5e8790] text-white text-xs font-bold flex items-center justify-center gap-2 hover:bg-[#4a6d75] transition-colors"
              >
                <Ticket className="w-5 h-5" />
                업그레이드
              </button>

              {/* 성과 통계 버튼 */}
              <button
                onClick={handleStatistics}
                className="w-full h-9 rounded-lg bg-white/20 border border-[#5e8790] text-[#5e8790] text-xs font-bold flex items-center justify-center gap-2 hover:bg-white/30 transition-colors"
              >
                <BarChart3 className="w-5 h-5" />
                성과 통계
              </button>

              {/* 로그아웃 버튼 */}
              <button
                onClick={handleLogout}
                className="w-full h-9 rounded-lg bg-white/20 border border-[#5e8790] text-[#5e8790] text-xs font-bold flex items-center justify-center gap-2 hover:bg-white/30 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                로그아웃
              </button>
            </div>
          </div>
        </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
