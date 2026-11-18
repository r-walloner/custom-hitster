import { useState } from 'react'
import type { ClientMessage, StateMessage } from '../../messages.ts'
import { toSong, useRoomTools } from '../../room.ts'
import Challenge from './Challenge.tsx'
import Guess from './Guess.tsx'
import Placing from './Placing.tsx'
import Reveal from './Reveal.tsx'
import type { Turn } from './turn.ts'

/** The running game: the phase picks the screen. The finished game is the winner screen. */
export default function Game() {
  const { state, room, you, send } = useRoomTools()
  // The state on screen when this device asked for a new card. Until the server answers with a
  // newer state (it always does, also on a refusal), the draw buttons stay locked.
  const [drawSentAt, setDrawSentAt] = useState<StateMessage | null>(null)
  const game = room.game
  if (!game) return null

  const active = game.players.find((player) => player.id === game.active) ?? game.players[0]
  const turn: Turn = {
    game,
    active,
    cards: active.timeline.map(toSong),
    referee: you.is_host || you.player_id === game.active,
    loading: game.drawing || drawSentAt === state,
    draw: (message: ClientMessage) => {
      setDrawSentAt(state)
      send(message)
    },
    picker:
      game.phase === 'picking' ? game.challenges.find((challenge) => !challenge.locked) : undefined,
  }

  switch (game.phase) {
    case 'placing':
      return <Placing turn={turn} />
    case 'challenging':
      return <Challenge turn={turn} />
    case 'picking':
      return <Guess turn={turn} />
    default:
      return <Reveal turn={turn} />
  }
}
