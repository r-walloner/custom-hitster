import { Avatar } from '../../components/Avatar.tsx'
import { Token } from '../../components/Button.tsx'
import { Dialog } from '../../components/Dialog.tsx'
import { Progress } from '../../components/Progress.tsx'
import { YearChips } from '../../components/YearChip.tsx'
import { useRoomTools } from '../../room.ts'
import { BuyButton } from './BuyButton.tsx'
import { BUY_COST } from './turn.ts'
import type { Turn } from './turn.ts'
import '../Dialogs.css'

/** The full scoreboard: progress to the goal, tokens, each timeline in short form, and buying. */
export default function Standings() {
  const { room, you, player, isLocal, send, close } = useRoomTools()
  const game = room.game
  if (!game) return null
  const goal = room.settings.cards_to_win
  const most = Math.max(...game.players.map((p) => p.timeline.length))
  const rows = [...game.players].sort(
    (a, b) => b.timeline.length - a.timeline.length || b.tokens - a.tokens,
  )
  // Buying from here doesn't lock the turn's draw buttons; the server refuses a second draw.
  const turn: Turn = {
    game,
    active: game.players.find((p) => p.id === game.active) ?? game.players[0],
    cards: [],
    referee: false,
    loading: game.drawing,
    draw: send,
    picker: undefined,
  }

  const note = (id: string, cards: number, tokens: number) => {
    if (id === game.active) return 'On turn'
    if (cards === most && cards > 0) return 'Leading'
    if (tokens >= BUY_COST) return 'Can buy a card'
    if (isLocal(id)) return 'Local player'
    if (id === you.player_id) return "That's you"
    return ''
  }

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
        <span />
      </div>
      <ul className="standings__rows app-scroll">
        {rows.map((p) => {
          const who = player(p.id)
          const cards = p.timeline.length
          return (
            <li
              key={p.id}
              className={
                p.id === game.active
                  ? 'standings__grid standings__row standings__row--turn'
                  : 'standings__grid standings__row'
              }
            >
              <div className="standings__who">
                <Avatar player={who} size="lg" />
                <span className="jm-player__name">
                  {who.name}
                  <small>{note(p.id, cards, p.tokens)}</small>
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
              <BuyButton turn={turn} id={p.id} label="Buy" />
            </li>
          )
        })}
      </ul>
    </Dialog>
  )
}
