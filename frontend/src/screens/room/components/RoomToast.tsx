import { useEffect } from 'react'
import type { Notice } from '../../../api/useRoom.ts'
import { Button } from '../../../components/Button.tsx'
import type { IconName } from '../../../components/Icon.tsx'
import { Toast, ToastDock } from '../../../components/Toast.tsx'
import { useRoomTools } from '../context.ts'
import type { ToastTone } from '../context.ts'

/** How long a toast stays up. */
const TOAST_MS = 4000

/** Something that just happened on this device: a copied link, a dropped connection. */
export interface Flash {
  tone: ToastTone
  text: string
  /** Tells two toasts with the same words apart, so the second one shows its full time. */
  id: string
}

const ICONS: Record<ToastTone, IconName> = { right: 'check', wrong: 'pass', 'heads-up': 'info' }

interface RoomToastProps {
  flash: Flash | null
  onFlashDone: () => void
  /** The server's last refusal. */
  notice: Notice | null
  onNoticeDone: () => void
  /** Is the game screen showing? Playback failures only matter there. */
  inGame: boolean
}

/**
 * One toast at a time: what just happened on this device first, then the server's word, then
 * music that didn't start.
 */
export function RoomToast({ flash, onFlashDone, notice, onNoticeDone, inGame }: RoomToastProps) {
  const { room, you, name, send } = useRoomTools()

  useEffect(() => {
    if (!flash) return
    const timer = window.setTimeout(onFlashDone, TOAST_MS)
    return () => window.clearTimeout(timer)
  }, [flash, onFlashDone])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(onNoticeDone, TOAST_MS)
    return () => window.clearTimeout(timer)
  }, [notice, onNoticeDone])

  const failure = room.game && room.playback.failures[0]
  let toast = null
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
  } else if (failure && room.playback.status === 'failed' && inGame) {
    const whose = failure.player_id === you.player_id ? 'Your' : `${name(failure.player_id)}'s`
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
  return toast && <ToastDock>{toast}</ToastDock>
}
