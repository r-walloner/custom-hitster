import { useState } from 'react'
import type { FormEvent } from 'react'
import { Avatar } from './Avatar.tsx'
import { Button, ButtonPair } from './Button.tsx'
import { Dialog } from './Dialog.tsx'
import { TextInput } from './Input.tsx'
import type { Player } from './types.ts'

/** The longest name the name fields take. */
export const MAX_NAME = 16

interface NameDialogProps {
  title: string
  /** One line under the title: "Plays on this device. No phone needed." */
  caption?: string
  /** The name the field starts with. */
  initial?: string
  color: Player['color']
  /** The primary button's label for the name typed so far. */
  submitLabel: (name: string) => string
  /** Called with the trimmed name; never empty. */
  onSubmit: (name: string) => void
  onClose: () => void
}

/** A pop-up asking for one name, with the avatar it will get beside the field. */
export function NameDialog({
  title,
  caption,
  initial = '',
  color,
  submitLabel,
  onSubmit,
  onClose,
}: NameDialogProps) {
  const [name, setName] = useState(initial.slice(0, MAX_NAME))
  const shown = name.trim()

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (shown) onSubmit(shown)
  }

  return (
    <Dialog title={title} onClose={onClose} closeLabel="Close">
      <form className="app-name-dialog" onSubmit={submit}>
        {caption && <p className="jm-meta">{caption}</p>}
        <div className="app-name-dialog__name">
          <Avatar player={{ name: shown || '?', color }} size="xl" />
          <TextInput
            aria-label="Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onFocus={(event) => event.target.select()}
            maxLength={MAX_NAME}
            autoComplete="nickname"
            autoFocus
          />
        </div>
        <ButtonPair className="app-name-dialog__actions">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={!shown}>
            {submitLabel(shown)}
          </Button>
        </ButtonPair>
      </form>
    </Dialog>
  )
}
