import type { RoomSettings } from '../../api/messages.ts'
import { CHALLENGE, labelOf, PLAY } from '../settings/options.ts'

/** What the menu's Rules row shows: "20 s to listen, 10 s to challenge". */
export function rulesSummary(settings: RoomSettings): string {
  const play = labelOf(PLAY, settings.play_seconds)
  const listen = play === 'No limit' ? 'Whole songs' : `${play} to listen`
  return `${listen}, ${labelOf(CHALLENGE, settings.challenge_seconds)} to challenge`
}
