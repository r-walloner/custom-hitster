import { createContext, useContext } from 'react'

/**
 * Where the desktop layouts take over from the zoomed phone: a hard switch, never a blend. The
 * height matters too, since the desktop game screen needs about 640px to fit.
 */
export const DESKTOP_QUERY = '(min-width: 1200px) and (min-height: 640px)'

// The design size: a landscape phone.
const DESIGN_W = 844
const DESIGN_H = 390

/** The frame for this window: desktop or not, the zoom, and the screen size in design pixels. */
export function measureFrame() {
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
  return {
    desktop: false,
    zoom,
    width: Math.floor(width / zoom),
    height: Math.floor(height / zoom),
  }
}

/** Is the desktop layout showing? Provided by `AppFrame`. */
export const DesktopContext = createContext(false)

/**
 * For the few things placed in script rather than CSS (the cover art); everything else switches
 * on the `.jm-desktop` root class.
 */
export function useDesktop(): boolean {
  return useContext(DesktopContext)
}
