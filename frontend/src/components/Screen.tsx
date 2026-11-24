import { Children, Fragment } from 'react'
import type { ReactNode } from 'react'

/** The frame every screen sits in: the 844 × 390 design, fitted to the viewport by `AppFrame`. */
export function Screen({ className, children }: { className?: string; children: ReactNode }) {
  return <main className={['jm-screen', className].filter(Boolean).join(' ')}>{children}</main>
}

/** The 44px row at the top of every screen. Compose it from Logo, RoomCode, HeaderMeta, Spacer, buttons. */
export function Header({ children }: { children: ReactNode }) {
  return <header className="jm-header">{children}</header>
}

export function Spacer() {
  return <span className="jm-header__spacer" />
}

/**
 * The one line of where you are: "Mara's room · 4 players · First to 10". Pass each part as a
 * child; the dots go between them. These are the only middle dots in the app.
 */
export function HeaderMeta({ children }: { children: ReactNode }) {
  const parts = Children.toArray(children)
  return (
    <span className="jm-header__meta">
      {parts.map((part, index) => (
        <Fragment key={index}>
          {index > 0 && <i />}
          {part}
        </Fragment>
      ))}
    </span>
  )
}

/** The header line outside the game. */
export function RoomMeta({
  host,
  players,
  toWin,
  last,
}: {
  host: string
  players: number
  toWin: number
  last?: ReactNode
}) {
  return (
    <HeaderMeta>
      <span>{host}'s room</span>
      <span>
        <b>{players}</b> {players === 1 ? 'player' : 'players'}
      </span>
      {last ?? (
        <span>
          First to <b>{toWin}</b>
        </span>
      )}
    </HeaderMeta>
  )
}
