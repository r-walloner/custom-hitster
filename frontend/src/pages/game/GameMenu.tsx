import { useState } from 'react'
import { Button } from '../../components/Button.tsx'
import { Dialog } from '../../components/Dialog.tsx'
import { Icon } from '../../components/Icon.tsx'
import { SettingRow } from '../../components/Rows.tsx'
import { useRoomTools } from '../../room.ts'
import '../Dialogs.css'

/** The gear menu: only what's needed mid-game. */
export default function GameMenu() {
  const { room, you, hearsMusic, send, open, close } = useRoomTools()
  const [ending, setEnding] = useState(false)
  const mine = room.players.find((seat) => seat.id === you.player_id)

  return (
    <Dialog title="Menu" onClose={close} closeLabel="Close menu">
      {hearsMusic && (
        <SettingRow
          label="Music plays on"
          value={mine?.device ?? 'Your active Spotify device'}
          className="dialog__setting"
        >
          <Button onClick={() => open('speaker')}>Change</Button>
        </SettingRow>
      )}
      <Button onClick={() => open('scoreboard')} className="dialog__link">
        Scoreboard
        <Icon name="forward" />
      </Button>
      {you.is_host ? (
        <Button
          variant="dark"
          className="dialog__end"
          onClick={() => {
            if (!ending) return setEnding(true)
            send({ type: 'end_game' })
            close()
          }}
        >
          {ending ? 'Tap again to end it for everyone' : 'End game'}
        </Button>
      ) : (
        <Button to="/" variant="dark" className="dialog__end">
          Leave game
        </Button>
      )}
    </Dialog>
  )
}
