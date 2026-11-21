# Hero

The cover art for the screens around the game: the bobbing cassette with song cards drifting around it, on Home, the sign-in error, a room that's gone and the winner screen.

## Anatomy

- `.jm-hero`, positioned, holds the art; everything in it is placed by hand. The tape is `.jm-hero__tape`, each card a `.jm-hero__float` with an inline `left` and `top`.
- The tape: the TapePlayer cassette at about 170–200px wide, `.jm-tape.jm-tape--bounce.jm-tape--slow.is-playing` (the bob takes 1.2 s here, not 0.5 s), hidden from screen readers and without `role="progressbar"`.
- The cards: `jm-card`s, scaled to 0.6–0.8, each in a `.jm-float` wrapper with its own `animation-delay` and `animation-duration` (3–5 s) so they never move together. One yellow `????` pick card in front of the tape; on the winner screen the winning card instead, as `jm-card--new`.
- `.jm-big-moment`: Rubik Mono One at 40px (34px on the winner screen) for the one big line (*Mara wins!*). It's the only other place the brand face appears besides the logo.

## Cover screen

`.jm-screen.jm-cover-screen`: the art on the left (`.jm-hero.jm-cover-screen__art`, 334px tall, with the `--xl` logo as `.jm-cover-screen__logo` and the slogan as `.jm-cover-screen__slogan`), one `jm-panel.jm-cover-screen__panel` on the right (316px). Its big buttons are `.jm-cover-screen__btn` (46px, 14px). Home, the sign-in error, *No such room* and *Room closed* use it; the error ones swap the panel for a `jm-verdict--wrong` tag, a 19px headline, one sentence and the way on.

## Winner

The text block comes first (the big line, then one sentence), the art below it in its own box, so a long name pushes the art down instead of covering it.

## Rules

- The cover is the one place tilt is free: the floating cards may lean −15° to +17°, and the Home slogan sits at the `tilt` angle. Everywhere else the three-things rule holds.
- Real songs only on the cards, with the right years: on the winner screen, the winner's own timeline.
- Keep the art out of the way of the text and of the buttons, even at the top of a card's drift.
- `prefers-reduced-motion` stops the bob, the reels and the drift.
