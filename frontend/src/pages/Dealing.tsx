import { useSearchParams } from 'react-router'
import { Avatar } from '../components/Avatar.tsx'
import { RoomCode } from '../components/Button.tsx'
import { Logo } from '../components/Logo.tsx'
import { Progress } from '../components/Progress.tsx'
import { Header, RoomMeta, Screen, Spacer } from '../components/Screen.tsx'
import { SongCard } from '../components/SongCard.tsx'
import { JONAS, LEA, MARA, SAM } from '../fixtures.ts'
import { useRoomPaths } from '../paths.ts'
import './Dealing.css'

const OPENING = [
  { player: MARA, song: { year: 1984, title: 'Smalltown Boy', artist: 'Bronski Beat' } },
  { player: SAM, song: { year: 2010, title: 'Dancing On My Own', artist: 'Robyn' } },
  { player: LEA, song: { year: 1974, title: 'Waterloo', artist: 'ABBA' } },
  { player: JONAS, song: { year: 1998, title: 'Doo Wop (That Thing)', artist: 'Lauryn Hill' } },
]

/** Dealing the opening cards, each one shown as it lands, so the wait reads as work. `?dealt=0…4` */
export default function Dealing() {
  const paths = useRoomPaths()
  const [params] = useSearchParams()
  const dealt = Math.max(0, Math.min(OPENING.length, Number(params.get('dealt') ?? 2) || 0))
  const status =
    dealt >= OPENING.length
      ? 'All dealt. Mara goes first.'
      : `Picked 120 songs from 2 libraries. ${dealt} of ${OPENING.length} dealt.`

  return (
    <Screen>
      <Header>
        <Logo />
        <RoomCode code={paths.code} />
        <Spacer />
        <RoomMeta host="Mara" players={4} />
      </Header>
      <div className="dealing">
        <h1 className="jm-moment__headline">Dealing the opening cards</h1>
        <div className="dealing__progress">
          <Progress value={dealt} max={OPENING.length} label="Opening cards dealt" />
          <span className="jm-caption">{status}</span>
        </div>
        <div className="dealing__players">
          {OPENING.map(({ player, song }, index) => (
            <div key={player.id} className="dealing__player">
              <div className="dealing__name">
                <Avatar player={player} />
                <span className="jm-section">{player.name}</span>
              </div>
              {index < dealt ? (
                <SongCard song={song} />
              ) : (
                <div className="dealing__waiting">
                  <span className="jm-caption">Dealing…</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Screen>
  )
}
