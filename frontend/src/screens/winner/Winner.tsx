import { Avatar } from '../../components/Avatar.tsx'
import { Button, Status, Token } from '../../components/Button.tsx'
import { CoverArt } from '../../components/Hero.tsx'
import type { FloatingCard } from '../../components/Hero.tsx'
import { InfoHeader } from '../../components/InfoHeader.tsx'
import { Screen } from '../../components/Screen.tsx'
import { useDesktop } from '../../components/useDesktop.ts'
import { useRoomTools } from '../room/context.ts'
import { spread, winnerSummary } from './summary.ts'
import './Winner.css'

// Where the winner's cards float around the tape. The last place, in front, is the card that won it.
const PLACES: Omit<FloatingCard, 'song'>[] = [
  { left: 192, top: 2, rotate: -14, scale: 0.62, delay: -1.2, duration: 3.1 },
  { left: 298, top: -26, rotate: 11, scale: 0.72, delay: -2.6, duration: 4.2 },
  { left: 396, top: 20, rotate: -3, scale: 0.58, delay: -0.6, duration: 3.7 },
  { left: 316, top: 54, rotate: 17, scale: 0.64, delay: -1.9, duration: 4.8 },
]
const FRONT: Omit<FloatingCard, 'song'> = {
  isNew: true,
  left: 218,
  top: 44,
  rotate: -4,
  scale: 0.72,
  delay: -0.2,
  duration: 3.4,
  front: true,
}

// The same places in the desktop's bigger art box.
const DESKTOP_PLACES: Omit<FloatingCard, 'song'>[] = [
  { left: 330, top: 20, rotate: -14, scale: 0.95, delay: -1.2, duration: 3.1 },
  { left: 500, top: 6, rotate: 11, scale: 1.05, delay: -2.6, duration: 4.2 },
  { left: 650, top: 80, rotate: -3, scale: 0.9, delay: -0.6, duration: 3.7 },
  { left: 530, top: 176, rotate: 17, scale: 0.95, delay: -1.9, duration: 4.8 },
]
const DESKTOP_FRONT: Omit<FloatingCard, 'song'> = {
  ...FRONT,
  left: 370,
  top: 170,
  scale: 1.12,
}

/** The winner: the one big line, the near misses, the final scoreboard. */
export default function Winner() {
  const { room, you, host, name, player, send } = useRoomTools()
  const desktop = useDesktop()
  const game = room.game
  if (!game) return null

  const { rows, winners, deciding, rest, headline, sentence } = winnerSummary(
    game,
    room.settings.cards_to_win,
    name,
  )
  const places = desktop ? DESKTOP_PLACES : PLACES
  const front = desktop ? DESKTOP_FRONT : FRONT
  const cards: FloatingCard[] = [
    ...spread(rest, places.length).map((song, i) => ({ ...places[i], song })),
    ...(deciding ? [{ ...front, song: deciding }] : []),
  ]

  return (
    <Screen className="winner__screen">
      <InfoHeader
        code={room.code}
        host={host?.name}
        players={room.players.length}
        toWin={room.settings.cards_to_win}
        last={<span>Game over</span>}
      />
      <div className="winner">
        <section className="winner__main" aria-labelledby="win-head">
          {/* The text has its own block, so a long name pushes the art down instead of covering it. */}
          <div className="winner__text">
            <h1 id="win-head" className="jm-big-moment winner__big">
              {headline}
            </h1>
            <p className="winner__sentence">{sentence}</p>
          </div>
          <CoverArt
            className="winner__art"
            tape={
              desktop
                ? { left: 24, top: 48, width: 260, progress: 0.9, year: deciding?.year }
                : { left: 22, top: 14, width: 170, progress: 0.9, year: deciding?.year }
            }
            cards={cards}
          />
          <div className="winner__actions">
            {you.is_host ? (
              <>
                <Button
                  variant="primary"
                  size="next"
                  className="winner__again"
                  onClick={() => {
                    send({ type: 'end_game' })
                    send({ type: 'start_game' })
                  }}
                >
                  Play again
                </Button>
                <Button className="winner__lobby" onClick={() => send({ type: 'end_game' })}>
                  Back to the lobby
                </Button>
              </>
            ) : (
              <>
                <Status>Waiting for {host?.name ?? 'the host'}</Status>
                <Button className="winner__lobby" onClick={() => send({ type: 'leave_room' })}>
                  Leave room
                </Button>
              </>
            )}
          </div>
        </section>
        <aside className="jm-panel winner__final" aria-labelledby="final-head">
          <h2 id="final-head" className="jm-label">
            Final scoreboard
          </h2>
          <ol className="winner__rows app-scroll">
            {rows.map((p) => (
              <li
                key={p.id}
                className={
                  winners.includes(p.id) ? 'winner__row winner__row--first' : 'winner__row'
                }
              >
                <span className="winner__place">{rows.indexOf(p) + 1}</span>
                <Avatar player={player(p.id)} size="lg" />
                <span className="jm-player__name">{name(p.id)}</span>
                <span className="winner__cards" aria-label={`${p.timeline.length} cards`}>
                  {p.timeline.length}
                </span>
                <Token>{p.tokens}</Token>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </Screen>
  )
}
