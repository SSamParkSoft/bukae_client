/**
 * TtsTrack - TTS 세그먼트 트랙 관리
 * 
 * 여러 TTS 파일을 하나의 연속 트랙으로 취급하여 타임라인 시간 `t` 기반으로 정확히 재생합니다.
 * Web Audio API의 AudioBufferSourceNode를 사용하여 seek/pause/resume을 정확하게 처리합니다.
 */

import type { TtsSegment, ActiveSegment, TtsTrackState } from './types'

export class TtsTrack {
  private audioContext: AudioContext
  private segments: TtsSegment[]
  private bufferMap: Map<string, AudioBuffer>
  private activeSources: AudioBufferSourceNode[]
  private masterGain: GainNode
  private lookaheadInterval: number | null = null
  private readonly LOOKAHEAD_TIME = 0.1 // 100ms lookahead
  private readonly MAX_CONCURRENT_LOADS = 6 // 동시 로딩 제한 (속도 개선을 위해 증가)
  private scheduledSegmentIds: Set<string> = new Set() // 이미 스케줄된 세그먼트 추적
  private sourceToSegmentId: Map<AudioBufferSourceNode, string> = new Map() // source와 segmentId 매핑
  private lastPlayedSceneIndex: number | null = null // 마지막으로 재생한 씬 인덱스
  private onSegmentEndCallback: ((segmentEndTime: number, sceneIndex: number) => void) | null = null // 세그먼트 종료 콜백
  private onSegmentStartCallback: ((segmentStartTime: number, sceneIndex: number) => void) | null = null // 세그먼트 시작 콜백 (씬 인덱스 포함)
  private allowedSceneIndices: Set<number> | null = null // 허용된 씬 인덱스 (씬/그룹 재생 시 사용)

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext
    this.segments = []
    this.bufferMap = new Map()
    this.activeSources = []

    // 마스터 게인 노드 생성
    this.masterGain = this.audioContext.createGain()
    this.masterGain.connect(this.audioContext.destination)
    this.masterGain.gain.value = 1.0
  }

  /**
   * 세그먼트 테이블 설정 및 오디오 버퍼 로딩
   */
  async preload(segments: TtsSegment[]): Promise<void> {
    this.segments = segments

    // 기존 버퍼 정리
    this.bufferMap.clear()

    // URL이 있는 세그먼트만 필터링
    const segmentsWithUrl = segments.filter(seg => seg.url && seg.url.trim() !== '')

    if (segmentsWithUrl.length === 0) {
      return
    }

    // 세그먼트를 순차적으로 로딩 (동시성 제한)
    const loadQueue = [...segmentsWithUrl]
    const loadingPromises: Promise<void>[] = []

    while (loadQueue.length > 0 || loadingPromises.length > 0) {
      // 동시 로딩 수가 제한보다 적으면 새로 시작
      while (loadingPromises.length < this.MAX_CONCURRENT_LOADS && loadQueue.length > 0) {
        const segment = loadQueue.shift()!
        const promise = this.loadSegmentBuffer(segment).then(() => {
          // 완료된 로딩 제거
          const index = loadingPromises.indexOf(promise)
          if (index > -1) {
            loadingPromises.splice(index, 1)
          }
        })
        loadingPromises.push(promise)
      }

      // 하나라도 완료될 때까지 대기
      if (loadingPromises.length > 0) {
        await Promise.race(loadingPromises)
      }
    }
  }

  /**
   * 단일 세그먼트 버퍼 로딩
   */
  private async loadSegmentBuffer(segment: TtsSegment): Promise<void> {
    if (this.bufferMap.has(segment.id)) {
      return // 이미 로딩됨
    }

    // URL이 없거나 빈 문자열이면 건너뛰기 (TTS 파일이 아직 생성되지 않음)
    if (!segment.url || segment.url.trim() === '') {
      return
    }

    try {
      let arrayBuffer: ArrayBuffer
      
      // blob URL인 경우 (네트워크 요청 없음)
      if (segment.url.startsWith('blob:')) {
        const response = await fetch(segment.url)
        if (!response.ok) {
          throw new Error(`Failed to load blob audio: ${response.statusText}`)
        }
        arrayBuffer = await response.arrayBuffer()
      } else {
        // HTTP/HTTPS URL인 경우 (네트워크 요청 발생, 캐시 활용)
        const response = await fetch(segment.url, {
          cache: 'default', // 브라우저 캐시 활용하여 304 응답 최적화
        })
        if (!response.ok) {
          throw new Error(`Failed to load audio: ${response.statusText}`)
        }
        arrayBuffer = await response.arrayBuffer()
      }
      
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer)
      this.bufferMap.set(segment.id, audioBuffer)
    } catch {
      // 에러를 throw하지 않고 무시 (다른 세그먼트는 계속 로딩)
    }
  }

  /**
   * 허용된 씬 인덱스 설정 (씬/그룹 재생 시 사용)
   * @param sceneIndices 허용된 씬 인덱스 배열, null이면 제한 해제
   */
  setAllowedSceneIndices(sceneIndices: number[] | null): void {
    if (sceneIndices === null) {
      this.allowedSceneIndices = null
    } else {
      this.allowedSceneIndices = new Set(sceneIndices)
    }
  }

  /**
   * 특정 시간 `t`부터 재생 시작
   * 
   * @param tSec 타임라인 시간 (초)
   * @param transportAudioCtxTimeSec Transport의 AudioContext 시간 (초)
   */
  playFrom(tSec: number, transportAudioCtxTimeSec: number): void {
    // 현재 시간에 해당하는 세그먼트 찾기
    const active = this.getActiveSegment(tSec)
    if (!active) {
      // 재생할 세그먼트가 없으면 모든 재생 중지
      console.warn('[TtsTrack] playFrom: active segment가 없습니다.', {
        tSec,
        segmentsCount: this.segments.length,
        segmentsWithUrl: this.segments.filter(s => s.url && s.url.trim() !== '').length,
      })
      this.stopAll()
      this.lastPlayedSceneIndex = null
      return
    }

    const { segment, offset, segmentIndex } = active
    const currentSceneIndex = segment.sceneIndex ?? null
    
    // 허용된 씬 인덱스가 설정되어 있고, 현재 세그먼트가 허용되지 않으면 재생하지 않음
    if (this.allowedSceneIndices !== null && currentSceneIndex !== null) {
      if (!this.allowedSceneIndices.has(currentSceneIndex)) {
        // 허용되지 않은 씬의 세그먼트이므로 재생하지 않음
        return
      }
    }

    // 씬이 변경되었으면 이전 씬의 세그먼트 정지
    if (this.lastPlayedSceneIndex !== null && this.lastPlayedSceneIndex !== currentSceneIndex) {
      this.stopSceneSegments(currentSceneIndex ?? undefined)
    }

    // 이미 재생 중인 경우, 같은 씬의 세그먼트 범위에 있으면 스킵 (중복 재생 방지)
    if (this.activeSources.length > 0) {
      let shouldSkip = false
      for (const scheduledId of this.scheduledSegmentIds) {
        const scheduledSegment = this.segments.find(s => s.id === scheduledId)
        if (scheduledSegment) {
          // 같은 씬의 세그먼트이고 현재 시간이 포함되는 범위에 있으면 스킵
          if (scheduledSegment.sceneIndex === currentSceneIndex) {
            const scheduledStart = scheduledSegment.startSec
            const scheduledEnd = scheduledStart + scheduledSegment.durationSec
            if (tSec >= scheduledStart && tSec < scheduledEnd) {
              shouldSkip = true
              break
            }
          }
        }
      }
      
      if (shouldSkip) {
        return // 이미 재생 중인 같은 씬의 세그먼트 범위에 있으므로 스킵
      }
    }

    // 현재 세그먼트부터 재생 시작
    const buffer = this.bufferMap.get(segment.id)
    if (!buffer) {
      // 버퍼가 없음 - 디버깅 정보 출력
      console.warn('[TtsTrack] playFrom: 버퍼가 없습니다.', {
        segmentId: segment.id,
        segmentUrl: segment.url,
        bufferMapSize: this.bufferMap.size,
        bufferMapKeys: Array.from(this.bufferMap.keys()),
      })
      return
    }

    // 현재 세그먼트 스케줄
    const startTime = transportAudioCtxTimeSec
    this.scheduleSegment(segment, buffer, startTime, offset)

    // 같은 씬의 다음 세그먼트들만 미리 스케줄 (lookahead) - 최대 2개만
    let currentTime = startTime + (segment.durationSec - offset)
    for (let i = segmentIndex + 1; i < this.segments.length && i < segmentIndex + 2; i++) {
      const nextSegment = this.segments[i]
      // 같은 씬의 세그먼트만 스케줄
      if (nextSegment.sceneIndex === currentSceneIndex) {
        // 허용된 씬 인덱스가 설정되어 있으면 확인
        if (this.allowedSceneIndices !== null && nextSegment.sceneIndex !== undefined) {
          if (!this.allowedSceneIndices.has(nextSegment.sceneIndex)) {
            // 허용되지 않은 씬의 세그먼트이므로 중단
            break
          }
        }
        const nextBuffer = this.bufferMap.get(nextSegment.id)
        if (nextBuffer && !this.scheduledSegmentIds.has(nextSegment.id)) {
          this.scheduleSegment(nextSegment, nextBuffer, currentTime, 0)
          currentTime += nextSegment.durationSec
        }
      } else {
        // 다른 씬의 세그먼트를 만나면 중단
        break
      }
    }

    // Lookahead 루프 시작 (같은 씬의 세그먼트만 스케줄하도록 수정 필요)
    this.startLookaheadLoop(tSec, currentSceneIndex ?? undefined)
    
    // 마지막 재생 씬 인덱스 업데이트
    this.lastPlayedSceneIndex = currentSceneIndex ?? null
  }
  
  /**
   * 특정 씬의 세그먼트만 정지
   * 
   * @param exceptSceneIndex 정지하지 않을 씬 인덱스 (이 씬의 세그먼트는 유지)
   */
  private stopSceneSegments(exceptSceneIndex?: number): void {
    const sourcesToStop: AudioBufferSourceNode[] = []
    const idsToRemove: string[] = []
    
    // 정지할 소스 찾기 (다른 씬의 세그먼트)
    for (let i = this.activeSources.length - 1; i >= 0; i--) {
      const source = this.activeSources[i]
      const segmentId = this.sourceToSegmentId.get(source)
      
      if (segmentId) {
        const segment = this.segments.find(s => s.id === segmentId)
        if (segment && segment.sceneIndex !== exceptSceneIndex) {
          sourcesToStop.push(source)
          idsToRemove.push(segmentId)
        }
      }
    }
    
    // 다른 씬의 세그먼트 정지
    sourcesToStop.forEach(source => {
      try {
        source.stop()
        const index = this.activeSources.indexOf(source)
        if (index > -1) {
          this.activeSources.splice(index, 1)
        }
        this.sourceToSegmentId.delete(source)
      } catch {
        // 이미 종료된 소스는 무시
      }
    })
    
    // scheduledSegmentIds에서 제거
    idsToRemove.forEach(id => {
      this.scheduledSegmentIds.delete(id)
    })
  }

  /**
   * 단일 세그먼트 스케줄링
   */
  private scheduleSegment(
    segment: TtsSegment,
    buffer: AudioBuffer,
    startTime: number,
    offset: number
  ): void {
    // 이미 스케줄된 세그먼트는 스킵 (중복 재생 방지)
    if (this.scheduledSegmentIds.has(segment.id)) {
      // 이미 스케줄됨 (로그 제거)
      return
    }
    
    const source = this.audioContext.createBufferSource()
    source.buffer = buffer
    source.connect(this.masterGain)

    const duration = segment.durationSec - offset
    
    // TTS 음성파일 시작 로그 (성능 최적화를 위해 주석 처리)
    // console.log('[TtsTrack] 세그먼트 시작', {
    //   segmentId: segment.id,
    //   segmentStartSec: segment.startSec,
    //   segmentDurationSec: segment.durationSec,
    //   tSec: segment.startSec, // 타임라인 시간
    //   sceneIndex: segment.sceneIndex,
    //   partIndex: segment.partIndex,
    //   audioContextStartTime: startTime,
    //   offset,
    //   duration,
    // })
    
    // 세그먼트 시작 시 즉시 씬 전환 트리거 (TTS와 씬 전환 동기화)
    // sceneIndex를 함께 전달하여 정확한 씬 전환 보장
    if (this.onSegmentStartCallback && segment.sceneIndex !== undefined) {
      this.onSegmentStartCallback(segment.startSec, segment.sceneIndex)
    }
    
    source.start(startTime, offset, duration)

    this.activeSources.push(source)
    this.scheduledSegmentIds.add(segment.id)
    this.sourceToSegmentId.set(source, segment.id)

    // 재생 완료 시 정리 및 콜백 호출
    source.onended = () => {
      const index = this.activeSources.indexOf(source)
      if (index > -1) {
        this.activeSources.splice(index, 1)
      }
      this.scheduledSegmentIds.delete(segment.id)
      this.sourceToSegmentId.delete(source)
      
      // 세그먼트 종료 시간 계산 및 콜백 호출 (즉시 렌더링 업데이트)
      if (this.onSegmentEndCallback && segment.sceneIndex !== undefined) {
        const segmentEndTime = segment.startSec + segment.durationSec
        // TTS 음성파일 종료 로그 (성능 최적화를 위해 주석 처리)
        // console.log('[TtsTrack] 세그먼트 종료', {
        //   segmentId: segment.id,
        //   segmentStartSec: segment.startSec,
        //   segmentDurationSec: segment.durationSec,
        //   segmentEndTime,
        //   tSec: segmentEndTime, // 타임라인 시간
        //   sceneIndex: segment.sceneIndex,
        //   partIndex: segment.partIndex,
        // })
        this.onSegmentEndCallback(segmentEndTime, segment.sceneIndex)
      }
    }
  }

  /**
   * Lookahead 루프 시작
   * 재생 중 다음 세그먼트들을 미리 스케줄합니다.
   * 
   * @param initialT 초기 타임라인 시간
   * @param sceneIndex 현재 씬 인덱스 (같은 씬의 세그먼트만 스케줄)
   */
  private startLookaheadLoop(initialT: number, sceneIndex?: number): void {
    if (this.lookaheadInterval !== null) {
      return
    }

    const active = this.getActiveSegment(initialT)
    if (!active) {
      return
    }
    
    let lastScheduledIndex = active.segmentIndex
    const currentSceneIndex = sceneIndex ?? active.segment.sceneIndex

    const scheduleNext = () => {
      // 현재 재생 중인 마지막 세그먼트 확인
      const lastSource = this.activeSources[this.activeSources.length - 1]
      if (!lastSource) {
        this.stopLookaheadLoop()
        return
      }

      // 다음 스케줄할 세그먼트 찾기 (같은 씬의 세그먼트만)
      let nextIndex = lastScheduledIndex + 1
      while (nextIndex < this.segments.length) {
        const nextSegment = this.segments[nextIndex]
        // 같은 씬의 세그먼트만 스케줄
        if (nextSegment.sceneIndex === currentSceneIndex) {
          // 허용된 씬 인덱스가 설정되어 있으면 확인
          if (this.allowedSceneIndices !== null && nextSegment.sceneIndex !== undefined) {
            if (!this.allowedSceneIndices.has(nextSegment.sceneIndex)) {
              // 허용되지 않은 씬의 세그먼트이므로 루프 중지
              this.stopLookaheadLoop()
              return
            }
          }
          const buffer = this.bufferMap.get(nextSegment.id)
          if (buffer && !this.scheduledSegmentIds.has(nextSegment.id)) {
            // 마지막 소스의 종료 시간 계산
            // AudioBufferSourceNode는 startTime과 duration을 직접 노출하지 않으므로
            // 현재 시간을 기준으로 다음 세그먼트 시작 시간 계산
            const lastStartTime = this.audioContext.currentTime
            const lastDuration = nextSegment.durationSec
            const nextStartTime = lastStartTime + lastDuration

            this.scheduleSegment(nextSegment, buffer, nextStartTime, 0)
            lastScheduledIndex = nextIndex
            break
          } else if (this.scheduledSegmentIds.has(nextSegment.id)) {
            // 이미 스케줄된 세그먼트는 인덱스만 업데이트
            lastScheduledIndex = nextIndex
            break
          }
        } else {
          // 다른 씬의 세그먼트를 만나면 루프 중지
          this.stopLookaheadLoop()
          return
        }
        nextIndex++
      }
      
      if (nextIndex >= this.segments.length) {
        this.stopLookaheadLoop()
        return
      }

      // 다음 체크 예약
      this.lookaheadInterval = setTimeout(
        scheduleNext,
        this.LOOKAHEAD_TIME * 1000
      ) as unknown as number
    }

    // 초기 지연 후 시작
    this.lookaheadInterval = setTimeout(
      scheduleNext,
      this.LOOKAHEAD_TIME * 1000
    ) as unknown as number
  }

  /**
   * Lookahead 루프 중지
   */
  private stopLookaheadLoop(): void {
    if (this.lookaheadInterval !== null) {
      clearTimeout(this.lookaheadInterval)
      this.lookaheadInterval = null
    }
  }

  /**
   * 모든 재생 중지
   */
  stopAll(): void {
    this.stopLookaheadLoop()

    // 모든 활성 소스 정지
    this.activeSources.forEach(source => {
      try {
        source.stop()
      } catch {
        // 이미 종료된 소스는 무시
      }
    })
    // activeSources 배열을 완전히 비우기 (lookahead 루프가 스케줄한 미래 세그먼트들도 정리)
    this.activeSources = []
    this.scheduledSegmentIds.clear()
    this.sourceToSegmentId.clear()
    this.lastPlayedSceneIndex = null
  }

  /**
   * 특정 시간 `t`에 해당하는 활성 세그먼트 반환
   * 
   * @param tSec 타임라인 시간 (초)
   * @returns 활성 세그먼트 정보 또는 null
   */
  getActiveSegment(tSec: number): ActiveSegment | null {
    // 세그먼트 테이블에서 tSec에 해당하는 세그먼트 찾기
    for (let i = 0; i < this.segments.length; i++) {
      const segment = this.segments[i]
      const segmentStart = segment.startSec
      const segmentEnd = segmentStart + segment.durationSec

      if (tSec >= segmentStart && tSec < segmentEnd) {
        const offset = tSec - segmentStart
        return {
          segment,
          offset,
          segmentIndex: i,
        }
      }
    }

    // 마지막 세그먼트의 끝에 정확히 있는 경우
    if (this.segments.length > 0) {
      const lastSegment = this.segments[this.segments.length - 1]
      const lastSegmentEnd = lastSegment.startSec + lastSegment.durationSec
      if (tSec >= lastSegmentEnd) {
        return {
          segment: lastSegment,
          offset: lastSegment.durationSec,
          segmentIndex: this.segments.length - 1,
        }
      }
    }

    return null
  }

  /**
   * 세그먼트 테이블 업데이트 (자막 수정 시)
   * 
   * @param updatedSegments 새로운 세그먼트 목록
   * @param currentT 현재 Transport 시간 (재생 중일 때만 필요)
   */
  updateSegments(updatedSegments: TtsSegment[], currentT?: number): void {
    const wasPlaying = this.activeSources.length > 0

    // 재생 중이면 일시정지
    if (wasPlaying) {
      this.stopAll()
    }

    // 세그먼트 업데이트
    this.segments = updatedSegments

    // 새로운 세그먼트 버퍼 로딩 (비동기)
    void this.preload(updatedSegments).then(() => {
      // 재생 중이었고 currentT가 제공되었으면 재개
      if (wasPlaying && currentT !== undefined && currentT !== null) {
        const audioCtxTime = this.audioContext.currentTime
        this.playFrom(currentT, audioCtxTime)
      }
    }).catch(() => {
      // 세그먼트 업데이트 후 로딩 실패 (로그 제거)
    })
  }

  /**
   * 특정 씬의 세그먼트만 교체 (부분 업데이트)
   * 
   * @param sceneIndex 씬 인덱스
   * @param newSegments 새로운 세그먼트 목록
   * @param currentT 현재 Transport 시간 (재생 중일 때만 필요)
   */
  replaceSceneSegments(sceneIndex: number, newSegments: TtsSegment[], currentT?: number): void {
    // 기존 세그먼트에서 해당 씬 찾기
    const oldSegments = this.segments.filter(s => s.sceneIndex === sceneIndex)
    if (oldSegments.length === 0 && newSegments.length === 0) {
      return // 변경사항 없음
    }

    const oldDuration = oldSegments.reduce((sum, s) => sum + s.durationSec, 0)
    const newDuration = newSegments.reduce((sum, s) => sum + s.durationSec, 0)
    const durationDiff = newDuration - oldDuration
    const oldStartSec = oldSegments.length > 0 ? oldSegments[0].startSec : 0

    // 세그먼트 교체 및 이후 세그먼트 startSec 조정
    const updatedSegments: TtsSegment[] = []

    for (const seg of this.segments) {
      if (seg.sceneIndex === sceneIndex) {
        // 해당 씬의 세그먼트는 건너뛰기 (나중에 새 것으로 교체)
        continue
      }

      if (seg.startSec >= oldStartSec + oldDuration) {
        // 이후 세그먼트들의 startSec 조정
        updatedSegments.push({
          ...seg,
          startSec: seg.startSec + durationDiff,
        })
      } else {
        // 이전 세그먼트는 그대로
        updatedSegments.push(seg)
      }
    }

    // 새로운 세그먼트 삽입 (올바른 위치에)
    if (newSegments.length > 0) {
      // startSec를 올바르게 설정
      let accumulatedTime = oldStartSec
      newSegments.forEach((seg) => {
        updatedSegments.push({
          ...seg,
          startSec: accumulatedTime,
        })
        accumulatedTime += seg.durationSec
      })

      // startSec 기준으로 정렬
      updatedSegments.sort((a, b) => a.startSec - b.startSec)
    }

    // 업데이트
    this.updateSegments(updatedSegments, currentT)
  }

  /**
   * 현재 재생 중인 시간 계산 (대략적)
   * 실제로는 Transport의 getTime()을 사용해야 함
   * 이 메서드는 updateSegments 내부에서만 사용되며, Transport 시간을 외부에서 받아야 함
   */
  private getCurrentPlaybackTime(): number | null {
    // 실제로는 Transport의 getTime()을 사용해야 하므로
    // 이 메서드는 사용하지 않음 (외부에서 Transport 시간을 전달받아야 함)
    return null
  }

  /**
   * 현재 상태 반환
   */
  getState(): TtsTrackState {
    const activeSegment = this.activeSources.length > 0
      ? this.getActiveSegment(0)?.segmentIndex ?? null
      : null

    return {
      segments: [...this.segments],
      loadingCount: 0, // TODO: 로딩 상태 추적
      activeSegmentIndex: activeSegment,
    }
  }

  /**
   * 세그먼트 목록 반환
   */
  getSegments(): TtsSegment[] {
    return [...this.segments]
  }

  /**
   * 세그먼트 종료 콜백 설정
   * 세그먼트가 끝날 때 호출되는 콜백을 등록합니다.
   * 
   * @param callback 세그먼트 종료 시 호출될 콜백 (segmentEndTime: number) => void
   */
  setOnSegmentEnd(callback: ((segmentEndTime: number, sceneIndex: number) => void) | null): void {
    this.onSegmentEndCallback = callback
  }

  setOnSegmentStart(callback: ((segmentStartTime: number, sceneIndex: number) => void) | null): void {
    this.onSegmentStartCallback = callback
  }

  /**
   * 정리 (컴포넌트 언마운트 시 호출)
   */
  dispose(): void {
    this.stopAll()
    this.bufferMap.clear()
    this.segments = []
    this.onSegmentEndCallback = null
    this.onSegmentStartCallback = null
  }
}
