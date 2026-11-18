import type { GamePlayerView, GameView } from '../../api/messages.ts'
import type { Song } from '../../components/types.ts'
import { names, plural } from '../../words.ts'
import { toSong } from '../game/board.ts'
import { byStanding } from '../game/rules.ts'

/** How the game ended, for the winner screen. */
export interface WinnerSummary {
  /** The players best first. */
  rows: GamePlayerView[]
  /** The ids of everyone who won; more than one on a tie. */
  winners: string[]
  /** The card that decided it: the one just revealed if the winner got it, else their newest. */
  deciding: Song | undefined
  /** The rest of the first winner's timeline, oldest first. */
  rest: Song[]
  /** "Mara wins!", "Mara and Sam win!" */
  headline: string
  /** The near misses: "The deck ran out. Sam was one card behind." */
  sentence: string
}

export function winnerSummary(
  game: GameView,
  cardsToWin: number,
  name: (id: string) => string,
): WinnerSummary {
  const rows = byStanding(game.players)
  const winners = game.winners.length > 0 ? game.winners : [rows[0].id]
  const champion = game.players.find((p) => p.id === winners[0]) ?? rows[0]
  const timeline = champion.timeline.map(toSong)
  const deciding =
    timeline.find((song) => song.id === game.card?.id) ?? timeline[timeline.length - 1]

  const headline = `${names(winners.map(name))} ${winners.length === 1 ? 'wins' : 'win'}!`
  const runnerUp = rows.find((p) => !winners.includes(p.id))
  const thrifty = rows
    .filter((p) => !winners.includes(p.id) && p.tokens > 0)
    .sort((a, b) => b.tokens - a.tokens)[0]
  const sentences: string[] = []
  if (champion.timeline.length < cardsToWin) sentences.push('The deck ran out.')
  if (runnerUp) {
    const gap = champion.timeline.length - runnerUp.timeline.length
    const behind =
      gap === 0
        ? `${name(runnerUp.id)} had as many cards, but fewer tokens`
        : `${name(runnerUp.id)} was ${gap === 1 ? 'one card' : `${gap} cards`} behind`
    sentences.push(
      thrifty === runnerUp && gap > 0
        ? `${behind}, with ${plural(thrifty.tokens, 'token')} left over.`
        : `${behind}.`,
    )
  }
  if (thrifty && thrifty !== runnerUp) {
    sentences.push(`${name(thrifty.id)} had ${plural(thrifty.tokens, 'token')} left over.`)
  }

  return {
    rows,
    winners,
    deciding,
    rest: timeline.filter((song) => song !== deciding),
    headline,
    sentence: sentences.join(' '),
  }
}

/** Up to `n` songs spread evenly over a timeline, oldest first. */
export function spread(songs: Song[], n: number): Song[] {
  if (songs.length <= n) return songs
  return Array.from({ length: n }, (_, i) => songs[Math.round((i * (songs.length - 1)) / (n - 1))])
}
