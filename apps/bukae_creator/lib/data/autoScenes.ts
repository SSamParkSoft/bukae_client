import type { ConceptType } from './templates'
import { conceptOptions, conceptTones } from './templates'
import type { AutoScene, SceneLayout } from '@/lib/types/video'

export interface CrawledImageAsset {
  id: string
  url: string
  label: string
  description: string
  scriptOverride?: string
}

export const crawledImagePool: CrawledImageAsset[] = [
  {
    id: 'prod-1',
    url: '/media/air-filter-set.png',
    label: '제품 사진 1',
    description: '제품 전체 모습을 가장 잘 보여주는 대표 컷',
  },
  {
    id: 'prod-2',
    url: '/media/bluetooth-speaker.png',
    label: '제품 사진 2',
    description: '라벨과 텍스트를 가까이에서 보여주는 디테일 컷',
  },
  {
    id: 'prod-3',
    url: '/media/led-strip-light.png',
    label: '제품 사진 3',
    description: '제품 사용 장면을 담아 활용도를 보여주는 컷',
  },
  {
    id: 'prod-4',
    url: '/media/num1.png',
    label: '제품 사진 4',
    description: '텍스처와 질감을 강조한 클로즈업 컷',
  },
  {
    id: 'prod-5',
    url: '/media/num2.png',
    label: '제품 사진 5',
    description: '피부나 손 등 실제 사용감을 보여주는 장면',
  },
  {
    id: 'prod-6',
    url: '/media/num3.png',
    label: '제품 사진 6',
    description: '전후 느낌을 비교할 수 있는 분위기 컷',
  },
  {
    id: 'prod-7',
    url: '/media/num1.png',
    label: '스파알 목어깨 마사지기',
    description: '스마트폰 · 컴퓨터로 뭉친 목과 어깨를 6개의 손맛 헤드로 풀어주는 제품',
    scriptOverride:
      '잠깐 주목! 목이랑 어깨 아파서 고생하는 사람들 모여주세요.\n집에서 셀프로 받는 제대로 된 손 마사지, 스파알로 시작하세요.',
  },
  {
    id: 'prod-8',
    url: '/media/num4.png',
    label: '제품 사진 8',
    description: '주요 특징을 설명하는 문구와 함께 촬영된 컷',
  },
  {
    id: 'prod-9',
    url: '/media/num5.png',
    label: '제품 사진 9',
    description: '소품과 함께 연출해 감성을 더한 이미지',
  },
  {
    id: 'prod-10',
    url: '/media/num6.png',
    label: '제품 사진 10',
    description: '제품 정보가 한눈에 보이도록 구성한 컷',
  },
]

const toneCopyPresets: Record<
  string,
  { opener: string; benefit: string; cta: string }
> = {
  'viral-1': {
    opener: '이 사진, 그냥 지나치기 아까워요.',
    benefit: '한 번 보면 바로 공유하고 싶은 포인트가 가득합니다.',
    cta: '지금 담아두면 콘텐츠 완성도가 확 달라져요.',
  },
  'info-1': {
    opener: '제품 정보를 한눈에 정리해볼게요.',
    benefit: '신뢰감 있는 디테일을 차분하게 전달해드립니다.',
    cta: '영상 속 핵심 문장으로 쓰기 딱 좋은 구성이에요.',
  },
  'daily-1': {
    opener: '일상 속 자연스럽게 꺼내는 추천 한마디.',
    benefit: '가볍게 말해도 설득력 있는 경험담으로 연결돼요.',
    cta: '친구에게 이야기하듯 편하게 이어가 볼까요?',
  },
}

const defaultCopyPreset = {
  opener: '이 컷은 영상에 꼭 넣고 싶네요.',
  benefit: '제품의 특징과 분위기를 동시에 보여줄 수 있어요.',
  cta: '시청자가 한눈에 이해하도록 정리해볼게요.',
}

const conceptLabelMap = Object.fromEntries(conceptOptions.map((option) => [option.id, option.label]))

const toneLabelMap: Record<string, string> = Object.fromEntries(
  Object.entries(conceptTones).flatMap(([_, tones]) => tones.map((tone) => [tone.id, tone.label])),
)

const getTonePreset = (toneId: string) => toneCopyPresets[toneId] || defaultCopyPreset

const getConceptLabel = (conceptId: ConceptType) => conceptLabelMap[conceptId] ?? '일반형'
const getToneLabel = (toneId: string) => toneLabelMap[toneId] ?? '기본 톤'

const generateSceneId = (assetId: string) => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${assetId}-${crypto.randomUUID()}`
  }
  return `${assetId}-${Math.random().toString(36).slice(2, 9)}`
}

const composeScript = (conceptId: ConceptType, toneId: string, asset: CrawledImageAsset, index: number) => {
  if (asset.scriptOverride) {
    return asset.scriptOverride
  }
  const preset = getTonePreset(toneId)
  const conceptLabel = getConceptLabel(conceptId)
  const toneLabel = getToneLabel(toneId)

  return [
    `[${conceptLabel} · ${toneLabel}] ${preset.opener}`,
    `#${index + 1} ${asset.label}`,
    asset.description,
    preset.benefit,
    preset.cta,
  ].join('\n')
}

export const createSceneFromAsset = (
  asset: CrawledImageAsset,
  conceptId: ConceptType,
  toneId: string,
  index: number,
): AutoScene => {
  const recommendedScript = composeScript(conceptId, toneId, asset, index)

  return {
    id: generateSceneId(asset.id),
    assetId: asset.id,
    imageUrl: asset.url,
    imageLabel: asset.label,
    recommendedScript,
    editedScript: recommendedScript,
    layout: 'default',
  }
}

export const regenerateScenesWithStyle = (
  scenes: AutoScene[],
  conceptId: ConceptType,
  toneId: string,
): AutoScene[] => {
  return scenes.map((scene, index) => {
    const asset = crawledImagePool.find((item) => item.id === scene.assetId)
    if (!asset) return scene
    const recommendedScript = composeScript(conceptId, toneId, asset, index)
    return {
      ...scene,
      recommendedScript,
      editedScript: recommendedScript,
    }
  })
}

export const DEFAULT_SCENE_LAYOUT: SceneLayout = 'default'
export const HIGHLIGHT_SCENE_LAYOUT: SceneLayout = 'highlight'


