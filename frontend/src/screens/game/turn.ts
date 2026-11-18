import { useState } from 'react'
import type { ClientMessage, GamePlayerView, GameView, StateMessage } from '../../api/messages.ts'
import type { Song } from '../../components/types.ts'
import { useRoomTools } from '../room/context.ts'
import { toSong } from './board.ts'

/** The running turn, as every phase screen needs it. */
export interface Turn {
  game: GameView
  /** The player on turn, whose timeline is on the board. */
  active: GamePlayerView
  /** Their timeline as songs, oldest first. */
  cards: Song[]
  /** The host or the player on turn: may move on to the next song. */
  referee: boolean
  /** A new song is on its way; draws wait until it is in. */
  loading: boolean
  /** Sends a move that draws a new card (skip, buy, next turn), and locks the draw buttons. */
  draw: (message: ClientMessage) => void
  /** While picking: the challenger whose turn it is to mark a slot. */
  picker: GameView['challenges'][number] | undefined
}

/** The running turn, or null outside a game. */
export function useTurn(): Turn | null {
  const { state, room, you, send } = useRoomTools()
  // The state on screen when this device asked for a new card. Until the server answers with a
  // newer state (it always does, also on a refusal), the draw buttons stay locked.
  const [drawSentAt, setDrawSentAt] = useState<StateMessage | null>(null)
  const game = room.game
  if (!game) return null

  const active = game.players.find((player) => player.id === game.active) ?? game.players[0]
  return {
    game,
    active,
    cards: active.timeline.map(toSong),
    referee: you.is_host || you.player_id === game.active,
    loading: game.drawing || drawSentAt === state,
    draw: (message: ClientMessage) => {
      setDrawSentAt(state)
      send(message)
    },
    picker:
      game.phase === 'picking' ? game.challenges.find((challenge) => !challenge.locked) : undefined,
  }
}
