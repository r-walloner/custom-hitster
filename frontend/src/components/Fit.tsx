import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { Outlet } from 'react-router'
import { Logo } from './Logo.tsx'
import { DESKTOP_QUERY, DesktopContext } from './useDesktop.ts'

// The design size: a landscape phone.
const DESIGN_W = 844
const DESIGN_H = 390

function measure() {
  const width = window.innerWidth
  const height = window.innerHeight
  // A window at least 1200 × 640 gets the desktop layouts, at their own size: no zoom.
  if (window.matchMedia(DESKTOP_QUERY).matches) return { desktop: true, zoom: 1, width, height }
  // Scale so the design fits both ways, then give the screen whatever room is left over in design
  // pixels: never smaller than 844 × 390, and a wider phone gets a wider middle.
  const zoom = Math.min(width / DESIGN_W, height / DESIGN_H)
  // A narrow, tall window on a computer has nothing to turn sideways: the phone layout, zoomed to
  // the width, runs the full height, so its lists get longer. Portrait touch screens are asked to
  // turn instead (CSS).
  return { desktop: false, zoom, width: Math.floor(width / zoom), height: Math.floor(height / zoom) }
}

/**
 * Fits every screen to the viewport: the phone design zoomed to fit, or the desktop layouts in a
 * large window (`.jm-desktop`). Asks portrait phones to rotate.
 */
export function Fit() {
  const [size, setSize] = useState(measure)

  useEffect(() => {
    const update = () => setSize(measure())
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const style = {
    zoom: size.desktop ? undefined : size.zoom,
    '--screen-w': `${size.width}px`,
    '--screen-h': `${size.height}px`,
  } as CSSProperties

  return (
    <DesktopContext value={size.desktop}>
      <div className={size.desktop ? 'app-fit jm-desktop' : 'app-fit'}>
        <div className="app-fit__stage" style={style}>
          <Outlet />
        </div>
        <div className="app-rotate">
          <Logo size="xl" />
          <p className="jm-headline app-rotate__line">Turn your phone sideways.</p>
        </div>
      </div>
    </DesktopContext>
  )
}
