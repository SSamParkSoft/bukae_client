'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useThemeStore } from '@/store/useThemeStore'
import { Loader2, AlertCircle } from 'lucide-react'
import { authApi } from '@/lib/api/auth'

export default function LoginPage() {
  const router = useRouter()
  const theme = useThemeStore((state) => state.theme)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleGoogleLogin = async () => {
    setError(null)
    setIsLoading(true)
    try {
      await authApi.loginWithGoogle()
      // 실제 리다이렉트는 Supabase가 처리
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : '구글 로그인 시작 중 오류가 발생했습니다.'
      setError(message)
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-full max-w-md"
      >
        <Card className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}>
          <CardHeader className="space-y-1">
            <CardTitle className={`text-2xl font-bold text-center ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              로그인
            </CardTitle>
            <CardDescription className="text-center">
              Google 계정으로 부캐 스튜디오에 로그인하세요
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="flex items-center justify-center gap-2 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}

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

            <p className={`text-xs text-center ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            }`}>
              로그인 시 서비스 이용약관 및 개인정보 처리방침에 동의하게 됩니다.
            </p>

            <button
              type="button"
              className={`w-full text-xs text-center underline ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`}
              onClick={() => router.push('/')}
            >
              메인 페이지로 돌아가기
            </button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

