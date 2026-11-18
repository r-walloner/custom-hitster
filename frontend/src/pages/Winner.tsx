import { Avatar } from '../components/Avatar.tsx'
import { Button, Status, Token } from '../components/Button.tsx'
import { CoverArt } from '../components/Hero.tsx'
import type { FloatingCard } from '../components/Hero.tsx'
import { Screen } from '../components/Screen.tsx'
import { names, plural, toSong, useRoomTools } from '../room.ts'
import type { Song } from '../types.ts'
import { RoomHeader } from './RoomHeader.tsx'
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

/** Up to `n` songs spread evenly over a timeline, oldest first. */
function spread(songs: Song[], n: number): Song[] {
  if (songs.length <= n) return songs
  return Array.from({ length: n }, (_, i) => songs[Math.round((i * (songs.length - 1)) / (n - 1))])
}

/** The winner: the one big line, the near misses, the final scoreboard. */
export default function Winner() {
  const { room, you, host, name, player, send } = useRoomTools()
  const game = room.game
  if (!game) return null

  const rows = [...game.players].sort(
    (a, b) => b.timeline.length - a.timeline.length || b.tokens - a.tokens,
  )
  const winners = game.winners.length > 0 ? game.winners : [rows[0].id]
  const champion = game.players.find((p) => p.id === winners[0]) ?? rows[0]
  const timeline = champion.timeline.map(toSong)
  // The card that decided it: the one just revealed if the winner got it, else their newest.
  const deciding =
    timeline.find((song) => song.id === game.card?.id) ?? timeline[timeline.length - 1]
  const others = spread(
    timeline.filter((song) => song !== deciding),
    PLACES.length,
  )
  const cards: FloatingCard[] = [
    ...others.map((song, i) => ({ ...PLACES[i], song })),
    ...(deciding ? [{ ...FRONT, song: deciding }] : []),
  ]

  const headline = `${names(winners.map(name))} ${winners.length === 1 ? 'wins' : 'win'}!`
  const runnerUp = rows.find((p) => !winners.includes(p.id))
  const thrifty = rows
    .filter((p) => !winners.includes(p.id) && p.tokens > 0)
    .sort((a, b) => b.tokens - a.tokens)[0]
  const sentences: string[] = []
  if (champion.timeline.length < room.settings.cards_to_win) sentences.push('The deck ran out.')
  if (runnerUp) {
    const gap = champion.timeline.length - runnerUp.timeline.length
    const behind =
      gap === 0
        ? `${name(runnerUp.id)} had as many cards, but fewer tokens`
        : `${name(runnerUp.id)} was ${gap === 1 ? 'one card' : `${gap} cards`} behind`
    sentences.push(
      thrifty === runnerUp && gap > 0
        ? `${behind}, with ${plural(thrifty.tokens, 'token')} left over.`
        : `${behind}.`,
    )
  }
  if (thrifty && thrifty !== runnerUp) {
    sentences.push(`${name(thrifty.id)} had ${plural(thrifty.tokens, 'token')} left over.`)
  }

  return (
    <Screen>
      <RoomHeader last={<span>Game over</span>} />
      <div className="winner">
        <section className="winner__main" aria-labelledby="win-head">
          {/* The text has its own block, so a long name pushes the art down instead of covering it. */}
          <div className="winner__text">
            <h1 id="win-head" className="jm-big-moment winner__big">
              {headline}
            </h1>
            <p className="winner__sentence">{sentences.join(' ')}</p>
          </div>
          <CoverArt
            className="winner__art"
            tape={{ left: 22, top: 14, width: 170, progress: 0.9, year: deciding?.year }}
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
                <Button to="/" className="winner__lobby">
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
