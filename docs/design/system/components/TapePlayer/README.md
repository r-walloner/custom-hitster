# TapePlayer

The song in play: a tilted coral cassette whose reels turn while music plays, with a progress bar on its label, and one line under it with the time and a small restart icon.

It is the only place the game shows that music is playing, so it must always be visible during a round.

## Anatomy

- **Shell**: `coral` cassette (`.t-shell`), ink outline, a hard drop shadow, tilted `tilt` (−4°), rendered at `tape-w` (160px).
- **Label**: `label` surface with `????` while the song is a mystery and the year after the reveal (`.t-year`, Bricolage 800, the `tape-year` style), and the **progress bar**: a `sand` track with a `coral` fill (`.t-bar`). The bar is the primary progress signal.
- **Reels**: two hubs (`.t-reel`) that spin only while audio is actually playing. The tape packs (`.t-pack`, `tape-brown`) shrink on the left and grow on the right as a secondary progress cue.
- **Foot** (`.jm-tape__foot`): one line, `jm-time` (`0:09 / 0:30`) on the left and a 36px restart icon (`.jm-btn--icon-sm`) on the right. Restart plays the current song from the start.

## Markup

`.jm-tape-player` › `.jm-tape.jm-tape--bounce.is-playing` › `.jm-tape__bob` › `.jm-tape__shell` › the SVG (300 × 190 viewBox), then `.jm-tape__foot`. Set the bar width to `220 × progress`, the left pack to `scale(1 − 0.6p)`, the right pack to `scale(0.4 + 0.6p)`.

## States

| State | Reels | Bounce | Label |
| --- | --- | --- | --- |
| Playing | spin | on | `????` |
| Loading next song / paused | still | off | bar keeps its position |
| Playback dropped | still | off | pair with a toast with *Retry*; if the speaker itself fails, a toast with *Change* opens the speaker choice |
| Revealed | spin while the song plays on | on | the year |

## Rules

- Bringing back players whose playback dropped happens on its own or from a toast with *Retry*; it has no button under the tape.
- On covers (*Hero*) the tape is decoration: no foot, a slower bob (`jm-tape--slow`), and no `role="progressbar"`.
- Respect `prefers-reduced-motion`: no spin, no bob, no transitions (bundle.css does this).
- Use the SVG's `role="progressbar"` with `aria-valuenow` (0–100) so the progress is announced.
- Don't use the tape as a decorative icon elsewhere; the covers and the app's own icon (*AppIcon*) are the exceptions.
