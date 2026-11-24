import { useEffect } from 'react'
import type { GameView } from '../../../api/messages.ts'
import { bought, right, steal, tap, tinted } from '../../../components/confetti.ts'
import type { Point } from '../../../components/confetti.ts'
import type { Player } from '../../../components/types.ts'
import { centreOf, rainOn, useConfetti } from '../../../components/useConfetti.ts'

/** The confetti a reveal gets, and whose it is; null when nobody was right. */
export interface Celebration {
  kind: 'right' | 'stolen' | 'bought'
  /** The id of who got the card. */
  by: string
}

export function celebration(game: GameView): Celebration | null {
  const { outcome } = game
  if (!game.card || !outcome || !outcome.card_to) return null
  if (outcome.bought) return { kind: 'bought', by: outcome.card_to }
  if (outcome.card_to === game.active) return { kind: 'right', by: outcome.card_to }
  return { kind: 'stolen', by: outcome.card_to }
}

/** A steal's stream lands about this long after it leaves the card. */
const LANDS_MS = 900

// The reveal last celebrated in this tab, so Reveal showing again (after a sub-screen, or a
// reconnect) doesn't celebrate it twice.
let celebrated: string | null = null

/** The revealed card on the board: the new card where it was kept, else its ghost. */
function revealedCard(): Element | null {
  return document.querySelector('.jm-board .jm-card--new, .jm-board .app-card--ghost')
}

/** `point` moved into the visible part of `element`: the phone's row scrolls sideways, so the
    revealed card may be out of view. */
function inside(point: Point, element: Element): Point {
  const box = element.getBoundingClientRect()
  return {
    x: Math.min(box.right, Math.max(box.left, point.x)),
    y: Math.min(box.bottom, Math.max(box.top, point.y)),
  }
}

/**
 * Confetti once per reveal, raining down on the revealed card in the colour of who got it. A steal
 * streams from the card to the thief's avatar in the scoreboard, where it goes off as it lands. A
 * bought card gets gold; nobody right, none. Call it in the Reveal phase.
 */
export function useRevealConfetti(game: GameView, player: (id: string) => Player) {
  const confetti = useConfetti()
  const party = celebration(game)
  const key = party && game.card ? `${game.turn_number}:${game.card.id}` : null
  const kind = party?.kind
  const colour = party && `--player-${player(party.by).color}`
  const by = party?.by

  useEffect(() => {
    if (!key || !kind || !colour || !by || key === celebrated) return
    let landing: number | undefined
    // After layout, so the card is where it shows.
    const frame = requestAnimationFrame(() => {
      const card = revealedCard()
      const row = card?.closest('.jm-board__row')
      if (!card || !row) return
      celebrated = key
      const from = inside(rainOn(card), row)
      if (kind === 'bought') confetti.burst(from, bought())
      else if (kind === 'right') confetti.burst(from, right(tinted(colour)))
      else {
        const avatar = document.querySelector(
          `.app-scoreboard [data-player="${CSS.escape(by)}"] .jm-avatar`,
        )
        if (!avatar) return confetti.burst(from, right(tinted(colour)))
        const to = centreOf(avatar)
        confetti.burst(from, steal(to, tinted(colour)))
        landing = window.setTimeout(() => confetti.burst(to, tap(tinted(colour))), LANDS_MS)
      }
    })
    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(landing)
    }
  }, [key, kind, colour, by, confetti])
}
