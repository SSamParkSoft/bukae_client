import { NextResponse } from 'next/server'
import {
  CoupangStats,
  CoupangApiResponse,
  CoupangDailyClick,
  CoupangDailyOrder,
  CoupangDailyCancellation,
  CoupangDailyRevenue,
} from '@/lib/types/statistics'

// 날짜를 YYYYMMDD 형식으로 변환
const formatDate = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

// 더미 데이터용 상품 및 카테고리 목록
const productNames = [
  '무선 블루투스 이어폰',
  '스마트워치 프로',
  '노트북 스탠드',
  '무선 마우스',
  '키보드 패드',
  'USB-C 케이블',
  '스마트폰 케이스',
  '태블릿 거치대',
  '노이즈 캔슬링 헤드폰',
  '무선 충전기',
  '블루투스 스피커',
  '웹캠 HD',
  '외장하드 1TB',
  '메모리카드 128GB',
  'USB 허브',
]

const categories = [
  '전자제품',
  '컴퓨터/노트북',
  '스마트폰/태블릿',
  '오디오/영상',
  '게이밍',
  '생활가전',
  '패션의류',
  '뷰티',
  '식품',
  '도서',
]

// TODO: 실제 쿠팡파트너스 API 연동
// 현재는 더미 데이터 반환 (실제 API 응답 구조와 동일)
export async function GET() {
  try {
    // 더미 데이터 생성 (최근 7일)
    const today = new Date()
    const trackingCode = 'AF1234567'
    const subId = 'A1234567890'

    // 일별 클릭수 더미 데이터
    const dailyViews: CoupangDailyClick[] = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today)
      date.setDate(date.getDate() - (6 - i))
      // 주말에는 클릭수가 적고, 평일에는 많음
      const dayOfWeek = date.getDay()
      const baseClick = dayOfWeek === 0 || dayOfWeek === 6 ? 300 : 800
      return {
        date: formatDate(date),
        trackingCode,
        subId,
        addtag: '400',
        ctag: 'Home',
        click: Math.floor(Math.random() * 500) + baseClick,
      }
    })

    // 일별 주문정보 더미 데이터 (하루에 여러 주문 가능)
    const dailyOrders: CoupangDailyOrder[] = []
    Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today)
      date.setDate(date.getDate() - (6 - i))
      const dayOfWeek = date.getDay()
      // 주말에는 주문이 적고, 평일에는 많음
      const orderCount = dayOfWeek === 0 || dayOfWeek === 6 ? 3 : 8

      Array.from({ length: orderCount }, (_, j) => {
        const productIndex = (i * orderCount + j) % productNames.length
        const categoryIndex = (i * orderCount + j) % categories.length
        const gmv = Math.floor(Math.random() * 200000) + 30000
        const commissionRate = Math.random() > 0.5 ? 3 : 5
        const commission = Math.floor((gmv * commissionRate) / 100)
        
        // 더미 썸네일 이미지 URL 생성 (placeholder.com 사용)
        const thumbnailUrl = `https://via.placeholder.com/200x200/a78bfa/ffffff?text=${encodeURIComponent(productNames[productIndex].substring(0, 2))}`

        dailyOrders.push({
          date: formatDate(date),
          trackingCode,
          subId,
          addtag: '400',
          ctag: 'Home',
          orderId: 12345678901234 + i * 100 + j,
          productId: 1234567 + i * 100 + j,
          productName: productNames[productIndex],
          quantity: Math.floor(Math.random() * 3) + 1,
          gmv,
          commissionRate,
          commission,
          categoryName: categories[categoryIndex],
          thumbnailUrl,
        })
      })
    })

    // 일별 취소정보 더미 데이터 (하루에 여러 취소 가능)
    const dailyCancellations: CoupangDailyCancellation[] = []
    Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today)
      date.setDate(date.getDate() - (6 - i))
      const orderDate = new Date(date)
      orderDate.setDate(orderDate.getDate() - Math.floor(Math.random() * 3) - 1)
      // 취소는 주문의 10-20% 정도
      const cancelCount = Math.floor(Math.random() * 2) + 1

      Array.from({ length: cancelCount }, (_, j) => {
        const productIndex = (i * 10 + j) % productNames.length
        const categoryIndex = (i * 10 + j) % categories.length
        const gmv = Math.floor(Math.random() * 100000) + 20000
        const commissionRate = Math.random() > 0.5 ? 3 : 5
        const commission = Math.floor((gmv * commissionRate) / 100)

        dailyCancellations.push({
          orderDate: formatDate(orderDate),
          date: formatDate(date),
          trackingCode,
          subId,
          addtag: '400',
          ctag: 'Home',
          orderId: 12345678901000 + i * 100 + j,
          productId: 1234500 + i * 100 + j,
          productName: productNames[productIndex],
          quantity: Math.floor(Math.random() * 2) + 1,
          gmv,
          commissionRate,
          commission,
          categoryName: categories[categoryIndex],
        })
      })
    })

    // 일별 수익정보 더미 데이터
    const dailyRevenue: CoupangDailyRevenue[] = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today)
      date.setDate(date.getDate() - (6 - i))
      const view = dailyViews[i]
      const dayOrders = dailyOrders.filter((o) => o.date === formatDate(date))
      const dayCancellations = dailyCancellations.filter((c) => c.date === formatDate(date))
      
      const totalGmv = dayOrders.reduce((sum, o) => sum + o.gmv, 0)
      const totalCommission = dayOrders.reduce((sum, o) => sum + o.commission, 0)

      return {
        date: formatDate(date),
        trackingCode,
        subId,
        commission: totalCommission,
        click: view.click,
        order: dayOrders.length,
        cancel: dayCancellations.length,
        gmv: totalGmv,
      }
    })

    const statsData: CoupangStats = {
      dailyViews,
      dailyOrders,
      dailyCancellations,
      dailyRevenue,
    }

    // 실제 API 연동 시 아래 주석 해제하고 수정
    // const [clicksRes, ordersRes, cancellationsRes, revenueRes] = await Promise.all([
    //   fetch('https://api-gateway.coupang.com/v2/providers/affiliate_open_api/apis/openapi/reports/daily-clicks', {
    //     headers: {
    //       'Authorization': `Bearer ${process.env.COUPANG_API_KEY}`,
    //       'Content-Type': 'application/json',
    //     },
    //   }),
    //   fetch('https://api-gateway.coupang.com/v2/providers/affiliate_open_api/apis/openapi/reports/daily-orders', {
    //     headers: {
    //       'Authorization': `Bearer ${process.env.COUPANG_API_KEY}`,
    //       'Content-Type': 'application/json',
    //     },
    //   }),
    //   fetch('https://api-gateway.coupang.com/v2/providers/affiliate_open_api/apis/openapi/reports/daily-cancellations', {
    //     headers: {
    //       'Authorization': `Bearer ${process.env.COUPANG_API_KEY}`,
    //       'Content-Type': 'application/json',
    //     },
    //   }),
    //   fetch('https://api-gateway.coupang.com/v2/providers/affiliate_open_api/apis/openapi/reports/daily-revenue', {
    //     headers: {
    //       'Authorization': `Bearer ${process.env.COUPANG_API_KEY}`,
    //       'Content-Type': 'application/json',
    //     },
    //   }),
    // ])
    //
    // const clicksData: CoupangApiResponse<CoupangDailyClick> = await clicksRes.json()
    // const ordersData: CoupangApiResponse<CoupangDailyOrder> = await ordersRes.json()
    // const cancellationsData: CoupangApiResponse<CoupangDailyCancellation> = await cancellationsRes.json()
    // const revenueData: CoupangApiResponse<CoupangDailyRevenue> = await revenueRes.json()
    //
    // const statsData: CoupangStats = {
    //   dailyViews: clicksData.data,
    //   dailyOrders: ordersData.data,
    //   dailyCancellations: cancellationsData.data,
    //   dailyRevenue: revenueData.data,
    // }

    return NextResponse.json(statsData)
  } catch (error) {
    console.error('쿠팡 통계 API 오류:', error)
    return NextResponse.json(
      { error: '통계 데이터를 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

