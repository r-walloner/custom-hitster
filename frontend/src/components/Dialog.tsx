import { Children, useId } from 'react'
import type { ReactNode } from 'react'
import { Button } from './Button.tsx'
import { Icon } from './Icon.tsx'

/**
 * A pop-up over the dimmed screen. The screen behind keeps running and stays visible. Without a
 * pop-up it shows the screen alone, so opening and closing one never remounts the screen.
 */
export function Overlay({ under, children }: { under: ReactNode; children?: ReactNode }) {
  // Several optional pop-ups (`{a && <A />}{b && <B />}`) arrive as an array, which is truthy
  // even when every one is closed; count what would actually render.
  const open = Children.toArray(children).length > 0
  return (
    <div className="jm-overlay app-overlay">
      {/* Keeps the screen in its own layer, so its raised parts can't show through the scrim. */}
      <div className="jm-overlay__under">{under}</div>
      {open && (
        <>
          <div className="jm-scrim" />
          {children}
        </>
      )}
    </div>
  )
}

interface DialogProps {
  title: ReactNode
  /** What the close ✕ does. Left out on alerts, which have no ✕. */
  onClose?: () => void
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
  onClose,
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
          {onClose !== undefined && !alert && (
            <Button onClick={onClose} variant="bare" size="icon" aria-label={closeLabel}>
              <Icon name="close" />
            </Button>
          )}
        </div>
      )}
      {children}
    </section>
  )
}
