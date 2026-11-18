import { NameDialog } from '../../components/NameDialog.tsx'
import type { Player } from '../../components/types.ts'
import { useRoomTools } from '../room/context.ts'

/** Adding a local player (no phone; the host plays their turns), over the host's lobby. */
export default function AddPlayer() {
  const { room, send, close } = useRoomTools()

  return (
    <NameDialog
      title="Add local player"
      caption="Plays on this device. No phone needed."
      color={((room.players.length % 5) + 1) as Player['color']}
      submitLabel={(name) => (name ? `Add ${name}` : 'Add')}
      onSubmit={(name) => {
        send({ type: 'add_player', name })
        close()
      }}
      onClose={close}
    />
  )
}
