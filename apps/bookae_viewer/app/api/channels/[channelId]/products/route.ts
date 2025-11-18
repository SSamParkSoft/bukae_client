import { NextResponse } from 'next/server'
import { Product } from '@/lib/types/viewer'

// 더미 제품 데이터 (bookae_creator 구조 참고)
const generateDummyProducts = (channelId: string): Product[] => {
  // 30가지 제품 목록 (29개 음식 + 1개 스파알)
  const productTemplates = [
    { name: '일본 카레라이스 1인분', price: 7200, color: 'f59e0b', desc: '진짜 비주얼', text: '카레' },
    { name: '마파두부 1인분', price: 15200, color: 'ef4444', desc: '진은 상식당 염치는', text: '마파두부' },
    { name: '돈까스 정식 1인분', price: 16600, color: '10b981', desc: '진심 돈까스 맛집 정도로 맛있음', text: '돈까스' },
    { name: '새우튀김 10개', price: 6800, color: '3b82f6', desc: '개당 700원도 안함', text: '새우' },
    { name: '치킨가라아게 1인분', price: 12500, color: 'f97316', desc: '이자카야 가라아케 맛', text: '치킨' },
    { name: '피자 마르게리타 L', price: 18900, color: 'ef4444', desc: '이탈리아 정통 피자', text: '피자' },
    { name: '햄버거 세트', price: 12900, color: 'f59e0b', desc: '프리미엄 햄버거', text: '햄버거' },
    { name: '파스타 카르보나라', price: 14900, color: 'f97316', desc: '부드러운 크림 파스타', text: '파스타' },
    { name: '스테이크 200g', price: 29900, color: 'dc2626', desc: '프리미엄 스테이크', text: '스테이크' },
    { name: '초밥 세트 12pcs', price: 24900, color: '06b6d4', desc: '신선한 회 초밥', text: '초밥' },
    { name: '라멘 1인분', price: 11900, color: 'f59e0b', desc: '진한 돈코츠 라멘', text: '라멘' },
    { name: '비빔밥 세트 1인분', price: 8900, color: '10b981', desc: '영양만점 한끼', text: '비빔밥' },
    { name: '김치찌개 1인분', price: 7500, color: 'ef4444', desc: '얼큰한 맛', text: '김치찌개' },
    { name: '된장찌개 1인분', price: 5500, color: '8b5cf6', desc: '집밥 같은 맛', text: '된장찌개' },
    { name: '짜장면 1인분', price: 11900, color: 'f59e0b', desc: '달콤한 짜장면', text: '짜장면' },
    { name: '볶음밥 1인분', price: 9900, color: 'f97316', desc: '고소한 볶음밥', text: '볶음밥' },
    { name: '타코 3개', price: 8900, color: 'ef4444', desc: '멕시칸 타코', text: '타코' },
    { name: '샌드위치 세트', price: 10900, color: '10b981', desc: '신선한 샌드위치', text: '샌드위치' },
    { name: '샐러드 볼', price: 8900, color: '10b981', desc: '건강한 샐러드', text: '샐러드' },
    { name: '수프 1인분', price: 6900, color: '3b82f6', desc: '따뜻한 수프', text: '수프' },
    { name: '연어 스테이크 200g', price: 18900, color: '06b6d4', desc: '신선한 노르웨이 연어', text: '연어' },
    { name: '삼겹살 구이 300g', price: 15900, color: 'f59e0b', desc: '두툼한 삼겹살', text: '삼겹살' },
    { name: '스파알 포터블 목 어깨 마사지기', price: 60900, color: '8b5cf6', desc: '6개의 손맛 헤드로 목·어깨를 시원하게 풀어주는 프리미엄 마사지기', text: '스파알', isSpael: true },
    { name: '불고기 300g', price: 24900, color: 'dc2626', desc: '프리미엄 한우 불고기', text: '불고기' },
    { name: '치킨윙 10개', price: 12900, color: 'f97316', desc: '바삭한 치킨윙', text: '치킨윙' },
    { name: '갈비탕 1인분', price: 19900, color: 'dc2626', desc: '진한 국물', text: '갈비탕' },
    { name: '설렁탕 1인분', price: 18900, color: '3b82f6', desc: '깔끔한 설렁탕', text: '설렁탕' },
    { name: '순두부찌개 1인분', price: 8900, color: 'ec4899', desc: '부드러운 순두부', text: '순두부' },
    { name: '김치전 4장', price: 6900, color: 'ef4444', desc: '바삭한 김치전', text: '김치전' },
    { name: '케이크 1조각', price: 8900, color: 'ec4899', desc: '달콤한 케이크', text: '케이크' },
  ]

  // 30가지 제품 이미지 URL 매핑 - Unsplash에서 찾기 쉬운 음식 사진 (23번은 스파알 제외)
  const productImages: Record<number, string> = {
    1: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&h=400&fit=crop', // 카레
    2: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400&h=400&fit=crop', // 마파두부
    3: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&h=400&fit=crop', // 돈까스
    4: 'https://images.unsplash.com/photo-1626700051175-54f28ea4c103?w=400&h=400&fit=crop', // 새우튀김
    5: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=400&h=400&fit=crop', // 치킨가라아게
    6: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=400&fit=crop', // 피자
    7: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=400&h=400&fit=crop', // 햄버거
    8: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=400&h=400&fit=crop', // 파스타
    9: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&h=400&fit=crop', // 스테이크
    10: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400&h=400&fit=crop', // 초밥
    11: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&h=400&fit=crop', // 라멘
    12: 'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=400&h=400&fit=crop', // 비빔밥
    13: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=400&fit=crop', // 김치찌개
    14: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=400&fit=crop', // 된장찌개
    15: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&h=400&fit=crop', // 짜장면
    16: 'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=400&h=400&fit=crop', // 볶음밥
    17: 'https://images.unsplash.com/photo-1565299585323-38174c3b0d2e?w=400&h=400&fit=crop', // 타코
    18: 'https://images.unsplash.com/photo-1539252554453-80ab65ce3586?w=400&h=400&fit=crop', // 샌드위치
    19: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=400&fit=crop', // 샐러드
    20: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=400&fit=crop', // 수프
    21: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&h=400&fit=crop', // 연어
    22: 'https://images.unsplash.com/photo-1528607929212-4d8e5c0c8b8b?w=400&h=400&fit=crop', // 삼겹살
    24: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400&h=400&fit=crop', // 불고기
    25: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=400&h=400&fit=crop', // 치킨윙
    26: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=400&fit=crop', // 갈비탕
    27: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=400&fit=crop', // 설렁탕
    28: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=400&fit=crop', // 순두부찌개
    29: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&h=400&fit=crop', // 김치전
    30: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=400&fit=crop', // 케이크
  }

  // 제품 목록 생성
  const products: Product[] = productTemplates.map((template, index) => {
    const order = index + 1
    
    // 23번째 제품(인덱스 22)은 스파알 제품
    if ((template as any).isSpael) {
      return {
        id: 'spael-neck-massager',
        productId: 23,
        name: template.name,
        price: template.price,
        image: '/media/num1.png',
        thumbnailUrl: '/media/num1.png',
        description: template.desc,
        order: index + 1,
      }
    }
    
    // 전체 제품에 실제 이미지 사용 (없으면 placeholder)
    const imageUrl = productImages[order] || `https://via.placeholder.com/200/${template.color}/ffffff?text=${encodeURIComponent(template.text)}`
    
    return {
    id: String(index + 1),
    productId: 1234567 + index,
    name: template.name,
    price: template.price,
    image: imageUrl,
    thumbnailUrl: imageUrl,
    description: template.desc,
    order: index + 1,
    }
  })

  return products
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const { channelId } = await params
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''

    // 제품 목록 생성 (추후 실제 API 연동)
    let products = generateDummyProducts(channelId)

    // 검색 필터링 (제목 또는 배지 번호로만 검색)
    if (search) {
      const searchLower = search.toLowerCase()
      const searchNumber = parseInt(search, 10)
      const isNumericSearch = !isNaN(searchNumber) && search.trim() !== ''
      
      products = products.filter(
        (p) =>
          // 제품명(제목) 검색
          p.name.toLowerCase().includes(searchLower) ||
          // 배지에 표시되는 order 번호로만 검색 (정확히 일치)
          (isNumericSearch && p.order === searchNumber)
      )
    }

    // order 기준으로 정렬 (검색 후에도 정렬 유지)
    products.sort((a, b) => a.order - b.order)

    return NextResponse.json(products, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    })
  } catch (error) {
    console.error('제품 목록 API 오류:', error)
    return NextResponse.json(
      { error: '제품 목록을 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

