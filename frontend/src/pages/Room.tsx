import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useParams } from 'react-router'
import { getMe } from '../api.ts'
import type { Me } from '../api.ts'
import { Button } from '../components/Button.tsx'
import { Overlay } from '../components/Dialog.tsx'
import type { IconName } from '../components/Icon.tsx'
import { Toast, ToastDock } from '../components/Toast.tsx'
import { RoomContext, helpers } from '../room.ts'
import type { DialogName, RoomTools, Subscreen, ToastTone } from '../room.ts'
import { useRoom } from '../useRoom.ts'
import AddPlayer from './AddPlayer.tsx'
import Dealing from './Dealing.tsx'
import Game from './game/Game.tsx'
import GameMenu from './game/GameMenu.tsx'
import Reconnecting from './game/Reconnecting.tsx'
import Standings from './game/Standings.tsx'
import GuestLobby from './GuestLobby.tsx'
import JoinName from './JoinName.tsx'
import Lobby from './Lobby.tsx'
import Playback from './Playback.tsx'
import RoomNotFound from './RoomNotFound.tsx'
import Settings from './Settings.tsx'
import { Waiting } from './Waiting.tsx'
import Winner from './Winner.tsx'

const TOAST_MS = 4000

/** `/room/:code`: the live room. The room's state picks the screen; nothing else is in the URL. */
export default function Room() {
  const { code = '' } = useParams()
  const [me, setMe] = useState<Me | null>(null)
  const [failed, setFailed] = useState(false)

  // Fetching /api/me first also sets the session cookie the socket is identified by.
  useEffect(() => {
    getMe().then(setMe, () => setFailed(true))
  }, [])

  if (failed) return <Waiting text="The server can't be reached. Reload to try again." />
  if (!me) return <Waiting text="Loading…" />
  return <Connected code={code.toUpperCase()} me={me} />
}

type Kind = 'join' | 'lobby' | 'guest' | 'dealing' | 'game' | 'winner'

// The sub-screens and pop-ups each screen can open.
const VIEWS: Record<Kind, (Subscreen | DialogName)[]> = {
  join: [],
  lobby: ['settings', 'speaker', 'addPlayer'],
  guest: ['speaker'],
  dealing: [],
  game: ['speaker', 'menu', 'scoreboard'],
  winner: [],
}

interface Flash {
  tone: ToastTone
  text: string
  /** Tells two toasts with the same words apart, so the second one shows its full time. */
  id: string
}

const ICONS: Record<ToastTone, IconName> = { right: 'check', wrong: 'pass', 'heads-up': 'info' }

function Connected({ code, me }: { code: string; me: Me }) {
  const room = useRoom(code)
  const { state, connection, notice, dismissNotice, send } = room
  const [view, setView] = useState<Subscreen | DialogName | null>(null)
  const [flash, setFlash] = useState<Flash | null>(null)
  // Who was online in the last state, and who this browser has ever seen online.
  const [online, setOnline] = useState({ key: '', ids: [] as string[], seen: new Set<string>() })

  const connected = state?.room.players.filter((p) => p.connected).map((p) => p.id) ?? []
  const key = connected.join(',')
  if (state && online.key !== key) {
    const seen = new Set([...online.seen, ...connected])
    setOnline({ key, ids: connected, seen })
    const dropped = online.ids.filter(
      (id) => !connected.includes(id) && id !== state.you.player_id,
    )
    const seat = state.room.players.find((p) => p.id === dropped[0])
    if (state.room.game && seat) {
      setFlash({
        tone: 'heads-up',
        text: `${seat.name}'s connection dropped. The seat is safe.`,
        id: `drop-${key}`,
      })
    }
  }

  useEffect(() => {
    if (!flash) return
    const timer = window.setTimeout(() => setFlash(null), TOAST_MS)
    return () => window.clearTimeout(timer)
  }, [flash])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(dismissNotice, TOAST_MS)
    return () => window.clearTimeout(timer)
  }, [notice, dismissNotice])

  if (connection === 'not_found') return <RoomNotFound code={code} />
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

  const { game, deck } = state.room
  const kind: Kind =
    game?.phase === 'finished'
      ? 'winner'
      : game
        ? 'game'
        : deck.status === 'dealing'
          ? 'dealing'
          : !state.you.player_id
            ? 'join'
            : state.you.is_host
              ? 'lobby'
              : 'guest'
  // A sub-screen or pop-up of another screen (the game ended under the menu, say) is dropped.
  const shown = view && VIEWS[kind].includes(view) ? view : null

  const tools: RoomTools = {
    me,
    state,
    room: state.room,
    you: state.you,
    send,
    devices: room.devices,
    playbackTest: room.playbackTest,
    songStart: room.songStart,
    ...helpers(state, online.seen),
    open: setView,
    close: () => setView(null),
    toast: (tone, text) => setFlash({ tone, text, id: `${Date.now()}` }),
  }

  const screens: Record<Kind, ReactNode> = {
    join: <JoinName />,
    lobby: <Lobby />,
    guest: <GuestLobby />,
    dealing: <Dealing />,
    game: <Game />,
    winner: <Winner />,
  }
  let screen = screens[kind]
  if (shown === 'settings') screen = <Settings />
  if (shown === 'speaker') screen = <Playback />

  let dialog: ReactNode = null
  if (shown === 'addPlayer') dialog = <AddPlayer />
  if (shown === 'menu') dialog = <GameMenu />
  if (shown === 'scoreboard') dialog = <Standings />
  if (connection === 'connecting' || connection === 'failed') {
    dialog = <Reconnecting failed={connection === 'failed'} attempt={room.attempt} />
  }

  // One toast at a time: what just happened first, then music that didn't start.
  const failure = game && state.room.playback.failures[0]
  let toast: ReactNode = null
  if (flash) {
    toast = (
      <Toast key={flash.id} tone={flash.tone} icon={ICONS[flash.tone]}>
        {flash.text}
      </Toast>
    )
  } else if (notice) {
    toast = (
      <Toast tone={notice.ok ? 'right' : 'wrong'} icon={notice.ok ? 'check' : 'pass'}>
        {notice.text}
      </Toast>
    )
  } else if (failure && state.room.playback.status === 'failed' && kind === 'game') {
    const whose =
      failure.player_id === state.you.player_id ? 'Your' : `${tools.name(failure.player_id)}'s`
    toast = (
      <Toast
        tone="wrong"
        icon="speakerOff"
        alert
        action={
          <Button variant="primary" onClick={() => send({ type: 'retry_playback' })}>
            Retry
          </Button>
        }
      >
        {whose} music didn't start. {failure.message}
      </Toast>
    )
  }

  return (
    <RoomContext value={tools}>
      <div className="app-room">
        <Overlay under={screen}>{dialog}</Overlay>
        {toast && <ToastDock>{toast}</ToastDock>}
      </div>
    </RoomContext>
  )
}
