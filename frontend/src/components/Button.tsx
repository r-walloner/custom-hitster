import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router'
import { Icon } from './Icon.tsx'

type Variant = 'primary' | 'secondary' | 'dark' | 'bare'
type Size = 'md' | 'xl' | 'lg' | 'next' | 'icon' | 'icon-sm'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  /** A toggle: sets aria-pressed, and a pressed toggle shows a ✓ before its label. */
  pressed?: boolean
  /** Navigate instead of acting: renders a link that looks the same. */
  to?: string
  /** Like `to`, but a full page load (the Spotify sign-in goes through the server). */
  href?: string
}

function buttonClasses(variant: Variant = 'secondary', size: Size = 'md', toggle = false) {
  return [
    'jm-btn',
    variant !== 'secondary' && `jm-btn--${variant}`,
    size !== 'md' && `jm-btn--${size}`,
    toggle && 'jm-btn--toggle',
  ]
    .filter(Boolean)
    .join(' ')
}

/** The pill button. Coral (`primary`) only for the one thing to do now. */
export function Button({
  variant,
  size,
  pressed,
  to,
  href,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  const toggle = pressed !== undefined
  const classes = [buttonClasses(variant, size, toggle), className].filter(Boolean).join(' ')
  const content = (
    <>
      {pressed && <Icon name="check" />}
      {children}
    </>
  )
  if (href !== undefined) {
    return (
      <a href={href} className={classes} aria-label={rest['aria-label']} style={rest.style}>
        {content}
      </a>
    )
  }
  if (to !== undefined) {
    return (
      <Link
        to={to}
        className={classes}
        aria-label={rest['aria-label']}
        aria-disabled={rest.disabled || undefined}
        style={rest.style}
      >
        {content}
      </Link>
    )
  }
  return (
    <button type={type} className={classes} aria-pressed={toggle ? pressed : undefined} {...rest}>
      {content}
    </button>
  )
}

/** Two equal buttons side by side: Back / Take a seat, Skip song / Buy a card. */
export function ButtonPair({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={['jm-pair', className].filter(Boolean).join(' ')}>{children}</div>
}

/** The token coin and a number: `<Token>3</Token>`, `<Token>+1</Token>`. */
export function Token({ children }: { children: ReactNode }) {
  return <span className="jm-token">{children}</span>
}

/** Read-only state where a button was: Challenged, Guessing… (ink), Passed (quiet). */
export function Status({ children, quiet }: { children: ReactNode; quiet?: boolean }) {
  return <span className={quiet ? 'jm-status jm-status--quiet' : 'jm-status'}>{children}</span>
}

/** The room code in the header. Not a button. */
export function RoomCode({ code }: { code: string }) {
  return (
    <span className="jm-chip" aria-label={`Room code ${code}`}>
      {code}
    </span>
  )
}
