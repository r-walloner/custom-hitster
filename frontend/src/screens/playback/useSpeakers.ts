import { useEffect } from 'react'
import type { Device, Send } from '../../api/messages.ts'

/** Your speaker: asks for your Spotify devices when the screen opens, and picks one. */
export function useSpeakers(send: Send, onChosen?: () => void) {
  useEffect(() => {
    send({ type: 'get_devices' })
  }, [send])

  return {
    refresh: () => send({ type: 'get_devices' }),
    choose: (chosen: Device | null) => {
      send({ type: 'set_device', device_id: chosen?.id ?? null, name: chosen?.name ?? null })
      onChosen?.()
    },
  }
}
