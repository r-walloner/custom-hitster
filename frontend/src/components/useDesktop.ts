import { createContext, useContext } from 'react'

/**
 * Where the desktop layouts take over from the zoomed phone: a hard switch, never a blend. The
 * height matters too, since the desktop game screen needs about 640px to fit.
 */
export const DESKTOP_QUERY = '(min-width: 1200px) and (min-height: 640px)'

/** Is the desktop layout showing? Provided by `AppFrame`. */
export const DesktopContext = createContext(false)

/**
 * For the few things placed in script rather than CSS (the cover art); everything else switches
 * on the `.jm-desktop` root class.
 */
export function useDesktop(): boolean {
  return useContext(DesktopContext)
}
