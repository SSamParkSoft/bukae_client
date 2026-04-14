import type { ShootingGuide } from '@/lib/types/domain'

export const MOCK_SHOOTING_GUIDE: ShootingGuide = {
  scenes: [
    {
      sceneNumber: 1,
      startTimeSec: 0,
      endTimeSec: 3,
      description: '강렬한 오프닝',
      visualGuide:
        '제품을 클로즈업으로 촬영하여 첫 프레임부터 시선을 사로잡는다. 배경은 단색으로 처리하고 조명은 정면에서 강하게 주어 제품의 질감을 강조한다.',
      subtitleScript:
        '지금까지 이런 제품은 없었다. 단 하나의 선택으로 당신의 일상이 바뀐다.',
      audioScript:
        '(긴장감 있는 배경음악 페이드인) 지금까지 이런 제품은 없었다. 단 하나의 선택으로 당신의 일상이 바뀐다.',
    },
    {
      sceneNumber: 2,
      startTimeSec: 3,
      endTimeSec: 10,
      description: '중요한 갈등 발생',
      visualGuide:
        '사용자가 기존 방식으로 불편함을 겪는 장면을 촬영한다. 표정과 동작을 과장되지 않게 자연스럽게 담고, 문제 상황을 시각적으로 명확히 보여준다.',
      subtitleScript:
        '매일 반복되는 불편함, 이제 더 이상 참을 필요 없다. 더 나은 방법이 있다.',
      audioScript:
        '(불편함을 나타내는 효과음) 매일 반복되는 불편함, 이제 더 이상 참을 필요 없다. 더 나은 방법이 있다.',
    },
    {
      sceneNumber: 3,
      startTimeSec: 10,
      endTimeSec: 22,
      description: '해결책 제시',
      visualGuide:
        '제품을 사용하여 문제가 해결되는 장면을 촬영한다. 밝은 조명과 함께 사용자의 표정에서 만족감이 느껴지도록 연출하고, 제품의 핵심 기능을 클로즈업으로 보여준다.',
      subtitleScript:
        '단 3초면 충분하다. 복잡한 과정 없이 바로 결과를 확인할 수 있다. 이것이 진짜 혁신이다.',
      audioScript:
        '(밝고 경쾌한 음악으로 전환) 단 3초면 충분하다. 복잡한 과정 없이 바로 결과를 확인할 수 있다. 이것이 진짜 혁신이다.',
    },
    {
      sceneNumber: 4,
      startTimeSec: 22,
      endTimeSec: 30,
      description: '행동 유도',
      visualGuide:
        '만족스러운 표정의 사용자와 제품을 함께 담은 풀샷으로 마무리. 화면 하단에 CTA 텍스트가 자연스럽게 등장하도록 연출한다.',
      subtitleScript:
        '지금 바로 시작하세요. 링크는 프로필에 있습니다.',
      audioScript:
        '(음악 볼륨 유지) 지금 바로 시작하세요. 링크는 프로필에 있습니다.',
    },
  ],
}
