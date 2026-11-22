import { useLayoutEffect, useState } from 'react'
import type { RefObject } from 'react'

export interface Size {
  width: number
  height: number
}

/** A box's inner size in its own CSS pixels (unaffected by the phone layout's zoom); null until measured. */
export function useSize(box: RefObject<HTMLElement | null>): Size | null {
  const [size, setSize] = useState<Size | null>(null)

  useLayoutEffect(() => {
    const element = box.current
    if (!element) return
    const measure = () => {
      const width = element.clientWidth
      const height = element.clientHeight
      setSize((old) => (old?.width === width && old.height === height ? old : { width, height }))
    }
    measure()
    const resized = new ResizeObserver(measure)
    resized.observe(element)
    return () => resized.disconnect()
  }, [box])

  return size
}
