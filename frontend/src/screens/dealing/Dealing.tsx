import type { CSSProperties } from 'react'
import { Avatar } from '../../components/Avatar.tsx'
import { InfoHeader } from '../../components/InfoHeader.tsx'
import { Screen } from '../../components/Screen.tsx'
import { SongCard } from '../../components/SongCard.tsx'
import { toSong } from '../game/board.ts'
import { useRoomTools } from '../room/context.ts'
import './Dealing.css'

/**
 * Dealing the opening cards, one per player plus the first song, so the wait reads as work.
 * Players are shown in turn order, each starting card face up as it lands. The first song is
 * never shown.
 */
export default function Dealing() {
  const { room, host, player, name } = useRoomTools()
  const { order, dealt } = room.deck
  // Up to six players share a row; more split into two rows of smaller cards.
  const twoRows = order.length > 6
  const columns = twoRows ? Math.ceil(order.length / 2) : order.length

  return (
    <Screen>
      <InfoHeader
        code={room.code}
        host={host?.name}
        players={room.players.length}
        toWin={room.settings.cards_to_win}
      />
      <div className="dealing">
        <h1 className="jm-moment__headline">Dealing the opening cards</h1>
        <div
          className={twoRows ? 'dealing__players dealing__players--two-rows' : 'dealing__players'}
          style={{ '--columns': columns } as CSSProperties}
        >
          {order.map((id, index) => (
            <div key={id} className="dealing__player">
              <div className="dealing__name">
                <Avatar player={player(id)} />
                <span className="jm-section dealing__player-name">{name(id)}</span>
              </div>
              {dealt[index] ? (
                <SongCard className="dealing__card" song={toSong(dealt[index])} />
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
