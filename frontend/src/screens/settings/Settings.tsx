import { useRef } from 'react'
import type { ReactNode } from 'react'
import type { RoomSettings } from '../../api/messages.ts'
import { BackHeader } from '../../components/BackHeader.tsx'
import { DoneButton } from '../../components/DoneButton.tsx'
import { ControlRow } from '../../components/Rows.tsx'
import { Screen } from '../../components/Screen.tsx'
import { Stepper } from '../../components/Stepper.tsx'
import { useWheelScrollsSideways } from '../../components/useWheelScrollsSideways.ts'
import { fmt } from '../../words.ts'
import { useRoomTools } from '../room/context.ts'
import { MixCard } from './components/MixCard.tsx'
import { TimingRows } from './components/TimingRows.tsx'
import { mixChoices } from './options.ts'
import './Settings.css'

/**
 * Game settings: the deck mix first, as a row of mix cards, then one line each, steppers and
 * toggles, plain numbers. The host changes them; guests see the values.
 */
export default function Settings() {
  const { room, you, send, close } = useRoomTools()
  const { settings } = room
  const isHost = you.is_host
  const change = (patch: Partial<RoomSettings>) =>
    send({ type: 'set_settings', settings: { ...settings, ...patch } })
  const libraries = room.players.filter((seat) => seat.library?.status === 'done')
  const songs = libraries.reduce((sum, seat) => sum + (seat.library?.tracks ?? 0), 0)
  const mixes = mixChoices(room.strategies, settings.strategy)
  // Five cards share the phone's row; more scroll sideways, with the mouse wheel too.
  const mixRow = useRef<HTMLUListElement>(null)
  useWheelScrollsSideways(mixRow)

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
        <DoneButton onClick={close} />
      </BackHeader>
      <div className="settings">
        <section className="settings-mix" aria-labelledby="s-mix">
          <div className="settings-mix__head">
            <h2 id="s-mix" className="jm-section">
              Deck mix
            </h2>
            <span className="jm-caption">How the songs are picked from your libraries.</span>
          </div>
          <ul ref={mixRow} className="settings-mix__row" aria-labelledby="s-mix">
            {mixes.map((mix) => (
              <MixCard
                key={mix.key}
                mix={mix}
                onPick={
                  isHost
                    ? () => {
                        if (!mix.picked) change({ strategy: mix.key })
                      }
                    : undefined
                }
              />
            ))}
          </ul>
        </section>
        {/* Two columns, filled top to bottom: the game's numbers, then its times. */}
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
          <TimingRows settings={settings} onChange={change} idPrefix="s" readOnly={!isHost} />
        </div>
      </div>
    </Screen>
  )
}
