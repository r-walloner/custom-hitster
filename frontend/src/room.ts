import { createContext, useContext } from 'react'
import type { Me } from './api.ts'
import type {
  CardView,
  Device,
  Library,
  PlayerView,
  RoomView,
  Send,
  StateMessage,
} from './messages.ts'
import type { Player, Song } from './types.ts'
import type { PlaybackTest } from './useRoom.ts'

/** Screens that replace the room's screen until closed. */
export type Subscreen = 'settings' | 'speaker'
/** Pop-ups over the room's screen. */
export type DialogName = 'addPlayer' | 'menu' | 'scoreboard'
export type ToastTone = 'right' | 'wrong' | 'heads-up'

/** Everything a room screen needs: the state, a way to act, and helpers over both. */
export interface RoomTools {
  me: Me
  state: StateMessage
  room: RoomView
  you: StateMessage['you']
  send: Send
  devices: Device[] | null
  playbackTest: PlaybackTest | null
  /** When this browser saw the song in play start (Date.now()). */
  songStart: number
  /** A seat for the design components: name and avatar colour. */
  player: (id: string) => Player
  name: (id: string | null | undefined) => string
  host: PlayerView | undefined
  /** A hot-seat player, played on the host's device. */
  isLocal: (id: string) => boolean
  /** Can this device make that player's moves? The host may act for anyone. */
  canActFor: (id: string) => boolean
  /** `as_player` for a move made for someone else. */
  as: (id: string) => { as_player?: string }
  /** Does this device's own Spotify play the music? */
  hearsMusic: boolean
  open: (screen: Subscreen | DialogName) => void
  close: () => void
  toast: (tone: ToastTone, text: string) => void
}

export const RoomContext = createContext<RoomTools | null>(null)

export function useRoomTools(): RoomTools {
  const tools = useContext(RoomContext)
  if (!tools) throw new Error('useRoomTools needs a RoomContext')
  return tools
}

type Helpers = Pick<
  RoomTools,
  'player' | 'name' | 'host' | 'isLocal' | 'canActFor' | 'as' | 'hearsMusic'
>

/**
 * The helpers over one state. `seenConnected` holds the seats this browser has seen online: the
 * server reports hot-seat players and dropped guests both as not connected, so a seat never seen
 * online counts as a local player.
 */
export function helpers(state: StateMessage, seenConnected: ReadonlySet<string>): Helpers {
  const { room, you } = state
  const index = (id: string) => room.players.findIndex((player) => player.id === id)
  const seat = (id: string) => room.players.find((player) => player.id === id)
  const name = (id: string | null | undefined) => (id ? (seat(id)?.name ?? '?') : '?')
  const me = you.player_id ? seat(you.player_id) : undefined
  return {
    player: (id) => {
      const i = index(id)
      return { id, name: name(id), color: (((i < 0 ? 0 : i) % 5) + 1) as Player['color'] }
    },
    name,
    host: room.players.find((player) => player.is_host),
    isLocal: (id) => {
      const player = seat(id)
      return !!player && !player.connected && !player.spotify && !seenConnected.has(id)
    },
    canActFor: (id) => you.is_host || id === you.player_id,
    as: (id) => (id !== you.player_id ? { as_player: id } : {}),
    hearsMusic: !!me?.spotify && (room.settings.mode === 'remote' || you.is_host),
  }
}

export function toSong(card: CardView): Song {
  return { id: card.id, year: card.year, title: card.name, artist: card.artists.join(', ') }
}

export const fmt = (n: number) => n.toLocaleString('en-US')

export const plural = (n: number, word: string) => `${fmt(n)} ${word}${n === 1 ? '' : 's'}`

/** "Mara", "Mara and Sam", "Mara, Sam and Lea". */
export function names(list: string[]): string {
  if (list.length <= 1) return list.join('')
  return `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`
}

/** A library's state in a few words, for a player row. */
export function libraryStatus(library: Library | null): string {
  if (!library) return 'No library'
  switch (library.status) {
    case 'none':
      return 'Library not imported'
    case 'running':
      return 'Importing library…'
    case 'done':
      return `${plural(library.tracks, 'song')} in library`
    case 'error':
      return `Import stopped, ${plural(library.tracks, 'song')} kept`
  }
}

/** A player's status in the lobby lists. */
export function playerStatus(player: PlayerView, local: boolean): string {
  if (local) return 'Local player'
  if (!player.connected) return 'Reconnecting…'
  const library = player.spotify ? libraryStatus(player.library) : 'Guest'
  return player.is_host ? `Host, ${library.charAt(0).toLowerCase()}${library.slice(1)}` : library
}
