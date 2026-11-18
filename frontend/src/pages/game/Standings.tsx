import { Avatar } from '../../components/Avatar.tsx'
import { Token } from '../../components/Button.tsx'
import { Dialog, Overlay } from '../../components/Dialog.tsx'
import { Progress } from '../../components/Progress.tsx'
import { YearChips } from '../../components/YearChip.tsx'
import { JONAS, LEA, MARA, SAM } from '../../fixtures.ts'
import { usePhaseBehind } from './phases.ts'
import '../Dialogs.css'

const ROWS = [
  {
    player: MARA,
    note: 'Leading',
    cards: 6,
    tokens: 2,
    years: [1965, 1972, 1983, 1994, 2003, 2019],
  },
  {
    player: SAM,
    note: 'On turn',
    cards: 4,
    tokens: 1,
    years: [1974, 1984, 1998, 2010],
    turn: true,
  },
  { player: LEA, note: 'Can buy a card', cards: 4, tokens: 3, years: [1979, 1991, 2006, 2015] },
  { player: JONAS, note: 'Local player', cards: 3, tokens: 0, years: [1977, 1999, 2012] },
]

/** The full scoreboard: progress to the goal, tokens and each timeline in short form. */
export default function Standings() {
  const { Behind, back } = usePhaseBehind()
  return (
    <Overlay under={<Behind />}>
      <Dialog
        wide
        title="Scoreboard"
        closeTo={back}
        closeLabel="Close scoreboard"
        headExtra={<span className="jm-caption standings__goal">First to 10 cards wins</span>}
        className="standings"
      >
        <div className="standings__grid standings__cols" aria-hidden="true">
          <span className="jm-label">Player</span>
          <span className="jm-label">Cards</span>
          <span className="jm-label">Tokens</span>
          <span className="jm-label">Timeline</span>
        </div>
        <ul className="standings__rows">
          {ROWS.map((row) => (
            <li
              key={row.player.id}
              className={
                row.turn
                  ? 'standings__grid standings__row standings__row--turn'
                  : 'standings__grid standings__row'
              }
            >
              <div className="standings__who">
                <Avatar player={row.player} size="lg" />
                <span className="jm-player__name">
                  {row.player.name}
                  <small>{row.note}</small>
                </span>
              </div>
              <div className="standings__cards">
                <Progress
                  small
                  value={row.cards}
                  max={10}
                  label={`${row.player.name}: ${row.cards} of 10 cards`}
                />
                <span>{row.cards}/10</span>
              </div>
              <Token>{row.tokens}</Token>
              <YearChips years={row.years} />
            </li>
          ))}
        </ul>
      </Dialog>
    </Overlay>
  )
}
