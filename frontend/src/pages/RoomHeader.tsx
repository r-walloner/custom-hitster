import type { ReactNode } from 'react'
import { RoomCode } from '../components/Button.tsx'
import { Logo } from '../components/Logo.tsx'
import { Header, RoomMeta, Spacer } from '../components/Screen.tsx'
import { useRoomTools } from '../room.ts'

/** The header around the game: logo, room code, and "Mara's room · 4 players · First to 10". */
export function RoomHeader({ code = true, last }: { code?: boolean; last?: ReactNode }) {
  const { room, host } = useRoomTools()
  return (
    <Header>
      <Logo />
      {code && <RoomCode code={room.code} />}
      <Spacer />
      <RoomMeta
        host={host?.name ?? 'The'}
        players={room.players.length}
        toWin={room.settings.cards_to_win}
        last={last}
      />
    </Header>
  )
}
