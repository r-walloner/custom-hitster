import type { Score } from '../types.ts'
import { Avatar } from './Avatar.tsx'

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

function rowLabel({ player, cards, tokens }: Score, onTurn: boolean) {
  return `${player.name}${onTurn ? ', on turn' : ''}: ${plural(cards, 'card')}, ${plural(tokens, 'token')}`
}

interface ScoreboardProps {
  scores: Score[]
  /** The id of the player on turn. */
  turn: string
  /** Opens the full scoreboard. */
  onOpen: () => void
}

/** The mini scoreboard at the right end of the top band: initial, cards held, tokens. */
export function Scoreboard({ scores, turn, onOpen }: ScoreboardProps) {
  const summary = scores.map((score) => rowLabel(score, score.player.id === turn)).join('. ')
  return (
    <button
      type="button"
      onClick={onOpen}
      className="jm-scoreboard app-scoreboard"
      aria-label={`Scoreboard. ${summary}. Open the full scoreboard.`}
    >
      {scores.map((score) => (
        <span
          key={score.player.id}
          className={
            score.player.id === turn
              ? 'jm-scoreboard__row jm-scoreboard__row--turn'
              : 'jm-scoreboard__row'
          }
        >
          <Avatar player={score.player} />
          <span className="jm-scoreboard__score">{score.cards}</span>
          <span className="jm-token">{score.tokens}</span>
        </span>
      ))}
    </button>
  )
}
