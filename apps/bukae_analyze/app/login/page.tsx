import { redirect } from 'next/navigation'
import Image from 'next/image'
import { getServerAccessToken } from '@/lib/server/authSession'
import logo from '@/public/logo.svg'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? ''
const REDIRECT_URI = process.env.NEXT_PUBLIC_OAUTH_REDIRECT_URI ?? ''
const LOGIN_HREF = `${API_BASE_URL}/oauth2/authorization/google?redirect_uri=${encodeURIComponent(REDIRECT_URI)}`

export default async function LoginPage() {
  const accessToken = await getServerAccessToken()

  if (accessToken) {
    redirect('/')
  }

  return (
    <div className="flex h-dvh items-center justify-center">
      <div className="flex flex-col items-center gap-[120px]">
        {/* 로고 + 태그라인 */}
        <div className="flex flex-col items-center gap-4">
          <Image
            src={logo}
            alt="bukae"
            width={259}
            height={80}
            priority
            style={{ width: 'clamp(130px, 18vw, 259px)', height: 'auto' }}
          />
          <p className="font-20-rg text-white/80 tracking-[-0.04em] text-center">
            Plan Your Shorts
          </p>
        </div>

        {/* 버튼 + 약관 안내 */}
        <div className="flex flex-col items-center gap-8">
          <a className="gsi-material-button" href={LOGIN_HREF}>
            <div className="gsi-material-button-state" />
            <div className="gsi-material-button-content-wrapper">
              <div className="gsi-material-button-icon">
                <svg
                  version="1.1"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 48 48"
                  style={{ display: 'block' }}
                >
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  <path fill="none" d="M0 0h48v48H0z" />
                </svg>
              </div>
              <span className="gsi-material-button-contents">Sign in with Google</span>
              <span style={{ display: 'none' }}>Sign in with Google</span>
            </div>
          </a>

          <p className="font-16-md text-white/80 tracking-[-0.04em] text-center">
            로그인 시 서비스 이용약관 및 개인정보 처리방침에 동의하게 됩니다.
          </p>
        </div>
      </div>
    </div>
  )
}
