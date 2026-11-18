import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { BoardItem } from './boardItems.ts'
import { Gap, PickCard, SongCard } from './SongCard.tsx'

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
 * fixed width; when the row doesn't fit it scrolls sideways with a bar under it, and the pick being
 * placed is kept in view.
 */
export function Board({ owner, count, items, spaced, label }: BoardProps) {
  const row = useRef<HTMLDivElement>(null)
  const [scroll, setScroll] = useState({ overflows: false, share: 1, start: 0 })

  useLayoutEffect(() => {
    const element = row.current
    if (!element) return
    const measure = () => {
      const { scrollWidth, clientWidth, scrollLeft } = element
      setScroll({
        overflows: scrollWidth > clientWidth + 1,
        share: clientWidth / scrollWidth,
        start: scrollLeft / scrollWidth,
      })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    element.addEventListener('scroll', measure, { passive: true })
    return () => {
      observer.disconnect()
      element.removeEventListener('scroll', measure)
    }
  }, [items])

  // Keep the pick being placed in the middle when it moves.
  useEffect(() => {
    const element = row.current
    const pick = element?.querySelector<HTMLElement>('.jm-card--mystery:not(.jm-card--pick-done)')
    if (!element || !pick || element.scrollWidth <= element.clientWidth) return
    const target = pick.offsetLeft + pick.offsetWidth / 2 - element.clientWidth / 2
    element.scrollTo({ left: target, behavior: 'smooth' })
  }, [items])

  const hasMarks = items.some((item) => item.kind === 'card' && item.mark)
  const rowClasses = [
    'jm-board__row',
    scroll.overflows && 'jm-board__row--scroll',
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
        {items.map((item, index) => {
          switch (item.kind) {
            case 'card':
              return (
                <SongCard
                  key={`card-${item.song.year}-${item.song.title}`}
                  song={item.song}
                  isNew={item.isNew}
                  mark={item.mark}
                  onBefore={item.onBefore}
                  onAfter={item.onAfter}
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
