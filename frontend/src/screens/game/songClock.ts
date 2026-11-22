import { useEffect, useState } from 'react'
import type { PlaybackView } from '../../api/messages.ts'

/** "0:09" */
export function clock(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

/** How far the song in play is, counted from `start` on this device's clock. Ticks twice a second. */
export function useSongClock(start: number, playback: PlaybackView) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 500)
    return () => window.clearInterval(timer)
  }, [])
  const { status, duration_ms: duration } = playback
  const running = status === 'playing' || status === 'failed' || status === 'stopped'
  const elapsed = running ? Math.min(Math.max(0, now - start), duration ?? Infinity) : 0
  let time = clock(elapsed)
  if (duration !== null) time += ` / ${clock(duration)}`
  return {
    progress: duration ? elapsed / duration : 0,
    time,
    playing: status === 'playing',
  }
}
