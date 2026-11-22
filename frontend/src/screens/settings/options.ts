// What the settings screen offers, as label → value. The limits follow messages.py (RoomSettings).
export const CHALLENGE = { '5 s': 5, '10 s': 10, '15 s': 15, '20 s': 20 } as const
export const NEXT = { '5 s': 5, '10 s': 10, '15 s': 15, Tap: 0 } as const
export const PLAY = { '5 s': 5, '10 s': 10, '20 s': 20, 'No limit': 0 } as const

// The deck mixes (curation.STRATEGIES) as the settings screen shows them, in order: name and one
// line on what to expect. A planned mix is shown as Soon until the server offers it.
interface Mix {
  key: string
  name: string
  line: string
  planned?: boolean
}

export const MIXES: Mix[] = [
  {
    key: 'balanced',
    name: 'Balanced',
    line: 'Songs you all know, a fair share from every library.',
  },
  {
    key: 'show_and_tell',
    name: 'Show & Tell',
    line: 'Everyone brings the songs only they know.',
  },
  { key: 'wildcards', name: 'Wildcards', line: 'Obscure picks. Good luck.' },
  { key: 'deep_dive', name: 'Deep Dive', line: 'A single artist, start to finish.', planned: true },
  { key: 'nostalgia', name: 'Nostalgia', line: 'Songs you loved years ago.', planned: true },
]

/** What a deck mix is called: "Show & Tell". A mix this file doesn't know goes by its key. */
export function mixName(key: string): string {
  return MIXES.find((mix) => mix.key === key)?.name ?? key
}

export interface MixChoice {
  key: string
  name: string
  line: string
  /** Not offered by the server yet: shown, but can't be picked. */
  planned: boolean
  picked: boolean
}

/**
 * The cards of the Deck mix row: every mix the server offers, plus the planned ones it doesn't
 * offer yet. A strategy this file doesn't know comes last, under its key.
 */
export function mixChoices(strategies: string[], picked: string): MixChoice[] {
  const offered = new Set(strategies)
  const known = MIXES.filter((mix) => offered.has(mix.key) || mix.planned).map((mix) => ({
    key: mix.key,
    name: mix.name,
    line: mix.line,
    planned: !offered.has(mix.key),
  }))
  const unknown = strategies
    .filter((key) => !MIXES.some((mix) => mix.key === key))
    .map((key) => ({ key, name: key, line: '', planned: false }))
  return [...known, ...unknown].map((mix) => ({
    ...mix,
    picked: !mix.planned && mix.key === picked,
  }))
}

/** The label of `value` among `options`, or none when the value isn't offered. */
export function labelOf<T extends string, V>(options: Record<T, V>, value: V): T {
  const labels = Object.keys(options) as T[]
  return labels.find((label) => options[label] === value) ?? ('' as T)
}
