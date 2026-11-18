import { useCallback, useState } from 'react'
import type { ReactNode } from 'react'
import { Navigate, useParams } from 'react-router'
import type { Me } from '../../api/http.ts'
import { useMe } from '../../api/useMe.ts'
import { useRoom } from '../../api/useRoom.ts'
import { Button } from '../../components/Button.tsx'
import { Overlay } from '../../components/Dialog.tsx'
import { Waiting } from '../../components/Waiting.tsx'
import Dealing from '../dealing/Dealing.tsx'
import Game from '../game/Game.tsx'
import GameMenu from '../game/GameMenu.tsx'
import Standings from '../game/Standings.tsx'
import AddPlayer from '../lobby/AddPlayer.tsx'
import GuestLobby from '../lobby/GuestLobby.tsx'
import JoinName from '../lobby/JoinName.tsx'
import Lobby from '../lobby/Lobby.tsx'
import Playback from '../playback/Playback.tsx'
import Settings from '../settings/Settings.tsx'
import Winner from '../winner/Winner.tsx'
import { RoomToast } from './components/RoomToast.tsx'
import type { Flash } from './components/RoomToast.tsx'
import { RoomContext } from './context.ts'
import type { DialogName, RoomTools, Subscreen } from './context.ts'
import Reconnecting from './Reconnecting.tsx'
import RoomClosed from './RoomClosed.tsx'
import RoomNotFound from './RoomNotFound.tsx'
import { allowedView, pickScreen } from './screen.ts'
import type { ScreenKind } from './screen.ts'
import { seatHelpers } from './seats.ts'
import { usePresence } from './usePresence.ts'

/** `/room/:code`: the live room. The room's state picks the screen; nothing else is in the URL. */
export default function Room() {
  const { code = '' } = useParams()
  // Fetching /api/me first also sets the session cookie the socket is identified by.
  const { me, failed } = useMe()

  if (failed) return <Waiting text="The server can't be reached. Reload to try again." />
  if (!me) return <Waiting text="Loading…" />
  return <Connected code={code.toUpperCase()} me={me} />
}

const SCREENS: Record<ScreenKind, () => ReactNode> = {
  join: () => <JoinName />,
  lobby: () => <Lobby />,
  guest: () => <GuestLobby />,
  dealing: () => <Dealing />,
  game: () => <Game />,
  winner: () => <Winner />,
}

function Connected({ code, me }: { code: string; me: Me }) {
  const room = useRoom(code)
  const { state, connection, notice, dismissNotice, send } = room
  const [view, setView] = useState<Subscreen | DialogName | null>(null)
  const [flash, setFlash] = useState<Flash | null>(null)
  const endFlash = useCallback(() => setFlash(null), [])
  usePresence(state, (seat, key) =>
    setFlash({
      tone: 'heads-up',
      text: `${seat.name} is away. The seat is kept for them.`,
      id: `drop-${key}`,
    }),
  )

  if (connection === 'not_found') return <RoomNotFound code={code} />
  if (connection === 'left' || (connection === 'closed' && state?.you.is_host)) {
    return <Navigate to="/" replace />
  }
  if (connection === 'closed') {
    const host = state?.room.players.find((seat) => seat.is_host)?.name
    return <RoomClosed code={code} host={host} />
  }
  if (!state) {
    if (connection === 'failed') {
      return (
        <Waiting text="Couldn't reach the room.">
          <Button variant="primary" onClick={() => location.reload()}>
            Reload
          </Button>
        </Waiting>
      )
    }
    return <Waiting text={`Joining room ${code}…`} />
  }

  const kind = pickScreen(state)
  const shown = allowedView(kind, view)

  const tools: RoomTools = {
    me,
    state,
    room: state.room,
    you: state.you,
    send,
    devices: room.devices,
    playbackTest: room.playbackTest,
    songStart: room.songStart,
    ...seatHelpers(state),
    open: setView,
    close: () => setView(null),
    toast: (tone, text) => setFlash({ tone, text, id: `${Date.now()}` }),
  }

  let screen = SCREENS[kind]()
  if (shown === 'settings') screen = <Settings />
  if (shown === 'playback') screen = <Playback />

  let dialog: ReactNode = null
  if (shown === 'addPlayer') dialog = <AddPlayer />
  if (shown === 'menu') dialog = <GameMenu />
  if (shown === 'scoreboard') dialog = <Standings />
  if (connection === 'connecting' || connection === 'failed') {
    dialog = <Reconnecting failed={connection === 'failed'} attempt={room.attempt} />
  }

  return (
    <RoomContext value={tools}>
      <div className="app-room">
        <Overlay under={screen}>{dialog}</Overlay>
        <RoomToast
          flash={flash}
          onFlashDone={endFlash}
          notice={notice}
          onNoticeDone={dismissNotice}
          inGame={kind === 'game'}
        />
      </div>
    </RoomContext>
  )
}
