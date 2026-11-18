import { useEffect } from 'react'
import type { RefObject } from 'react'

/** Pixels per line and per page when the wheel reports in those units (Firefox with some mice). */
const LINE = 40

/**
 * Lets a plain mouse wheel scroll a sideways-scrolling box, which browsers otherwise only do with
 * Shift held. Only up-and-down wheel turns are turned sideways; a trackpad's own sideways swipe is
 * left to the browser. At either end the wheel goes back to scrolling the page.
 */
export function useWheelScrollsSideways(box: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const element = box.current
    if (!element) return
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return
      const room = element.scrollWidth - element.clientWidth
      if (room <= 1) return
      const unit =
        event.deltaMode === WheelEvent.DOM_DELTA_LINE
          ? LINE
          : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
            ? element.clientWidth
            : 1
      const delta = event.deltaY * unit
      const atStart = element.scrollLeft <= 0
      const atEnd = element.scrollLeft >= room - 1
      if ((delta < 0 && atStart) || (delta > 0 && atEnd)) return
      event.preventDefault()
      element.scrollLeft += delta
    }
    // Not passive, so the page doesn't scroll as well.
    element.addEventListener('wheel', onWheel, { passive: false })
    return () => element.removeEventListener('wheel', onWheel)
  }, [box])
}
