import type { ReactNode } from 'react'
import { Logo } from '../components/Logo.tsx'
import { Screen } from '../components/Screen.tsx'

/** The logo and one line, while there's nothing else to show. */
export function Waiting({ text, children }: { text: string; children?: ReactNode }) {
  return (
    <Screen>
      <div className="app-waiting">
        <Logo size="xl" />
        <p className="jm-meta" role="status">
          {text}
        </p>
        {children}
      </div>
    </Screen>
  )
}
