/** How far apart the scoreboard's rows start fading in, and how long each one takes. */
const ROW_GAP_MS = 100
export const ROW_FADE_MS = 700
/** The pause between the scoreboard and the first card. */
const PAUSE_MS = 150
/** How far apart the cards start fading in. */
const CARD_GAP_MS = 150
/** However many cards the winner has, they all start fading in within this time. */
const CARDS_SPAN_MS = 1200

/**
 * When each part of the winner screen starts fading in, in milliseconds: `rows` for the final
 * scoreboard, from the top, then, once the last row is in and after a short pause, `cards` for
 * the cards in the order they come in (the deciding card first, then the rest of the winning
 * timeline).
 */
export function entrance(cards: number, rows: number): { cards: number[]; rows: number[] } {
  const rowsIn = rows > 0 ? (rows - 1) * ROW_GAP_MS + ROW_FADE_MS : 0
  const gap = cards > 1 ? Math.min(CARD_GAP_MS, CARDS_SPAN_MS / (cards - 1)) : 0
  return {
    rows: Array.from({ length: rows }, (_, i) => i * ROW_GAP_MS),
    cards: Array.from({ length: cards }, (_, i) => rowsIn + PAUSE_MS + i * gap),
  }
}
