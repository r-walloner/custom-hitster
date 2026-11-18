import type { ReactNode } from 'react'
import type { Song } from '../fixtures.ts'

/** One thing on a board's row, left to right. */
export type BoardItem =
  | {
      kind: 'card'
      song: Song
      isNew?: boolean
      mark?: ReactNode
      onBefore?: () => void
      onAfter?: () => void
    }
  | { kind: 'pick'; name: string; done?: boolean }
  | { kind: 'gap'; label: string; onPick: () => void }

/** "Before 1975", "Between 1975 and 1994", "After 2016": the range of slot `i` (0…cards.length). */
export function slotRange(cards: Song[], i: number): string {
  if (i === 0) return `Before ${cards[0].year}`
  if (i === cards.length) return `After ${cards[cards.length - 1].year}`
  return `Between ${cards[i - 1].year} and ${cards[i].year}`
}

/** "1975 to 1994", "before 1975": the short form used in the panel. */
export function slotRangeShort(cards: Song[], i: number): string {
  if (i === 0) return `before ${cards[0].year}`
  if (i === cards.length) return `after ${cards[cards.length - 1].year}`
  return `${cards[i - 1].year} to ${cards[i].year}`
}

interface Pick {
  name: string
  /** The slot, 0…cards.length. */
  slot: number
  done?: boolean
}

/**
 * The row while someone places or guesses: gap, card, gap, card, … with the picks in their slots.
 * Slots already taken are left out, not disabled. The one picking now (`active`) can also tap
 * card halves; `onPick` moves their pick to a slot.
 */
export function pickingItems(
  cards: Song[],
  picks: Pick[],
  active: {
    name: string
    slot: number
    onPick: (slot: number) => void
    gapLabel: (slot: number) => string
  },
): BoardItem[] {
  const items: BoardItem[] = []
  for (let i = 0; i <= cards.length; i++) {
    const taken = picks.filter((pick) => pick.slot === i)
    for (const pick of taken) items.push({ kind: 'pick', name: pick.name, done: pick.done })
    if (i === active.slot) items.push({ kind: 'pick', name: active.name })
    else if (taken.length === 0)
      items.push({ kind: 'gap', label: active.gapLabel(i), onPick: () => active.onPick(i) })
    if (i < cards.length) {
      const before = i
      items.push({
        kind: 'card',
        song: cards[i],
        onBefore: picks.some((pick) => pick.slot === before)
          ? undefined
          : () => active.onPick(before),
        onAfter: picks.some((pick) => pick.slot === before + 1)
          ? undefined
          : () => active.onPick(before + 1),
      })
    }
  }
  return items
}
