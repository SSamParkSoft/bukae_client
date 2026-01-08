import { Product, TopProduct } from '@/lib/types/viewer'

const PRODUCT_URLS = {
  gomgom:
    'https://www.coupang.com/vp/products/8219863476?itemId=24070612437&vendorItemId=91090339343&src=1139000&spec=10799999&addtag=400&ctag=8219863476&lptag=AF4647824&itime=20251124175142&pageType=PRODUCT&pageValue=8219863476&wPcid=17510469561163597660443&wRef=&wTime=20251124175142&redirect=landing&traceid=V0-181-d23546ab1e9e8bdc&mcid=1a05349353484ccabe40bdcfbbe016d7&campaignid=&clickBeacon=&imgsize=&pageid=&sig=&subid=&campaigntype=&puid=&ctime=&portal=&landing_exp=&placementid=&puidType=&contentcategory=&tsource=&deviceid=&contenttype=&token=&impressionid=&requestid=&contentkeyword=&offerId=&subparam=',
  spal:
    'https://www.coupang.com/vp/products/8325333573?itemId=24032870241&vendorItemId=90892428366&src=1139000&spec=10799999&addtag=400&ctag=8325333573&lptag=AF4647824&itime=20251120203344&pageType=PRODUCT&pageValue=8325333573&wPcid=17510469561163597660443&wRef=&wTime=20251120203344&redirect=landing&traceid=V0-181-cb173513b88dc145&mcid=5544124932b74523a4ce3bae3417cac7&campaignid=&clickBeacon=&imgsize=&pageid=&sig=&subid=&campaigntype=&puid=&ctime=&portal=&landing_exp=&placementid=&puidType=&contentcategory=&tsource=&deviceid=&contenttype=&token=&impressionid=&requestid=&contentkeyword=&offerId=&subparam=',
  comet:
    'https://www.coupang.com/vp/products/8255333234?itemId=23773049706&vendorItemId=90797307191&src=1139000&spec=10799999&addtag=400&ctag=8255333234&lptag=AF4647824&itime=20251120203358&pageType=PRODUCT&pageValue=8255333234&wPcid=17510469561163597660443&wRef=&wTime=20251120203358&redirect=landing&traceid=V0-181-ceba89151785fca8&mcid=4579fed751d0403fb2bcc8f43bbec685&campaignid=&clickBeacon=&imgsize=&pageid=&sig=&subid=&campaigntype=&puid=&ctime=&portal=&landing_exp=&placementid=&puidType=&contentcategory=&tsource=&deviceid=&contenttype=&token=&impressionid=&requestid=&contentkeyword=&offerId=&subparam=',
  comet_shower_touchcase:
    'https://www.coupang.com/vp/products/7414945883?itemId=19221027558&vendorItemId=86337800425&src=1139000&spec=10799999&addtag=400&ctag=7414945883&lptag=AF4647824&itime=20251217212316&pageType=PRODUCT&pageValue=7414945883&wPcid=17510469561163597660443&wRef=&wTime=20251217212316&redirect=landing&traceid=V0-181-ae6443d3fabd61ff&mcid=052eca0a60654d6ea9358f653e7e9d29&campaignid=&clickBeacon=&imgsize=&pageid=&sig=&subid=&campaigntype=&puid=&ctime=&portal=&landing_exp=&placementid=&puidType=&contentcategory=&tsource=&deviceid=&contenttype=&token=&impressionid=&requestid=&contentkeyword=&offerId=&subparam=',
  milk:
    'https://www.coupang.com/vp/products/181699807?itemId=520561494&vendorItemId=85694345825&src=1139000&spec=10799999&addtag=400&ctag=181699807&lptag=AF4647824&itime=20251120203401&pageType=PRODUCT&pageValue=181699807&wPcid=17510469561163597660443&wRef=&wTime=20251120203401&redirect=landing&traceid=V0-181-81e5ee4cf0a4cd21&mcid=c4ce7403a3fc435581559ed6a8773c7e&campaignid=&clickBeacon=&imgsize=&pageid=&sig=&subid=&campaigntype=&puid=&ctime=&portal=&landing_exp=&placementid=&puidType=&contentcategory=&tsource=&deviceid=&contenttype=&token=&impressionid=&requestid=&contentkeyword=&offerId=&subparam=',
  viper:
    'https://www.coupang.com/vp/products/8609316210?itemId=24969131250&vendorItemId=91974737006&src=1139000&spec=10799999&addtag=400&ctag=8609316210&lptag=AF4647824&itime=20251120203404&pageType=PRODUCT&pageValue=8609316210&wPcid=17510469561163597660443&wRef=&wTime=20251120203404&redirect=landing&traceid=V0-181-d7f087c23b2393b7&mcid=4cf9c0d3d7e545fbb186eeab9760568a&campaignid=&clickBeacon=&imgsize=&pageid=&sig=&subid=&campaigntype=&puid=&ctime=&portal=&landing_exp=&placementid=&puidType=&contentcategory=&tsource=&deviceid=&contenttype=&token=&impressionid=&requestid=&contentkeyword=&offerId=&subparam=',
  sleepandsleep:
    'https://www.coupang.com/vp/products/8529253500?itemId=24694860335&vendorItemId=89625752062&src=1139000&spec=10799999&addtag=400&ctag=8529253500&lptag=AF4647824&itime=20251127202722&pageType=PRODUCT&pageValue=8529253500&wPcid=17510469561163597660443&wRef=&wTime=20251127202722&redirect=landing&traceid=V0-181-fbce8af0ad776348&mcid=2071b6f7292149e082d6af96b6d3d4e8&campaignid=&clickBeacon=&imgsize=&pageid=&sig=&subid=&campaigntype=&puid=&ctime=&portal=&landing_exp=&placementid=&puidType=&contentcategory=&tsource=&deviceid=&contenttype=&token=&impressionid=&requestid=&contentkeyword=&offerId=&subparam=',
  dashu_nipple_band:
    'https://www.coupang.com/vp/products/7335670569?itemId=781216890&vendorItemId=4977555248&src=1139000&spec=10799999&addtag=400&ctag=7335670569&lptag=AF4647824&itime=20251218171509&pageType=PRODUCT&pageValue=7335670569&wPcid=17510469561163597660443&wRef=&wTime=20251218171509&redirect=landing&traceid=V0-181-fd475d0924b6aa71&mcid=21fcaa0e65ec40f8908a6147f0f34d53&campaignid=&clickBeacon=&imgsize=&pageid=&sig=&subid=&campaigntype=&puid=&ctime=&portal=&landing_exp=&placementid=&puidType=&contentcategory=&tsource=&deviceid=&contenttype=&token=&impressionid=&requestid=&contentkeyword=&offerId=&sfId=&subparam=',
  pork_belly:
    'https://www.coupang.com/vp/products/5450317509?itemId=8315410809&vendorItemId=75603273343&src=1139000&spec=10799999&addtag=400&ctag=5450317509&lptag=AF4647824&itime=20251229193340&pageType=PRODUCT&pageValue=5450317509&wPcid=17510469561163597660443&wRef=&wTime=20251229193340&redirect=landing&traceid=V0-181-e43da220d2f96555&mcid=c0bfddb73be447088a3725e16d622e8d&campaignid=&clickBeacon=&imgsize=&pageid=&sig=&subid=&campaigntype=&puid=&ctime=&portal=&landing_exp=&placementid=&puidType=&contentcategory=&tsource=&deviceid=&contenttype=&token=&impressionid=&requestid=&contentkeyword=&offerId=&sfId=&subparam=',
  estra_sunscreen:
    'https://www.coupang.com/vp/products/8567202716?itemId=22126066236&vendorItemId=86249756142&src=1139000&spec=10799999&addtag=400&ctag=8567202716&lptag=AF4647824&itime=20251229193441&pageType=PRODUCT&pageValue=8567202716&wPcid=17510469561163597660443&wRef=&wTime=20251229193441&redirect=landing&traceid=V0-181-dcadeaa802540824&mcid=63352bbe88a841508c40acf7d7ddcb18&campaignid=&clickBeacon=&imgsize=&pageid=&sig=&subid=&campaigntype=&puid=&ctime=&portal=&landing_exp=&placementid=&puidType=&contentcategory=&tsource=&deviceid=&contenttype=&token=&impressionid=&requestid=&contentkeyword=&offerId=&sfId=&subparam=',
  gomgom_pork_fried_rice:
    'https://www.coupang.com/vp/products/1310396683?itemId=2327020825&vendorItemId=70323614196&src=1139000&spec=10799999&addtag=400&ctag=1310396683&lptag=AF4647824&itime=20251229193512&pageType=PRODUCT&pageValue=1310396683&wPcid=17510469561163597660443&wRef=&wTime=20251229193512&redirect=landing&traceid=V0-181-6ffbe2ec47993f6b&mcid=aad30b5b4c65424096ad1c8d004b0417&campaignid=&clickBeacon=&imgsize=&pageid=&sig=&subid=&campaigntype=&puid=&ctime=&portal=&landing_exp=&placementid=&puidType=&contentcategory=&tsource=&deviceid=&contenttype=&token=&impressionid=&requestid=&contentkeyword=&offerId=&sfId=&subparam=',
  worldclean_bucket:
    'https://www.coupang.com/vp/products/8481141329?itemId=24606557441&vendorItemId=91617952859&src=1139000&spec=10799999&addtag=400&ctag=8481141329&lptag=AF4647824&itime=20251229193542&pageType=PRODUCT&pageValue=8481141329&wPcid=17510469561163597660443&wRef=&wTime=20251229193542&redirect=landing&traceid=V0-181-d1e557b440f9abd5&mcid=73bdcb3433a94938914cccce50fe885d&campaignid=&clickBeacon=&imgsize=&pageid=&sig=&subid=&campaigntype=&puid=&ctime=&portal=&landing_exp=&placementid=&puidType=&contentcategory=&tsource=&deviceid=&contenttype=&token=&impressionid=&requestid=&contentkeyword=&offerId=&sfId=&subparam=',
  sinjimoru_glass_protector:
    'https://www.coupang.com/vp/products/6131560742?itemId=19908948306&vendorItemId=87097760248&src=1139000&spec=10799999&addtag=400&ctag=6131560742&lptag=AF4647824&itime=20260104060319&pageType=PRODUCT&pageValue=6131560742&wPcid=17510469561163597660443&wRef=&wTime=20260104060319&redirect=landing&traceid=V0-181-14f6d5ff563c987b&mcid=b5d3b54dcc5b4116b8c80210faafc124&campaignid=&clickBeacon=&imgsize=&pageid=&sig=&subid=&campaigntype=&puid=&ctime=&portal=&landing_exp=&placementid=&puidType=&contentcategory=&tsource=&deviceid=&contenttype=&token=&impressionid=&requestid=&contentkeyword=&offerId=&sfId=&subparam=',
  bibigo_samchi:
    'https://www.coupang.com/vp/products/6011993543?itemId=24451885314&vendorItemId=91465703325&src=1139000&spec=10799999&addtag=400&ctag=6011993543&lptag=AF4647824&itime=20260107162225&pageType=PRODUCT&pageValue=6011993543&wPcid=17510469561163597660443&wRef=&wTime=20260107162225&redirect=landing&traceid=V0-181-e76981e4e1a69962&mcid=4d5c6205d54946a69906a625dddfe8fa&campaignid=&clickBeacon=&imgsize=&pageid=&sig=&subid=&campaigntype=&puid=&ctime=&portal=&landing_exp=&placementid=&puidType=&contentcategory=&tsource=&deviceid=&contenttype=&token=&impressionid=&requestid=&contentkeyword=&offerId=&sfId=&subparam=',
  rush_massage_bar:
    'https://www.coupang.com/vp/products/8906749731?itemId=26013724094&vendorItemId=92995575781&src=1139000&spec=10799999&addtag=400&ctag=8906749731&lptag=AF4647824&itime=20260107162443&pageType=PRODUCT&pageValue=8906749731&wPcid=17510469561163597660443&wRef=&wTime=20260107162443&redirect=landing&traceid=V0-181-695a1da0528ef960&mcid=cf0c8ea7072b44cead2b733ece78a541&campaignid=&clickBeacon=&imgsize=&pageid=&sig=&subid=&campaigntype=&puid=&ctime=&portal=&landing_exp=&placementid=&puidType=&contentcategory=&tsource=&deviceid=&contenttype=&token=&impressionid=&requestid=&contentkeyword=&offerId=&sfId=&subparam='
} as const

export const STATIC_PRODUCTS: Product[] = [
  {
    id: 'spal',
    productId: 1002,
    name: '추성훈 스파알 포터블 목 어깨 마사지기 블랙라벨 2400',
    description: '휴대용 · 블랙라벨 2400 · 6헤드',
    order: 1,
    thumbnailUrl: '/dummy/spal.png',
    url: PRODUCT_URLS.spal,
  },
  {
    id: 'milk',
    productId: 1004,
    name: '밀크바오밥 바디워시 화이트머스크향, 1L, 1개',
    description: '화이트 머스크향 · 1,000ml · 펌프 타입',
    order: 2,
    thumbnailUrl: '/dummy/milk.png',
    url: PRODUCT_URLS.milk,
  },
  {
    id: 'viper-v3',
    productId: 1005,
    name: '레이저 Viper V3 Pro Faker Edition 무선 마우스',
    description: 'Faker 한정판 · 초경량 무선 게이밍',
    order: 3,
    thumbnailUrl: '/dummy/viper v3.png',
    url: PRODUCT_URLS.viper,
  },
  {
    id: 'gomgom',
    productId: 1001,
    name: '곰곰 감자탕볶음밥 (냉동), 300g, 6개',
    description: '국산 육수 · 냉동 · 6팩 구성',
    order: 4,
    thumbnailUrl: '/dummy/gomgom.png',
    url: PRODUCT_URLS.gomgom,
  },
  {
    id: 'comet',
    productId: 1003,
    name: '코멧 자동 센서 모션 인식 냄새차단 쓰레기통 15L+18L [1+1]',
    description: '모션센서 · 15L+18L · 이중 실링',
    order: 5,
    thumbnailUrl: '/dummy/comet.png',
    url: PRODUCT_URLS.comet,
  },
  {
    id: 'sleepandsleep',
    productId: 1006,
    name: '(+베이지커버 증정) 슬립앤슬립 깊은잠베개',
    description: '누적판매량 550,000',
    order: 6,
    thumbnailUrl: '/dummy/sleepandsleep.png',
    url: PRODUCT_URLS.sleepandsleep,
  },
]

const SSAMBAK_EXTRA_PRODUCTS: Product[] = [
  {
    id: 'comet-shower-touchcase',
    productId: 1007,
    name: '코멧 김서림 방지 샤워 터치케이스',
    description: '욕실 부착 · 샤워 중 터치 가능 · 김서림 방지',
    order: 7,
    thumbnailUrl:
      '/dummy/shower.png',
    url: PRODUCT_URLS.comet_shower_touchcase,
  },
  {
    id: 'dashu-nipple-band',
    productId: 1008,
    name: '다슈 매직 커버 니플밴드 52매, 2개',
    description: '매직 커버 · 52매 · 2개 구성',
    order: 8,
    thumbnailUrl: '/dummy/dashu_band.png',
    url: PRODUCT_URLS.dashu_nipple_band,
  },
  {
    id: 'bibigo-samchi',
    productId: 1014,
    name: '비비고 순살 삼치구이, 60g, 6개',
    description: '순살 삼치구이 · 60g · 6개',
    order: 9,
    thumbnailUrl: '/dummy/bibigo_samchi.png',
    url: PRODUCT_URLS.bibigo_samchi,
  },
  {
    id: 'rush-massage-bar',
    productId: 1015,
    name: '러쉬 트루 로맨스 마사지 바',
    description: '트루 로맨스 · 마사지 바',
    order: 10,
    thumbnailUrl: '/dummy/rush_massage_bar.png',
    url: PRODUCT_URLS.rush_massage_bar,
  },
  {
    id: 'pork-belly',
    productId: 1009,
    name: '미국산 왕건 돈전지 불고기용 두께 0.3cm (냉동), 3kg, 1개',
    description: '미국산 · 냉동 · 3kg · 불고기용',
    order: 11,
    thumbnailUrl: '/dummy/pork_belly.png',
    url: PRODUCT_URLS.pork_belly,
  },
  {
    id: 'estra-sunscreen',
    productId: 1010,
    name: '에스트라 더마 UV 365 레드진정 톤업 선크림 SPF50+ PA++++',
    description: 'SPF50+ PA++++ · 레드진정 · 톤업',
    order: 12,
    thumbnailUrl: '/dummy/estra_sunscreen.png',
    url: PRODUCT_URLS.estra_sunscreen,
  },
  {
    id: 'gomgom-pork-fried-rice',
    productId: 1011,
    name: '곰곰 대패삼겹 볶음밥 (냉동), 300g, 6개',
    description: '냉동 · 300g · 6개 구성',
    order: 13,
    thumbnailUrl: '/dummy/gomgom_pork_fried_rice.png',
    url: PRODUCT_URLS.gomgom_pork_fried_rice,
  },
  {
    id: 'worldclean-bucket',
    productId: 1012,
    name: '월드크린 다용도 휴대용 버킷',
    description: '다용도 · 휴대용 · 버킷',
    order: 14,
    thumbnailUrl: '/dummy/worldclean_bucket.png',
    url: PRODUCT_URLS.worldclean_bucket,
  },
  {
    id: 'sinjimoru-glass-protector',
    productId: 1013,
    name: '신지모루 풀커버 하이브리드 강화유리 액정보호필름 2매입',
    description: '풀커버 · 하이브리드 · 강화유리 · 2매입',
    order: 15,
    thumbnailUrl: '/dummy/sinjimoru_glass_protector.png',
    url: PRODUCT_URLS.sinjimoru_glass_protector,
  },
]

export function getStaticProducts(channelId?: string): Product[] {
  const products = (channelId === 'ssambak' || channelId === '4rmy3px9') ? [...STATIC_PRODUCTS, ...SSAMBAK_EXTRA_PRODUCTS] : [...STATIC_PRODUCTS]
  products.sort((a, b) => a.order - b.order)
  return products
}

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
  {
    productId: 1006,
    productName: '(+베이지커버 증정) 슬립앤슬립 깊은잠베개',
    thumbnailUrl: '/dummy/sleepandsleep.png',
    totalQuantity: 100,
    totalGmv: 9550000,
    averagePrice: 95500,
    orderCount: 100,
    productUrl: PRODUCT_URLS.sleepandsleep,
  },
]

