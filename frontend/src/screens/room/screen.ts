import type { StateMessage } from '../../api/messages.ts'
import type { DialogName, Subscreen } from './context.ts'

/** The room's main screens, one of which is always showing. */
export type ScreenKind = 'join' | 'lobby' | 'guest' | 'dealing' | 'game' | 'winner'

// The sub-screens and pop-ups each screen can open.
const VIEWS: Record<ScreenKind, (Subscreen | DialogName)[]> = {
  join: [],
  lobby: ['settings', 'playback', 'addPlayer', 'rename'],
  guest: ['playback', 'rename'],
  dealing: [],
  game: ['playback', 'menu', 'scoreboard'],
  winner: [],
}

/** Which screen the state calls for. */
export function pickScreen(state: StateMessage): ScreenKind {
  const { game, deck } = state.room
  if (game?.phase === 'finished') return 'winner'
  if (game) return 'game'
  if (deck.status === 'dealing') return 'dealing'
  if (!state.you.player_id) return 'join'
  return state.you.is_host ? 'lobby' : 'guest'
}

/**
 * The sub-screen or pop-up to show over `kind`. One that belongs to another screen (the game
 * ended under the menu, say) is dropped.
 */
export function allowedView<V extends Subscreen | DialogName>(kind: ScreenKind, view: V | null) {
  return view && VIEWS[kind].includes(view) ? view : null
}
