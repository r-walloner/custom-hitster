import { useCallback, useEffect, useRef, useState } from 'react'
import type { ClientMessage, Device, ServerMessage, StateMessage } from './messages.ts'

// Close codes sent by the backend (web.py).
const NO_SESSION = 4401
const NO_SUCH_ROOM = 4404
const RECONNECT_MS = 1000
/** After this many failed reconnects in a row, stop and offer a reload. */
const MAX_ATTEMPTS = 10

export type Connection = 'connecting' | 'open' | 'not_found' | 'failed'

export interface Notice {
  ok: boolean
  text: string
}

/** The answer to `test_playback`: whether the test song started. */
export interface PlaybackTest {
  ok: boolean
  message: string
}

/** The live connection to one room: the latest state from the server, and a way to send. */
export function useRoom(code: string) {
  const [state, setState] = useState<StateMessage | null>(null)
  const [connection, setConnection] = useState<Connection>('connecting')
  const [attempt, setAttempt] = useState(0)
  const [devices, setDevices] = useState<Device[] | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [playbackTest, setPlaybackTest] = useState<PlaybackTest | null>(null)
  // When this browser saw the song in play start: every new song, and a restart, passes through
  // `starting`. The server doesn't say how far the song is (a backend TODO in README.md).
  const [songStart, setSongStart] = useState(() => Date.now())
  const socket = useRef<WebSocket | null>(null)

  useEffect(() => {
    let stopped = false
    let retry: number | undefined
    let failures = 0
    let playback = ''

    const connect = () => {
      const scheme = location.protocol === 'https:' ? 'wss' : 'ws'
      const ws = new WebSocket(`${scheme}://${location.host}/ws/rooms/${code}`)
      socket.current = ws
      ws.onopen = () => {
        failures = 0
        setAttempt(0)
        setConnection('open')
      }
      ws.onmessage = (event) => {
        const message = JSON.parse(event.data) as ServerMessage
        if (message.type === 'state') {
          const status = message.room.playback.status
          if (status === 'starting' && playback !== 'starting') setSongStart(Date.now())
          playback = status
          setState(message)
        }
        else if (message.type === 'devices') setDevices(message.devices)
        else if (message.type === 'error') setNotice({ ok: false, text: message.message })
        else setPlaybackTest({ ok: message.ok, message: message.message })
      }
      ws.onclose = (event) => {
        if (stopped) return
        if (event.code === NO_SUCH_ROOM) return setConnection('not_found')
        // A missing session cookie is fixed by loading the page again.
        if (event.code === NO_SESSION) return location.reload()
        failures += 1
        setAttempt(failures)
        if (failures >= MAX_ATTEMPTS) return setConnection('failed')
        setConnection('connecting')
        retry = window.setTimeout(connect, RECONNECT_MS)
      }
    }

    connect()
    return () => {
      stopped = true
      window.clearTimeout(retry)
      socket.current?.close()
    }
  }, [code])

  const send = useCallback((message: ClientMessage) => {
    if (socket.current?.readyState === WebSocket.OPEN) socket.current.send(JSON.stringify(message))
    else setNotice({ ok: false, text: 'Not connected. Reconnecting…' })
  }, [])

  const dismissNotice = useCallback(() => setNotice(null), [])

  return {
    state,
    connection,
    attempt,
    devices,
    notice,
    dismissNotice,
    playbackTest,
    songStart,
    send,
  }
}
