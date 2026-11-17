# Board

The active player's timeline, along the bottom of the game screen at full width, oldest on the left.

## Parts

- `.jm-board` › `.jm-board__head` (`jm-section` "Mara's timeline" + `jm-meta` "4 of 10") › `.jm-board__row` of SongCards, gaps and picks.
- While placing or guessing, the row alternates gap and card: tap a dashed + gap, or either half of a card. Taking a slot moves the pick there at once; nothing is final until *Lock it in*.
- Gaps that can't be chosen (the slot already taken by the player on turn) are left out, not disabled.
- During the challenge and the reveal there are no gaps; the row has a wider 10px rhythm instead.

## Scrolling

- Cards keep their fixed 112px width. When a row doesn't fit, add `.jm-board__row--scroll` and a `.jm-board__scrollbar` under it: a 5px `sand` track with an `ink-subtle` thumb whose width is the visible share. The thumb moves as the row scrolls.
- Keep the pick in view: scroll it into the middle when it moves.

## Rules

- The board never shares its width with anything else; the scoreboard and panels live in the top band.
- Ten cards to win means up to nine cards plus picks on one row, so scrolling is normal late in a game.
