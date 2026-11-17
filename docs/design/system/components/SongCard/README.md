# SongCard

A revealed song on a timeline (year, title, artist, and whose library it came from), the tilted mustard mystery card, and the dashed gaps between cards where a song can go.

## Parts

- `.jm-card`: `label` surface, ink outline, `shadow-sticker`, `card-w` × `card-h` (84 × 100 on a phone; 100 × 116 when the timeline has the height).
  - `.jm-card__year`: `year` style, tabular figures. The year is the answer, so it's always the largest thing on the card.
  - `.jm-card__title` (`card-title`, may wrap to 2 lines), `.jm-card__artist` (`caption`, `ink-muted`).
  - `.jm-card__via`: whose library it came from. A dot in that player's colour plus their name; set the player with `.jm-p1`…`.jm-p5` on the card.
- `.jm-card--mystery`: the song in play once it sits in a gap. `mustard`, tilted `tilt` (−4°), shows `????` and "<name>'s pick". Only one exists at a time.
- `.jm-gap`: a button between cards. Dashed `slot-dash` when empty; solid ink on `turn-tint` when hovered or chosen (`aria-pressed="true"`). Label it with its range: "Place between 1975 and 1994".

## Rules

- Never show the year, title or artist of the song in play before the reveal.
- The "via" colour always comes with the name; colour is never the only cue.
- The results after a reveal (right/wrong marks, challengers' guesses on the timeline, where the card really belongs) are **not designed yet**. Design them in this language: ink outline + icon + word, not colour alone.
