/**
 * Transport 단위 테스트
 * 
 * 주의: 이 테스트는 Web Audio API를 사용하므로 브라우저 환경에서 실행되어야 합니다.
 * 테스트 프레임워크(Vitest 등)가 설정되면 실행 가능합니다.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Transport } from '../Transport'

// Web Audio API 모킹 (테스트 환경용)
class MockAudioContext {
  currentTime = 0
  state = 'running'
  destination = {} as AudioDestinationNode

  createGain() {
    return {
      connect: () => {},
      gain: { value: 1.0 },
    } as GainNode
  }

  resume() {
    this.state = 'running'
    return Promise.resolve()
  }
}

describe('Transport', () => {
  let transport: Transport
  let mockAudioContext: MockAudioContext

  beforeEach(() => {
    // Mock AudioContext 생성
    mockAudioContext = new MockAudioContext() as unknown as AudioContext
    transport = new Transport(mockAudioContext)
  })

  afterEach(() => {
    transport.dispose()
  })

  describe('getTime()', () => {
    it('정지 상태에서 timelineOffsetSec 반환', () => {
      transport.seek(5.0)
      expect(transport.getTime()).toBe(5.0)
    })

    it('재생 중 시간 계산', async () => {
      transport.setTotalDuration(10.0)
      transport.seek(0)
      transport.play()

      // 시간 경과 시뮬레이션
      mockAudioContext.currentTime = 1.0
      
      // 약간의 지연 후 확인 (requestAnimationFrame 처리)
      await new Promise(resolve => setTimeout(resolve, 50))
      
      const time = transport.getTime()
      expect(time).toBeGreaterThan(0)
      expect(time).toBeLessThanOrEqual(1.0)
    })
  })

  describe('seek()', () => {
    it('특정 시간으로 이동', () => {
      transport.setTotalDuration(10.0)
      transport.seek(5.0)
      expect(transport.getTime()).toBe(5.0)
    })

    it('범위를 넘지 않도록 제한', () => {
      transport.setTotalDuration(10.0)
      transport.seek(15.0)
      expect(transport.getTime()).toBe(10.0) // totalDuration으로 제한
    })

    it('음수 시간은 0으로 제한', () => {
      transport.setTotalDuration(10.0)
      transport.seek(-5.0)
      expect(transport.getTime()).toBe(0)
    })
  })

  describe('play() / pause()', () => {
    it('재생 시작 후 일시정지', () => {
      transport.setTotalDuration(10.0)
      transport.seek(3.0)
      transport.play()
      expect(transport.getState().isPlaying).toBe(true)

      // 시간 경과
      mockAudioContext.currentTime = 1.0
      const timeBeforePause = transport.getTime()

      transport.pause()
      expect(transport.getState().isPlaying).toBe(false)
      expect(transport.getState().timelineOffsetSec).toBe(timeBeforePause)
    })

    it('일시정지 후 재개 시 같은 위치에서 시작', () => {
      transport.setTotalDuration(10.0)
      transport.seek(5.0)
      transport.play()

      // 시간 경과
      mockAudioContext.currentTime = 1.0
      const pausedTime = transport.getTime()

      transport.pause()
      expect(transport.getTime()).toBe(pausedTime)

      // 재개
      mockAudioContext.currentTime = 2.0
      transport.play()
      
      // 재개 시 저장된 시간에서 시작
      expect(transport.getState().timelineOffsetSec).toBe(pausedTime)
    })
  })

  describe('setRate()', () => {
    it('재생 속도 설정', () => {
      transport.setRate(2.0)
      expect(transport.getState().playbackRate).toBe(2.0)
    })

    it('0 이하의 속도는 에러', () => {
      expect(() => transport.setRate(0)).toThrow()
      expect(() => transport.setRate(-1)).toThrow()
    })
  })

  describe('subscribe()', () => {
    it('구독자에게 시간 업데이트 알림', () => {
      const times: number[] = []
      const unsubscribe = transport.subscribe((time) => {
        times.push(time)
      })

      transport.seek(1.0)
      transport.seek(2.0)
      transport.seek(3.0)

      expect(times.length).toBeGreaterThan(0)
      expect(times[times.length - 1]).toBe(3.0)

      unsubscribe()
    })

    it('구독 해제 후 알림 없음', () => {
      const times: number[] = []
      const unsubscribe = transport.subscribe((time) => {
        times.push(time)
      })

      transport.seek(1.0)
      const countBefore = times.length

      unsubscribe()
      transport.seek(2.0)

      expect(times.length).toBe(countBefore)
    })
  })

  describe('setTotalDuration()', () => {
    it('타임라인 길이 설정', () => {
      transport.setTotalDuration(15.0)
      expect(transport.getState().totalDuration).toBe(15.0)
    })

    it('현재 시간이 totalDuration을 넘으면 조정', () => {
      transport.setTotalDuration(10.0)
      transport.seek(15.0)
      expect(transport.getTime()).toBe(10.0)

      transport.setTotalDuration(5.0)
      expect(transport.getTime()).toBe(5.0) // 조정됨
    })
  })
})
