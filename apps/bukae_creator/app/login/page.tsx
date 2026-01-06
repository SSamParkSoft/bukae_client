'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Loader2, AlertCircle, ArrowRight, TestTube } from 'lucide-react'
import { authApi } from '@/lib/api/auth'
import { useUserStore } from '@/store/useUserStore'

const mapSupabaseUser = (user: {
  id: string
  email?: string
  created_at?: string
  user_metadata?: Record<string, unknown>
}) => {
  const fullName = (user.user_metadata?.full_name as string | undefined) ?? ''
  const fallbackName = user.email?.split('@')[0] ?? '사용자'

  return {
    id: user.id,
    name: fullName || fallbackName,
    email: user.email ?? '',
    profileImage: user.user_metadata?.avatar_url as string | undefined,
    createdAt: user.created_at ?? new Date().toISOString(),
    accountStatus: 'active' as const,
  }
}

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isDev, setIsDev] = useState(false)
  const setUser = useUserStore((state) => state.setUser)

  useEffect(() => {
    // 개발 환경 확인
    setIsDev(
      process.env.NODE_ENV === 'development' &&
      (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
    )
  }, [])

  const handleGoogleLogin = async () => {
    setError(null)
    setIsLoading(true)
    try {
      await authApi.loginWithGoogle()
      // 실제 리다이렉트는 Supabase가 처리
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : '구글 로그인 시작 중 오류가 발생했어요.'
      setError(message)
      setIsLoading(false)
    }
  }

  const handleTestAdminLogin = async () => {
    setError(null)
    setIsLoading(true)
    try {
      // 개발 환경에서는 구글 OAuth를 통해 실제 토큰 획득
      // OAuth 콜백에서 자동으로 처리됨
      await authApi.loginAsTestAdmin()
      // OAuth 리다이렉트가 발생하므로 여기서는 아무것도 하지 않음
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : '구글 로그인 시작 중 오류가 발생했어요.'
      setError(message)
      setIsLoading(false)
    }
  }

  return (
    <div 
      className="flex min-h-screen flex-col items-center justify-center p-4 relative overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #a78bfa 0%, #c4b5fd 50%, #ddd6fe 100%)'
      }}
    >
      {/* 상단 브랜딩 영역 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col items-center mb-8 mt-16"
      >
        <h1 className="text-5xl font-bold text-white mb-3 tracking-tight">
          부캐
        </h1>
        <p className="text-white/90 text-lg mb-6">
          AI 기반 영상 제작 스튜디오
        </p>
        
        {/* 소개 버튼 */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 text-white text-sm font-medium hover:bg-white/30 transition-all"
          onClick={() => router.push('/')}
        >
          <span>부캐를 소개합니다</span>
          <ArrowRight className="w-4 h-4" />
        </motion.button>
      </motion.div>

      {/* 중앙 인디케이터 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="mb-12"
      >
        <div className="w-2 h-2 rounded-full bg-white border-2 border-purple-300" />
      </motion.div>

      {/* 로그인 버튼 영역 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="w-full max-w-sm space-y-4"
      >
        {error && (
          <div className="flex items-center justify-center gap-2 text-red-100 text-sm bg-red-500/20 backdrop-blur-sm rounded-lg p-3 border border-red-300/30">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {/* 구글 로그인 버튼 */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          className="gsi-material-button mx-auto flex items-center justify-center"
          disabled={isLoading}
        >
          <div className="gsi-material-button-state" />
          <div className="gsi-material-button-content-wrapper">
            <div className="gsi-material-button-icon">
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 48 48"
                >
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  />
                  <path fill="none" d="M0 0h48v48H0z" />
                </svg>
              )}
            </div>
            <span className="gsi-material-button-contents">
              {isLoading ? '구글로 이동 중...' : 'Sign in with Google'}
            </span>
            <span style={{ display: 'none' }}>Sign in with Google</span>
          </div>
        </button>

        {/* 약관 동의 텍스트 */}
        <p className="text-white/80 text-xs text-center px-4">
          로그인 시 서비스 이용약관 및 개인정보 처리방침에 동의하게 됩니다.
        </p>

        {/* 개발 환경 구글 로그인 버튼 (Supabase 우회) */}
        {isDev && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="pt-4 border-t border-white/20"
          >
            <button
              type="button"
              onClick={handleTestAdminLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-yellow-500/20 backdrop-blur-sm border border-yellow-300/30 text-yellow-100 text-sm font-medium hover:bg-yellow-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>구글로 이동 중...</span>
                </>
              ) : (
                <>
                  <TestTube className="w-4 h-4" />
                  <span>구글 계정으로 로그인 (개발용, Supabase 우회)</span>
                </>
              )}
            </button>
            <p className="text-yellow-200/70 text-xs text-center mt-2 px-4">
              개발 환경에서만 표시됩니다. 실제 구글 계정으로 로그인합니다.
            </p>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}

