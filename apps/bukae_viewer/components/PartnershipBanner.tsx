'use client'

export default function PartnershipBanner() {
  const text = '이 게시물은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.'

  return (
    <div className="relative w-full overflow-hidden bg-white py-2">
      <div className="flex animate-scroll-left whitespace-nowrap">
        <span className="text-xs sm:text-sm text-gray-700 px-4">
          {text}
        </span>
        <span className="text-xs sm:text-sm text-gray-700 px-4">
          {text}
        </span>
        <span className="text-xs sm:text-sm text-gray-700 px-4">
          {text}
        </span>
        <span className="text-xs sm:text-sm text-gray-700 px-4">
          {text}
        </span>
      </div>
    </div>
  )
}

