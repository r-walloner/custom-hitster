import { useState } from 'react'
import type { StateMessage } from '../../api/messages.ts'
import { withoutSpotify } from '../playback/devices.ts'

/**
 * Calls `onFallback` with the guests' names when the server switched the room from separate
 * speakers to one speaker, because a guest without Spotify joined (the host can't pick separate
 * speakers while one is there).
 */
export function useSpeakerFallback(
  state: StateMessage | null,
  onFallback: (guests: string[]) => void,
): void {
  // The mode in the last state; none before the first.
  const [mode, setMode] = useState<string | null>(null)

  const now = state?.room.settings.mode ?? null
  if (state && now !== mode) {
    setMode(now)
    const guests = withoutSpotify(state.room.players)
    if (mode === 'remote' && now === 'local' && guests.length > 0) onFallback(guests)
  }
}
