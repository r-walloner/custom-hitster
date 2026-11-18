// What the settings screen offers, as label → value. The limits follow messages.py (RoomSettings).
export const MUSIC = { 'One speaker': 'local', "Everyone's Spotify": 'remote' } as const
export const CHALLENGE = { '5 s': 5, '10 s': 10, '15 s': 15, '20 s': 20 } as const
export const NEXT = { '5 s': 5, '10 s': 10, '15 s': 15, Tap: 0 } as const

// What each deck strategy (curation.STRATEGIES) is called here; unknown ones show their key.
export const STRATEGY_NAMES: Record<string, string> = {
  majority: 'Songs most know',
}

/** The label of `value` among `options`, or none when the value isn't offered. */
export function labelOf<T extends string, V>(options: Record<T, V>, value: V): T {
  const labels = Object.keys(options) as T[]
  return labels.find((label) => options[label] === value) ?? ('' as T)
}
