import { useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { getMe, loginUrl } from '../api.ts'
import type { Me } from '../api.ts'
import { DevicePicker } from '../components/DevicePicker.tsx'
import { Game } from '../components/Game.tsx'
import { Lobby } from '../components/Lobby.tsx'
import { useRoom } from '../useRoom.ts'

const NOTICE_MS = 5000

export default function Room() {
  const { code = '' } = useParams()
  const [me, setMe] = useState<Me | null>(null)

  // Fetching /api/me first also sets the session cookie the socket is identified by.
  useEffect(() => {
    getMe().then(setMe)
  }, [])

  if (!me) return <Message>Loading…</Message>
  return <Connected code={code.toUpperCase()} me={me} />
}

function Message({ children }: { children: ReactNode }) {
  return (
    <main className="page narrow">
      <p className="muted">{children}</p>
    </main>
  )
}

function Connected({ code, me }: { code: string; me: Me }) {
  const { state, connection, devices, closeDevices, notice, dismissNotice, send } = useRoom(code)
  const [name, setName] = useState(me.spotify?.name ?? '')

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(dismissNotice, NOTICE_MS)
    return () => window.clearTimeout(timer)
  }, [notice, dismissNotice])

  if (connection === 'not_found') {
    return (
      <Message>
        There is no room {code}. Rooms disappear when the server restarts.{' '}
        <Link to="/">Back to the start</Link>
      </Message>
    )
  }
  if (!state) return <Message>Connecting…</Message>

  const { room, you } = state
  const seat = room.players.find((player) => player.id === you.player_id)
  const devicePicker = seat?.spotify ? (
    <DevicePicker
      current={seat.device}
      devices={devices}
      onClose={closeDevices}
      send={send}
      canTest={room.game === null}
    />
  ) : null

  const join = (event: FormEvent) => {
    event.preventDefault()
    if (name.trim()) send({ type: 'join', name: name.trim() })
  }

  return (
    <main className="page">
      {connection === 'connecting' && <p className="banner bad">Connection lost. Reconnecting…</p>}

      {room.game ? (
        <Game state={state} game={room.game} send={send} devicePicker={devicePicker} />
      ) : you.player_id ? (
        <Lobby state={state} send={send} devicePicker={devicePicker} />
      ) : (
        <section className="panel narrow">
          <h1>Join room {room.code}</h1>
          <p className="muted">
            Already here: {room.players.map((player) => player.name).join(', ')}
          </p>
          <form className="row" onSubmit={join}>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your name"
              maxLength={24}
              aria-label="Your name"
              autoFocus
            />
            <button className="primary" type="submit" disabled={!name.trim()}>
              Join
            </button>
          </form>
          {you.spotify ? (
            <p className="muted">Your Spotify library will help shape the deck.</p>
          ) : (
            <p>
              <a href={loginUrl(`/room/${room.code}`)}>Sign in with Spotify</a>{' '}
              <span className="muted">first if you want your music in the deck.</span>
            </p>
          )}
        </section>
      )}

      {notice && (
        <p className={`toast ${notice.ok ? 'good' : 'bad'}`} role="status" onClick={dismissNotice}>
          {notice.text}
        </p>
      )}
    </main>
  )
}
