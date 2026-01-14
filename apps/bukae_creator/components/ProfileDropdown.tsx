'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, User } from 'lucide-react'
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
  const [dropdownWidth, setDropdownWidth] = useState<number | undefined>(undefined)

  // 프로필 버튼의 너비를 측정하여 드롭다운 너비에 적용
  useEffect(() => {
    if (buttonRef.current) {
      setDropdownWidth(buttonRef.current.offsetWidth)
    }
  }, [isOpen, user])

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleLogout = async () => {
    try {
      await authApi.logout()
      reset()
      router.push('/login')
      setIsOpen(false)
    } catch (error) {
      console.error('로그아웃 실패:', error)
    }
  }

  const handleMyPage = () => {
    router.push('/profile')
    setIsOpen(false)
  }

  if (!user) return null

  const subscriptionPlan = user.subscriptionPlan || 'Free'
  const displayPlan = subscriptionPlan === 'none' ? 'Free' : subscriptionPlan
  const isAdmin = isAdminEmail(user.email)

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center h-[60px] px-5 rounded-3xl bg-white/10 gap-4 shadow-md hover:bg-white/20 transition-colors"
      >
        {/* 프로필 사진 */}
        {user.profileImage ? (
          <Image
            src={user.profileImage}
            alt={user.name}
            width={40}
            height={40}
            className="w-10 h-10 rounded-xl object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-xl bg-[#e3b8ff] flex items-center justify-center shrink-0">
            <span className="text-white text-base font-bold">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        
        {/* 사용자 이름 */}
        <span className="text-base font-bold text-[#454545] whitespace-nowrap">
          {user.name}
        </span>
        
        {/* 요금제 (Pro Track) */}
        <span className="text-base font-bold text-[#5e8790] whitespace-nowrap">
          {displayPlan}
        </span>
        
        {/* Admin 표시 */}
        {isAdmin && (
          <span className="text-base font-bold text-red-500 whitespace-nowrap">
            Admin
          </span>
        )}
      </button>

      {/* 드롭다운 메뉴 */}
      {isOpen && (
        <div 
          className="absolute top-full left-0 mt-2 rounded-3xl bg-white shadow-lg z-50 overflow-hidden"
          style={{ width: dropdownWidth ? `${dropdownWidth}px` : 'auto' }}
        >
          {/* 버튼 영역 */}
          <div className="p-2 space-y-2">
            {/* 업그레이드 버튼 */}
            <button
              onClick={() => {
                // TODO: 업그레이드 페이지로 이동
                setIsOpen(false)
              }}
              className="w-full h-10 rounded-xl bg-[#5e8790] text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#4a6d75] transition-colors"
            >
              <Image
                src="/star-icon.svg"
                alt="Star"
                width={24}
                height={24}
                className="w-6 h-6"
              />
              업그레이드
            </button>

            {/* 로그아웃 버튼 */}
            <button
              onClick={handleLogout}
              className="w-full h-10 rounded-xl bg-white/20 border border-[#5e8790] text-[#5e8790] text-sm font-bold flex items-center justify-center gap-2 hover:bg-white/30 transition-colors"
            >
              <LogOut className="w-6 h-6" />
              로그아웃
            </button>

            {/* 마이페이지 버튼 */}
            <button
              onClick={handleMyPage}
              className="w-full h-10 rounded-xl bg-white/20 border border-[#5e8790] text-[#5e8790] text-sm font-bold flex items-center justify-center gap-2 hover:bg-white/30 transition-colors"
            >
              <User className="w-6 h-6" />
              마이페이지
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
