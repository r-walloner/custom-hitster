# SongCard

The cards on a board: a revealed song (year, title, artist), the yellow pick card that stands for a guess, the card just won, the dashed + gap between cards, and the ✓ / ✕ marks shown after the reveal.

## Parts

- `.jm-card`: `label` surface, ink outline, `shadow-sticker`, fixed `card-w` × `card-h` (112 × 108), so it reads like a real, near-square card.
  - `.jm-card__year`: 24px/800, tabular figures. The year is the answer, so it's always the largest thing on the card.
  - `.jm-card__title` (13px/700, up to three lines), `.jm-card__artist` (`caption`, `ink-muted`, at the bottom).
  - No "via" line: every card on a board belongs to the same player.
- `.jm-card--mystery`: a pick. `mustard`, tilted `tilt`, `????` and "<name>'s pick". Every pick looks the same: the player on turn's and the challenger's.
  - `.jm-card--pick-done`: a pick that is locked in, in `turn-tint`. While the challenger guesses, only their pick stays mustard.
- `.jm-card--new`: the card just won, in `turn-tint` with `shadow-sticker-lg`.
- `.jm-card--ghost`: the revealed card shown where it belongs on a timeline it didn't join (stolen, or thrown away): 60% opacity, dashed outline.
- `.jm-gap`: a button between cards, 36px wide, dashed `slot-dash` with a + icon; solid ink on `turn-tint` when hovered or chosen (`aria-pressed="true"`). Its tap area reaches past the dashes. It's the only way to place a pick. Label it "Put it here: between 1994 and 2008".
- `.jm-mark--right` / `--wrong`: 24px pills after the reveal, 13px above the card tops. ✓ + initial on `right` sits at the won card's top-right corner; ✕ + initial on `wrong` sits centred over the gap that was guessed (put it inside the card to the gap's left). Add `.jm-mark--before` for the gap before the first card: the mark moves to that card's left edge.

## Rules

- Never show the year, title or artist of the song in play before the reveal.
- Right and wrong are always icon + initial, never colour alone. Label each mark in words: "Sam guessed 2008 to 2016: wrong".
- A bought card has no marks: it simply sits where it belongs.
