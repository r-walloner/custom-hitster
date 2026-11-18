import type { GameView } from '../../../api/messages.ts'
import type { Song } from '../../../components/types.ts'
import { names } from '../../../words.ts'
import { toSong } from '../board.ts'
import type { Guess } from '../board.ts'
import { fits } from '../rules.ts'

/** What the reveal showed: who was right, where the card goes, and how to say it. */
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
  verdict: 'Right' | 'Stolen' | 'Wrong'
  headline: string
  sub: string
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
  const guesses: Guess[] = [
    { id: game.active, name: who, slot: game.slot },
    ...game.challenges
      .filter((challenge) => challenge.slot !== null)
      .map((challenge) => ({
        id: challenge.player_id,
        name: name(challenge.player_id),
        slot: challenge.slot!,
      })),
  ]
  const won = guesses.find((guess) => guess.id === winner)
  const firstFit = before.findIndex((_, slot) => fits(before, slot, card.year))
  const at = won ? won.slot : firstFit === -1 ? before.length : firstFit

  const challengers = game.challenges.map((challenge) => name(challenge.player_id))
  const missed = game.challenges
    .filter((challenge) => challenge.player_id !== winner)
    .map((challenge) => name(challenge.player_id))
  const said = kept
    ? {
        verdict: 'Right' as const,
        headline: `${who} nailed it.`,
        sub: `The card is ${who}'s.${missed.length ? ` ${names(missed)} missed.` : ''}`,
      }
    : winner
      ? {
          verdict: 'Stolen' as const,
          headline: `${name(winner)} takes it.`,
          sub: `${who} was off. The card is ${name(winner)}'s.`,
        }
      : {
          verdict: 'Wrong' as const,
          headline: 'Nobody got it.',
          sub: `${names([who, ...challengers])} ${challengers.length ? 'were' : 'was'} off. The card is out.`,
        }

  return { revealed, kept, winner, before, guesses, at, ...said }
}
