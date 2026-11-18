import Challenge from './phases/Challenge.tsx'
import Guess from './phases/Guess.tsx'
import Placing from './phases/Placing.tsx'
import Reveal from './phases/Reveal.tsx'
import { useTurn } from './turn.ts'

/** The running game: the phase picks the screen. The finished game is the winner screen. */
export default function Game() {
  const turn = useTurn()
  if (!turn) return null
  switch (turn.game.phase) {
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
