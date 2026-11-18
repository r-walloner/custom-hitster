import type { StateMessage } from '../../api/messages.ts'
import type { Player } from '../../components/types.ts'
import type { RoomTools } from './context.ts'

export type SeatHelpers = Pick<
  RoomTools,
  'player' | 'name' | 'host' | 'isLocal' | 'isAway' | 'canActFor' | 'as' | 'hearsMusic'
>

/** The helpers over one state. */
export function seatHelpers(state: StateMessage): SeatHelpers {
  const { room, you } = state
  const index = (id: string) => room.players.findIndex((player) => player.id === id)
  const seat = (id: string) => room.players.find((player) => player.id === id)
  const name = (id: string | null | undefined) => (id ? (seat(id)?.name ?? '?') : '?')
  const me = you.player_id ? seat(you.player_id) : undefined
  const isAway = (id: string) => {
    const player = seat(id)
    return !!player && !player.connected && !player.local
  }
  return {
    player: (id) => {
      const i = index(id)
      return { id, name: name(id), color: (((i < 0 ? 0 : i) % 5) + 1) as Player['color'] }
    },
    name,
    host: room.players.find((player) => player.is_host),
    isLocal: (id) => !!seat(id)?.local,
    isAway,
    canActFor: (id) => id === you.player_id || (you.is_host && !!seat(id)?.local),
    as: (id) => (id !== you.player_id ? { as_player: id } : {}),
    hearsMusic: !!me?.spotify && (room.settings.mode === 'remote' || you.is_host),
  }
}
