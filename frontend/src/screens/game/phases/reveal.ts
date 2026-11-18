import type { GameView } from '../../../api/messages.ts'
import type { Song } from '../../../components/types.ts'
import { toSong } from '../board.ts'
import type { Guess } from '../board.ts'
import { fits } from '../rules.ts'

/** What the reveal showed: who was right and where the card goes. */
export interface RevealOutcome {
  revealed: Song
  /** The player on turn keeps the card. */
  kept: boolean
  /** The id of who got the card: null when it was discarded. */
  winner: string | null
  /** The timeline as it was when the guesses were made. */
  before: Song[]
  /** The placement first, then every challenger's guess. */
  guesses: Guess[]
  /** Where the card sits on the board: the kept slot, the winner's guess, or the first fit. */
  at: number
}

/** The revealed turn, or null before the reveal. `cards` is the active timeline as it is now. */
export function revealOutcome(
  game: GameView,
  cards: Song[],
  name: (id: string) => string,
): RevealOutcome | null {
  const { card, outcome } = game
  if (!card || !outcome || game.slot === null) return null

  const who = name(game.active)
  const revealed = toSong(card)
  const kept = outcome.correct
  const winner = outcome.card_to
  const before = kept ? cards.filter((song) => song.id !== card.id) : cards
  const placed: Guess = { id: game.active, name: who, slot: game.slot }
  const challenged: Guess[] = game.challenges
    .filter((challenge) => challenge.slot !== null)
    .map((challenge) => ({
      id: challenge.player_id,
      name: name(challenge.player_id),
      slot: challenge.slot!,
    }))
  // A bought card has no guesses to mark: it simply sits where it belongs.
  const guesses: Guess[] = outcome.bought ? [] : [placed, ...challenged]
  const won = guesses.find((guess) => guess.id === winner)
  const firstFit = before.findIndex((_, slot) => fits(before, slot, card.year))
  let at = firstFit === -1 ? before.length : firstFit
  if (outcome.bought) at = game.slot
  else if (won) at = won.slot

  return { revealed, kept, winner, before, guesses, at }
}
