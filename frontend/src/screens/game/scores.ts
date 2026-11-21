// The status line under each name in the game's player list (desktop only; the phone's mini
// scoreboard has no room for it) and in the full scoreboard. Only what matters mid-game and the row doesn't already show: the
// player on turn has the highlighted row, you know your own name, and who plays on the host's
// device was settled in the lobby.
import type { GameView } from '../../api/messages.ts'

interface Seat {
  id: string
  cards: number
}

interface Facts {
  game: GameView
  isAway: (id: string) => boolean
}

/**
 * Holds the most cards while someone holds fewer. A tie for everyone (as at the start, one card
 * each) is no lead.
 */
export function isLeading(cards: number, game: GameView): boolean {
  const counts = game.players.map((p) => p.timeline.length)
  return cards === Math.max(...counts) && cards > Math.min(...counts)
}

/**
 * "Reconnecting…" alone while the player is away; otherwise "Leading" and "Challenged!", joined with
 * a comma, each capitalised ("Leading, Challenged!"), or "".
 */
export function scoreStatus({ id, cards }: Seat, facts: Facts): string {
  const { game, isAway } = facts
  if (isAway(id)) return 'Reconnecting…'
  const notes: string[] = []
  if (isLeading(cards, game)) notes.push('Leading')
  if (game.challenges.some((challenge) => challenge.player_id === id)) notes.push('Challenged!')
  return notes.join(', ')
}
