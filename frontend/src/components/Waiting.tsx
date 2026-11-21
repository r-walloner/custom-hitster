import type { ReactNode } from 'react'
import { Logo } from './Logo.tsx'
import { Screen } from './Screen.tsx'

/**
 * The logo and one line, while there's nothing else to show. A `splash` is the brief wait before a
 * screen (loading, joining a room): only the logo shows, and the line is for screen readers.
 */
export function Waiting({
  text,
  splash = false,
  children,
}: {
  text: string
  splash?: boolean
  children?: ReactNode
}) {
  return (
    <Screen>
      <div className="app-waiting">
        <Logo size="xl" />
        <p className={splash ? 'app-sr-only' : 'jm-meta'} role="status">
          {text}
        </p>
        {children}
      </div>
    </Screen>
  )
}
