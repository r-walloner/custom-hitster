import type { ReactNode } from 'react'
import { RoomCode } from './Button.tsx'
import { Logo } from './Logo.tsx'
import { Header, RoomMeta, Spacer } from './Screen.tsx'

interface InfoHeaderProps {
  code: string
  /** The host's name; "The room" without one. */
  host?: string
  players: number
  toWin: number
  /** Replaces "First to 10" at the end. */
  last?: ReactNode
}

/**
 * A header with the logo, a room code and a line of facts on the right:
 * "Mara's room · 4 players · First to 10".
 */
export function InfoHeader({ code, host, players, toWin, last }: InfoHeaderProps) {
  return (
    <Header>
      <Logo />
      <RoomCode code={code} />
      <Spacer />
      <RoomMeta host={host ?? 'The'} players={players} toWin={toWin} last={last} />
    </Header>
  )
}
