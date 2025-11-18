import { NextResponse } from 'next/server'
import { Product } from '@/lib/types/viewer'

// 더미 제품 데이터 (bookae_creator 구조 참고)
const generateDummyProducts = (channelId: string): Product[] => {
  const productTemplates = [
    { name: '[모노마트] 와후카레 중간 맛(레토르트) 1kg', price: 7200, color: 'f59e0b', desc: '(냄새도) 이야 진짜 비주얼', text: '카레' },
    { name: '[모노마트] 다이쇼 마파두부소스(마라소스) 1.16kg', price: 15200, color: 'ef4444', desc: '진은 상식당 염치는', text: '마파두부' },
    { name: '등심 돈까스 800g (100g*8ea)', price: 16600, color: '10b981', desc: '진심 돈까스 맛집 정도로 맛있음', text: '돈까스' },
    { name: '빵가루 새우 튀김(헤드 OFF) 450g(45g*10ea)', price: 6800, color: '3b82f6', desc: '개당 700원도 안함', text: '새우' },
    { name: '와후 치킨가라아게 1kg', price: 12500, color: 'f97316', desc: '이자카야 가라아케 맛을 집에서 느낄 수 있음', text: '치킨' },
    { name: '고구마 치즈 고로케 720g(40g*18ea)', price: 11500, color: 'a855f7', desc: '진심 싫어할 수가 없는 맛!!', text: '고로케' },
    { name: '닭가슴살 스테이크 500g', price: 8900, color: 'ec4899', desc: '고단백 저지방 건강식', text: '닭가슴살' },
    { name: '연어 스테이크 300g', price: 18900, color: '06b6d4', desc: '신선한 노르웨이 연어', text: '연어' },
    { name: '한우 불고기 400g', price: 24900, color: 'dc2626', desc: '프리미엄 한우 불고기', text: '불고기' },
    { name: '삼겹살 구이용 600g', price: 15900, color: 'f59e0b', desc: '두툼한 삼겹살', text: '삼겹살' },
    { name: '소고기 미역국 500g', price: 6900, color: '3b82f6', desc: '깔끔한 국물맛', text: '미역국' },
    { name: '된장찌개 600g', price: 5500, color: '8b5cf6', desc: '집밥 같은 맛', text: '된장찌개' },
    { name: '김치찌개 700g', price: 7500, color: 'ef4444', desc: '얼큰한 맛', text: '김치찌개' },
    { name: '비빔밥 세트 1인분', price: 8900, color: '10b981', desc: '영양만점 한끼', text: '비빔밥' },
    { name: '짜장면 2인분', price: 11900, color: 'f59e0b', desc: '달콤한 짜장면', text: '짜장면' },
    { name: '짬뽕 2인분', price: 12900, color: 'ef4444', desc: '얼큰한 해물짬뽕', text: '짬뽕' },
    { name: '볶음밥 2인분', price: 9900, color: 'f97316', desc: '고소한 볶음밥', text: '볶음밥' },
    { name: '떡볶이 500g', price: 6500, color: 'ec4899', desc: '쫄깃한 떡볶이', text: '떡볶이' },
    { name: '순대 500g', price: 7500, color: '8b5cf6', desc: '고소한 순대', text: '순대' },
    { name: '어묵탕 600g', price: 8500, color: '06b6d4', desc: '시원한 어묵탕', text: '어묵탕' },
    { name: '닭볶음탕 1kg', price: 18900, color: 'f59e0b', desc: '매콤달콤 닭볶음탕', text: '닭볶음탕' },
    { name: '보쌈 정식 1kg', price: 22900, color: '10b981', desc: '부드러운 보쌈', text: '보쌈' },
    { name: '스파알 포터블 목 어깨 마사지기', price: 60900, color: '8b5cf6', desc: '6개의 손맛 헤드로 목·어깨를 시원하게 풀어주는 프리미엄 마사지기', text: '스파알', isSpael: true },
    { name: '양념치킨 1kg', price: 17900, color: 'f97316', desc: '달콤한 양념치킨', text: '양념치킨' },
    { name: '후라이드치킨 1kg', price: 16900, color: 'f59e0b', desc: '바삭한 후라이드', text: '후라이드' },
    { name: '떡갈비 500g', price: 14900, color: 'ef4444', desc: '부드러운 떡갈비', text: '떡갈비' },
    { name: '갈비탕 700g', price: 19900, color: 'dc2626', desc: '진한 국물', text: '갈비탕' },
    { name: '설렁탕 700g', price: 18900, color: '3b82f6', desc: '깔끔한 설렁탕', text: '설렁탕' },
    { name: '순두부찌개 600g', price: 8900, color: 'ec4899', desc: '부드러운 순두부', text: '순두부' },
    { name: '된장찌개 600g', price: 7500, color: '8b5cf6', desc: '구수한 된장찌개', text: '된장' },
    { name: '김치전 4장', price: 6900, color: 'ef4444', desc: '바삭한 김치전', text: '김치전' },
    { name: '해물파전 4장', price: 11900, color: '06b6d4', desc: '고소한 해물파전', text: '해물파전' },
    { name: '부추전 4장', price: 8900, color: '10b981', desc: '향긋한 부추전', text: '부추전' },
    { name: '계란말이 300g', price: 5900, color: 'f59e0b', desc: '부드러운 계란말이', text: '계란말이' },
    { name: '제육볶음 500g', price: 12900, color: 'dc2626', desc: '매콤한 제육볶음', text: '제육볶음' },
    { name: '오징어볶음 400g', price: 14900, color: '8b5cf6', desc: '쫄깃한 오징어볶음', text: '오징어' },
    { name: '낙지볶음 400g', price: 17900, color: 'ec4899', desc: '신선한 낙지볶음', text: '낙지' },
    { name: '멸치볶음 200g', price: 6900, color: 'f97316', desc: '고소한 멸치볶음', text: '멸치' },
    { name: '어묵볶음 500g', price: 9900, color: '06b6d4', desc: '달콤한 어묵볶음', text: '어묵' },
    { name: '콩나물무침 500g', price: 4900, color: '10b981', desc: '아삭한 콩나물무침', text: '콩나물' },
    { name: '시금치나물 300g', price: 5900, color: '10b981', desc: '영양만점 시금치나물', text: '시금치' },
    { name: '무생채 400g', price: 5500, color: '3b82f6', desc: '아삭한 무생채', text: '무생채' },
    { name: '오이소박이 500g', price: 6900, color: '10b981', desc: '시원한 오이소박이', text: '오이소박이' },
    { name: '깍두기 500g', price: 5900, color: 'ef4444', desc: '얼큰한 깍두기', text: '깍두기' },
    { name: '배추김치 1kg', price: 12900, color: 'ef4444', desc: '신선한 배추김치', text: '배추김치' },
    { name: '열무김치 1kg', price: 11900, color: '10b981', desc: '아삭한 열무김치', text: '열무김치' },
    { name: '갓김치 500g', price: 9900, color: '10b981', desc: '향긋한 갓김치', text: '갓김치' },
    { name: '깻잎장아찌 300g', price: 7900, color: '10b981', desc: '고소한 깻잎장아찌', text: '깻잎' },
    { name: '마늘장아찌 300g', price: 8900, color: 'f59e0b', desc: '알싸한 마늘장아찌', text: '마늘' },
    { name: '고추장아찌 300g', price: 6900, color: 'ef4444', desc: '아삭한 고추장아찌', text: '고추' },
  ]

  // 제품 목록 생성
  const products: Product[] = productTemplates.map((template, index) => {
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
    
    return {
    id: String(index + 1),
    productId: 1234567 + index,
    name: template.name,
    price: template.price,
    image: `https://via.placeholder.com/200/${template.color}/ffffff?text=${encodeURIComponent(template.text)}`,
    thumbnailUrl: `https://via.placeholder.com/200/${template.color}/ffffff?text=${encodeURIComponent(template.text)}`,
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

