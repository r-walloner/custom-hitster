import { TapePlayer } from '../../../components/TapePlayer.tsx'
import { useRoomTools } from '../../room/context.ts'
import { useSongClock } from '../songClock.ts'

/** The tape for the song in play, counting from `start`. */
export function LiveTape({
  start,
  year,
  onRestart,
}: {
  start: number
  year?: number
  onRestart?: () => void
}) {
  const { room } = useRoomTools()
  const { progress, time, playing } = useSongClock(start, room.playback.status)
  return (
    <TapePlayer
      progress={progress}
      time={time}
      year={year}
      playing={playing}
      onRestart={onRestart}
    />
  )
}
