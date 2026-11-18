import { useState } from 'react'
import type { FormEvent } from 'react'
import { Avatar } from '../components/Avatar.tsx'
import { Button, ButtonPair } from '../components/Button.tsx'
import { Dialog } from '../components/Dialog.tsx'
import { TextInput } from '../components/Input.tsx'
import { useRoomTools } from '../room.ts'
import type { Player } from '../types.ts'
import './Dialogs.css'

/** Adding a local player (no phone; the host plays their turns), over the host's lobby. */
export default function AddPlayer() {
  const { room, send, close } = useRoomTools()
  const [name, setName] = useState('')
  const shown = name.trim()
  const color = ((room.players.length % 5) + 1) as Player['color']

  const add = (event: FormEvent) => {
    event.preventDefault()
    if (!shown) return
    send({ type: 'add_player', name: shown })
    close()
  }

  return (
    <Dialog title="Add local player" onClose={close} closeLabel="Close">
      <form className="dialog__form" onSubmit={add}>
        <p className="jm-meta">Plays on this device. No phone needed.</p>
        <label htmlFor="new-name" className="jm-label dialog__field-label">
          Name
        </label>
        <div className="dialog__name">
          <Avatar player={{ name: shown || '?', color }} size="xl" />
          <TextInput
            id="new-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={16}
            autoFocus
          />
        </div>
        <ButtonPair className="dialog__actions">
          <Button onClick={close}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={!shown}>
            {shown ? `Add ${shown}` : 'Add'}
          </Button>
        </ButtonPair>
      </form>
    </Dialog>
  )
}
