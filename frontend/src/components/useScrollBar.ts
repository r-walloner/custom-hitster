import { useLayoutEffect, useState } from 'react'
import type { RefObject } from 'react'

export interface ScrollBar {
  /** The content is longer than the box. */
  overflows: boolean
  /** How much of the content shows, from 0 to 1: the thumb's length. */
  share: number
  /** Where the part that shows starts, from 0 to 1: the thumb's offset. */
  start: number
}

/**
 * How far a scrolling box's content reaches along one axis, for drawing the design's own scroll
 * bar instead of the browser's (which some systems hide until hovered). Measured again when the
 * box scrolls, changes size or gets other children.
 */
export function useScrollBar(box: RefObject<HTMLElement | null>, axis: 'x' | 'y'): ScrollBar {
  const [bar, setBar] = useState<ScrollBar>({ overflows: false, share: 1, start: 0 })

  useLayoutEffect(() => {
    const element = box.current
    if (!element) return
    const measure = () => {
      const size = axis === 'x' ? element.clientWidth : element.clientHeight
      const total = axis === 'x' ? element.scrollWidth : element.scrollHeight
      const offset = axis === 'x' ? element.scrollLeft : element.scrollTop
      setBar({ overflows: total > size + 1, share: size / total, start: offset / total })
    }
    measure()
    const resized = new ResizeObserver(measure)
    resized.observe(element)
    const changed = new MutationObserver(measure)
    changed.observe(element, { childList: true })
    element.addEventListener('scroll', measure, { passive: true })
    return () => {
      resized.disconnect()
      changed.disconnect()
      element.removeEventListener('scroll', measure)
    }
  }, [box, axis])

  return bar
}
