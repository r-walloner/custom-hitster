import { Avatar } from '../components/Avatar.tsx'
import { Button, RoomCode, Token } from '../components/Button.tsx'
import { CoverArt } from '../components/Hero.tsx'
import type { FloatingCard } from '../components/Hero.tsx'
import { Logo } from '../components/Logo.tsx'
import { Header, RoomMeta, Screen, Spacer } from '../components/Screen.tsx'
import { JONAS, LEA, MARA, SAM } from '../fixtures.ts'
import { useRoomPaths } from '../paths.ts'
import './Winner.css'

// The winner's own timeline floats around the tape; the card that won it sits in front.
const CARDS: FloatingCard[] = [
  {
    song: { year: 1965, title: 'Satisfaction', artist: 'The Rolling Stones' },
    left: 192,
    top: 2,
    rotate: -14,
    scale: 0.62,
    delay: -1.2,
    duration: 3.1,
  },
  {
    song: { year: 1983, title: 'Sweet Dreams', artist: 'Eurythmics' },
    left: 298,
    top: -26,
    rotate: 11,
    scale: 0.72,
    delay: -2.6,
    duration: 4.2,
  },
  {
    song: { year: 1994, title: 'Zombie', artist: 'The Cranberries' },
    left: 396,
    top: 20,
    rotate: -3,
    scale: 0.58,
    delay: -0.6,
    duration: 3.7,
  },
  {
    song: { year: 2003, title: 'Seven Nation Army', artist: 'The White Stripes' },
    left: 316,
    top: 54,
    rotate: 17,
    scale: 0.64,
    delay: -1.9,
    duration: 4.8,
  },
  {
    song: { year: 2019, title: 'Bad Guy', artist: 'Billie Eilish' },
    isNew: true,
    left: 218,
    top: 44,
    rotate: -4,
    scale: 0.72,
    delay: -0.2,
    duration: 3.4,
    front: true,
  },
]

const FINAL = [
  { player: MARA, cards: 10, tokens: 1 },
  { player: SAM, cards: 9, tokens: 2 },
  { player: LEA, cards: 7, tokens: 3 },
  { player: JONAS, cards: 5, tokens: 0 },
]

/** The winner: the one big line, the near misses, the final scoreboard. */
export default function Winner() {
  const paths = useRoomPaths()
  return (
    <Screen>
      <Header>
        <Logo />
        <RoomCode code={paths.code} />
        <Spacer />
        <RoomMeta host="Mara" players={4} last={<span>Game over</span>} />
      </Header>
      <div className="winner">
        <section className="winner__main" aria-labelledby="win-head">
          {/* The text has its own block, so a long name pushes the art down instead of covering it. */}
          <div className="winner__text">
            <h1 id="win-head" className="jm-big-moment winner__big">
              Mara wins!
            </h1>
            <p className="winner__sentence">
              Sam was one card behind. Lea had three tokens left over.
            </p>
          </div>
          <CoverArt
            className="winner__art"
            tape={{ left: 22, top: 14, width: 170, progress: 0.9, year: 2019 }}
            cards={CARDS}
          />
          <div className="winner__actions">
            <Button to={paths.dealing} variant="primary" size="next" className="winner__again">
              Play again
            </Button>
            <Button to={paths.lobby} className="winner__lobby">
              Back to the lobby
            </Button>
          </div>
        </section>
        <aside className="jm-panel winner__final" aria-labelledby="final-head">
          <h2 id="final-head" className="jm-label">
            Final scoreboard
          </h2>
          <ol className="winner__rows">
            {FINAL.map((row, index) => (
              <li
                key={row.player.id}
                className={index === 0 ? 'winner__row winner__row--first' : 'winner__row'}
              >
                <span className="winner__place">{index + 1}</span>
                <Avatar player={row.player} size="lg" />
                <span className="jm-player__name">{row.player.name}</span>
                <span className="winner__cards" aria-label={`${row.cards} cards`}>
                  {row.cards}
                </span>
                <Token>{row.tokens}</Token>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </Screen>
  )
}
