// The winner screen's art: the tape in the middle, and the winner's cards burst out around it.
import type { FloatingCard } from '../../components/Hero.tsx'
import type { Size } from '../../components/useSize.ts'

export type Place = Omit<FloatingCard, 'song'>

export interface Burst {
  /** The tape, centred in the box. */
  tape: { left: number; top: number; width: number }
  /** One place per card, oldest first, going round clockwise after the winning card. */
  places: Place[]
  /** The card that won it: the ring's slot towards the tape's top right, in front and larger. */
  front: Place
}

interface Look {
  /** The tape's width when the box has room for it. */
  tape: number
  /** The largest card scale. */
  maxScale: number
  /** The scale shrinks with the count: `fit / √count`. */
  fit: number
}
const PHONE: Look = { tape: 170, maxScale: 0.62, fit: 2.7 }
const DESKTOP: Look = { tape: 300, maxScale: 0.95, fit: 4 }

// The card's unscaled size (--card-w, --card-h). It scales about its centre.
const CARD_W = 112
const CARD_H = 108
// The tape's drawing is 300 × 190.
const TAPE_RATIO = 190 / 300
// A tilted card needs a little more room than its own box.
const TILT_ROOM = 1.1
// How far a card may tuck behind the tape: the share of its half size that stays clear of it.
const TUCK = 0.6
// A step that gives each card its own tilt without looking regular.
const SILVER = 0.754878

const frac = (x: number) => x - Math.floor(x)
const clamp = (x: number, low: number, high: number) => Math.min(high, Math.max(low, x))

/**
 * Lays out the tape in the middle of a `box` and `count` cards around it, as if the tape had burst
 * open. The cards, the winning one included, sit evenly spaced along a band between the tape's
 * edge and the box's, near and far in turn once there are many. The winning card is at the top
 * right; the years run clockwise after it. They only bob in place (the cover's float); nothing is
 * random, so the layout stays put from one render to the next.
 */
export function burst(count: number, box: Size, desktop: boolean): Burst {
  const look = desktop ? DESKTOP : PHONE
  const centreX = box.width / 2
  const centreY = box.height / 2
  const tapeW = Math.round(Math.min(look.tape, box.width * 0.4, (box.height * 0.9) / TAPE_RATIO))
  const tapeH = tapeW * TAPE_RATIO
  // Every card has a slot on the ring, the winning card's included.
  const slots = count + 1
  const scale = Math.min(look.maxScale, look.fit / Math.sqrt(slots))
  const halfW = (CARD_W / 2) * scale * TILT_ROOM
  const halfH = (CARD_H / 2) * scale * TILT_ROOM

  // How far a card steps in or out of the band's middle: the same everywhere, so the cards stay
  // evenly spaced where the band is wide (the sides of a wide box) as where it is narrow.
  const step = Math.max(halfW, halfH) * 0.8

  /** The point on the ray at `angle`, `offset` steps (−1 to 1) out from the band's middle. */
  const point = (angle: number, offset: number) => {
    const dx = Math.cos(angle)
    const dy = Math.sin(angle)
    const along = (room: number, d: number) => (Math.abs(d) < 1e-6 ? Infinity : room / Math.abs(d))
    const inner = Math.min(
      along(tapeW / 2 + halfW * TUCK, dx),
      along(tapeH / 2 + halfH * TUCK, dy),
    )
    const outer = Math.min(along(box.width / 2 - halfW, dx), along(box.height / 2 - halfH, dy))
    const middle = (inner + outer) / 2
    const distance =
      outer <= inner ? outer : middle + offset * Math.min(step, (outer - inner) / 2)
    return { x: centreX + dx * distance, y: centreY + dy * distance, dx }
  }

  // Walk once round the middle of the band, clockwise from the left (with y pointing down, just
  // past π is up), so the cards can be spaced by distance along it rather than by angle.
  const steps = 720
  const angleOf = (k: number) => Math.PI + (2 * Math.PI * k) / steps
  const lengths: number[] = []
  let total = 0
  let last = point(angleOf(0), 0)
  for (let k = 0; k <= steps; k++) {
    const here = point(angleOf(k), 0)
    total += Math.hypot(here.x - last.x, here.y - last.y)
    lengths.push(total)
    last = here
  }
  const angleAt = (length: number) => {
    const at = ((length % total) + total) % total
    const k = Math.max(1, lengths.findIndex((l) => l >= at))
    const share = (at - lengths[k - 1]) / (lengths[k] - lengths[k - 1] || 1)
    return angleOf(k - 1 + share)
  }

  // The winning card takes the slot towards the tape's top right corner; the others follow it
  // clockwise at even distances, so the ring is even whatever the count, the winner included.
  const corner = Math.atan2(-tapeH, tapeW) // up and to the right
  const turn = frac((corner - Math.PI) / (2 * Math.PI)) // how far round from the left
  const start = lengths[Math.round(turn * steps)]
  const spacing = total / slots

  const place = (slot: number, own: number): Place => {
    // A few cards keep to the middle of the band; more take turns near the tape and far out.
    const offset = slots < 8 ? 0 : slot % 2 === 0 ? -1 : 1
    const { x, y, dx } = point(angleAt(start + slot * spacing), offset)
    // Cards on the right lean right, those on the left lean left, each a little its own way.
    const rotate = Math.round(clamp(12 * dx + 10 * (frac(slot * SILVER) - 0.5), -15, 17))
    return {
      left: Math.round(x - CARD_W / 2),
      top: Math.round(y - CARD_H / 2),
      rotate,
      scale: Math.round(own * 100) / 100,
      delay: -((slot * 0.7) % 3),
      duration: 3.1 + ((slot * 0.37) % 1.7),
    }
  }

  return {
    tape: {
      left: Math.round(centreX - tapeW / 2),
      top: Math.round(centreY - tapeH / 2),
      width: tapeW,
    },
    places: Array.from({ length: count }, (_, i) => place(i + 1, scale)),
    front: {
      ...place(0, Math.min(look.maxScale * 1.15, scale * 1.3)),
      isNew: true,
      front: true,
    },
  }
}
