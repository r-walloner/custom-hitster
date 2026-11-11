import { useState } from 'react'
import type { ReactNode } from 'react'
import type { ClientMessage, GameView, Send, StateMessage } from '../messages.ts'
import { Timeline } from './Timeline.tsx'

interface Props {
  state: StateMessage
  game: GameView
  send: Send
  devicePicker: ReactNode
}

// Choices of the host's "acting as" menu besides a specific player.
const MYSELF = 'myself'
const ACTIVE = 'active'

const YEAR_SOURCES: Record<string, string> = {
  musicbrainz: 'MusicBrainz',
  spotify: 'Spotify',
  manual: 'a manual correction',
}

export function Game({ state, game, send, devicePicker }: Props) {
  const { room, you } = state
  // Default to the player on turn, so a game on one device needs no switching.
  const [acting, setActing] = useState(ACTIVE)
  // The state on screen when this device asked for a new card. Until the server answers with a
  // newer state (it always does, also on a refusal), the draw buttons stay locked.
  const [drawSentAt, setDrawSentAt] = useState<StateMessage | null>(null)
  const loading = game.drawing || drawSentAt === state
  const restart = () => send({ type: 'restart_playback' })
  const draw = (message: ClientMessage) => {
    setDrawSentAt(state)
    send(message)
  }

  // The seat the buttons act for. The host can play for anyone, e.g. everyone on one device.
  const actor = !you.is_host || acting === MYSELF ? you.player_id : acting === ACTIVE ? game.active : acting
  const onBehalf = actor !== null && actor !== you.player_id ? { as_player: actor } : {}
  const name = (id: string | null) => room.players.find((player) => player.id === id)?.name ?? '?'

  const active = game.players.find((player) => player.id === game.active) ?? game.players[0]
  const me = game.players.find((player) => player.id === actor) ?? null
  const isActive = actor === game.active
  const referee = you.is_host || you.player_id === game.active
  const live = game.phase === 'placing' || game.phase === 'challenging'
  const nextToPick = game.challenges.find((challenge) => challenge.slot === null)?.player_id
  const myChallenge = game.challenges.find((challenge) => challenge.player_id === actor)
  const taken = new Set([game.slot, ...game.challenges.map((challenge) => challenge.slot)])
  const canPick = game.phase === 'challenging' && actor !== null && nextToPick === actor
  const canBuy =
    me !== null &&
    me.tokens >= 3 &&
    game.deck_remaining > 0 &&
    game.phase !== 'finished' &&
    (!isActive || game.phase === 'revealed')

  const marks = new Map<number, string[]>()
  for (const challenge of game.challenges) {
    if (challenge.slot !== null) {
      marks.set(challenge.slot, [...(marks.get(challenge.slot) ?? []), name(challenge.player_id)])
    }
  }

  const playback = room.playback
  const mySeat = room.players.find((player) => player.id === you.player_id)
  const listening = mySeat?.spotify && (room.settings.mode === 'remote' || you.is_host)

  return (
    <>
      <header className="room-header">
        <div>
          <span className="muted">Room {room.code}</span>
          <h1>Turn {game.turn_number}</h1>
        </div>
        <div className="muted">
          {game.deck_remaining} cards left · first to {room.settings.cards_to_win} wins
        </div>
        {you.is_host && (
          <div className="row wrap">
            <label>
              Acting as
              <select value={acting} onChange={(event) => setActing(event.target.value)}>
                <option value={MYSELF}>myself</option>
                <option value={ACTIVE}>whoever's turn it is</option>
                {room.players
                  .filter((player) => player.id !== you.player_id)
                  .map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.name}
                    </option>
                  ))}
              </select>
            </label>
            <button
              onClick={() => window.confirm('End this game for everyone?') && send({ type: 'end_game' })}
            >
              End game
            </button>
          </div>
        )}
      </header>

      {playback.status === 'starting' && <p className="banner">Starting playback…</p>}
      {playback.status === 'failed' && (
        <div className="banner bad">
          {playback.failures.map((failure) => (
            <p key={failure.player_id}>
              <strong>{name(failure.player_id)}:</strong> {failure.message}
            </p>
          ))}
          <div className="row wrap">
            <button onClick={() => send({ type: 'retry_playback' })}>Retry playback</button>
            {referee && <button onClick={restart}>Restart song for everyone</button>}
          </div>
        </div>
      )}
      {listening && playback.status === 'failed' && <section className="panel">{devicePicker}</section>}

      <section className="panel now-playing">
        {game.card ? (
          <>
            {game.card.image_url && <img src={game.card.image_url} alt="" />}
            <div>
              <strong className="year">{game.card.year}</strong>
              <h2>{game.card.name}</h2>
              <p>{game.card.artists.join(', ')}</p>
              <p className="muted">
                Year from {YEAR_SOURCES[game.card.year_source] ?? game.card.year_source}
                {game.card.known_by.length > 0 && <> · in the library of {game.card.known_by.join(', ')}</>}
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="card mystery big">?</div>
            <div>
              <h2>{name(game.active)} is up</h2>
              <p className="muted">
                {game.phase === 'placing'
                  ? 'Listen, then put the card where it belongs on the timeline.'
                  : 'Locked in. Anyone else can challenge the placement or pass.'}
              </p>
            </div>
          </>
        )}
        {referee && game.phase !== 'finished' && (
          <button
            className="restart"
            disabled={playback.status === 'starting'}
            title="Start the song again from the beginning"
            onClick={restart}
          >
            ↻ Restart song
          </button>
        )}
      </section>

      {game.outcome && (
        <p className={`banner ${game.outcome.correct ? 'good' : 'bad'}`}>
          {game.outcome.correct
            ? `${name(game.active)} placed it correctly and keeps the card.`
            : game.outcome.card_to
              ? `Wrong spot. ${name(game.outcome.card_to)} challenged correctly and takes the card.`
              : 'Wrong spot. The card is discarded.'}
        </p>
      )}
      {game.phase === 'finished' && (
        <p className="banner good winner">
          {game.winners.map(name).join(' and ')} {game.winners.length === 1 ? 'wins' : 'win'}!
        </p>
      )}

      <section className="panel">
        <h3>{name(game.active)}'s timeline</h3>
        <Timeline
          cards={active.timeline}
          pending={live ? game.slot : null}
          marks={live ? marks : undefined}
          highlight={game.card?.id}
          pickable={(slot) =>
            game.phase === 'placing' ? isActive && slot !== game.slot : canPick && !taken.has(slot)
          }
          onPick={(slot) =>
            send({ type: game.phase === 'placing' ? 'place' : 'pick_slot', slot, ...onBehalf })
          }
        />

        <div className="controls">
          {actor !== null && actor !== you.player_id && (
            <p className="muted">You are playing for {name(actor)}.</p>
          )}

          {game.phase === 'placing' &&
            (isActive ? (
              <div className="row wrap">
                <button
                  className="primary"
                  disabled={game.slot === null}
                  onClick={() => send({ type: 'lock', ...onBehalf })}
                >
                  Lock in
                </button>
                <button
                  disabled={!me || me.tokens < 1 || game.deck_remaining === 0 || loading}
                  onClick={() => draw({ type: 'skip', ...onBehalf })}
                >
                  {loading ? <Loading /> : 'Skip song (1 token)'}
                </button>
                {game.slot === null && <span className="muted">Tap a + to place the card.</span>}
              </div>
            ) : (
              <p className="muted">Waiting for {name(game.active)} to place the card.</p>
            ))}

          {game.phase === 'challenging' && (
            <div className="row wrap">
              {isActive || actor === null ? (
                <span className="muted">Waiting for challenges.</span>
              ) : myChallenge ? (
                <span className="muted">
                  {myChallenge.slot !== null
                    ? 'Your challenge is placed.'
                    : canPick
                      ? 'Tap a free + to mark where the card really belongs.'
                      : `You buzzed. ${name(nextToPick ?? null)} picks first.`}
                </span>
              ) : game.passed.includes(actor) ? (
                <span className="muted">You passed.</span>
              ) : (
                <>
                  <button
                    className="primary buzz"
                    disabled={!me || me.tokens < 1}
                    onClick={() => send({ type: 'buzz', ...onBehalf })}
                  >
                    Challenge (1 token)
                  </button>
                  <button onClick={() => send({ type: 'pass', ...onBehalf })}>Pass</button>
                </>
              )}
              {referee && <button onClick={() => send({ type: 'reveal' })}>Reveal now</button>}
            </div>
          )}

          {game.phase === 'revealed' &&
            (referee ? (
              <div className="row wrap">
                <span>Did {name(game.active)} name the title and artist?</span>
                <button
                  className={game.named === true ? 'selected' : ''}
                  onClick={() => send({ type: 'set_named', value: true })}
                >
                  Yes (+1 token)
                </button>
                <button
                  className={game.named === false ? 'selected' : ''}
                  onClick={() => send({ type: 'set_named', value: false })}
                >
                  No
                </button>
                <button
                  className="primary"
                  disabled={loading}
                  aria-busy={loading}
                  onClick={() => draw({ type: 'next_turn' })}
                >
                  {loading ? <Loading /> : 'Next turn'}
                </button>
              </div>
            ) : (
              <p className="muted">{loading ? <Loading /> : 'Waiting for the next turn.'}</p>
            ))}

          {canBuy && (
            <div className="row">
              <button disabled={loading} onClick={() => draw({ type: 'buy', ...onBehalf })}>
                {loading ? <Loading /> : 'Buy a card (3 tokens)'}
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="panel">
        <h3>Scores</h3>
        <ul className="list scores">
          {game.players.map((player) => (
            <li key={player.id} className={player.id === game.active ? 'active' : ''}>
              <div>
                <strong>{name(player.id)}</strong>
                {player.id === you.player_id && <span className="chip">you</span>}
                {game.winners.includes(player.id) && <span className="chip mark">winner</span>}
                <br />
                <span className="muted">
                  {player.timeline.length} of {room.settings.cards_to_win} cards · {player.tokens}{' '}
                  {player.tokens === 1 ? 'token' : 'tokens'}
                </span>
              </div>
              <div className="years">
                {player.timeline.map((card) => (
                  <span
                    key={card.id}
                    className={`chip${card.id === game.card?.id ? ' mark' : ''}`}
                    title={`${card.name} · ${card.artists.join(', ')}`}
                  >
                    {card.year}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}

function Loading() {
  return (
    <>
      <span className="spinner" aria-hidden="true" />
      Loading the next song…
    </>
  )
}
