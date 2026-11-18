import { useState } from 'react'
import type { PlayerView, StateMessage } from '../../api/messages.ts'

/** Calls `onDrop` when a seat goes offline mid-game, whether it left or lost its connection. */
export function usePresence(
  state: StateMessage | null,
  onDrop: (seat: PlayerView, key: string) => void,
): void {
  // Who was online in the last state.
  const [online, setOnline] = useState({ key: '', ids: [] as string[] })

  const connected = state?.room.players.filter((p) => p.connected).map((p) => p.id) ?? []
  const key = connected.join(',')
  if (state && online.key !== key) {
    setOnline({ key, ids: connected })
    const dropped = online.ids.filter(
      (id) => !connected.includes(id) && id !== state.you.player_id,
    )
    const seat = state.room.players.find((p) => p.id === dropped[0])
    if (state.room.game && seat) onDrop(seat, key)
  }
}
