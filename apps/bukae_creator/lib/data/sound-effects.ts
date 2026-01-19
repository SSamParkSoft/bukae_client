/**
 * 효과음 메타데이터 정의
 * Supabase Storage의 실제 파일 구조와 매핑됩니다.
 * 파일 경로: {category.en}/{key}.mp3
 */

export interface SoundEffectMetadata {
  category: {
    en: string
    ko: string
  }
  label: string
  key: string
}

export const soundEffectsMetadata: SoundEffectMetadata[] = [
  { "category": { "en": "game", "ko": "게임" }, "label": "게임 띠링", "key": "ddiring" },
  { "category": { "en": "game", "ko": "게임" }, "label": "게임 효과음", "key": "bbam" },
  { "category": { "en": "game", "ko": "게임" }, "label": "레벨업", "key": "levelup" },

  { "category": { "en": "horn", "ko": "경적" }, "label": "빵빠레", "key": "bbangbbare" },
  { "category": { "en": "horn", "ko": "경적" }, "label": "뿌~뿌뿌뿌", "key": "bbubbubbu" },
  { "category": { "en": "horn", "ko": "경적" }, "label": "사이렌", "key": "loudsiren" },
  { "category": { "en": "horn", "ko": "경적" }, "label": "운동경기 시작", "key": "roundstart" },
  { "category": { "en": "horn", "ko": "경적" }, "label": "자동차 경적", "key": "carbbang" },

  { "category": { "en": "positive", "ko": "긍정반응" }, "label": "군중 wow", "key": "cloudwa" },
  { "category": { "en": "positive", "ko": "긍정반응" }, "label": "군중환호", "key": "cloud" },
  { "category": { "en": "positive", "ko": "긍정반응" }, "label": "WOW", "key": "wow" },
  { "category": { "en": "positive", "ko": "긍정반응" }, "label": "YEAH!", "key": "yeah" },

  { "category": { "en": "embarrassment", "ko": "당황" }, "label": "놀람발견", "key": "discover" },
  { "category": { "en": "embarrassment", "ko": "당황" }, "label": "당황(Ding Ding)", "key": "dingding" },
  { "category": { "en": "embarrassment", "ko": "당황" }, "label": "또이잉", "key": "ddoing" },
  { "category": { "en": "embarrassment", "ko": "당황" }, "label": "뚜훅", "key": "ddugk" },
  { "category": { "en": "embarrassment", "ko": "당황" }, "label": "뜨헉!", "key": "dduhuck" },
  { "category": { "en": "embarrassment", "ko": "당황" }, "label": "띠용소리", "key": "ddiyong" },
  { "category": { "en": "embarrassment", "ko": "당황" }, "label": "물방울(삐질)", "key": "water" },
  { "category": { "en": "embarrassment", "ko": "당황" }, "label": "텅(터엉)", "key": "tung" },
  { "category": { "en": "embarrassment", "ko": "당황" }, "label": "헉", "key": "herl" },
  { "category": { "en": "embarrassment", "ko": "당황" }, "label": "황당(데엥)", "key": "eng" },

  { "category": { "en": "money", "ko": "돈" }, "label": "철컥띵 (캐셔)", "key": "casher" },
  { "category": { "en": "money", "ko": "돈" }, "label": "코인소리 1", "key": "coin1" },
  { "category": { "en": "money", "ko": "돈" }, "label": "코인소리 2", "key": "coin2" },

  { "category": { "en": "animal", "ko": "동물" }, "label": "귀뚜라미", "key": "cricket" },
  { "category": { "en": "animal", "ko": "동물" }, "label": "까마귀", "key": "crow" },
  { "category": { "en": "animal", "ko": "동물" }, "label": "뻐꾸기", "key": "owl" },
  { "category": { "en": "animal", "ko": "동물" }, "label": "염소 1", "key": "goat1" },
  { "category": { "en": "animal", "ko": "동물" }, "label": "염소 2", "key": "goat2" },
  { "category": { "en": "animal", "ko": "동물" }, "label": "오리", "key": "duck" },

  { "category": { "en": "talk", "ko": "말" }, "label": "뚝배기", "key": "dduckbaeki" },
  { "category": { "en": "talk", "ko": "말" }, "label": "뭐요", "key": "koza" },
  { "category": { "en": "talk", "ko": "말" }, "label": "비명소리", "key": "bimyeong" },
  { "category": { "en": "talk", "ko": "말" }, "label": "안녕히계세요 여러분", "key": "bye" },
  { "category": { "en": "talk", "ko": "말" }, "label": "헬로", "key": "hello" },

  { "category": { "en": "wind", "ko": "바람소리" }, "label": "넘기는소리", "key": "bigwind" },
  { "category": { "en": "wind", "ko": "바람소리" }, "label": "바람1", "key": "wind" },
  { "category": { "en": "wind", "ko": "바람소리" }, "label": "바람2", "key": "wind2" },
  { "category": { "en": "wind", "ko": "바람소리" }, "label": "바람3", "key": "wind3" },
  { "category": { "en": "wind", "ko": "바람소리" }, "label": "화면전환 (휙)", "key": "hwick" },
  { "category": { "en": "wind", "ko": "바람소리" }, "label": "후욱 (긴)", "key": "longhook" },
  { "category": { "en": "wind", "ko": "바람소리" }, "label": "후욱 (강한)", "key": "stronghook" },
  { "category": { "en": "wind", "ko": "바람소리" }, "label": "후욱 (약한)", "key": "weakhook" },
  { "category": { "en": "wind", "ko": "바람소리" }, "label": "후욱 (짧은)", "key": "shorthook" },
  { "category": { "en": "wind", "ko": "바람소리" }, "label": "휙 (만화적)", "key": "cartoonhook" },

  { "category": { "en": "fart", "ko": "방귀" }, "label": "방귀 뿡 1", "key": "bbung1" },
  { "category": { "en": "fart", "ko": "방귀" }, "label": "방귀 뿡 2", "key": "bbung2" },
  { "category": { "en": "fart", "ko": "방귀" }, "label": "방귀 뿡 3", "key": "bbung3" },

  { "category": { "en": "negative", "ko": "부정" }, "label": "놉 !", "key": "nope" },
  { "category": { "en": "negative", "ko": "부정" }, "label": "왓 !", "key": "what" },

  { "category": { "en": "shit", "ko": "비속어" }, "label": "왓더퍽", "key": "whatthef" },
  { "category": { "en": "shit", "ko": "비속어" }, "label": "이 뭔 개소리야", "key": "kaesound" },
  { "category": { "en": "shit", "ko": "비속어" }, "label": "shut up", "key": "shutup" },

  { "category": { "en": "speed", "ko": "빨리감기 뒤로감기" }, "label": "뒤로감기 1", "key": "back1" },
  { "category": { "en": "speed", "ko": "빨리감기 뒤로감기" }, "label": "빨리감기 1", "key": "front1" },
  { "category": { "en": "speed", "ko": "빨리감기 뒤로감기" }, "label": "빨리감기 2", "key": "front2" },

  { "category": { "en": "beep", "ko": "삐" }, "label": "삐빅 (짧은)", "key": "wrong1" },
  { "category": { "en": "beep", "ko": "삐" }, "label": "삐이이 (긴)", "key": "wrong2" },
  { "category": { "en": "beep", "ko": "삐" }, "label": "삐처리", "key": "bbi" },

  { "category": { "en": "suspense", "ko": "서스펜스" }, "label": "놀라는배경", "key": "long" },
  { "category": { "en": "suspense", "ko": "서스펜스" }, "label": "허얽", "key": "heak" },
  { "category": { "en": "suspense", "ko": "서스펜스" }, "label": "안 좋은 예감", "key": "dduddung" },
  { "category": { "en": "suspense", "ko": "서스펜스" }, "label": "엔딩 쿵", "key": "ending" },
  { "category": { "en": "suspense", "ko": "서스펜스" }, "label": "Suspense 1", "key": "Suspense1" },
  { "category": { "en": "suspense", "ko": "서스펜스" }, "label": "Suspense 2", "key": "Suspense2" },
  { "category": { "en": "suspense", "ko": "서스펜스" }, "label": "Suspense 3", "key": "Suspense3" },
  { "category": { "en": "suspense", "ko": "서스펜스" }, "label": "Suspense 4", "key": "Suspense4" },
  { "category": { "en": "suspense", "ko": "서스펜스" }, "label": "Suspense 6", "key": "Suspense6" },
  { "category": { "en": "suspense", "ko": "서스펜스" }, "label": "Suspense 7", "key": "Suspense7" },
  { "category": { "en": "suspense", "ko": "서스펜스" }, "label": "Suspense 8", "key": "Suspense8" },

  { "category": { "en": "spring", "ko": "스프링" }, "label": "띠요옹 (바운스)", "key": "ddiyong" },
  { "category": { "en": "spring", "ko": "스프링" }, "label": "스프링 (뚀오오옹)", "key": "ddotong" },
  { "category": { "en": "spring", "ko": "스프링" }, "label": "스프링 (또잇)", "key": "ddoing" },
  { "category": { "en": "spring", "ko": "스프링" }, "label": "스프링 (또잉)", "key": "ddoing2" },

  { "category": { "en": "alarm", "ko": "알림음" }, "label": "띠딩", "key": "ddiring1" },
  { "category": { "en": "alarm", "ko": "알림음" }, "label": "메일 알림음", "key": "mail" },
  { "category": { "en": "alarm", "ko": "알림음" }, "label": "문자 알림음", "key": "text1" },
  { "category": { "en": "alarm", "ko": "알림음" }, "label": "실로폰 (띵)", "key": "silrophone" },
  { "category": { "en": "alarm", "ko": "알림음" }, "label": "청명한 띠링", "key": "cungmyeong" },
  { "category": { "en": "alarm", "ko": "알림음" }, "label": "카톡", "key": "kakao" },
  { "category": { "en": "alarm", "ko": "알림음" }, "label": "폰문자전송", "key": "send" },

  { "category": { "en": "wand", "ko": "요술봉 효과음" }, "label": "또리링", "key": "ddoriring" },
  { "category": { "en": "wand", "ko": "요술봉 효과음" }, "label": "마법봉소리", "key": "wand" },
  { "category": { "en": "wand", "ko": "요술봉 효과음" }, "label": "마법효과", "key": "magic1" },
  { "category": { "en": "wand", "ko": "요술봉 효과음" }, "label": "뾰로롱 1", "key": "bbyororong1" },
  { "category": { "en": "wand", "ko": "요술봉 효과음" }, "label": "뾰로롱 2", "key": "bbyororong2" },

  { "category": { "en": "laugh", "ko": "웃음소리" }, "label": "격하게 비웃음", "key": "laugh1" },
  { "category": { "en": "laugh", "ko": "웃음소리" }, "label": "관중 웃음", "key": "cloudlaugh" },
  { "category": { "en": "laugh", "ko": "웃음소리" }, "label": "남자 큰웃음", "key": "man1" },
  { "category": { "en": "laugh", "ko": "웃음소리" }, "label": "남자 헛웃음", "key": "man2" },
  { "category": { "en": "laugh", "ko": "웃음소리" }, "label": "비웃음", "key": "haha" },
  { "category": { "en": "laugh", "ko": "웃음소리" }, "label": "사악한 웃음", "key": "wicked" },
  { "category": { "en": "laugh", "ko": "웃음소리" }, "label": "아기 웃음", "key": "baby" },
  { "category": { "en": "laugh", "ko": "웃음소리" }, "label": "만화 웃음", "key": "cartoon" },

  { "category": { "en": "frustration", "ko": "좌절" }, "label": "독백 좌절", "key": "mono" },
  { "category": { "en": "frustration", "ko": "좌절" }, "label": "좌절 (low)", "key": "low" },
  { "category": { "en": "frustration", "ko": "좌절" }, "label": "좌절 (high)", "key": "high" },

  { "category": { "en": "blow", "ko": "타격" }, "label": "타격음 (착)", "key": "chack" },
  { "category": { "en": "blow", "ko": "타격" }, "label": "타격음 (탁)", "key": "tak" },
  { "category": { "en": "blow", "ko": "타격" }, "label": "타격음 (팍)", "key": "pak" },
  { "category": { "en": "blow", "ko": "타격" }, "label": "타격음 (푸히익)", "key": "puck" },

  { "category": { "en": "percussion", "ko": "타악기" }, "label": "타당", "key": "tiding" },
  { "category": { "en": "percussion", "ko": "타악기" }, "label": "팅", "key": "ting" },
  { "category": { "en": "percussion", "ko": "타악기" }, "label": "큰 북 (둥)", "key": "dung" },
  { "category": { "en": "percussion", "ko": "타악기" }, "label": "드럼", "key": "drum" },
  { "category": { "en": "percussion", "ko": "타악기" }, "label": "큰 북 (퉁)", "key": "tung" },
  { "category": { "en": "percussion", "ko": "타악기" }, "label": "큰 북 두번", "key": "twice" },

  { "category": { "en": "explosion", "ko": "폭발" }, "label": "천둥소리", "key": "lightning" },
  { "category": { "en": "explosion", "ko": "폭발" }, "label": "폭발 (묵직)", "key": "mukgik" },
  { "category": { "en": "explosion", "ko": "폭발" }, "label": "폭발", "key": "e1" },

  { "category": { "en": "basic", "ko": "기본 효과음" }, "label": "띠리리로링", "key": "ddiririroring" },
  { "category": { "en": "basic", "ko": "기본 효과음" }, "label": "삐유", "key": "bbiyu" },
  { "category": { "en": "basic", "ko": "기본 효과음" }, "label": "따닥", "key": "ddadak" },
  { "category": { "en": "basic", "ko": "기본 효과음" }, "label": "또잇", "key": "ddoit" },
  { "category": { "en": "basic", "ko": "기본 효과음" }, "label": "똥딩", "key": "ddongding" },
  { "category": { "en": "basic", "ko": "기본 효과음" }, "label": "띠동", "key": "ddidong" },
  { "category": { "en": "basic", "ko": "기본 효과음" }, "label": "띠동띠동", "key": "ddidongx2" },
  { "category": { "en": "basic", "ko": "기본 효과음" }, "label": "뽁", "key": "bbok" },
  { "category": { "en": "basic", "ko": "기본 효과음" }, "label": "뽁소리", "key": "bboks" },

  { "category": { "en": "run", "ko": "달리는 효과음" }, "label": "도망치는 소리(빠른)", "key": "fast" },
  { "category": { "en": "run", "ko": "달리는 효과음" }, "label": "얄미운줄행랑", "key": "annoying" },
  { "category": { "en": "run", "ko": "달리는 효과음" }, "label": "줄행랑", "key": "ing" },
  { "category": { "en": "run", "ko": "달리는 효과음" }, "label": "쌩지나가는소리", "key": "sseng" },
  { "category": { "en": "run", "ko": "달리는 효과음" }, "label": "카툰 쌩쌩이(가벼운)", "key": "ctlight" },
  { "category": { "en": "run", "ko": "달리는 효과음" }, "label": "카툰 쌩쌩이(묵직)", "key": "ctheavy" },

  { "category": { "en": "emotion", "ko": "감정" }, "label": "깨닫는소리", "key": "realize" },
  { "category": { "en": "emotion", "ko": "감정" }, "label": "깨달음(뜨링)", "key": "ddeoring" },
  { "category": { "en": "emotion", "ko": "감정" }, "label": "물음표(씌잉)", "key": "question" },
  { "category": { "en": "emotion", "ko": "감정" }, "label": "보노보노 땀소리", "key": "sweat" },
  { "category": { "en": "emotion", "ko": "감정" }, "label": "느낌표(떵!)", "key": "exddung" },
  { "category": { "en": "emotion", "ko": "감정" }, "label": "느낌표(또독)", "key": "exddodok" },

  { "category": { "en": "mech", "ko": "기기 소리" }, "label": "급브레이크", "key": "break" },
  { "category": { "en": "mech", "ko": "기기 소리" }, "label": "플라스틱 톱니(2)", "key": "gear2" },
  { "category": { "en": "mech", "ko": "기기 소리" }, "label": "플라스틱 톱니(1)", "key": "gear1" },
  { "category": { "en": "mech", "ko": "기기 소리" }, "label": "마우스클릭음(1)", "key": "click1" },
  { "category": { "en": "mech", "ko": "기기 소리" }, "label": "마우스클릭음(2)", "key": "click2" },
  { "category": { "en": "mech", "ko": "기기 소리" }, "label": "카메라(차알칵)", "key": "cameralong" },
  { "category": { "en": "mech", "ko": "기기 소리" }, "label": "카메라(찰칵)", "key": "camerashort" },
  { "category": { "en": "mech", "ko": "기기 소리" }, "label": "키보드 소리", "key": "keyboard" },

  { "category": { "en": "water", "ko": "물방울소리" }, "label": "물방울소리(빱)", "key": "bbap" },
  { "category": { "en": "water", "ko": "물방울소리" }, "label": "물방울소리(뽀잉)", "key": "bboing" },
  { "category": { "en": "water", "ko": "물방울소리" }, "label": "물방울소리(뾰옥)", "key": "bbwok" },
  { "category": { "en": "water", "ko": "물방울소리" }, "label": "물방울소리(톡)", "key": "tok" },

  { "category": { "en": "etc", "ko": "이외 효과음" }, "label": "고무장난감", "key": "rubbertoy" },
  { "category": { "en": "etc", "ko": "이외 효과음" }, "label": "기억 회상 효과음", "key": "remind" },
  { "category": { "en": "etc", "ko": "이외 효과음" }, "label": "길게 던지는 피유웅", "key": "piyunglong" },
  { "category": { "en": "etc", "ko": "이외 효과음" }, "label": "길게 멀리 던지는 피유웅", "key": "piyungfar" },
  { "category": { "en": "etc", "ko": "이외 효과음" }, "label": "담넘어가는사운드", "key": "over" },
  { "category": { "en": "etc", "ko": "이외 효과음" }, "label": "물감푸직", "key": "paint" },
  { "category": { "en": "etc", "ko": "이외 효과음" }, "label": "쑤우욱 커지는 소리", "key": "grow" },
  { "category": { "en": "etc", "ko": "이외 효과음" }, "label": "웅장한 등장 1", "key": "appear1" },
  { "category": { "en": "etc", "ko": "이외 효과음" }, "label": "웅장한 등장 2", "key": "appear2" },
  { "category": { "en": "etc", "ko": "이외 효과음" }, "label": "자막효과음 만화적(휘익)", "key": "wheak" },
  { "category": { "en": "etc", "ko": "이외 효과음" }, "label": "접시깨지는소리", "key": "plate" },
  { "category": { "en": "etc", "ko": "이외 효과음" }, "label": "정답(띵동띵동)", "key": "correct" },
  { "category": { "en": "etc", "ko": "이외 효과음" }, "label": "짜잔 사운드", "key": "zzazan" },
  { "category": { "en": "etc", "ko": "이외 효과음" }, "label": "채찍소리 효과음", "key": "whiplash" },
  { "category": { "en": "etc", "ko": "이외 효과음" }, "label": "타랴~(짜잔~)", "key": "tada" },
  { "category": { "en": "etc", "ko": "이외 효과음" }, "label": "프라이팬 타격 효과음", "key": "fryingpan" },
  { "category": { "en": "etc", "ko": "이외 효과음" }, "label": "핑거스냅 손가락 튕기는 효과음", "key": "finger" },
  { "category": { "en": "etc", "ko": "이외 효과음" }, "label": "한입 먹는 소리", "key": "bite" },
  { "category": { "en": "etc", "ko": "이외 효과음" }, "label": "고무삑삑이", "key": "rubberbbeak" },
  { "category": { "en": "etc", "ko": "이외 효과음" }, "label": "그런데말입니다 배경음", "key": "background" },
  { "category": { "en": "etc", "ko": "이외 효과음" }, "label": "글리치(치직)", "key": "glitch" },
  { "category": { "en": "etc", "ko": "이외 효과음" }, "label": "띠링안내음(자막)", "key": "ddiring" },
  { "category": { "en": "etc", "ko": "이외 효과음" }, "label": "심장소리", "key": "heart" },
  { "category": { "en": "etc", "ko": "이외 효과음" }, "label": "종이찢는 소리", "key": "paper" },
  { "category": { "en": "etc", "ko": "이외 효과음" }, "label": "카툰 팝", "key": "ctpop" },
  { "category": { "en": "etc", "ko": "이외 효과음" }, "label": "DJ스크레치", "key": "scratch" },
  { "category": { "en": "etc", "ko": "이외 효과음" }, "label": "째깍째깍(시계)", "key": "clock" }
]

/**
 * 효과음 파일 경로를 생성합니다.
 * 형식: {category.en}/{key}.mp3
 */
export function getSoundEffectPath(metadata: SoundEffectMetadata): string {
  return `${metadata.category.en}/${metadata.key}.mp3`
}

/**
 * key와 category.en으로 효과음 메타데이터를 찾습니다.
 */
export function findSoundEffectMetadata(categoryEn: string, key: string): SoundEffectMetadata | undefined {
  return soundEffectsMetadata.find(
    (meta) => meta.category.en === categoryEn && meta.key === key
  )
}

/**
 * 파일 경로로 효과음 메타데이터를 찾습니다.
 * 경로 형식: {category.en}/{key}.mp3
 */
export function findSoundEffectMetadataByPath(path: string): SoundEffectMetadata | undefined {
  const parts = path.split('/')
  if (parts.length !== 2) return undefined
  
  const [categoryEn, filename] = parts
  const key = filename.replace(/\.mp3$/, '')
  
  return findSoundEffectMetadata(categoryEn, key)
}

/**
 * 카테고리별로 그룹화된 효과음 메타데이터를 반환합니다.
 */
export function getSoundEffectsByCategory(): Record<string, SoundEffectMetadata[]> {
  const grouped: Record<string, SoundEffectMetadata[]> = {}
  
  soundEffectsMetadata.forEach((meta) => {
    const categoryKo = meta.category.ko
    if (!grouped[categoryKo]) {
      grouped[categoryKo] = []
    }
    grouped[categoryKo].push(meta)
  })
  
  return grouped
}
