import type { Product } from '@/store/useVideoCreateStore'

export const SPAEL_PRODUCT_ID = 'spael-neck-massager'

export const SPAEL_PRODUCT: Product = {
  id: SPAEL_PRODUCT_ID,
  name: '스파알 포터블 목 어깨 마사지기',
  price: 60900,
  image: '/media/spael-massager.png',
  platform: 'coupang',
  url: 'https://www.coupang.com/vp/products/spael-neck-massager',
  description: '6개의 손맛 헤드로 목·어깨를 시원하게 풀어주는 프리미엄 마사지기',
}

export const isSpaelProduct = (product?: Product | null) => product?.id === SPAEL_PRODUCT_ID

