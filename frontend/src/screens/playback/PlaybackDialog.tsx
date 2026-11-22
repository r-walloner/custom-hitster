import { Dialog } from '../../components/Dialog.tsx'
import { DoneButton } from '../../components/DoneButton.tsx'
import { useRoomTools } from '../room/context.ts'
import { RefreshDevices, SpeakerList } from './components/SpeakerList.tsx'
import { useSpeakers } from './useSpeakers.ts'
import './Playback.css'
import './PlaybackDialog.css'

/**
 * Your speaker during the game, a pop-up from the game menu: only the speaker can change, since
 * the playback mode stays as the game started, and there is no Test while a song plays.
 */
export default function PlaybackDialog() {
  const { room, you, send, devices, open, close } = useRoomTools()
  const mine = room.players.find((seat) => seat.id === you.player_id)
  const { refresh, choose } = useSpeakers(send)

  return (
    <Dialog
      title="Where should the music play?"
      onBack={() => open('menu')}
      backLabel="Back to the menu"
      headExtra={
        <>
          <RefreshDevices onClick={refresh} />
          <DoneButton onClick={close} />
        </>
      }
      className="playback-dialog"
    >
      <div className="playback playback--speaker">
        <SpeakerList devices={devices} device={mine?.device ?? null} onChoose={choose}>
          <p className="jm-caption">
            Changes apply starting from the next song. The current song stays where it is.
          </p>
        </SpeakerList>
      </div>
    </Dialog>
  )
}
