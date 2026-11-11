import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { loginUrl } from '../api.ts'
import type { RoomSettings, Send, StateMessage } from '../messages.ts'
import { LibraryStatus } from './LibraryStatus.tsx'

interface Props {
  state: StateMessage
  send: Send
  devicePicker: ReactNode
}

const CARDS_TO_WIN = [3, 5, 7, 10, 15]
const STARTING_TOKENS = [0, 1, 2, 3, 4, 5]
const DECK_SIZES = [20, 40, 60, 100, 150, 200]

export function Lobby({ state, send, devicePicker }: Props) {
  const { room, you } = state
  const { settings, deck } = room
  const [name, setName] = useState('')
  const [copied, setCopied] = useState(false)
  const link = `${location.origin}/room/${room.code}`
  const me = room.players.find((player) => player.id === you.player_id)
  const silent = room.players.filter((player) => settings.mode === 'remote' && !player.spotify)
  const libraries = room.players.filter((player) => player.library?.status === 'done').length

  const change = (patch: Partial<RoomSettings>) =>
    send({ type: 'set_settings', settings: { ...settings, ...patch } })

  const addPlayer = (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return
    send({ type: 'add_player', name: name.trim() })
    setName('')
  }

  // The clipboard API only exists on HTTPS and on 127.0.0.1.
  const copy = () => navigator.clipboard?.writeText(link).then(() => setCopied(true))

  const select = (label: string, key: keyof RoomSettings, options: (number | string)[]) => (
    <label>
      {label}
      <select
        value={settings[key]}
        disabled={!you.is_host}
        onChange={(event) => {
          const value = event.target.value
          const typed = typeof settings[key] === 'number' ? Number(value) : value
          change({ [key]: typed } as Partial<RoomSettings>)
        }}
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  )

  return (
    <>
      <header className="room-header">
        <div>
          <span className="muted">Room</span>
          <h1 className="code">{room.code}</h1>
        </div>
        <div className="share">
          <code>{link}</code>
          {navigator.clipboard && <button onClick={copy}>{copied ? 'Copied' : 'Copy link'}</button>}
        </div>
      </header>

      <section className="panel">
        <h2>Players</h2>
        <ul className="list players">
          {room.players.map((player) => (
            <li key={player.id}>
              <div>
                <strong>{player.name}</strong>
                {player.is_host && <span className="chip">host</span>}
                {!player.connected && (
                  <span className="chip">{player.spotify ? 'offline' : 'plays on the host'}</span>
                )}
                {player.spotify && player.device && <span className="chip">{player.device}</span>}
                <br />
                {player.library ? (
                  <LibraryStatus library={player.library} />
                ) : (
                  <span className="muted">No Spotify: does not shape the deck</span>
                )}
              </div>
              {you.is_host && !player.is_host && (
                <button onClick={() => send({ type: 'remove_player', player_id: player.id })}>
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
        {you.is_host && (
          <form className="row" onSubmit={addPlayer}>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Add a player without a phone"
              maxLength={24}
              aria-label="Player name"
            />
            <button type="submit" disabled={!name.trim()}>
              Add
            </button>
          </form>
        )}
        {me && !me.spotify && (
          <p>
            <a href={loginUrl(`/room/${room.code}`)}>Sign in with Spotify</a>{' '}
            <span className="muted">to add your music to the deck.</span>
          </p>
        )}
      </section>

      {devicePicker && (settings.mode === 'remote' || you.is_host) && (
        <section className="panel">
          <h2>Your Spotify device</h2>
          {devicePicker}
        </section>
      )}

      <section className="panel">
        <h2>Game</h2>
        <div className="settings">
          <label>
            Music plays
            <select
              value={settings.mode}
              disabled={!you.is_host}
              onChange={(event) => change({ mode: event.target.value as RoomSettings['mode'] })}
            >
              <option value="local">on the host's Spotify (same room)</option>
              <option value="remote">on every player's Spotify (remote)</option>
            </select>
          </label>
          {select('Cards to win', 'cards_to_win', CARDS_TO_WIN)}
          {select('Starting tokens', 'starting_tokens', STARTING_TOKENS)}
          {select('Deck size', 'deck_size', DECK_SIZES)}
          {room.strategies.length > 1 && select('Deck strategy', 'strategy', room.strategies)}
        </div>
        {silent.length > 0 && (
          <p className="banner bad">
            Without Spotify, {silent.map((player) => player.name).join(', ')} will not hear the
            music in remote mode.
          </p>
        )}

        <h3>Deck</h3>
        {deck.status === 'none' && (
          <p className="muted">
            Built from the {libraries} imported {libraries === 1 ? 'library' : 'libraries'} in this
            room.
          </p>
        )}
        {deck.status === 'dealing' && (
          <>
            <progress value={deck.done} max={deck.total || 1} />
            <p className="muted">
              Dealing: {deck.done} of {deck.total} opening cards. A song new to Jamster needs about
              a second to look up its release year.
            </p>
          </>
        )}
        {deck.status === 'error' && <p className="bad-text">{deck.error}</p>}

        {you.is_host ? (
          <div className="row wrap">
            <button
              className="primary"
              disabled={deck.status === 'dealing'}
              onClick={() => send({ type: 'start_game' })}
            >
              Start game
            </button>
          </div>
        ) : (
          <p className="muted">The host starts the game.</p>
        )}
      </section>
    </>
  )
}
