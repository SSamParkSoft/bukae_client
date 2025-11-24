// 채널 정보 타입
export interface ChannelInfo {
  id: string
  name: string
  profileImage?: string
  description?: string
  youtubeChannelId?: string
  youtubeChannelName?: string
  subscriberCount?: number
  businessEmail?: string
}

// Top 5 제품 타입
export interface TopProduct {
  productId: number
  productName: string
  thumbnailUrl?: string
  totalQuantity: number // 주문 수 합계
  totalGmv: number // 총 거래 금액
  averagePrice: number // 평균 가격
  orderCount: number // 주문 건수
  productUrl?: string
}

// 제품 그리드용 제품 타입
export interface Product {
  id: string
  productId: number
  name: string
  price: number
  image?: string
  thumbnailUrl?: string
  description?: string
  order: number // 순서 (ID)
  url?: string
}

// 채널 통계 타입
export interface ChannelStats {
  topProducts: TopProduct[]
  totalOrders: number
  totalRevenue: number
  totalGmv: number
}

