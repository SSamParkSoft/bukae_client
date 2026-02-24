type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface DebugOptions {
  tag?: string
  devOnly?: boolean
  condition?: boolean
  depth?: number
}

class Debugger {
  private readonly isDev: boolean
  private enabledTags: Set<string> | null = null
  private minLevel: LogLevel = 'debug'

  constructor() {
    this.isDev = process.env.NODE_ENV === 'development'

    if (typeof window !== 'undefined') {
      const debugTags = localStorage.getItem('debug:tags')
      if (debugTags) {
        this.enabledTags = new Set(debugTags.split(','))
      }

      const debugLevel = localStorage.getItem('debug:level') as LogLevel | null
      if (debugLevel) {
        this.minLevel = debugLevel
      }
    }
  }

  private shouldLog(level: LogLevel, tag?: string, devOnly = true): boolean {
    if (devOnly && !this.isDev) return false

    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error']
    if (levels.indexOf(level) < levels.indexOf(this.minLevel)) {
      return false
    }

    if (this.enabledTags && tag && !this.enabledTags.has(tag)) {
      return false
    }

    return true
  }

  private formatMessage(tag: string | undefined, message: string): string {
    return tag ? `[${tag}] ${message}` : message
  }

  // 호환성 유지를 위한 no-op: debug 로그는 더 이상 출력하지 않음.
  debug(_message: string, _data?: unknown, _options?: DebugOptions): void {}

  // 호환성 유지를 위한 no-op: info 로그는 더 이상 출력하지 않음.
  info(_message: string, _data?: unknown, _options?: DebugOptions): void {}

  warn(message: string, data?: unknown, options?: DebugOptions): void {
    const { tag, devOnly = false, condition = true, depth = 3 } = options || {}

    if (!condition || !this.shouldLog('warn', tag, devOnly)) return

    const formatted = this.formatMessage(tag, message)
    if (data !== undefined) {
      console.warn(formatted, this.serializeData(data, depth))
      return
    }

    console.warn(formatted)
  }

  error(message: string, error?: unknown, options?: DebugOptions): void {
    const { tag, devOnly = false, condition = true, depth = 5 } = options || {}

    if (!condition || !this.shouldLog('error', tag, devOnly)) return

    const formatted = this.formatMessage(tag, message)

    if (error instanceof Error) {
      console.error(formatted, error)
      if (error.stack) {
        console.error('Stack trace:', error.stack)
      }
      return
    }

    if (error !== undefined) {
      console.error(formatted, this.serializeData(error, depth))
      return
    }

    console.error(formatted)
  }

  // 호환성 유지를 위한 no-op: 개발용 시간 측정 출력은 더 이상 사용하지 않음.
  time(_label: string, _tag?: string): void {}

  // 호환성 유지를 위한 no-op: 개발용 시간 측정 출력은 더 이상 사용하지 않음.
  timeEnd(_label: string, _tag?: string): void {}

  // 호환성 유지를 위한 no-op: 로그 그룹 출력은 더 이상 사용하지 않음.
  group(_label: string, _tag?: string, _collapsed = false): void {}

  // 호환성 유지를 위한 no-op: 로그 그룹 출력은 더 이상 사용하지 않음.
  groupEnd(): void {}

  // 호환성 유지를 위한 no-op: 테이블 출력은 더 이상 사용하지 않음.
  table(_data: unknown, _tag?: string): void {}

  private serializeData(data: unknown, depth: number): unknown {
    if (depth <= 0) return '[Max depth reached]'

    try {
      if (data === null || data === undefined) return data
      if (typeof data !== 'object') return data

      if (data instanceof Error) {
        return {
          name: data.name,
          message: data.message,
          stack: data.stack,
        }
      }

      if (data instanceof Date) {
        return data.toISOString()
      }

      if (Array.isArray(data)) {
        return data.map((item) => this.serializeData(item, depth - 1))
      }

      if (data instanceof Map) {
        return Object.fromEntries(
          Array.from(data.entries()).map(([k, v]) => [
            k,
            this.serializeData(v, depth - 1),
          ])
        )
      }

      if (data instanceof Set) {
        return Array.from(data).map((item) => this.serializeData(item, depth - 1))
      }

      const result: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(data)) {
        if (key.startsWith('__')) continue
        result[key] = this.serializeData(value, depth - 1)
      }

      return result
    } catch (error) {
      return `[Serialization error: ${error}]`
    }
  }

  enableTags(tags: string[]): void {
    if (typeof window !== 'undefined') {
      this.enabledTags = new Set(tags)
      localStorage.setItem('debug:tags', tags.join(','))
    }
  }

  enableAllTags(): void {
    if (typeof window !== 'undefined') {
      this.enabledTags = null
      localStorage.removeItem('debug:tags')
    }
  }

  setMinLevel(level: LogLevel): void {
    this.minLevel = level
    if (typeof window !== 'undefined') {
      localStorage.setItem('debug:level', level)
    }
  }
}

export const debug = new Debugger()

export const createDebugger = (tag: string) => ({
  debug: (message: string, data?: unknown, options?: Omit<DebugOptions, 'tag'>) =>
    debug.debug(message, data, { ...options, tag }),
  info: (message: string, data?: unknown, options?: Omit<DebugOptions, 'tag'>) =>
    debug.info(message, data, { ...options, tag }),
  warn: (message: string, data?: unknown, options?: Omit<DebugOptions, 'tag'>) =>
    debug.warn(message, data, { ...options, tag }),
  error: (message: string, error?: unknown, options?: Omit<DebugOptions, 'tag'>) =>
    debug.error(message, error, { ...options, tag }),
  time: (label: string) => debug.time(label, tag),
  timeEnd: (label: string) => debug.timeEnd(label, tag),
  group: (label: string, collapsed?: boolean) => debug.group(label, tag, collapsed),
  groupEnd: () => debug.groupEnd(),
  table: (data: unknown) => debug.table(data, tag),
})
