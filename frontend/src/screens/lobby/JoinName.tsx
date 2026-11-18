import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button, ButtonPair } from '../../components/Button.tsx'
import { TextInput } from '../../components/Input.tsx'
import { RoomHeader } from '../../components/RoomHeader.tsx'
import { PlayerRow } from '../../components/Rows.tsx'
import { Screen } from '../../components/Screen.tsx'
import type { Player } from '../../components/types.ts'
import { useRoomTools } from '../room/context.ts'
import './JoinName.css'

const MAX_NAME = 16

/** Joining asks for a name only, with the people already at the table beside it. */
export default function JoinName() {
  const { me, room, host, send, player } = useRoomTools()
  const [name, setName] = useState((me.spotify?.name ?? '').slice(0, MAX_NAME))
  const shown = name.trim()

  const sit = (event: FormEvent) => {
    event.preventDefault()
    if (shown) send({ type: 'join', name: shown })
  }

  return (
    <Screen>
      <RoomHeader
        code={room.code}
        host={host?.name}
        players={room.players.length}
        toWin={room.settings.cards_to_win}
      />
      <div className="join">
        <form className="jm-panel join__panel" onSubmit={sit}>
          <span className="jm-label">Joining room {room.code}</span>
          <label htmlFor="player-name" className="jm-moment__headline">
            What should we call you?
          </label>
          <TextInput
            id="player-name"
            className="join__name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={MAX_NAME}
            autoComplete="nickname"
            autoFocus
          />
          <p className="jm-caption">
            {me.spotify
              ? 'Your Spotify library goes into the deck.'
              : "No account needed. You can add your Spotify library once you're in."}
          </p>
          <ButtonPair className="join__pair">
            <Button to="/">Back</Button>
            <Button type="submit" variant="primary" disabled={!shown}>
              Take a seat
            </Button>
          </ButtonPair>
        </form>
        <aside className="join__table app-scroll">
          <h2 className="jm-section">Already at the table</h2>
          {room.players.map((seat) => (
            <PlayerRow
              key={seat.id}
              player={player(seat.id)}
              status={seat.is_host ? 'Host' : undefined}
            />
          ))}
          <PlayerRow
            player={{ id: 'you', name: shown || '?', color: ((room.players.length % 5) + 1) as Player['color'] }}
            status="That's you"
            className="join__you"
          />
        </aside>
      </div>
    </Screen>
  )
}
