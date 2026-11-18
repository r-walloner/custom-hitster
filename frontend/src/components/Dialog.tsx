import { useId } from 'react'
import type { ReactNode } from 'react'
import { Button } from './Button.tsx'
import { Icon } from './Icon.tsx'

/** A pop-up over the dimmed screen. The screen behind keeps running and stays visible. */
export function Overlay({ under, children }: { under: ReactNode; children: ReactNode }) {
  return (
    <div className="jm-overlay app-overlay">
      {/* Keeps the screen in its own layer, so its raised parts can't show through the scrim. */}
      <div className="jm-overlay__under">{under}</div>
      <div className="jm-scrim" />
      {children}
    </div>
  )
}

interface DialogProps {
  title: ReactNode
  /** Where the close ✕ goes. Left out on alerts, which have no ✕. */
  closeTo?: string
  closeLabel?: string
  /** Fills the screen but a margin: for content that needs room (the scoreboard). */
  wide?: boolean
  /** Blocks the game (reconnecting): `alertdialog`, no ✕. */
  alert?: boolean
  /** Extra things in the head row, between the title and the ✕. */
  headExtra?: ReactNode
  /** Replaces the whole head row (the title must then carry `titleId`). */
  head?: (titleId: string) => ReactNode
  className?: string
  children: ReactNode
}

export function Dialog({
  title,
  closeTo,
  closeLabel = 'Close',
  wide,
  alert,
  headExtra,
  head,
  className,
  children,
}: DialogProps) {
  const titleId = useId()
  const classes = ['jm-dialog', wide && 'jm-dialog--wide', className].filter(Boolean).join(' ')
  return (
    <section
      className={classes}
      role={alert ? 'alertdialog' : 'dialog'}
      aria-modal="true"
      aria-labelledby={titleId}
    >
      {head ? (
        head(titleId)
      ) : (
        <div className="jm-dialog__head">
          <h1 id={titleId} className="jm-headline">
            {title}
          </h1>
          {headExtra}
          {closeTo !== undefined && !alert && (
            <Button to={closeTo} variant="bare" size="icon" aria-label={closeLabel}>
              <Icon name="close" />
            </Button>
          )}
        </div>
      )}
      {children}
    </section>
  )
}
