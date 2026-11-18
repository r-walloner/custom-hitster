import { Button, ButtonPair } from '../../components/Button.tsx'
import { Dialog } from '../../components/Dialog.tsx'

interface DeleteAccountProps {
  onDelete: () => void
  onClose: () => void
}

/** Asks before deleting the player's Jamster account. */
export default function DeleteAccount({ onDelete, onClose }: DeleteAccountProps) {
  return (
    <Dialog title="Delete your account?" onClose={onClose}>
      <p className="jm-meta">
        This removes your Jamster account and all imported data. Your Spotify account will not be
        touched.
      </p>
      <ButtonPair className="home__delete-actions">
        <Button onClick={onClose} autoFocus>
          Cancel
        </Button>
        <Button variant="primary" onClick={onDelete}>
          Delete my account
        </Button>
      </ButtonPair>
    </Dialog>
  )
}
