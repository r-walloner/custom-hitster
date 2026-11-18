import type { ReactNode } from 'react'
import { Button } from './Button.tsx'
import { Icon } from './Icon.tsx'
import { Header, Spacer } from './Screen.tsx'

/** A sub-screen's header: a back arrow instead of the logo, the screen's name, its action on the right. */
export function SubHeader({
  onBack,
  backLabel,
  title,
  children,
}: {
  onBack: () => void
  /** "Back to the lobby", "Back to the game". */
  backLabel: string
  title: string
  children?: ReactNode
}) {
  return (
    <Header>
      <Button onClick={onBack} size="icon" aria-label={backLabel}>
        <Icon name="back" />
      </Button>
      <h1 className="jm-headline">{title}</h1>
      <Spacer />
      {children}
    </Header>
  )
}
