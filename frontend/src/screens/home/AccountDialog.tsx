import { Button } from '../../components/Button.tsx'
import { Dialog } from '../../components/Dialog.tsx'
import { Icon } from '../../components/Icon.tsx'
import { SettingRow } from '../../components/Rows.tsx'

interface AccountDialogProps {
  name: string
  onRename: () => void
  onSignOut: () => void
  onDelete: () => void
  onClose: () => void
}

/** The signed-in player's account: their name, signing out, and deleting it all. */
export default function AccountDialog({
  name,
  onRename,
  onSignOut,
  onDelete,
  onClose,
}: AccountDialogProps) {
  return (
    <Dialog title="Your account" onClose={onClose} closeLabel="Close your account">
      <SettingRow
        label="Your name"
        value={name}
        caption="Logged in with Spotify."
        className="home__setting"
      >
        <Button onClick={onRename}>Change</Button>
      </SettingRow>
      <Button onClick={onSignOut} className="home__link">
        Sign out
        <Icon name="signOut" />
      </Button>
      <Button className="app-btn--danger" onClick={onDelete}>
        <Icon name="trash" />
        Delete my account
      </Button>
    </Dialog>
  )
}
