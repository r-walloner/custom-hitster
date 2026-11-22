import type { RoomSettings } from '../../api/messages.ts'
import { Dialog } from '../../components/Dialog.tsx'
import { DoneButton } from '../../components/DoneButton.tsx'
import { useRoomTools } from '../room/context.ts'
import { TimingRows } from './components/TimingRows.tsx'
import './GameSettings.css'

/**
 * The game settings the host may still change mid-game, a pop-up from the game menu's Rules: the
 * same rows as on the lobby's settings screen. The server takes no others once the game runs.
 */
export default function GameSettings() {
  const { room, send, open, close } = useRoomTools()
  const { settings } = room
  const change = (patch: Partial<RoomSettings>) =>
    send({ type: 'set_settings', settings: { ...settings, ...patch } })

  return (
    <Dialog
      title="Game settings"
      onBack={() => open('menu')}
      backLabel="Back to the menu"
      headExtra={<DoneButton onClick={close} />}
      className="game-settings"
    >
      <TimingRows settings={settings} onChange={change} idPrefix="g" />
      <p className="jm-caption">Changes apply starting from the next song or countdown.</p>
    </Dialog>
  )
}
