import { useParams } from 'react-router'
import { ROOM_CODE } from './fixtures.ts'

/**
 * The room code from the URL, and the paths of the room's screens.
 * Temporary, like the per-screen routes in main.tsx: see the note there.
 */
export function useRoomPaths() {
  const { code = ROOM_CODE } = useParams()
  const room = `/room/${code.toUpperCase()}`
  return {
    code: code.toUpperCase(),
    join: room,
    guestLobby: `${room}/lobby/guest`,
    lobby: `${room}/lobby`,
    addPlayer: `${room}/lobby/add-player`,
    settings: `${room}/settings`,
    speaker: `${room}/speaker`,
    dealing: `${room}/dealing`,
    placing: `${room}/game/placing`,
    challenge: `${room}/game/challenge`,
    guess: `${room}/game/guess`,
    reveal: `${room}/game/reveal`,
    menu: `${room}/game/menu`,
    scoreboard: `${room}/game/scoreboard`,
    reconnecting: `${room}/game/reconnecting`,
    winner: `${room}/winner`,
  }
}
