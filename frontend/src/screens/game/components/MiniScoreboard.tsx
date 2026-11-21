import { Avatar } from '../../../components/Avatar.tsx'
import type { Player } from '../../../components/types.ts'
import './MiniScoreboard.css'

/** One player's line on the scoreboard. */
export interface Score {
  player: Player
  cards: number
  tokens: number
  /** "Leading, challenged": shown under the name on desktop only. */
  status: string
  /** Reconnecting: a dashed avatar on desktop. */
  away: boolean
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

function rowLabel({ player, cards, tokens, status }: Score) {
  return `${player.name}${status ? ` (${status})` : ''}: ${plural(cards, 'card')}, ${plural(tokens, 'token')}`
}

interface MiniScoreboardProps {
  scores: Score[]
  /** The id of the player on turn. */
  turn: string
  /** Opens the full scoreboard. */
  onOpen: () => void
}

/**
 * The mini scoreboard at the right end of the top band: initial, cards held, tokens. In a desktop
 * window at least 1440px wide it grows into a player list with a head row, full names and a status
 * line; the phone and narrower desktop windows hide those.
 */
export function MiniScoreboard({ scores, turn, onOpen }: MiniScoreboardProps) {
  const summary = scores.map(rowLabel).join('. ')
  return (
    <button
      type="button"
      onClick={onOpen}
      className="jm-scoreboard app-scoreboard"
      aria-label={`Scoreboard. ${summary}. Open the full scoreboard.`}
    >
      <span className="app-scoreboard__head" aria-hidden="true">
        <span />
        <span className="jm-label">Players</span>
        <span className="jm-label">Cards</span>
        <span className="jm-label">Tokens</span>
      </span>
      {scores.map((score) => {
        const classes = [
          'jm-scoreboard__row',
          score.player.id === turn && 'jm-scoreboard__row--turn',
          score.away && 'app-scoreboard__row--away',
        ]
        return (
          <span key={score.player.id} className={classes.filter(Boolean).join(' ')}>
            <Avatar player={score.player} />
            <span className="app-scoreboard__name">
              <span>{score.player.name}</span>
              {score.status && <small>{score.status}</small>}
            </span>
            <span className="jm-scoreboard__score">{score.cards}</span>
            <span className="jm-token">{score.tokens}</span>
          </span>
        )
      })}
    </button>
  )
}
