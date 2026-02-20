type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface DebugOptions {
  /** 로그 레벨 (기본값: 'debug') */
  level?: LogLevel
  /** 태그/네임스페이스 (예: 'scene-renderer', 'playback-controls') */
  tag?: string
  /** 개발 환경에서만 로그 출력 (기본값: true) */
  devOnly?: boolean
  /** 조건부 로깅 */
  condition?: boolean
  /** 객체 깊이 제한 (기본값: 3) */
  depth?: number
}

class Debugger {
  private isDev: boolean
  private enabledTags: Set<string> | null = null // null이면 모든 태그 활성화
  private minLevel: LogLevel = 'debug'

  constructor() {
    this.isDev = process.env.NODE_ENV === 'development'
    
    // 환경 변수로 디버깅 설정 제어
    if (typeof window !== 'undefined') {
      const debugTags = localStorage.getItem('debug:tags')
      if (debugTags) {
        this.enabledTags = new Set(debugTags.split(','))
      }
      
      const debugLevel = localStorage.getItem('debug:level') as LogLevel
      if (debugLevel) {
        this.minLevel = debugLevel
      }
    }
  }

  private shouldLog(level: LogLevel, tag?: string, devOnly = true): boolean {
    if (devOnly && !this.isDev) return false
    
    // 레벨 체크
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error']
    if (levels.indexOf(level) < levels.indexOf(this.minLevel)) {
      return false
    }
    
    // 태그 필터링
    if (this.enabledTags && tag && !this.enabledTags.has(tag)) {
      return false
    }
    
    return true
  }

  private formatMessage(tag: string | undefined, message: string): string {
    return tag ? `[${tag}] ${message}` : message
  }

  /**
   * 디버그 로그 (개발 환경에서만)
   */
  debug(message: string, data?: any, options?: DebugOptions): void {
    const { tag, devOnly = true, condition = true, depth = 3 } = options || {}
    
    if (!condition || !this.shouldLog('debug', tag, devOnly)) return
    
    const formatted = this.formatMessage(tag, message)
    if (data !== undefined) {
    } else {
    }
  }

  /**
   * 정보 로그
   */
  info(message: string, data?: any, options?: DebugOptions): void {
    const { tag, devOnly = false, condition = true, depth = 3 } = options || {}
    
    if (!condition || !this.shouldLog('info', tag, devOnly)) return
    
    const formatted = this.formatMessage(tag, message)
    if (data !== undefined) {
    } else {
    }
  }

  /**
   * 경고 로그
   */
  warn(message: string, data?: any, options?: DebugOptions): void {
    const { tag, devOnly = false, condition = true, depth = 3 } = options || {}
    
    if (!condition || !this.shouldLog('warn', tag, devOnly)) return
    
    const formatted = this.formatMessage(tag, message)
    if (data !== undefined) {
      console.warn(formatted, this.serializeData(data, depth))
    } else {
      console.warn(formatted)
    }
  }

  /**
   * 에러 로그
   */
  error(message: string, error?: Error | any, options?: DebugOptions): void {
    const { tag, devOnly = false, condition = true, depth = 5 } = options || {}
    
    if (!condition || !this.shouldLog('error', tag, devOnly)) return
    
    const formatted = this.formatMessage(tag, message)
    
    if (error instanceof Error) {
      console.error(formatted, error)
      if (error.stack) {
        console.error('Stack trace:', error.stack)
      }
    } else if (error !== undefined) {
      console.error(formatted, this.serializeData(error, depth))
    } else {
      console.error(formatted)
    }
  }

  /**
   * 성능 측정 시작
   */
  time(label: string, tag?: string): void {
    if (!this.isDev) return
    const formatted = this.formatMessage(tag, label)
    console.time(formatted)
  }

  /**
   * 성능 측정 종료
   */
  timeEnd(label: string, tag?: string): void {
    if (!this.isDev) return
    const formatted = this.formatMessage(tag, label)
    console.timeEnd(formatted)
  }

  /**
   * 로그 그룹 시작
   */
  group(label: string, tag?: string, collapsed = false): void {
    if (!this.isDev) return
    const formatted = this.formatMessage(tag, label)
    if (collapsed) {
      console.groupCollapsed(formatted)
    } else {
      console.group(formatted)
    }
  }

  /**
   * 로그 그룹 종료
   */
  groupEnd(): void {
    if (!this.isDev) return
    console.groupEnd()
  }

  /**
   * 테이블 형태로 데이터 출력
   */
  table(data: any, tag?: string): void {
    if (!this.isDev) return
    const formatted = this.formatMessage(tag, 'Table')
    console.table(data)
  }

  /**
   * 객체를 안전하게 직렬화 (순환 참조 방지)
   */
  private serializeData(data: any, depth: number): any {
    if (depth <= 0) return '[Max depth reached]'
    
    try {
      // 원시 타입
      if (data === null || data === undefined) return data
      if (typeof data !== 'object') return data
      
      // Error 객체
      if (data instanceof Error) {
        return {
          name: data.name,
          message: data.message,
          stack: data.stack,
        }
      }
      
      // Date 객체
      if (data instanceof Date) {
        return data.toISOString()
      }
      
      // 배열
      if (Array.isArray(data)) {
        return data.map(item => this.serializeData(item, depth - 1))
      }
      
      // Map/Set
      if (data instanceof Map) {
        return Object.fromEntries(
          Array.from(data.entries()).map(([k, v]) => [
            k,
            this.serializeData(v, depth - 1),
          ])
        )
      }
      
      if (data instanceof Set) {
        return Array.from(data).map(item => this.serializeData(item, depth - 1))
      }
      
      // 일반 객체
      const result: Record<string, any> = {}
      for (const [key, value] of Object.entries(data)) {
        // 순환 참조 체크 (간단한 버전)
        if (key.startsWith('__')) continue
        result[key] = this.serializeData(value, depth - 1)
      }
      
      return result
    } catch (e) {
      return `[Serialization error: ${e}]`
    }
  }

  /**
   * 태그별 디버깅 활성화/비활성화
   * 사용법: localStorage.setItem('debug:tags', 'scene-renderer,playback-controls')
   */
  enableTags(tags: string[]): void {
    if (typeof window !== 'undefined') {
      this.enabledTags = new Set(tags)
      localStorage.setItem('debug:tags', tags.join(','))
    }
  }

  /**
   * 모든 태그 활성화
   */
  enableAllTags(): void {
    if (typeof window !== 'undefined') {
      this.enabledTags = null
      localStorage.removeItem('debug:tags')
    }
  }

  /**
   * 최소 로그 레벨 설정
   * 사용법: localStorage.setItem('debug:level', 'warn')
   */
  setMinLevel(level: LogLevel): void {
    this.minLevel = level
    if (typeof window !== 'undefined') {
      localStorage.setItem('debug:level', level)
    }
  }
}

// 싱글톤 인스턴스
export const debug = new Debugger()

/**
 * 태그별 디버거 생성 함수
 * 
 * @example
 * ```typescript
 * const sceneDebug = createDebugger('scene-renderer')
 * sceneDebug.debug('씬 표시 시작', { index: 5 })
 * sceneDebug.warn('스프라이트 없음', { index: 3 })
 * ```
 */
export const createDebugger = (tag: string) => ({
  debug: (message: string, data?: any, options?: Omit<DebugOptions, 'tag'>) =>
    debug.debug(message, data, { ...options, tag }),
  info: (message: string, data?: any, options?: Omit<DebugOptions, 'tag'>) =>
    debug.info(message, data, { ...options, tag }),
  warn: (message: string, data?: any, options?: Omit<DebugOptions, 'tag'>) =>
    debug.warn(message, data, { ...options, tag }),
  error: (message: string, error?: Error | any, options?: Omit<DebugOptions, 'tag'>) =>
    debug.error(message, error, { ...options, tag }),
  time: (label: string) => debug.time(label, tag),
  timeEnd: (label: string) => debug.timeEnd(label, tag),
  group: (label: string, collapsed?: boolean) => debug.group(label, tag, collapsed),
  groupEnd: () => debug.groupEnd(),
  table: (data: any) => debug.table(data, tag),
})

