import { Button } from '../components/Button.tsx'
import { ControlRow } from '../components/Rows.tsx'
import { Screen } from '../components/Screen.tsx'
import { Segmented, Stepper } from '../components/Stepper.tsx'
import type { RoomSettings } from '../messages.ts'
import { fmt, useRoomTools } from '../room.ts'
import { SubHeader } from './SubHeader.tsx'
import './Settings.css'

// The choices offered, as label → value. The limits follow messages.py (RoomSettings).
const MUSIC = { 'One speaker': 'local', "Everyone's Spotify": 'remote' } as const
const CHALLENGE = { '5 s': 5, '10 s': 10, '15 s': 15, '20 s': 20 } as const
const NEXT = { '5 s': 5, '10 s': 10, '15 s': 15, Tap: 0 } as const

// What each deck strategy (curation.STRATEGIES) is called here; unknown ones show their key.
const STRATEGY_NAMES: Record<string, string> = {
  majority: 'Songs most know',
}

/** The label of `value` among `options`, or none when the value isn't offered. */
function labelOf<T extends string, V>(options: Record<T, V>, value: V): T {
  const labels = Object.keys(options) as T[]
  return labels.find((label) => options[label] === value) ?? ('' as T)
}

/** Game settings: one line each, steppers and toggles, plain numbers. Only the host gets here. */
export default function Settings() {
  const { room, send, close } = useRoomTools()
  const { settings } = room
  const change = (patch: Partial<RoomSettings>) =>
    send({ type: 'set_settings', settings: { ...settings, ...patch } })
  const libraries = room.players.filter((seat) => seat.library?.status === 'done')
  const songs = libraries.reduce((sum, seat) => sum + (seat.library?.tracks ?? 0), 0)

  return (
    <Screen>
      <SubHeader onBack={close} backLabel="Back to the lobby" title="Game settings">
        <Button onClick={close} variant="primary" className="settings__done">
          Done
        </Button>
      </SubHeader>
      <div className="settings">
        <ControlRow
          name="Where the music plays"
          nameId="s-music"
          caption="One speaker for a room together. Everyone's own Spotify for a call: each phone plays the song at the same moment."
          className="settings__music"
        >
          <Segmented
            labelledBy="s-music"
            options={Object.keys(MUSIC) as (keyof typeof MUSIC)[]}
            value={labelOf(MUSIC, settings.mode)}
            onChange={(label) => change({ mode: MUSIC[label] })}
          />
        </ControlRow>
        <div className="settings__grid">
          <ControlRow name="Cards to win" nameId="s-win" caption="First to this many wins.">
            <Stepper
              labelledBy="s-win"
              value={settings.cards_to_win}
              onChange={(value) => change({ cards_to_win: value })}
              min={3}
              max={20}
              lessLabel="Fewer cards"
              moreLabel="More cards"
            />
          </ControlRow>
          <ControlRow
            name="Starting tokens"
            nameId="s-tokens"
            caption="For challenges and skips. Three buy a card."
          >
            <Stepper
              labelledBy="s-tokens"
              value={settings.starting_tokens}
              onChange={(value) => change({ starting_tokens: value })}
              max={5}
              lessLabel="Fewer tokens"
              moreLabel="More tokens"
            />
          </ControlRow>
          <ControlRow
            name="Deck size"
            nameId="s-deck"
            caption={
              libraries.length > 0
                ? `Picked from ${fmt(songs)} songs in ${libraries.length} ${libraries.length === 1 ? 'library' : 'libraries'}.`
                : 'No library is imported yet.'
            }
          >
            <Stepper
              labelledBy="s-deck"
              value={settings.deck_size}
              onChange={(value) => change({ deck_size: value })}
              step={10}
              min={20}
              max={300}
              lessLabel="Smaller deck"
              moreLabel="Bigger deck"
            />
          </ControlRow>
          <ControlRow
            name="Deck mix"
            nameId="s-strategy-name"
            labelFor="s-strategy"
            caption="How songs are picked from each library."
          >
            <select
              id="s-strategy"
              className="jm-select settings__select"
              value={settings.strategy}
              onChange={(event) => change({ strategy: event.target.value })}
            >
              {room.strategies.map((strategy) => (
                <option key={strategy} value={strategy}>
                  {STRATEGY_NAMES[strategy] ?? strategy}
                </option>
              ))}
            </select>
          </ControlRow>
          <ControlRow
            name="Time to challenge"
            nameId="s-challenge"
            caption="After the placement is locked in."
          >
            <Segmented
              labelledBy="s-challenge"
              options={Object.keys(CHALLENGE) as (keyof typeof CHALLENGE)[]}
              value={labelOf(CHALLENGE, settings.challenge_seconds)}
              onChange={(label) => change({ challenge_seconds: CHALLENGE[label] })}
            />
          </ControlRow>
          <ControlRow
            name="Next song starts"
            nameId="s-next"
            caption="After the reveal. Tap: only when someone taps Next song."
          >
            <Segmented
              labelledBy="s-next"
              options={Object.keys(NEXT) as (keyof typeof NEXT)[]}
              value={labelOf(NEXT, settings.next_turn_seconds)}
              onChange={(label) => change({ next_turn_seconds: NEXT[label] })}
            />
          </ControlRow>
        </div>
      </div>
    </Screen>
  )
}
