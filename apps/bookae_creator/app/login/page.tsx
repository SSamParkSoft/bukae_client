'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useLogin } from '@/lib/hooks/useAuth'
import { useUserStore } from '@/store/useUserStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useThemeStore } from '@/store/useThemeStore'
import { Loader2, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const theme = useThemeStore((state) => state.theme)
  const { checkAuth } = useUserStore()
  const loginMutation = useLogin()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email || !password) {
      setError('이메일과 비밀번호를 입력해주세요.')
      return
    }

    try {
      await loginMutation.mutateAsync({ email, password })
      // 로그인 성공 시 인증 상태 업데이트
      checkAuth()
      // 홈으로 리다이렉트
      router.push('/')
    } catch (err: any) {
      setError(
        err?.message || '로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.'
      )
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
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
              Bookae 계정으로 로그인하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className={`rounded-lg border p-3 flex items-center gap-2 ${
                  theme === 'dark'
                    ? 'bg-red-900/20 border-red-700 text-red-300'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">이메일</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loginMutation.isPending}
                  required
                  className={theme === 'dark' ? 'bg-gray-900 border-gray-700' : ''}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">비밀번호</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loginMutation.isPending}
                  required
                  className={theme === 'dark' ? 'bg-gray-900 border-gray-700' : ''}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    로그인 중...
                  </>
                ) : (
                  '로그인'
                )}
              </Button>
            </form>

            <div className={`mt-6 text-center text-sm ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              계정이 없으신가요?{' '}
              <button
                onClick={() => router.push('/signup')}
                className={`font-medium hover:underline ${
                  theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                }`}
              >
                회원가입
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

