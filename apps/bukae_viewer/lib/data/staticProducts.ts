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
    'https://www.coupang.com/vp/products/8906749731?itemId=26013724094&vendorItemId=92995575781&src=1139000&spec=10799999&addtag=400&ctag=8906749731&lptag=AF4647824&itime=20260107162443&pageType=PRODUCT&pageValue=8906749731&wPcid=17510469561163597660443&wRef=&wTime=20260107162443&redirect=landing&traceid=V0-181-695a1da0528ef960&mcid=cf0c8ea7072b44cead2b733ece78a541&campaignid=&clickBeacon=&imgsize=&pageid=&sig=&subid=&campaigntype=&puid=&ctime=&portal=&landing_exp=&placementid=&puidType=&contentcategory=&tsource=&deviceid=&contenttype=&token=&impressionid=&requestid=&contentkeyword=&offerId=&sfId=&subparam=',
  biorecipe_hairpack:
    'https://www.coupang.com/vp/products/7357768723?itemId=18949358758&vendorItemId=86075655733&src=1139000&spec=10799999&addtag=400&ctag=7357768723&lptag=AF4647824&itime=20260110175805&pageType=PRODUCT&pageValue=7357768723&wPcid=17510469561163597660443&wRef=&wTime=20260110175805&redirect=landing&traceid=V0-181-60d38c5d32d4c700&mcid=69d5b3bc0a364b4d9b7e5ef8efaa7e77&campaignid=&clickBeacon=&imgsize=&pageid=&sig=&subid=&campaigntype=&puid=&ctime=&portal=&landing_exp=&placementid=&puidType=&contentcategory=&tsource=&deviceid=&contenttype=&token=&impressionid=&requestid=&contentkeyword=&offerId=&sfId=&subparam=',
  nangmomil:
    'https://www.coupang.com/vp/products/8248204570?itemId=23742416658&vendorItemId=90767010073&src=1139000&spec=10799999&addtag=400&ctag=8248204570&lptag=AF4647824&itime=20260110175800&pageType=PRODUCT&pageValue=8248204570&wPcid=17510469561163597660443&wRef=&wTime=20260110175800&redirect=landing&traceid=V0-181-a2a1d9205d4759bf&mcid=d93b484d21ca44f7b7e48149c83934d0&campaignid=&clickBeacon=&imgsize=&pageid=&sig=&subid=&campaigntype=&puid=&ctime=&portal=&landing_exp=&placementid=&puidType=&contentcategory=&tsource=&deviceid=&contenttype=&token=&impressionid=&requestid=&contentkeyword=&offerId=&sfId=&subparam=',
  pepsi_zerocoke:
    'https://www.coupang.com/vp/products/9274048526?itemId=27492126386&vendorItemId=94457247773&src=1139000&spec=10799999&addtag=400&ctag=9274048526&lptag=AF4647824&itime=20260110181631&pageType=PRODUCT&pageValue=9274048526&wPcid=17510469561163597660443&wRef=&wTime=20260110181631&redirect=landing&traceid=V0-181-f2d39e29bec12616&mcid=0167c871faa148a0ad837497652ff61d&campaignid=&clickBeacon=&imgsize=&pageid=&sig=&subid=&campaigntype=&puid=&ctime=&portal=&landing_exp=&placementid=&puidType=&contentcategory=&tsource=&deviceid=&contenttype=&token=&impressionid=&requestid=&contentkeyword=&offerId=&sfId=&subparam=',
  akii_boots:
    'https://www.coupang.com/vp/products/8730341883?itemId=25366951659&vendorItemId=91526396377&src=1139000&spec=10799999&addtag=400&ctag=8730341883&lptag=AF4647824&itime=20260114163219&pageType=PRODUCT&pageValue=8730341883&wPcid=17510469561163597660443&wRef=&wTime=20260114163219&redirect=landing&traceid=V0-181-5a98c36d9c864c47&mcid=b95674d6161a4dca9b600146a3113f0c&campaignid=&clickBeacon=&imgsize=&pageid=&sig=&subid=&campaigntype=&puid=&ctime=&portal=&landing_exp=&placementid=&puidType=&contentcategory=&tsource=&deviceid=&contenttype=&token=&impressionid=&requestid=&contentkeyword=&offerId=&sfId=&subparam=',
  worldclean_mini_power_plunger:
    'https://link.coupang.com/a/ds2nnq',
  worldclean_mini_power_plunger_15:
    'https://link.coupang.com/a/dtySs9',
  raon_multihub:
    'https://link.coupang.com/a/dulIts',
  solo_hell_dex:
    'https://link.coupang.com/a/dvlgdp'
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
    id: 'biorecipe-hairpack',
    productId: 1016,
    name: '바이오레시피 1초 데미지케어 4 In 1 system 헤어팩, 300g, 1개',
    description: '데미지케어 · 4 In 1 system · 300g',
    order: 11,
    thumbnailUrl: '/dummy/biorecipe_hairpack.png',
    url: PRODUCT_URLS.biorecipe_hairpack,
  },
  {
    id: 'nangmomil',
    productId: 1017,
    name: '100g당 20kcal 바로먹는 발효곤약 냉모밀, 12개, 350g',
    description: '100g당 20kcal · 발효곤약 · 12개',
    order: 12,
    thumbnailUrl: '/dummy/nangmomil.png',
    url: PRODUCT_URLS.nangmomil,
  },
  {
    id: 'akii-boots',
    productId: 1018,
    name: '[아키클래식] 여성용 아이슬린 리커버리 패딩 부츠 AKANWWH02',
    description: '여성용 · 아이슬린 리커버리 · 패딩 부츠',
    order: 13,
    thumbnailUrl: '/dummy/akii_boots.png',
    url: PRODUCT_URLS.akii_boots,
  },
  {
    id: 'worldclean-mini-power-plunger',
    productId: 1019,
    name: '월드크린 미니 파워 뚫어뻥',
    description: '미니 파워 · 뚫어뻥',
    order: 14,
    thumbnailUrl: '/dummy/durubong.png',
    url: PRODUCT_URLS.worldclean_mini_power_plunger,
  },
  {
    id: 'worldclean-mini-power-plunger-15',
    productId: 1020,
    name: '마를랑 양면 두피 마사지 샴푸 브러쉬',
    description: '양면 두피 마사지 · 샴푸 브러쉬',
    order: 15,
    thumbnailUrl: '/dummy/talmobit.png',
    url: PRODUCT_URLS.worldclean_mini_power_plunger_15,
  },
  {
    id: 'raon-multihub',
    productId: 1021,
    name: '라온 7in1 C타입 멀티 카드리더기',
    description: '7in1 멀티 카드리더기 · C타입',
    order: 16,
    thumbnailUrl: '/dummy/multihub.png',
    url: PRODUCT_URLS.raon_multihub,
  },
  {
    id: 'solo-hell-dex',
    productId: 1022,
    name: '솔로지옥2 덱스 다각형 검정 남자 뿔테 안경',
    description: '다각형 검정 뿔테 안경 · 남자용',
    order: 17,
    thumbnailUrl: '/dummy/dex.png',
    url: PRODUCT_URLS.solo_hell_dex,
  },
]

export function getStaticProducts(channelId?: string): Product[] {
  // 기본 제품 목록과 추가 제품 목록을 합침
  // channelId는 향후 채널별 필터링에 사용될 수 있음
  const products = [...STATIC_PRODUCTS, ...SSAMBAK_EXTRA_PRODUCTS]
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

