# Timeline

The active player's cards in year order, left to right, with a gap before, between and after them: the game board.

## Layout

- `.jm-timeline`: a horizontal flex row, `space-8` gap, scrolls sideways when it outgrows the screen (10 cards + 11 gaps at 84px ≈ 1000px, so it will scroll on a phone; keep the mystery card scrolled into view).
- Head: `.jm-section` "<name>'s timeline" plus a `.jm-meta` count "4 of 10", and the state of hidden marks.
- Order: gap, card, gap, card, … gap. While placing, every gap is a `.jm-gap` button; once committed, the mystery card replaces the chosen gap and the gaps either side of it disappear.

## Behaviour

- The player on turn can move their pick between gaps until they commit (*Lock it in*).
- Challengers mark a gap on the same timeline in their own turn. Their marks stay hidden until the reveal; say so in the head line.
- Only the timeline of the player on turn is shown full size; everyone's timeline in short form lives in Standings.
