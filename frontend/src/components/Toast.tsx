import type { ReactNode } from 'react'
import { Icon } from './Icon.tsx'
import type { IconName } from './Icon.tsx'

interface ToastProps {
  /** right: it worked; wrong: refused or failed; heads-up: neither. */
  tone: 'right' | 'wrong' | 'heads-up'
  icon: IconName
  /** At most one button, one word, primary. */
  action?: ReactNode
  /** A failure that needs an action: role="alert" instead of "status". */
  alert?: boolean
  children: ReactNode
}

const BADGE = { right: 'jm-toast__badge--right', wrong: 'jm-toast__badge--wrong', 'heads-up': '' }

/** One line of feedback after an action: what happened, then one short fact. */
export function Toast({ tone, icon, action, alert, children }: ToastProps) {
  return (
    <div
      className={action ? 'jm-toast jm-toast--action' : 'jm-toast'}
      role={alert ? 'alert' : 'status'}
    >
      <span className={['jm-toast__badge', BADGE[tone]].filter(Boolean).join(' ')}>
        <Icon name={icon} />
      </span>
      <span className="jm-toast__text">{children}</span>
      {action}
    </div>
  )
}

/** Puts a toast at the bottom centre of the screen it's in, above the board. */
export function ToastDock({ children }: { children: ReactNode }) {
  return <div className="app-toast-dock">{children}</div>
}
