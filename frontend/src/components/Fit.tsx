import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { Outlet } from 'react-router'
import { Logo } from './Logo.tsx'

// The design size: a landscape phone.
const DESIGN_W = 844
const DESIGN_H = 390

function measure() {
  const width = window.innerWidth
  const height = window.innerHeight
  // Scale so the design fits both ways, then give the screen whatever room is left over in design
  // pixels: never smaller than 844 × 390, and a wider phone gets a wider middle.
  const zoom = Math.min(width / DESIGN_W, height / DESIGN_H)
  return { zoom, width: Math.floor(width / zoom), height: Math.floor(height / zoom) }
}

/** Fits every screen to the viewport, and asks portrait phones to rotate. */
export function Fit() {
  const [size, setSize] = useState(measure)

  useEffect(() => {
    const update = () => setSize(measure())
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const style = {
    zoom: size.zoom,
    '--screen-w': `${size.width}px`,
    '--screen-h': `${size.height}px`,
  } as CSSProperties

  return (
    <div className="app-fit">
      <div className="app-fit__stage" style={style}>
        <Outlet />
      </div>
      <div className="app-rotate">
        <Logo size="xl" />
        <p className="jm-headline">Turn your phone sideways.</p>
        <p className="jm-meta">Jamster is played in landscape.</p>
      </div>
    </div>
  )
}
