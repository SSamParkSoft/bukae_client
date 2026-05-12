import { useRef, useEffect } from 'react'

export function useScrollToBottom(deps: unknown[]) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight
    }
  }, deps)  // eslint-disable-line react-hooks/exhaustive-deps

  return ref
}
