import type { ReactNode } from 'react'
import { RoomCode } from './Button.tsx'
import { Logo } from './Logo.tsx'
import { Header, RoomMeta, Spacer } from './Screen.tsx'

interface RoomHeaderProps {
  code: string
  /** The host's name; "The room" without one. */
  host?: string
  players: number
  toWin: number
  /** Replaces "First to 10" at the end. */
  last?: ReactNode
}

/** The header around the game: logo, room code, and "Mara's room · 4 players · First to 10". */
export function RoomHeader({ code, host, players, toWin, last }: RoomHeaderProps) {
  return (
    <Header>
      <Logo />
      <RoomCode code={code} />
      <Spacer />
      <RoomMeta host={host ?? 'The'} players={players} toWin={toWin} last={last} />
    </Header>
  )
}
