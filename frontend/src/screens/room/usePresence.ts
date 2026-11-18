import { useState } from 'react'
import type { PlayerView, StateMessage } from '../../api/messages.ts'

/**
 * Tracks who is online across states. Returns the seats this browser has ever seen online (for
 * telling local players from dropped guests) and calls `onDrop` when a seat goes offline mid-game.
 */
export function usePresence(
  state: StateMessage | null,
  onDrop: (seat: PlayerView, key: string) => void,
): ReadonlySet<string> {
  // Who was online in the last state, and who this browser has ever seen online.
  const [online, setOnline] = useState({ key: '', ids: [] as string[], seen: new Set<string>() })

  const connected = state?.room.players.filter((p) => p.connected).map((p) => p.id) ?? []
  const key = connected.join(',')
  if (state && online.key !== key) {
    const seen = new Set([...online.seen, ...connected])
    setOnline({ key, ids: connected, seen })
    const dropped = online.ids.filter(
      (id) => !connected.includes(id) && id !== state.you.player_id,
    )
    const seat = state.room.players.find((p) => p.id === dropped[0])
    if (state.room.game && seat) onDrop(seat, key)
  }
  return online.seen
}
