import type { ComponentType } from 'react'
import { useSearchParams } from 'react-router'
import { useRoomPaths } from '../../paths.ts'
import Challenge from './Challenge.tsx'
import Guess from './Guess.tsx'
import Placing from './Placing.tsx'
import Reveal from './Reveal.tsx'

export type Phase = 'placing' | 'challenge' | 'guess' | 'reveal'

const SCREENS: Record<Phase, ComponentType> = {
  placing: Placing,
  challenge: Challenge,
  guess: Guess,
  reveal: Reveal,
}

const isPhase = (value: string | null): value is Phase => value !== null && value in SCREENS

/**
 * The round phase a pop-up (menu, scoreboard, reconnecting) was opened over, from `?over=`.
 * Temporary, like the per-screen routes: once the room state is wired in, the pop-ups are
 * component state over the live game and need none of this.
 */
export function usePhaseBehind() {
  const paths = useRoomPaths()
  const [params] = useSearchParams()
  const over = params.get('over')
  const phase: Phase = isPhase(over) ? over : 'placing'
  return {
    /** The phase's screen, to render under the pop-up. */
    Behind: SCREENS[phase],
    /** Where closing the pop-up goes. */
    back: paths[phase],
    /** Keeps the phase when moving to another pop-up. */
    query: `?over=${phase}`,
  }
}
