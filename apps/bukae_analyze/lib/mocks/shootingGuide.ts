import type { ShootingGuide } from '@/lib/types/domain'

export const MOCK_SHOOTING_GUIDE: ShootingGuide = {
  scenes: [
    {
      sceneNumber: 1,
      sceneName: 'Hook',
      startTimeSec: 0,
      endTimeSec: 3,
      description: '이탈 방어 최우선 구간',
      visualGuide:
        '제품을 클로즈업으로 촬영하여 첫 프레임부터 시선을 사로잡는다. 배경은 단색으로 처리하고 조명은 정면에서 강하게 주어 제품의 질감을 강조한다.',
      subtitleScript:
        '지금까지 이런 제품은 없었다. 단 하나의 선택으로 당신의 일상이 바뀐다.',
      audioScript:
        '(긴장감 있는 배경음악 페이드인) 지금까지 이런 제품은 없었다. 단 하나의 선택으로 당신의 일상이 바뀐다.',
      planningBasis:
        '유튜브 쇼츠 평균 이탈률 데이터에 따르면 첫 3초 이내 이탈이 전체의 60%를 차지한다. 클로즈업 + 강한 조명 조합은 클릭률을 최대 2.3배 높이는 것으로 분석된 레퍼런스 영상의 공통 패턴이다.',
    },
    {
      sceneNumber: 2,
      sceneName: 'Rising Action',
      startTimeSec: 3,
      endTimeSec: 10,
      description: '중요한 갈등 발생',
      visualGuide:
        '사용자가 기존 방식으로 불편함을 겪는 장면을 촬영한다. 표정과 동작을 과장되지 않게 자연스럽게 담고, 문제 상황을 시각적으로 명확히 보여준다.',
      subtitleScript:
        '매일 반복되는 불편함, 이제 더 이상 참을 필요 없다. 더 나은 방법이 있다.',
      audioScript:
        '(불편함을 나타내는 효과음) 매일 반복되는 불편함, 이제 더 이상 참을 필요 없다. 더 나은 방법이 있다.',
      planningBasis:
        '공감 유발을 통한 시청 지속률 향상이 목표다. 레퍼런스 영상 분석 결과, 문제 상황을 과장 없이 현실적으로 묘사할 때 댓글 공감 반응이 3.1배 높았다. 7초 구간은 알고리즘 체류 시간 가산점 발생 임계값이다.',
    },
    {
      sceneNumber: 3,
      sceneName: 'Resolution',
      startTimeSec: 10,
      endTimeSec: 22,
      description: '해결책 제시',
      visualGuide:
        '제품을 사용하여 문제가 해결되는 장면을 촬영한다. 밝은 조명과 함께 사용자의 표정에서 만족감이 느껴지도록 연출하고, 제품의 핵심 기능을 클로즈업으로 보여준다.',
      subtitleScript:
        '단 3초면 충분하다. 복잡한 과정 없이 바로 결과를 확인할 수 있다. 이것이 진짜 혁신이다.',
      audioScript:
        '(밝고 경쾌한 음악으로 전환) 단 3초면 충분하다. 복잡한 과정 없이 바로 결과를 확인할 수 있다. 이것이 진짜 혁신이다.',
      planningBasis:
        '해결책 제시 시점을 영상 중반부에 배치하는 패턴이 유지율 최적화에 유리하다. 클로즈업으로 핵심 기능을 시각화하면 구매 전환율이 평균 1.8배 증가한다는 유사 카테고리 데이터를 근거로 한다.',
    },
    {
      sceneNumber: 4,
      sceneName: 'Call to Action',
      startTimeSec: 22,
      endTimeSec: 30,
      description: '행동 유도',
      visualGuide:
        '만족스러운 표정의 사용자와 제품을 함께 담은 풀샷으로 마무리. 화면 하단에 CTA 텍스트가 자연스럽게 등장하도록 연출한다.',
      subtitleScript:
        '지금 바로 시작하세요. 링크는 프로필에 있습니다.',
      audioScript:
        '(음악 볼륨 유지) 지금 바로 시작하세요. 링크는 프로필에 있습니다.',
      planningBasis:
        '영상 말미 CTA 배치는 쇼츠 알고리즘 완주율 지표와 직결된다. 풀샷 + 텍스트 오버레이 조합은 링크 클릭률을 평균 42% 높인다는 채널 내부 AB 테스트 결과를 반영했다.',
    },
  ],
}
