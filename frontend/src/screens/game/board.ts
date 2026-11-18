// The board row in each phase, and how its slots are named. Slot i is the gap before card i;
// slot cards.length is the gap after the last card.
import type { ReactNode } from 'react'
import type { CardView, GameView } from '../../api/messages.ts'
import type { Song } from '../../components/types.ts'
import type { BoardItem } from './components/Board.tsx'
import { fits } from './rules.ts'

/** A card from the server as the design components draw it. */
export function toSong(card: CardView): Song {
  return { id: card.id, year: card.year, title: card.name, artist: card.artists.join(', ') }
}

/** "Before 1975", "Between 1975 and 1994", "After 2016": the range of slot `i` (0…cards.length). */
export function slotRange(cards: Song[], i: number): string {
  if (cards.length === 0) return 'Anywhere'
  if (i === 0) return `Before ${cards[0].year}`
  if (i === cards.length) return `After ${cards[cards.length - 1].year}`
  return `Between ${cards[i - 1].year} and ${cards[i].year}`
}

/** "1975 to 1994", "before 1975": the short form used in the panel. */
export function slotRangeShort(cards: Song[], i: number): string {
  if (cards.length === 0) return 'anywhere'
  if (i === 0) return `before ${cards[0].year}`
  if (i === cards.length) return `after ${cards[cards.length - 1].year}`
  return `${cards[i - 1].year} to ${cards[i].year}`
}

export interface Pick {
  name: string
  /** The slot, 0…cards.length. */
  slot: number
  done?: boolean
}

export interface ActivePick {
  name: string
  /** Null until they first tap a slot. */
  slot: number | null
  onPick: (slot: number) => void
  gapLabel: (slot: number) => string
}

/**
 * The row while someone places or guesses: gap, card, gap, card, … with the picks in their slots.
 * Slots already taken are left out, not disabled. The one picking now on this device (`active`)
 * can also tap card halves; `onPick` moves their pick to a slot. Without `active` the row is
 * read-only: cards and picks, no gaps.
 */
export function pickingItems(cards: Song[], picks: Pick[], active?: ActivePick): BoardItem[] {
  const taken = (slot: number) => picks.some((pick) => pick.slot === slot)
  const items: BoardItem[] = []
  for (let i = 0; i <= cards.length; i++) {
    for (const pick of picks.filter((pick) => pick.slot === i)) {
      items.push({ kind: 'pick', name: pick.name, done: pick.done })
    }
    if (active) {
      if (i === active.slot) items.push({ kind: 'pick', name: active.name })
      else if (!taken(i)) {
        const slot = i
        items.push({ kind: 'gap', label: active.gapLabel(slot), onPick: () => active.onPick(slot) })
      }
    }
    if (i < cards.length) {
      const before = i
      items.push({
        kind: 'card',
        song: cards[i],
        onBefore: active && !taken(before) ? () => active.onPick(before) : undefined,
        onAfter: active && !taken(before + 1) ? () => active.onPick(before + 1) : undefined,
      })
    }
  }
  return items
}

/** While challengers guess: the placement and the guesses already locked in, all done. */
export function guessPicks(game: GameView, name: (id: string) => string): Pick[] {
  return [
    ...(game.slot === null ? [] : [{ name: name(game.active), slot: game.slot, done: true }]),
    ...game.challenges
      .filter((challenge) => challenge.locked && challenge.slot !== null)
      .map((challenge) => ({ name: name(challenge.player_id), slot: challenge.slot!, done: true })),
  ]
}

export interface Guess {
  /** The player's id. */
  id: string
  /** "Mara" */
  name: string
  /** The slot on the timeline as it was before the reveal. */
  slot: number
}

/**
 * The row after the reveal: the active player's timeline with the revealed card where it belongs,
 * and a ✓ or ✕ with an initial for every placement and guess. A wrong guess sits on the gap it
 * named, on the right edge of the card before it (or the left edge of the first card). The card is
 * a ghost when it left this timeline.
 */
export function revealItems(
  /** The timeline before the reveal. */
  before: Song[],
  revealed: Song,
  guesses: Guess[],
  /** The id of who got the card: null when it was discarded. */
  winner: string | null,
  kept: boolean,
  /** Where the card sits: the kept slot, the winner's guess, or the first slot it fits. */
  at: number,
  mark: (right: boolean, guess: Guess, before: boolean) => ReactNode,
): BoardItem[] {
  const items: BoardItem[] = before.map((song) => ({ kind: 'card', song }))
  const marks = new Map<number, ReactNode[]>()
  const add = (index: number, node: ReactNode) => marks.set(index, [...(marks.get(index) ?? []), node])
  for (const guess of guesses) {
    const right = fits(before, guess.slot, revealed.year)
    if (right && guess.id === winner) continue // marked on the card itself
    // Index in `before`; it moves one right once the revealed card is inserted before it.
    const left = guess.slot === 0 ? 0 : guess.slot - 1
    add(left >= at ? left + 1 : left, mark(right, guess, guess.slot === 0))
  }
  const winning = guesses.find((guess) => guess.id === winner)
  items.splice(at, 0, {
    kind: 'card',
    song: revealed,
    isNew: kept,
    ghost: !kept,
    mark: winning ? mark(true, winning, false) : undefined,
  })
  return items.map((item, index) =>
    item.kind === 'card' && marks.has(index) ? { ...item, mark: marks.get(index) } : item,
  )
}
