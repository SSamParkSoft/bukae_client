// 쿠팡파트너스 API 응답 공통 구조
export interface CoupangApiResponse<T> {
  rCode: string
  rMessage: string
  data: T[]
}

// 일별 클릭수
export interface CoupangDailyClick {
  date: string // YYYYMMDD 형식
  trackingCode: string
  subId: string
  addtag: string
  ctag: string
  click: number
}

// 일별 주문정보
export interface CoupangDailyOrder {
  date: string // YYYYMMDD 형식
  trackingCode: string
  subId: string
  addtag: string
  ctag: string
  orderId: number
  productId: number
  productName: string
  quantity: number
  gmv: number // 총 주문 금액
  commissionRate: number // 수수료율 (%)
  commission: number // 수수료
  categoryName: string
  thumbnailUrl?: string // 상품 썸네일 이미지 URL
}

// 일별 취소정보
export interface CoupangDailyCancellation {
  orderDate: string // YYYYMMDD 형식
  date: string // YYYYMMDD 형식 (취소일)
  trackingCode: string
  subId: string
  addtag: string
  ctag: string
  orderId: number
  productId: number
  productName: string
  quantity: number
  gmv: number // 취소된 주문 금액
  commissionRate: number
  commission: number // 취소된 수수료
  categoryName: string
}

// 일별 수익정보
export interface CoupangDailyRevenue {
  date: string // YYYYMMDD 형식
  trackingCode: string
  subId: string
  commission: number // 수익
  click: number
  order: number
  cancel: number
  gmv: number // 총 거래 금액
}

// 통계 페이지에서 사용할 가공된 데이터 구조
export interface CoupangStats {
  dailyViews: CoupangDailyClick[]
  dailyOrders: CoupangDailyOrder[]
  dailyCancellations: CoupangDailyCancellation[]
  dailyRevenue: CoupangDailyRevenue[]
}

// 유튜브 애널리틱스 통계 타입
export interface YouTubeTrafficSource {
  source: string
  percentage: number
}

export interface YouTubeVideo {
  videoId: string
  title: string
  thumbnailUrl?: string
  publishedAt?: string
  views?: number
}

export interface YouTubeStats {
  videoId?: string
  videoTitle?: string
  // 수익 관련 (우선 표시)
  totalEstimatedRevenue: number
  adRevenue: number
  cpm: number
  monetizedPlaybacks: number
  // 기타 통계
  views: number
  likes: number
  dislikes: number
  subscriberChange: number
  trafficSources: YouTubeTrafficSource[]
}

