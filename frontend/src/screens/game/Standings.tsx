import { Avatar } from '../../components/Avatar.tsx'
import { Token } from '../../components/Button.tsx'
import { Dialog } from '../../components/Dialog.tsx'
import { Progress } from '../../components/Progress.tsx'
import { YearChips } from '../../components/YearChip.tsx'
import { useRoomTools } from '../room/context.ts'
import { byStanding } from './rules.ts'
import { scoreStatus } from './scores.ts'
import './Standings.css'

/**
 * The full scoreboard: progress to the goal, tokens, and each timeline in short form. The notes
 * under the names are the game screen's player list's (scores.ts).
 */
export default function Standings() {
  const { room, player, isAway, close } = useRoomTools()
  const game = room.game
  if (!game) return null
  const goal = room.settings.cards_to_win
  const rows = byStanding(game.players)

  return (
    <Dialog
      wide
      title="Scoreboard"
      onClose={close}
      closeLabel="Close scoreboard"
      headExtra={<span className="jm-caption standings__goal">First to {goal} cards wins</span>}
      className="standings"
    >
      <div className="standings__grid standings__cols" aria-hidden="true">
        <span className="jm-label">Player</span>
        <span className="jm-label">Cards</span>
        <span className="jm-label">Tokens</span>
        <span className="jm-label">Timeline</span>
      </div>
      <ul className="standings__rows app-scroll">
        {rows.map((p) => {
          const who = player(p.id)
          const cards = p.timeline.length
          return (
            <li
              key={p.id}
              className={[
                'standings__grid standings__row',
                p.id === game.active && 'standings__row--turn',
                isAway(p.id) && 'standings__row--away',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <div className="standings__who">
                <Avatar player={who} size="lg" />
                <span className="jm-player__name">
                  {who.name}
                  <small>{scoreStatus({ id: p.id, cards }, { game, isAway })}</small>
                </span>
              </div>
              <div className="standings__cards">
                <Progress
                  small
                  value={Math.min(cards, goal)}
                  max={goal}
                  label={`${who.name}: ${cards} of ${goal} cards`}
                />
                <span>
                  {cards}/{goal}
                </span>
              </div>
              <Token>{p.tokens}</Token>
              <YearChips years={p.timeline.map((card) => card.year)} />
            </li>
          )
        })}
      </ul>
    </Dialog>
  )
}
