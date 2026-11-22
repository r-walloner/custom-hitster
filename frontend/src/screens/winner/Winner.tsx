import { useRef } from 'react'
import { Avatar } from '../../components/Avatar.tsx'
import { Button, Status, Token } from '../../components/Button.tsx'
import { CoverArt } from '../../components/Hero.tsx'
import type { FloatingCard } from '../../components/Hero.tsx'
import { InfoHeader } from '../../components/InfoHeader.tsx'
import { Screen } from '../../components/Screen.tsx'
import { useDesktop } from '../../components/useDesktop.ts'
import { useSize } from '../../components/useSize.ts'
import { useSongClock } from '../game/songClock.ts'
import { useRoomTools } from '../room/context.ts'
import { burst } from './places.ts'
import { winnerSummary } from './summary.ts'
import './Winner.css'

/** The winner: the one big line, the near misses, the final scoreboard. */
export default function Winner() {
  const { room, you, host, name, player, send, songStart } = useRoomTools()
  const desktop = useDesktop()
  const art = useRef<HTMLDivElement>(null)
  const box = useSize(art)
  // The last song plays on after the game; the tape follows it.
  const { progress, playing } = useSongClock(songStart, room.playback)
  const game = room.game
  if (!game) return null

  const { rows, winners, deciding, rest, headline, sentence } = winnerSummary(
    game,
    room.settings.cards_to_win,
    name,
  )
  const layout = box && burst(rest.length, box, desktop)
  const cards: FloatingCard[] = layout
    ? [
        ...rest.map((song, i) => ({ ...layout.places[i], song })),
        ...(deciding ? [{ ...layout.front, song: deciding }] : []),
      ]
    : []

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
          {/* The art fills the room between the line and the buttons, measured to place the cards. */}
          <div ref={art} className="winner__art">
            {layout && (
              <CoverArt
                tape={{
                  ...layout.tape,
                  progress,
                  playing,
                  // The song playing: the winning card, or the last one revealed if the deck ran out.
                  year: game.card?.year,
                }}
                cards={cards}
              />
            )}
          </div>
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
