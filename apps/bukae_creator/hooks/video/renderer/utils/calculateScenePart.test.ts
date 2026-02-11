import test from 'node:test'
import assert from 'node:assert/strict'
import type { TimelineData } from '@/store/useVideoCreateStore'
import { calculateScenePartFromTime } from './calculateScenePart'

function makeTimeline(): TimelineData {
  return {
    fps: 30,
    resolution: '1080x1920',
    scenes: [
      {
        sceneId: 1,
        duration: 10,
        transition: 'none',
        image: 'https://example.com/scene-1.jpg',
        text: {
          content: 'scene-1',
          font: 'pretendard',
          color: '#ffffff',
        },
        voiceTemplate: 'voice-a',
      },
      {
        sceneId: 2,
        duration: 10,
        transition: 'none',
        image: 'https://example.com/scene-2.jpg',
        text: {
          content: 'scene-2',
          font: 'pretendard',
          color: '#ffffff',
        },
        voiceTemplate: 'voice-a',
      },
    ],
  }
}

test('calculateScenePartFromTime uses shared playable resolver on TTS boundaries', () => {
  const timeline = makeTimeline()
  const makeTtsKey = (voiceName: string, markup: string) => `${voiceName}::${markup}`
  const ttsCacheRef = {
    current: new Map<string, { durationSec: number; markup?: string; url?: string | null }>([
      [makeTtsKey('voice-a', 's1-p1'), { durationSec: 2 }],
      [makeTtsKey('voice-a', 's1-p2'), { durationSec: 1 }],
      [makeTtsKey('voice-a', 's2-p1'), { durationSec: 4 }],
    ]),
  } as React.MutableRefObject<Map<string, { durationSec: number; markup?: string; url?: string | null }>>

  const buildSceneMarkup = (_timeline: TimelineData | null, sceneIndex: number) => {
    if (sceneIndex === 0) {
      return ['s1-p1', 's1-p2']
    }
    return ['s2-p1']
  }

  const inFirstSceneSecondPart = calculateScenePartFromTime({
    timeline,
    tSec: 2.5,
    ttsCacheRef,
    voiceTemplate: 'voice-a',
    buildSceneMarkup,
    makeTtsKey,
  })
  assert.equal(inFirstSceneSecondPart.sceneIndex, 0)
  assert.equal(inFirstSceneSecondPart.partIndex, 1)
  assert.equal(inFirstSceneSecondPart.sceneStartTime, 0)

  const inSecondScene = calculateScenePartFromTime({
    timeline,
    tSec: 3.2,
    ttsCacheRef,
    voiceTemplate: 'voice-a',
    buildSceneMarkup,
    makeTtsKey,
  })
  assert.equal(inSecondScene.sceneIndex, 1)
  assert.equal(inSecondScene.partIndex, 0)
  assert.equal(inSecondScene.sceneStartTime, 3)

  const forcedSecondScene = calculateScenePartFromTime({
    timeline,
    tSec: 100,
    forceSceneIndex: 1,
    ttsCacheRef,
    voiceTemplate: 'voice-a',
    buildSceneMarkup,
    makeTtsKey,
  })
  assert.equal(forcedSecondScene.sceneIndex, 1)
  assert.equal(forcedSecondScene.partIndex, 0)
  assert.equal(forcedSecondScene.sceneStartTime, 3)
})
