// The game rules the screens need to know ahead of the server, as engine.py has them.
import type { GamePlayerView, GameView } from '../../api/messages.ts'
import type { Song } from '../../components/types.ts'

/** Tokens a bought card costs (engine.Rules.buy_cost). */
export const BUY_COST = 3

/** Tokens never go above this (engine.Rules.max_tokens). */
export const MAX_TOKENS = 5

/** Is the card in play for sale to `id`? Only to the player on turn, until they lock it in. */
export function buyable(game: GameView, id: string): boolean {
  return game.phase === 'placing' && id === game.active
}

/** Can `id` buy the card in play right now? Also takes the tokens, and no new song `loading`. */
export function canBuy(game: GameView, id: string, loading: boolean): boolean {
  const tokens = game.players.find((player) => player.id === id)?.tokens ?? 0
  return buyable(game, id) && tokens >= BUY_COST && !loading
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

/** Does the next turn end the game? Someone has reached `cardsToWin`, or no card is left. */
export function lastCard(game: GameView, cardsToWin: number): boolean {
  return game.deck_remaining === 0 || game.players.some((p) => p.timeline.length >= cardsToWin)
}
