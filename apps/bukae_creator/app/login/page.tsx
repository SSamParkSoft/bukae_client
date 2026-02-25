'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Loader2, AlertCircle, ArrowRight, TestTube } from 'lucide-react'
import { authApi } from '@/lib/api/auth'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isDev, setIsDev] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Hydration 에러 방지를 위해 클라이언트에서만 상태 설정
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
     
    setIsDev(
      process.env.NODE_ENV === 'development' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
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
      await authApi.loginAsTestAdmin()
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : '구글 로그인 시작 중 오류가 발생했어요.'
      setError(message)
      setIsLoading(false)
    }
  }

  return (
    <div 
      className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden"
      style={{
        background: '#f2f9f7',
        width: '100%',
        maxWidth: '100vw'
      }}
    >
      <div 
        className="w-full flex flex-col items-center space-y-8" 
        style={{ 
          minWidth: '320px',
          maxWidth: '512px',
          width: '100%'
        }}
      >
        {/* 상단 브랜딩 영역 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center text-center"
          style={{ 
            width: '100%',
            maxWidth: '100%'
          }}
        >
          <h1 
            className="font-bold mb-3 tracking-tight"
            style={{
              fontSize: '32px',
              lineHeight: '44.8px',
              color: '#234B60',
              fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif',
              whiteSpace: 'nowrap',
              display: 'inline-block',
              width: 'auto',
              margin: '0 auto'
            }}
          >
            부캐
          </h1>
          <p 
            className="mb-6"
            style={{
              fontSize: '18px',
              lineHeight: '25.2px',
              color: '#2c2c2c',
              fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif',
              whiteSpace: 'normal',
              display: 'block',
              width: '100%',
              textAlign: 'center',
              wordBreak: 'keep-all'
            }}
          >
            AI 기반 영상 제작 스튜디오
          </p>
          
          {/* 소개 버튼 */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl border-2 transition-all shadow-[var(--shadow-card-default)]"
            style={{
              backgroundColor: '#5e8790',
              borderColor: '#5e8790',
              color: 'white',
              fontSize: '16px',
              lineHeight: '22.4px',
              fontWeight: '600',
              fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#3b6574'
              e.currentTarget.style.borderColor = '#3b6574'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#5e8790'
              e.currentTarget.style.borderColor = '#5e8790'
            }}
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
        >
          <div 
            className="w-2 h-2 rounded-full border-2"
            style={{
              backgroundColor: '#5e8790',
              borderColor: '#88a9ac'
            }}
          />
        </motion.div>

        {/* 로그인 버튼 영역 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="w-full space-y-4"
        >
          {error && (
            <div 
              className="flex items-center justify-center gap-2 rounded-lg p-3 border"
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderColor: 'rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                fontSize: '14px',
                lineHeight: '19.6px',
                boxShadow: '0px 2px 10px rgba(0, 0, 0, 0.08), 0px 0px 20px rgba(0, 0, 0, 0.04)',
                fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif'
              }}
            >
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          {/* 구글 로그인 버튼 */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="gsi-material-button"
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
          </div>

          {/* 약관 동의 텍스트 */}
          <p 
            className="text-center"
            style={{
              fontSize: '12px',
              lineHeight: '16.8px',
              color: '#5d5d5d',
              fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif'
            }}
          >
            로그인 시 서비스 이용약관 및 개인정보 처리방침에 동의하게 됩니다.
          </p>

          {/* 개발 환경 구글 로그인 버튼 (Supabase 우회) */}
          {mounted && isDev && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="pt-4 space-y-2"
              style={{
                borderTop: '1px solid #e3e3e3'
              }}
            >
              <button
                type="button"
                onClick={handleTestAdminLogin}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[var(--shadow-card-default)]"
                style={{
                  backgroundColor: '#e4eeed',
                  borderColor: '#88a9ac',
                  color: '#234B60',
                  fontSize: '14px',
                  lineHeight: '19.6px',
                  fontWeight: '500',
                  fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif'
                }}
                onMouseEnter={(e) => {
                  if (!isLoading) {
                    e.currentTarget.style.backgroundColor = '#88a9ac'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isLoading) {
                    e.currentTarget.style.backgroundColor = '#e4eeed'
                  }
                }}
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
              <p 
                className="text-center"
                style={{
                  fontSize: '12px',
                  lineHeight: '16.8px',
                  color: '#5d5d5d',
                  fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif'
                }}
              >
                개발 환경에서만 표시됩니다. 실제 구글 계정으로 로그인합니다.
              </p>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
