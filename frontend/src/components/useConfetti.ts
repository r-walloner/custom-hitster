import { createContext, useContext } from 'react'
import type { Point, Preset } from './confetti.ts'

/** Confetti over the whole app. Points are viewport pixels: a pointer's `clientX`/`clientY`, or
    the centre of an element's `getBoundingClientRect()`. */
export interface ConfettiApi {
  /** One burst of `preset` at `at`. Does nothing when the device asks for reduced motion. */
  burst: (at: Point, preset: Preset) => void
  /** The pieces in the air right now. */
  count: () => number
  /** The share of their pieces new bursts get, 0.2 to 1: lower while frames take over 20 ms. */
  quality: () => number
  /** False when the device asks for reduced motion. */
  enabled: boolean
}

const off: ConfettiApi = {
  burst: () => {},
  count: () => 0,
  quality: () => 1,
  enabled: false,
}

/** Provided by `ConfettiProvider`; without one, confetti is simply off. */
export const ConfettiContext = createContext<ConfettiApi>(off)

export function useConfetti(): ConfettiApi {
  return useContext(ConfettiContext)
}

/** The centre of an element, in viewport pixels. */
export function centreOf(element: Element): Point {
  const box = element.getBoundingClientRect()
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 }
}

/** Where confetti rains down on a card from: a little above its centre. */
const RAIN_FROM = 0.35

/** The point confetti for a card comes from, in viewport pixels: a little above its centre, so
    it rains down on the card. */
export function rainOn(element: Element): Point {
  const box = element.getBoundingClientRect()
  return { x: box.left + box.width / 2, y: box.top + box.height * RAIN_FROM }
}
