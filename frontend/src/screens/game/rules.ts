// The game rules the screens need to know ahead of the server, as engine.py has them.
import type { GamePlayerView, GameView } from '../../api/messages.ts'
import type { Song } from '../../components/types.ts'

/** Tokens a bought card costs (engine.Rules.buy_cost). */
export const BUY_COST = 3

/** Tokens never go above this (engine.Rules.max_tokens). */
export const MAX_TOKENS = 5

/**
 * May `id` buy a card now? The player on turn waits until their card is revealed, and nobody buys
 * while a new song is `loading`.
 */
export function canBuy(game: GameView, id: string, loading: boolean): boolean {
  const tokens = game.players.find((player) => player.id === id)?.tokens ?? 0
  return (
    tokens >= BUY_COST &&
    game.deck_remaining > 0 &&
    game.phase !== 'finished' &&
    (id !== game.active || game.phase === 'revealed') &&
    !loading
  )
}

/** Is a card from `year` in order at `slot`? Equal years may go on either side, as in the engine. */
export function fits(cards: Song[], slot: number, year: number): boolean {
  const before = slot > 0 ? cards[slot - 1].year : null
  const after = slot < cards.length ? cards[slot].year : null
  return (before === null || before <= year) && (after === null || year <= after)
}

/** The players best first: most cards, then most tokens. */
export function byStanding(players: GamePlayerView[]): GamePlayerView[] {
  return [...players].sort((a, b) => b.timeline.length - a.timeline.length || b.tokens - a.tokens)
}
