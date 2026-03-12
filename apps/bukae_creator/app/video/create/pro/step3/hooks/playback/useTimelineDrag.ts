import { useCallback } from 'react'

export function useTimelineDrag(
  timelineBarRef: React.RefObject<HTMLDivElement | null>,
  onSeek: (ratio: number) => void
) {
  const handleTimelineMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = timelineBarRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      onSeek(ratio)

      const onMove = (moveEvent: MouseEvent) => {
        const bar = timelineBarRef.current
        if (!bar) return
        const rct = bar.getBoundingClientRect()
        const r = Math.max(0, Math.min(1, (moveEvent.clientX - rct.left) / rct.width))
        onSeek(r)
      }
      const onUp = () => {
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
      }
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    },
    [timelineBarRef, onSeek]
  )

  return { handleTimelineMouseDown }
}
