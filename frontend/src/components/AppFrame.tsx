import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { Outlet } from 'react-router'
import { FullScreenPrompt } from './FullScreenPrompt.tsx'
import { DesktopContext, measureFrame } from './useDesktop.ts'
import { useFullScreen } from './useFullScreen.ts'

/**
 * Fits every screen to the viewport: the phone design zoomed to fit, or the desktop layouts in a
 * large window (`.jm-desktop`). Asks portrait phones to rotate, and every phone to play full
 * screen.
 */
export function AppFrame() {
  const [size, setSize] = useState(measureFrame)
  const fullScreen = useFullScreen()

  useEffect(() => {
    const update = () => setSize(measureFrame())
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // Over every screen, sideways and upright (only one of the two shows), until the app is full
  // screen or installed.
  const prompt = fullScreen.offer && (
    <FullScreenPrompt
      offer={fullScreen.offer}
      onFullScreen={fullScreen.enter}
      onClose={fullScreen.dismiss}
    />
  )

  const style = {
    zoom: size.desktop ? undefined : size.zoom,
    '--screen-w': `${size.width}px`,
    '--screen-h': `${size.height}px`,
  } as CSSProperties

  return (
    <DesktopContext value={size.desktop}>
      <div className={size.desktop ? 'app-frame jm-desktop' : 'app-frame'}>
        <div className="app-frame__stage" style={style}>
          <Outlet />
          {prompt}
        </div>
        <div className="app-rotate">
          <p className="jm-headline app-full-screen__text">Turn your phone sideways.</p>
          {prompt}
        </div>
      </div>
    </DesktopContext>
  )
}
