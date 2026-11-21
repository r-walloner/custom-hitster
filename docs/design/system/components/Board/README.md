# Board

The active player's timeline, along the bottom of the game screen at full width, oldest on the left.

## Parts

- `.jm-board` › `.jm-board__head` (`jm-section` "Mara's timeline" + `jm-meta jm-board__count` "4 of 10") › `.jm-board__row` of SongCards, gaps and picks.
- While placing or guessing, the device that decides sees gap, card, gap, card: tap a dashed + gap to move the pick there at once; nothing is final until *Lock it in*. Cards themselves aren't tappable.
- Gaps that can't be chosen (the slot the player on turn already took) are left out, not disabled.
- Everyone else sees the same row without gaps: the cards and the picks only.
- During the challenge and the reveal there are no gaps; `.jm-board__row--spaced` gives the row a wider 10px rhythm instead. After the reveal, `.jm-board__row--marks` leaves 14px above the cards for the ✓ / ✕ marks.

## Scrolling

- Cards keep their fixed 112px width. When a row doesn't fit, add `.jm-board__row--scroll` and a `.jm-board__scrollbar` under it: a 5px `sand` track with an `ink-subtle` thumb whose width is the visible share. The thumb moves as the row scrolls, and the mouse wheel scrolls the row sideways.
- Keep the pick being placed in view: scroll it into the middle when it moves.

## Rules

- The board never shares its width with anything else; the scoreboard and panels live in the top band.
- Ten cards to win means up to nine cards plus picks on one row, so scrolling is normal late in a game.
