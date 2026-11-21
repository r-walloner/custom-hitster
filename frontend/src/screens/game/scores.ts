// The status line under each name in the game's player list (desktop only; the phone's mini
// scoreboard has no room for it).
import type { GameView } from '../../api/messages.ts'

interface Seat {
  id: string
  cards: number
}

interface Facts {
  game: GameView
  /** The player looking at this screen. */
  you: string | null
  /** This device makes the moves of the player on turn. */
  acting: boolean
  isLocal: (id: string) => boolean
  isAway: (id: string) => boolean
  /** The most cards anyone holds. */
  most: number
}

/** "Your turn, leading", "That's you", "Local player", "Reconnecting…", "Challenged" or "". */
export function scoreStatus({ id, cards }: Seat, facts: Facts): string {
  const { game, you, acting, isLocal, isAway, most } = facts
  const notes: string[] = []
  if (id === game.active) notes.push(acting ? 'Your turn' : 'On turn')
  if (cards === most && cards > 0) notes.push('Leading')
  if (id === you && id !== game.active) notes.push("That's you")
  if (isLocal(id)) notes.push('Local player')
  if (isAway(id)) notes.push('Reconnecting…')
  if (game.challenges.some((challenge) => challenge.player_id === id)) notes.push('Challenged')
  return notes.map((note, i) => (i === 0 ? note : note.charAt(0).toLowerCase() + note.slice(1))).join(', ')
}
