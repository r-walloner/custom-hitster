import type { RoomSettings } from '../../../api/messages.ts'
import { ControlRow } from '../../../components/Rows.tsx'
import { Segmented } from '../../../components/Stepper.tsx'
import { CHALLENGE, labelOf, NEXT, PLAY } from '../options.ts'

interface Row {
  key: 'play_seconds' | 'challenge_seconds' | 'next_turn_seconds'
  id: string
  name: string
  caption: string
  /** label → seconds */
  options: Record<string, number>
}

// The settings that are times, picked from a few fixed values. The host may change these during
// the game too (GameSettings), so both screens draw them from here.
const ROWS: Row[] = [
  {
    key: 'play_seconds',
    id: 'play',
    name: 'Listening time',
    caption: 'How long songs play before guessing.',
    options: PLAY,
  },
  {
    key: 'challenge_seconds',
    id: 'challenge',
    name: 'Time to challenge',
    caption: 'After the placement is locked in.',
    options: CHALLENGE,
  },
  {
    key: 'next_turn_seconds',
    id: 'next',
    name: 'Next song starts',
    caption: 'After the reveal. Tap: only when someone taps Next song.',
    options: NEXT,
  },
]

interface TimingRowsProps {
  settings: RoomSettings
  onChange: (patch: Partial<RoomSettings>) => void
  /** Makes the ids unique on the page: "s" gives "s-play". */
  idPrefix: string
  /** A guest sees the values where the host has the toggles. */
  readOnly?: boolean
}

/** Listening time, time to challenge and the next song's countdown, one row each. */
export function TimingRows({ settings, onChange, idPrefix, readOnly }: TimingRowsProps) {
  return ROWS.map(({ key, id, name, caption, options }) => {
    const nameId = `${idPrefix}-${id}`
    const value = labelOf(options, settings[key])
    return (
      <ControlRow key={key} name={name} nameId={nameId} caption={caption}>
        {readOnly ? (
          <output className="settings__value" aria-labelledby={nameId}>
            {value}
          </output>
        ) : (
          <Segmented
            labelledBy={nameId}
            options={Object.keys(options)}
            value={value}
            onChange={(label) => onChange({ [key]: options[label] })}
          />
        )}
      </ControlRow>
    )
  })
}
