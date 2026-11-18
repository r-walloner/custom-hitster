import { createContext, useContext } from 'react'
import type { Me } from '../../api/http.ts'
import type { Device, PlayerView, RoomView, Send, StateMessage } from '../../api/messages.ts'
import type { PlaybackTest } from '../../api/useRoom.ts'
import type { Player } from '../../components/types.ts'

/** Screens that replace the room's screen until closed. */
export type Subscreen = 'settings' | 'playback' | 'library'
/** Pop-ups over the room's screen. */
export type DialogName = 'addPlayer' | 'rename' | 'menu' | 'scoreboard'
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
  /** When the song in play started, on this browser's clock (Date.now()). */
  songStart: number
  /** A seat for the design components: name and avatar colour. */
  player: (id: string) => Player
  name: (id: string | null | undefined) => string
  host: PlayerView | undefined
  /** A hot-seat player, played on the host's device. */
  isLocal: (id: string) => boolean
  /** A player who has left or lost their connection; their seat waits for them. */
  isAway: (id: string) => boolean
  /** Can this device make that player's moves? The host may act for anyone who isn't away. */
  canActFor: (id: string) => boolean
  /** `as_player` for a move made for someone else. */
  as: (id: string) => { as_player?: string }
  /** Does this device's own Spotify play the music? */
  hearsMusic: boolean
  /** `player` is who the pop-up is about: the seat to rename. */
  open: (screen: Subscreen | DialogName, player?: string) => void
  /** The seat the rename pop-up is for. */
  renaming: string | null
  close: () => void
  toast: (tone: ToastTone, text: string) => void
}

export const RoomContext = createContext<RoomTools | null>(null)

/** The room's tools, for any screen inside `/room/:code` (provided by Room.tsx). */
export function useRoomTools(): RoomTools {
  const tools = useContext(RoomContext)
  if (!tools) throw new Error('useRoomTools needs a RoomContext')
  return tools
}
