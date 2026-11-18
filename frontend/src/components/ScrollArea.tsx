import { useRef } from 'react'
import type { HTMLAttributes } from 'react'
import { useScrollBar } from './useScrollBar.ts'

/**
 * A box that scrolls up and down, with the design's own bar beside it (sand track, ink thumb, the
 * timeline's look) instead of the browser's. `className` styles the outer box; the other props go
 * to the scrolling one.
 */
export function ScrollArea({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  const box = useRef<HTMLDivElement>(null)
  const bar = useScrollBar(box, 'y')
  return (
    <div className={['app-scroll', className].filter(Boolean).join(' ')}>
      <div ref={box} className="app-scroll__box" {...rest}>
        {children}
      </div>
      {bar.overflows && (
        <div className="app-scroll__bar" aria-hidden="true">
          <span style={{ height: `${bar.share * 100}%`, top: `${bar.start * 100}%` }} />
        </div>
      )}
    </div>
  )
}
