import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { Gap, PickCard, SongCard } from '../../../components/SongCard.tsx'
import type { Song } from '../../../components/types.ts'
import { useDesktop } from '../../../components/useDesktop.ts'
import { useScrollBar } from '../../../components/useScrollBar.ts'
import { withSlots } from '../board.ts'
import { useWheelScrollsSideways } from '../../../components/useWheelScrollsSideways.ts'
import './Board.css'

/** One thing on a board's row, left to right. */
export type BoardItem =
  | {
      kind: 'card'
      song: Song
      isNew?: boolean
      /** Shown where it belongs without being part of this timeline (a stolen or lost card). */
      ghost?: boolean
      mark?: ReactNode
    }
  | { kind: 'pick'; name: string; done?: boolean }
  | { kind: 'gap'; label: string; onPick: () => void }

interface BoardProps {
  /** Whose timeline: "Mara". */
  owner: string
  /** "4 of 10" */
  count: string
  items: BoardItem[]
  /** No gaps (challenge, reveal): the wider 10px rhythm. */
  spaced?: boolean
  /** Describes the board for screen readers; defaults to "<owner>'s timeline". */
  label?: string
}

/**
 * The active player's timeline, full width along the bottom, oldest on the left. Cards keep their
 * fixed width; when the row doesn't fit it scrolls sideways with a bar under it (the mouse wheel
 * scrolls it too), and the pick being placed is kept in view.
 */
export function Board({ owner, count, items, spaced, label }: BoardProps) {
  const row = useRef<HTMLDivElement>(null)
  // On desktop the row wraps instead of scrolling sideways; only a window too short for every row
  // scrolls it down.
  const desktop = useDesktop()
  const x = useScrollBar(row, 'x')
  const y = useScrollBar(row, 'y')
  const scroll = desktop ? { ...x, overflows: false } : x
  const tall = desktop && y.overflows
  useWheelScrollsSideways(row)

  // Keep the pick being placed in the middle when it moves: sideways on the phone, and up or down
  // on a desktop window too short for every row.
  useEffect(() => {
    const element = row.current
    const pick = element?.querySelector<HTMLElement>('.jm-card--mystery:not(.jm-card--pick-done)')
    if (!element || !pick) return
    if (!desktop && element.scrollWidth > element.clientWidth) {
      const left = pick.offsetLeft + pick.offsetWidth / 2 - element.clientWidth / 2
      element.scrollTo({ left, behavior: 'smooth' })
    } else if (desktop && element.scrollHeight > element.clientHeight + 1) {
      const box = element.getBoundingClientRect()
      const card = pick.getBoundingClientRect()
      const top = element.scrollTop + card.top - box.top + card.height / 2 - box.height / 2
      element.scrollTo({ top, behavior: 'smooth' })
    }
  }, [items, desktop])

  const hasMarks = items.some((item) => item.kind === 'card' && item.mark !== undefined)
  const rowClasses = [
    'jm-board__row',
    scroll.overflows && 'jm-board__row--scroll',
    tall && 'app-board__row--tall',
    spaced && 'app-board__row--spaced',
    hasMarks && 'app-board__row--marks',
  ]

  return (
    <section className="jm-board" aria-label={label ?? `${owner}'s timeline`}>
      <div className="jm-board__head">
        <h2 className="jm-section">{owner}'s timeline</h2>
        <span className="jm-meta app-board__count">{count}</span>
      </div>
      <div
        ref={row}
        className={rowClasses.filter(Boolean).join(' ')}
        tabIndex={scroll.overflows ? 0 : undefined}
        aria-label={scroll.overflows ? 'Timeline, scrolls sideways' : undefined}
      >
        {withSlots(items).map((item, index) => {
          switch (item.kind) {
            case 'slot':
              return <span key={`slot-${index}`} className="app-board__slot" aria-hidden="true" />
            case 'card':
              return (
                <SongCard
                  key={`card-${item.song.id ?? `${item.song.year}-${item.song.title}`}`}
                  song={item.song}
                  isNew={item.isNew}
                  className={item.ghost ? 'app-card--ghost' : undefined}
                  mark={item.mark}
                />
              )
            case 'pick':
              return <PickCard key={`pick-${item.name}`} name={item.name} done={item.done} />
            case 'gap':
              return <Gap key={`gap-${index}`} label={item.label} onClick={item.onPick} />
          }
        })}
      </div>
      {scroll.overflows && (
        <div className="jm-board__scrollbar" aria-hidden="true">
          <span style={{ width: `${scroll.share * 100}%`, left: `${scroll.start * 100}%` }} />
        </div>
      )}
    </section>
  )
}
