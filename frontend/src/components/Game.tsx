import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { CardView, ClientMessage, GameView, Send, StateMessage } from '../messages.ts'
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

  // The challenger whose turn it is to mark a slot, once the challenge window has closed.
  const picker = game.phase === 'picking' ? game.challenges.find((challenge) => !challenge.locked) : undefined
  // "Whoever's turn it is": the active player, or the challenger who is picking.
  const current = picker?.player_id ?? game.active
  // The seat the buttons act for. The host can play for anyone, e.g. everyone on one device.
  const actor = !you.is_host || acting === MYSELF ? you.player_id : acting === ACTIVE ? current : acting
  const onBehalf = actor !== null && actor !== you.player_id ? { as_player: actor } : {}
  const asPlayer = (id: string) => (id !== you.player_id ? { as_player: id } : {})
  const name = (id: string | null) => room.players.find((player) => player.id === id)?.name ?? '?'

  const active = game.players.find((player) => player.id === game.active) ?? game.players[0]
  const me = game.players.find((player) => player.id === actor) ?? null
  const isActive = actor === game.active
  const referee = you.is_host || you.player_id === game.active
  const live = game.phase === 'placing' || game.phase === 'challenging' || game.phase === 'picking'
  const canPick = picker !== undefined && picker.player_id === actor
  // Slots nobody but the picker may mark: the active player's and the other challengers'.
  const taken = new Set([
    game.slot,
    ...game.challenges.filter((challenge) => challenge !== picker).map((challenge) => challenge.slot),
  ])
  // Players this device decides for while the window is open: yourself, and for the host also
  // every player without a device of their own (and whoever the menu names), with one tap each.
  const deciders = game.players
    .map((player) => player.id)
    .filter((id) => id !== game.active)
    .filter((id) =>
      you.is_host
        ? id === you.player_id || id === actor || !room.players.find((player) => player.id === id)?.connected
        : id === you.player_id,
    )
  const canBuy =
    me !== null &&
    me.tokens >= 3 &&
    game.deck_remaining > 0 &&
    game.phase !== 'finished' &&
    (!isActive || game.phase === 'revealed')

  const marks = new Map<number, string[]>()
  const mark = (slot: number, label: string) => marks.set(slot, [...(marks.get(slot) ?? []), label])

  // After the reveal: who guessed where, right or wrong, and where the card really belongs.
  // Slots are counted on the timeline before the reveal; a kept card shifts the later ones.
  let ghost: { slot: number; card: CardView } | undefined
  const shown = game.outcome && game.card && game.slot !== null ? game.card : null
  if (shown && game.outcome && game.slot !== null) {
    const kept = game.outcome.correct
    const before = kept ? active.timeline.filter((card) => card.id !== shown.id) : active.timeline
    const right = (slot: number) => fits(before, slot, shown.year)
    const at = (slot: number) => (kept && game.slot !== null && slot > game.slot ? slot + 1 : slot)
    if (!kept) {
      mark(game.slot, `${name(game.active)} ✗`)
      const belongs = before.findIndex((_, index) => right(index))
      ghost = { slot: belongs === -1 ? before.length : belongs, card: shown }
    }
    for (const challenge of game.challenges) {
      if (challenge.slot !== null) {
        mark(at(challenge.slot), `${name(challenge.player_id)} ${right(challenge.slot) ? '✓' : '✗'}`)
      }
    }
  } else {
    for (const challenge of game.challenges) {
      if (challenge.slot !== null) mark(challenge.slot, name(challenge.player_id))
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
                  : game.phase === 'challenging'
                    ? 'Locked in. Everyone else can challenge or pass before the time runs out.'
                    : `${name(picker?.player_id ?? null)} marks where the card really belongs.`}
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
          marks={marks}
          highlight={game.card?.id}
          ghost={ghost}
          pickable={(slot) =>
            game.phase === 'placing'
              ? isActive && slot !== game.slot
              : canPick && !taken.has(slot) && slot !== picker?.slot
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
            <>
              {game.window_left_ms !== null && (
                <Countdown
                  key={game.window_left_ms}
                  ms={game.window_left_ms}
                  total={room.settings.challenge_seconds * 1000}
                  label="to challenge"
                />
              )}
              {deciders.length === 0 && <p className="muted">Waiting for challenges.</p>}
              {deciders.map((id) => {
                const player = game.players.find((candidate) => candidate.id === id)
                const decision = game.challenges.some((challenge) => challenge.player_id === id)
                  ? 'challenges'
                  : game.passed.includes(id)
                    ? 'passes'
                    : null
                return (
                  <div key={id} className="row wrap decide">
                    {(you.is_host || id !== you.player_id) && <strong>{name(id)}</strong>}
                    {decision ? (
                      <span className="muted">{decision}</span>
                    ) : (
                      <>
                        <button
                          className="primary buzz"
                          disabled={!player || player.tokens < 1}
                          onClick={() => send({ type: 'buzz', ...asPlayer(id) })}
                        >
                          Challenge (1 token)
                        </button>
                        <button onClick={() => send({ type: 'pass', ...asPlayer(id) })}>Pass</button>
                      </>
                    )}
                  </div>
                )
              })}
              {referee && (
                <div className="row">
                  <button onClick={() => send({ type: 'reveal' })}>Reveal now</button>
                </div>
              )}
            </>
          )}

          {game.phase === 'picking' && picker && (
            <>
              {game.challenges.length > 1 && (
                <p className="muted">
                  Challengers pick in this order: {game.challenges.map((c) => name(c.player_id)).join(', ')}.
                </p>
              )}
              <div className="row wrap">
                {canPick ? (
                  <>
                    <button
                      className="primary"
                      disabled={picker.slot === null || !me || me.tokens < 1}
                      onClick={() => send({ type: 'lock_pick', ...onBehalf })}
                    >
                      Lock in challenge (1 token)
                    </button>
                    {picker.slot === null && (
                      <span className="muted">Tap a free + to mark where the card really belongs.</span>
                    )}
                  </>
                ) : (
                  <span className="muted">Waiting for {name(picker.player_id)} to mark a slot.</span>
                )}
                {referee && <button onClick={() => send({ type: 'reveal' })}>Reveal now</button>}
              </div>
            </>
          )}

          {game.phase === 'revealed' && game.advance_left_ms !== null && !loading && (
            <Countdown
              key={game.advance_left_ms}
              ms={game.advance_left_ms}
              total={room.settings.next_turn_seconds * 1000}
              label="until the next turn"
            />
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
                {game.advance_left_ms !== null && !loading && (
                  <button onClick={() => send({ type: 'hold_turn' })}>Keep listening</button>
                )}
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

/** Counts down from `ms`; remount it (change its key) whenever the server sends a new value. */
function Countdown({ ms, total, label }: { ms: number; total: number; label: string }) {
  const [deadline] = useState(() => Date.now() + ms)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 100)
    return () => window.clearInterval(timer)
  }, [])
  const left = Math.max(0, deadline - now)
  return (
    <div className="countdown" role="timer" aria-live="off">
      <progress value={left} max={total} />
      <strong>{Math.ceil(left / 1000)} s</strong>
      <span className="muted">{label}</span>
    </div>
  )
}

/** Is a card from `year` in order at `slot`? Equal years may go on either side, as in the engine. */
function fits(timeline: CardView[], slot: number, year: number) {
  const before = slot > 0 ? timeline[slot - 1].year : null
  const after = slot < timeline.length ? timeline[slot].year : null
  return (before === null || before <= year) && (after === null || year <= after)
}
