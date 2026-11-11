import { useCallback, useEffect, useRef, useState } from 'react'
import type { ClientMessage, Device, ServerMessage, StateMessage } from './messages.ts'

// Close codes sent by the backend (web.py).
const NO_SESSION = 4401
const NO_SUCH_ROOM = 4404
const RECONNECT_MS = 1000

export type Connection = 'connecting' | 'open' | 'not_found'

export interface Notice {
  ok: boolean
  text: string
}

/** The live connection to one room: the latest state from the server, and a way to send. */
export function useRoom(code: string) {
  const [state, setState] = useState<StateMessage | null>(null)
  const [connection, setConnection] = useState<Connection>('connecting')
  const [devices, setDevices] = useState<Device[] | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const socket = useRef<WebSocket | null>(null)

  useEffect(() => {
    let stopped = false
    let retry: number | undefined

    const connect = () => {
      const scheme = location.protocol === 'https:' ? 'wss' : 'ws'
      const ws = new WebSocket(`${scheme}://${location.host}/ws/rooms/${code}`)
      socket.current = ws
      ws.onopen = () => setConnection('open')
      ws.onmessage = (event) => {
        const message = JSON.parse(event.data) as ServerMessage
        if (message.type === 'state') setState(message)
        else if (message.type === 'devices') setDevices(message.devices)
        else if (message.type === 'error') setNotice({ ok: false, text: message.message })
        else setNotice({ ok: message.ok, text: message.message })
      }
      ws.onclose = (event) => {
        if (stopped) return
        if (event.code === NO_SUCH_ROOM) return setConnection('not_found')
        // A missing session cookie is fixed by loading the page again.
        if (event.code === NO_SESSION) return location.reload()
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

  const closeDevices = useCallback(() => setDevices(null), [])
  const dismissNotice = useCallback(() => setNotice(null), [])

  return { state, connection, devices, closeDevices, notice, dismissNotice, send }
}
