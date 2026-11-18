import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Button, ButtonPair, RoomCode } from '../components/Button.tsx'
import { TextInput } from '../components/Input.tsx'
import { Logo } from '../components/Logo.tsx'
import { PlayerRow } from '../components/Rows.tsx'
import { Header, RoomMeta, Screen, Spacer } from '../components/Screen.tsx'
import { JONAS, LEA, MARA, SAM } from '../fixtures.ts'
import { useRoomPaths } from '../paths.ts'
import './JoinName.css'

/** Joining asks for a name only, with the people already at the table beside it. */
export default function JoinName() {
  const paths = useRoomPaths()
  const navigate = useNavigate()
  const [name, setName] = useState('Jonas')

  const sit = (event: FormEvent) => {
    event.preventDefault()
    navigate(paths.guestLobby)
  }

  return (
    <Screen>
      <Header>
        <Logo />
        <RoomCode code={paths.code} />
        <Spacer />
        <RoomMeta host="Mara" players={3} />
      </Header>
      <div className="join">
        <form className="jm-panel join__panel" onSubmit={sit}>
          <span className="jm-label">Joining room {paths.code}</span>
          <label htmlFor="player-name" className="jm-moment__headline">
            What should we call you?
          </label>
          <TextInput
            id="player-name"
            className="join__name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={16}
            autoComplete="nickname"
          />
          <p className="jm-caption">
            No account needed. You can add your Spotify library once you're in.
          </p>
          <ButtonPair className="join__pair">
            <Button to="/">Back</Button>
            <Button type="submit" variant="primary" disabled={!name.trim()}>
              Take a seat
            </Button>
          </ButtonPair>
        </form>
        <aside className="join__table">
          <h2 className="jm-section">Already at the table</h2>
          <PlayerRow player={MARA} status="Host" />
          <PlayerRow player={SAM} />
          <PlayerRow player={LEA} />
          <PlayerRow
            player={{ ...JONAS, name: name.trim() || JONAS.name }}
            status="That's you"
            className="join__you"
          />
        </aside>
      </div>
    </Screen>
  )
}
