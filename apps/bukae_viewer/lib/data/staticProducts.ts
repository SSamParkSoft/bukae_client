import { Product, TopProduct } from '@/lib/types/viewer'

const PRODUCT_URLS = {
  gomgom:
    'https://www.coupang.com/vp/products/8325333573?itemId=24032870241&vendorItemId=90892428366&src=1139000&spec=10799999&addtag=400&ctag=8325333573&lptag=AF4647824&itime=20251120203344&pageType=PRODUCT&pageValue=8325333573&wPcid=17510469561163597660443&wRef=&wTime=20251120203344&redirect=landing&traceid=V0-181-cb173513b88dc145&mcid=5544124932b74523a4ce3bae3417cac7&campaignid=&clickBeacon=&imgsize=&pageid=&sig=&subid=&campaigntype=&puid=&ctime=&portal=&landing_exp=&placementid=&puidType=&contentcategory=&tsource=&deviceid=&contenttype=&token=&impressionid=&requestid=&contentkeyword=&offerId=&subparam=',
  spal:
    'https://www.coupang.com/vp/products/8325333573?itemId=24032870241&vendorItemId=90892428366&src=1139000&spec=10799999&addtag=400&ctag=8325333573&lptag=AF4647824&itime=20251120203344&pageType=PRODUCT&pageValue=8325333573&wPcid=17510469561163597660443&wRef=&wTime=20251120203344&redirect=landing&traceid=V0-181-cb173513b88dc145&mcid=5544124932b74523a4ce3bae3417cac7&campaignid=&clickBeacon=&imgsize=&pageid=&sig=&subid=&campaigntype=&puid=&ctime=&portal=&landing_exp=&placementid=&puidType=&contentcategory=&tsource=&deviceid=&contenttype=&token=&impressionid=&requestid=&contentkeyword=&offerId=&subparam=',
  comet:
    'https://www.coupang.com/vp/products/8255333234?itemId=23773049706&vendorItemId=90797307191&src=1139000&spec=10799999&addtag=400&ctag=8255333234&lptag=AF4647824&itime=20251120203358&pageType=PRODUCT&pageValue=8255333234&wPcid=17510469561163597660443&wRef=&wTime=20251120203358&redirect=landing&traceid=V0-181-ceba89151785fca8&mcid=4579fed751d0403fb2bcc8f43bbec685&campaignid=&clickBeacon=&imgsize=&pageid=&sig=&subid=&campaigntype=&puid=&ctime=&portal=&landing_exp=&placementid=&puidType=&contentcategory=&tsource=&deviceid=&contenttype=&token=&impressionid=&requestid=&contentkeyword=&offerId=&subparam=',
  milk:
    'https://www.coupang.com/vp/products/181699807?itemId=520561494&vendorItemId=85694345825&src=1139000&spec=10799999&addtag=400&ctag=181699807&lptag=AF4647824&itime=20251120203401&pageType=PRODUCT&pageValue=181699807&wPcid=17510469561163597660443&wRef=&wTime=20251120203401&redirect=landing&traceid=V0-181-81e5ee4cf0a4cd21&mcid=c4ce7403a3fc435581559ed6a8773c7e&campaignid=&clickBeacon=&imgsize=&pageid=&sig=&subid=&campaigntype=&puid=&ctime=&portal=&landing_exp=&placementid=&puidType=&contentcategory=&tsource=&deviceid=&contenttype=&token=&impressionid=&requestid=&contentkeyword=&offerId=&subparam=',
  viper:
    'https://www.coupang.com/vp/products/8609316210?itemId=24969131250&vendorItemId=91974737006&src=1139000&spec=10799999&addtag=400&ctag=8609316210&lptag=AF4647824&itime=20251120203404&pageType=PRODUCT&pageValue=8609316210&wPcid=17510469561163597660443&wRef=&wTime=20251120203404&redirect=landing&traceid=V0-181-d7f087c23b2393b7&mcid=4cf9c0d3d7e545fbb186eeab9760568a&campaignid=&clickBeacon=&imgsize=&pageid=&sig=&subid=&campaigntype=&puid=&ctime=&portal=&landing_exp=&placementid=&puidType=&contentcategory=&tsource=&deviceid=&contenttype=&token=&impressionid=&requestid=&contentkeyword=&offerId=&subparam=',
} as const

export const STATIC_PRODUCTS: Product[] = [
  {
    id: 'gomgom',
    productId: 1001,
    name: '곰곰 감자탕볶음밥 (냉동), 300g, 6개',
    price: 13520,
    description: '국산 육수 · 냉동 · 6팩 구성',
    order: 1,
    thumbnailUrl: '/dummy/gomgom.png',
    url: PRODUCT_URLS.gomgom,
  },
  {
    id: 'spal',
    productId: 1002,
    name: '추성훈 스파알 포터블 목 어깨 마사지기 블랙라벨 2400',
    price: 63580,
    description: '휴대용 · 블랙라벨 2400 · 6헤드',
    order: 2,
    thumbnailUrl: '/dummy/spal.png',
    url: PRODUCT_URLS.spal,
  },
  {
    id: 'comet',
    productId: 1003,
    name: '코멧 자동 센서 모션 인식 냄새차단 쓰레기통 15L+18L [1+1]',
    price: 21990,
    description: '모션센서 · 15L+18L · 이중 실링',
    order: 3,
    thumbnailUrl: '/dummy/comet.png',
    url: PRODUCT_URLS.comet,
  },
  {
    id: 'milk',
    productId: 1004,
    name: '밀크바오밥 바디워시 화이트머스크향, 1L, 1개',
    price: 12990,
    description: '화이트 머스크향 · 1,000ml · 펌프 타입',
    order: 4,
    thumbnailUrl: '/dummy/milk.png',
    url: PRODUCT_URLS.milk,
  },
  {
    id: 'viper-v3',
    productId: 1005,
    name: '레이저 Viper V3 Pro Faker Edition 무선 마우스',
    price: 279000,
    description: 'Faker 한정판 · 초경량 무선 게이밍',
    order: 5,
    thumbnailUrl: '/dummy/viper v3.png',
    url: PRODUCT_URLS.viper,
  },
]

export const STATIC_TOP_PRODUCTS: TopProduct[] = [
  {
    productId: 1001,
    productName: '곰곰 감자탕볶음밥 (냉동), 300g, 6개',
    thumbnailUrl: '/dummy/gomgom.png',
    totalQuantity: 142,
    totalGmv: 4242960,
    averagePrice: 29880,
    orderCount: 96,
    productUrl: PRODUCT_URLS.gomgom,
  },
  {
    productId: 1002,
    productName: '추성훈 스파알 포터블 목 어깨 마사지기 블랙라벨 2400',
    thumbnailUrl: '/dummy/spal.png',
    totalQuantity: 88,
    totalGmv: 12232000,
    averagePrice: 139000,
    orderCount: 63,
    productUrl: PRODUCT_URLS.spal,
  },
  {
    productId: 1003,
    productName: '코멧 자동 센서 모션 인식 냄새차단 쓰레기통 15L+18L [1+1]',
    thumbnailUrl: '/dummy/comet.png',
    totalQuantity: 310,
    totalGmv: 6816900,
    averagePrice: 21990,
    orderCount: 187,
    productUrl: PRODUCT_URLS.comet,
  },
  {
    productId: 1004,
    productName: '밀크바오밥 바디워시 화이트머스크향, 1L, 1개',
    thumbnailUrl: '/dummy/milk.png',
    totalQuantity: 260,
    totalGmv: 4368000,
    averagePrice: 16800,
    orderCount: 145,
    productUrl: PRODUCT_URLS.milk,
  },
  {
    productId: 1005,
    productName: '레이저 Viper V3 Pro Faker Edition 무선 마우스',
    thumbnailUrl: '/dummy/viper v3.png',
    totalQuantity: 54,
    totalGmv: 11826000,
    averagePrice: 219000,
    orderCount: 52,
    productUrl: PRODUCT_URLS.viper,
  },
]

