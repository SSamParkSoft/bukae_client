'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useSendVerificationEmail, useVerifyEmail, useSignUp } from '@/lib/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useThemeStore } from '@/store/useThemeStore'
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'

export default function SignUpPage() {
  const router = useRouter()
  const theme = useThemeStore((state) => state.theme)
  const sendEmailMutation = useSendVerificationEmail()
  const verifyEmailMutation = useVerifyEmail()
  const signUpMutation = useSignUp()

  const [step, setStep] = useState<'email' | 'verify' | 'signup'>('email')
  const [email, setEmail] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSendVerification = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!email) {
      setError('이메일을 입력해주세요.')
      return
    }

    try {
      await sendEmailMutation.mutateAsync(email)
      setSuccess('인증 코드가 이메일로 발송되었습니다.')
      setStep('verify')
    } catch (err: any) {
      setError(err?.message || '인증 코드 발송에 실패했습니다.')
    }
  }

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!verificationCode || verificationCode.length !== 6) {
      setError('6자리 인증 코드를 입력해주세요.')
      return
    }

    try {
      await verifyEmailMutation.mutateAsync({ email, code: verificationCode })
      setSuccess('이메일 인증이 완료되었습니다.')
      setStep('signup')
    } catch (err: any) {
      setError(err?.message || '인증 코드가 올바르지 않습니다.')
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

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
      setSuccess('회원가입이 완료되었습니다. 로그인 페이지로 이동합니다.')
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    } catch (err: any) {
      setError(err?.message || '회원가입에 실패했습니다.')
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
              {step === 'email' && '회원가입'}
              {step === 'verify' && '이메일 인증'}
              {step === 'signup' && '정보 입력'}
            </CardTitle>
            <CardDescription className="text-center">
              {step === 'email' && '이메일을 입력하여 인증 코드를 받으세요'}
              {step === 'verify' && '이메일로 받은 인증 코드를 입력하세요'}
              {step === 'signup' && '회원 정보를 입력하세요'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 'email' && (
              <form onSubmit={handleSendVerification} className="space-y-4">
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
                    disabled={sendEmailMutation.isPending}
                    required
                    className={theme === 'dark' ? 'bg-gray-900 border-gray-700' : ''}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={sendEmailMutation.isPending}
                >
                  {sendEmailMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      발송 중...
                    </>
                  ) : (
                    '인증 코드 받기'
                  )}
                </Button>
              </form>
            )}

            {step === 'verify' && (
              <form onSubmit={handleVerifyEmail} className="space-y-4">
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
                  <Label htmlFor="email-display">이메일</Label>
                  <Input
                    id="email-display"
                    type="email"
                    value={email}
                    disabled
                    className={theme === 'dark' ? 'bg-gray-900 border-gray-700' : ''}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="code">인증 코드</Label>
                  <Input
                    id="code"
                    type="text"
                    placeholder="000000"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    disabled={verifyEmailMutation.isPending}
                    required
                    maxLength={6}
                    className={theme === 'dark' ? 'bg-gray-900 border-gray-700' : ''}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setStep('email')
                      setVerificationCode('')
                      setError(null)
                      setSuccess(null)
                    }}
                  >
                    이전
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={verifyEmailMutation.isPending}
                  >
                    {verifyEmailMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        확인 중...
                      </>
                    ) : (
                      '인증 확인'
                    )}
                  </Button>
                </div>
              </form>
            )}

            {step === 'signup' && (
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

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setStep('verify')
                      setName('')
                      setPassword('')
                      setConfirmPassword('')
                      setError(null)
                      setSuccess(null)
                    }}
                  >
                    이전
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
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
                </div>
              </form>
            )}

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

