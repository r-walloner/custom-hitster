import { useEffect, useState } from 'react'
import type { PlaybackView } from '../../api/messages.ts'

/** The tape fills over this much of the song: about how long a turn listens. */
const LISTEN_MS = 30_000

/** "0:09" */
export function clock(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

/**
 * How far the song in play is, counted on this device from `start` (the server doesn't say; a
 * backend TODO in README.md). Ticks twice a second.
 */
export function useSongClock(start: number, status: PlaybackView['status']) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 500)
    return () => window.clearInterval(timer)
  }, [])
  const elapsed = status === 'idle' || status === 'starting' ? 0 : Math.max(0, now - start)
  return {
    progress: elapsed / LISTEN_MS,
    time: status === 'starting' ? 'Starting…' : clock(elapsed),
    playing: status === 'playing',
  }
}
