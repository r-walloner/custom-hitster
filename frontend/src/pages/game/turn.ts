import type { ClientMessage, GamePlayerView, GameView } from '../../messages.ts'
import type { Song } from '../../types.ts'

/** The running turn, as every phase screen needs it. */
export interface Turn {
  game: GameView
  /** The player on turn, whose timeline is on the board. */
  active: GamePlayerView
  /** Their timeline as songs, oldest first. */
  cards: Song[]
  /** The host or the player on turn: may reveal, judge the answer and move on. */
  referee: boolean
  /** A new song is on its way; draws wait until it is in. */
  loading: boolean
  /** Sends a move that draws a new card (skip, buy, next turn), and locks the draw buttons. */
  draw: (message: ClientMessage) => void
  /** While picking: the challenger whose turn it is to mark a slot. */
  picker: GameView['challenges'][number] | undefined
}

export const BUY_COST = 3

/** May `id` buy a card now? The player on turn waits until their card is revealed (engine.py). */
export function canBuy(turn: Turn, id: string): boolean {
  const { game } = turn
  const tokens = game.players.find((player) => player.id === id)?.tokens ?? 0
  return (
    tokens >= BUY_COST &&
    game.deck_remaining > 0 &&
    game.phase !== 'finished' &&
    (id !== game.active || game.phase === 'revealed') &&
    !turn.loading
  )
}
