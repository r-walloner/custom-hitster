import { Avatar } from '../components/Avatar.tsx'
import { Progress } from '../components/Progress.tsx'
import { Screen } from '../components/Screen.tsx'
import { PickCard } from '../components/SongCard.tsx'
import { plural, useRoomTools } from '../room.ts'
import { RoomHeader } from './RoomHeader.tsx'
import './Dealing.css'

/**
 * Dealing the opening cards, one per player plus the first song, so the wait reads as work.
 * The server says how many have a year so far, not which songs they are, so a dealt card shows
 * face down (showing the real cards is a backend TODO in README.md).
 */
export default function Dealing() {
  const { room, player } = useRoomTools()
  const { done, total } = room.deck
  const status =
    done >= total
      ? 'All dealt. The game starts now.'
      : `Picked ${plural(room.settings.deck_size, 'song')}. ${done} of ${total} opening cards have their year.`

  return (
    <Screen>
      <RoomHeader />
      <div className="dealing">
        <h1 className="jm-moment__headline">Dealing the opening cards</h1>
        <div className="dealing__progress">
          <Progress value={done} max={total || 1} label="Opening cards dealt" />
          <span className="jm-caption" aria-live="polite">
            {status}
          </span>
        </div>
        <div className="dealing__players">
          {room.players.map((seat, index) => (
            <div key={seat.id} className="dealing__player">
              <div className="dealing__name">
                <Avatar player={player(seat.id)} />
                <span className="jm-section">{seat.name}</span>
              </div>
              {index < done ? (
                <PickCard />
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
