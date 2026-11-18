import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Avatar } from '../components/Avatar.tsx'
import { Button, ButtonPair } from '../components/Button.tsx'
import { Dialog, Overlay } from '../components/Dialog.tsx'
import { TextInput } from '../components/Input.tsx'
import { useRoomPaths } from '../paths.ts'
import Lobby from './Lobby.tsx'
import './Dialogs.css'

/** Adding a local player (no phone; the host plays their turns), over the host's lobby. */
export default function AddPlayer() {
  const paths = useRoomPaths()
  const navigate = useNavigate()
  const [name, setName] = useState('Ilse')
  const shown = name.trim()

  const add = (event: FormEvent) => {
    event.preventDefault()
    navigate(paths.lobby)
  }

  return (
    <Overlay under={<Lobby />}>
      <Dialog title="Add local player" closeTo={paths.lobby} closeLabel="Close">
        <form className="dialog__form" onSubmit={add}>
          <p className="jm-meta">Plays on this device. No phone needed.</p>
          <label htmlFor="new-name" className="jm-label dialog__field-label">
            Name
          </label>
          <div className="dialog__name">
            <Avatar player={{ name: shown || '?', color: 5 }} size="xl" />
            <TextInput
              id="new-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={16}
            />
          </div>
          <ButtonPair className="dialog__actions">
            <Button to={paths.lobby}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={!shown}>
              {shown ? `Add ${shown}` : 'Add'}
            </Button>
          </ButtonPair>
        </form>
      </Dialog>
    </Overlay>
  )
}
