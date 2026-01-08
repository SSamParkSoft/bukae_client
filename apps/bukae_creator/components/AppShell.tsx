'use client'

import { usePathname } from 'next/navigation'
import BukaeTop from './BukaeTop'

const PUBLIC_PATHS = ['/login', '/signup', '/login/callback', '/oauth/callback']

interface AppShellProps {
  children: React.ReactNode
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname()
  const isPublicRoute = PUBLIC_PATHS.includes(pathname)

  // 현재 step 감지
  const getCurrentStep = (): number => {
    if (pathname.includes('/step4')) return 4
    if (pathname.includes('/step3')) return 3
    if (pathname.includes('/step2')) return 2
    if (pathname.includes('/step1')) return 1
    return 0
  }

  const currentStep = getCurrentStep()

  // Step별 타원 배치 설정
  const getEllipseConfig = () => {
    switch (currentStep) {
      case 1:
        // Step1: 상단 배치
        return {
          position1: { top: '65%', left: '15%', transform: 'translateY(-50%)' },
        }
      case 2:
        // Step2: 중앙 배치
        return {
          position1: { top: '70%', left: '15%', transform: 'translate(-50%, -50%)' },
          position3: { top: '80%', right: '-15%', transform: 'translate(0, -50%)' },
        }
      case 3:
        // Step3: 하단 배치
        return {
          position1: { bottom: '30%', left: '15%', transform: 'translateY(50%)' },
          position2: { bottom: '15%', left: '-19%', transform: 'translateY(50%)' },
          position3: { bottom: '10%', right: '-13%', transform: 'translateY(50%)' },
        }
      default:
        // 기본값: 하단 배치
        return {
          position1: { bottom: '0%', left: '15%', transform: 'translateY(50%)' },
          position2: { bottom: '5%', left: '-20%', transform: 'translateY(50%)' },
          position3: { bottom: '0%', right: '-15%', transform: 'translateY(50%)' },
        }
    }
  }

  const ellipseConfig = getEllipseConfig()

  // 테두리 표시 여부 (true로 변경하면 테두리가 표시됩니다)
  const showEllipseBorder = false

  if (isPublicRoute) {
    return <>{children}</>
  }

  return (
    <div className="relative flex flex-col h-screen bg-gradient-to-b from-brand-background-start to-brand-background-end overflow-hidden">
      {/* 배경 장식 타원들 */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {/* 왼쪽 타원 */}
        {showEllipseBorder && (
          <div 
            className="absolute rounded-full"
            style={{
              ...ellipseConfig.position1,
              width: '1171px',
              height: '591px',
              border: '12px solid #234b60',
              opacity: 0.5,
            }}
          />
        )}
        <div 
          className="absolute rounded-full bg-[#234b60]"
          style={{
            ...ellipseConfig.position1,
            width: '1171px',
            height: '591px',
            opacity: 0.3,
            filter: 'blur(100px)',
          }}
        />
        {/* 왼쪽 중앙 타원 (position2가 있는 경우만 표시) */}
        {ellipseConfig.position2 && (
          <>
            {showEllipseBorder && (
              <div 
                className="absolute rounded-full"
                style={{
                  ...ellipseConfig.position2,
                  width: '705px',
                  height: '591px',
                  border: '12px solid #234b60',
                  opacity: 0.5,
                }}
              />
            )}
            <div 
              className="absolute rounded-full bg-[#234b60]"
              style={{
                ...ellipseConfig.position2,
                width: '705px',
                height: '591px',
                opacity: 0.3,
                filter: 'blur(100px)',
              }}
            />
          </>
        )}
        {/* 오른쪽 타원 (position3가 있는 경우만 표시) */}
        {ellipseConfig.position3 && (
          <>
            {showEllipseBorder && (
              <div 
                className="absolute rounded-full"
                style={{
                  ...ellipseConfig.position3,
                  width: '741px',
                  height: '591px',
                  border: '12px solid #234b60',
                  opacity: 0.5,
                }}
              />
            )}
            <div 
              className="absolute rounded-full bg-[#234b60]"
              style={{
                ...ellipseConfig.position3,
                width: '741px',
                height: '591px',
                opacity: 0.3,
                filter: 'blur(100px)',
              }}
            />
          </>
        )}
      </div>
      
      <BukaeTop />
      <main className="relative z-10 flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}

