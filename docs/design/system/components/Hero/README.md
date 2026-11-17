# Hero

The cover art for the screens around the game: the bobbing cassette with song cards drifting around it, on Home, the sign-in error and the winner screen.

## Anatomy

- `.jm-hero`, positioned: the text block first (logo or `.jm-big-moment`, then one sentence), the art below it in its own box, so a long name pushes the art down instead of covering it.
- The tape: the TapePlayer cassette at about 200px wide, `.jm-tape.jm-tape--bounce.jm-tape--slow.is-playing` (the bob takes 1.2 s here, not 0.5 s).
- The cards: `jm-card`s, scaled to 0.6–0.75, each in a `.jm-float` wrapper with its own `animation-delay` and `animation-duration` (3–5 s) so they never move together. One yellow `????` pick card in front of the tape; on the winner screen the winning card instead, as `jm-card--new`.
- `.jm-big-moment`: Rubik Mono One at 40px for the one big line (*Mara wins!*). It's the only other place the brand face appears besides the logo.

## Rules

- The cover is the one place tilt is free: the floating cards may lean −15° to +17°, and the Home slogan sits at the `tilt` angle. Everywhere else the three-things rule holds.
- Real songs only on the cards, with the right years: on the winner screen, the winner's own timeline.
- Keep the art out of the way of the text and of the buttons, even at the top of a card's drift.
- `prefers-reduced-motion` stops the bob, the reels and the drift.
