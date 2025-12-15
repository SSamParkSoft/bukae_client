'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useSignUp } from '@/lib/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useThemeStore } from '@/store/useThemeStore'
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'

export default function SignUpPage() {
  const router = useRouter()
  const theme = useThemeStore((state) => state.theme)
  const signUpMutation = useSignUp()

  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!email) {
      setError('이메일을 입력해주세요.')
      return
    }

    if (!name || name.length < 2 || name.length > 20) {
      setError('이름은 2자 이상 20자 이하여야 합니다.')
      return
    }

    if (!password || password.length < 6 || password.length > 20) {
      setError('비밀번호는 6자 이상 20자 이하여야 합니다.')
      return
    }

    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }

    try {
      await signUpMutation.mutateAsync({ email, name, password })
      setSuccess('회원가입이 완료되었습니다. 이메일로 전송된 확인 링크를 눌러주세요.')
      setTimeout(() => {
        router.push('/login')
      }, 2500)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '회원가입에 실패했습니다.'
      setError(message)
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
              회원가입
            </CardTitle>
            <CardDescription className="text-center">
              Supabase 기반 이메일/비밀번호 계정을 생성합니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignUp} className="space-y-4">
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

              {success && (
                <div className={`rounded-lg border p-3 flex items-center gap-2 ${
                  theme === 'dark'
                    ? 'bg-green-900/20 border-green-700 text-green-300'
                    : 'bg-green-50 border-green-200 text-green-800'
                }`}>
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-sm">{success}</span>
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
                  disabled={signUpMutation.isPending}
                  required
                  className={theme === 'dark' ? 'bg-gray-900 border-gray-700' : ''}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">이름</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="홍길동"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={signUpMutation.isPending}
                  required
                  minLength={2}
                  maxLength={20}
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
                  disabled={signUpMutation.isPending}
                  required
                  minLength={6}
                  maxLength={20}
                  className={theme === 'dark' ? 'bg-gray-900 border-gray-700' : ''}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">비밀번호 확인</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={signUpMutation.isPending}
                  required
                  minLength={6}
                  maxLength={20}
                  className={theme === 'dark' ? 'bg-gray-900 border-gray-700' : ''}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={signUpMutation.isPending}
              >
                {signUpMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    가입 중...
                  </>
                ) : (
                  '회원가입'
                )}
              </Button>
            </form>

            <div className={`mt-6 text-center text-sm ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              이미 계정이 있으신가요?{' '}
              <button
                onClick={() => router.push('/login')}
                className={`font-medium hover:underline ${
                  theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                }`}
              >
                로그인
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

