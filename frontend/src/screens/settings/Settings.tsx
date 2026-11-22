import type { ReactNode } from 'react'
import type { RoomSettings } from '../../api/messages.ts'
import { BackHeader } from '../../components/BackHeader.tsx'
import { Button } from '../../components/Button.tsx'
import { ControlRow } from '../../components/Rows.tsx'
import { Screen } from '../../components/Screen.tsx'
import { Segmented, Stepper } from '../../components/Stepper.tsx'
import { fmt } from '../../words.ts'
import { useRoomTools } from '../room/context.ts'
import { CHALLENGE, labelOf, NEXT, PLAY, STRATEGY_NAMES } from './options.ts'
import './Settings.css'

/**
 * Game settings: one line each, steppers and toggles, plain numbers. The host changes them;
 * guests see the values.
 */
export default function Settings() {
  const { room, you, send, close } = useRoomTools()
  const { settings } = room
  const isHost = you.is_host
  const change = (patch: Partial<RoomSettings>) =>
    send({ type: 'set_settings', settings: { ...settings, ...patch } })
  const libraries = room.players.filter((seat) => seat.library?.status === 'done')
  const songs = libraries.reduce((sum, seat) => sum + (seat.library?.tracks ?? 0), 0)
  const strategy = STRATEGY_NAMES[settings.strategy] ?? settings.strategy

  // A guest sees the value where the host has the control.
  const control = (nameId: string, value: string | number, editable: ReactNode) =>
    isHost ? (
      editable
    ) : (
      <output className="settings__value" aria-labelledby={nameId}>
        {value}
      </output>
    )

  return (
    <Screen>
      <BackHeader onBack={close} backLabel="Back to the lobby" title="Game settings">
        {!isHost && <span className="jm-caption">The host sets these.</span>}
        <Button onClick={close} variant="primary" className="settings__done">
          Done
        </Button>
      </BackHeader>
      <div className="settings">
        <div className="settings__grid">
          <ControlRow name="Cards to win" nameId="s-win" caption="First to this many wins.">
            {control(
              's-win',
              settings.cards_to_win,
              <Stepper
                labelledBy="s-win"
                value={settings.cards_to_win}
                onChange={(value) => change({ cards_to_win: value })}
                min={3}
                max={20}
                lessLabel="Fewer cards"
                moreLabel="More cards"
              />,
            )}
          </ControlRow>
          <ControlRow
            name="Starting tokens"
            nameId="s-tokens"
            caption="For challenges and skips. Three buy a card."
          >
            {control(
              's-tokens',
              settings.starting_tokens,
              <Stepper
                labelledBy="s-tokens"
                value={settings.starting_tokens}
                onChange={(value) => change({ starting_tokens: value })}
                max={5}
                lessLabel="Fewer tokens"
                moreLabel="More tokens"
              />,
            )}
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
            {control(
              's-deck',
              settings.deck_size,
              <Stepper
                labelledBy="s-deck"
                value={settings.deck_size}
                onChange={(value) => change({ deck_size: value })}
                step={10}
                min={20}
                max={300}
                lessLabel="Smaller deck"
                moreLabel="Bigger deck"
              />,
            )}
          </ControlRow>
          <ControlRow
            name="Deck mix"
            nameId="s-strategy-name"
            labelFor={isHost ? 's-strategy' : undefined}
            caption="How songs are picked from each library."
          >
            {control(
              's-strategy-name',
              strategy,
              <select
                id="s-strategy"
                className="jm-select settings__select"
                value={settings.strategy}
                onChange={(event) => change({ strategy: event.target.value })}
              >
                {room.strategies.map((key) => (
                  <option key={key} value={key}>
                    {STRATEGY_NAMES[key] ?? key}
                  </option>
                ))}
              </select>,
            )}
          </ControlRow>
          <ControlRow
            name="Listening time"
            nameId="s-play"
            caption="How long songs play before guessing."
          >
            {control(
              's-play',
              labelOf(PLAY, settings.play_seconds),
              <Segmented
                labelledBy="s-play"
                options={Object.keys(PLAY) as (keyof typeof PLAY)[]}
                value={labelOf(PLAY, settings.play_seconds)}
                onChange={(label) => change({ play_seconds: PLAY[label] })}
              />,
            )}
          </ControlRow>
          <ControlRow
            name="Time to challenge"
            nameId="s-challenge"
            caption="After the placement is locked in."
          >
            {control(
              's-challenge',
              labelOf(CHALLENGE, settings.challenge_seconds),
              <Segmented
                labelledBy="s-challenge"
                options={Object.keys(CHALLENGE) as (keyof typeof CHALLENGE)[]}
                value={labelOf(CHALLENGE, settings.challenge_seconds)}
                onChange={(label) => change({ challenge_seconds: CHALLENGE[label] })}
              />,
            )}
          </ControlRow>
          <ControlRow
            name="Next song starts"
            nameId="s-next"
            caption="After the reveal. Tap: only when someone taps Next song."
          >
            {control(
              's-next',
              labelOf(NEXT, settings.next_turn_seconds),
              <Segmented
                labelledBy="s-next"
                options={Object.keys(NEXT) as (keyof typeof NEXT)[]}
                value={labelOf(NEXT, settings.next_turn_seconds)}
                onChange={(label) => change({ next_turn_seconds: NEXT[label] })}
              />,
            )}
          </ControlRow>
        </div>
      </div>
    </Screen>
  )
}
