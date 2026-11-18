import { NameDialog } from '../../components/NameDialog.tsx'
import { useRoomTools } from '../room/context.ts'

/** Changing a name in the lobby: your own, or a local player's if you're the host. */
export default function Rename() {
  const { room, you, renaming, player, send, close } = useRoomTools()
  const seat = room.players.find((candidate) => candidate.id === renaming)
  if (!seat) return null
  const yours = seat.id === you.player_id

  return (
    <NameDialog
      title={yours ? 'Change your name' : `Rename ${seat.name}`}
      initial={seat.name}
      color={player(seat.id).color}
      submitLabel={() => 'Save'}
      onSubmit={(name) => {
        if (name !== seat.name) send({ type: 'rename', player_id: seat.id, name })
        close()
      }}
      onClose={close}
    />
  )
}
