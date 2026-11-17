# TapePlayer

The song in play: a tilted coral cassette whose reels turn while music plays, with a progress bar on its label and the time underneath.

It is the only place the game shows that music is playing, so it must always be visible during a round.

## Anatomy

- **Shell**: `coral` cassette (`.t-shell`), ink outline, a hard `shadow-sticker` drop shadow, tilted `tilt` (−4°).
- **Label**: `label` surface with the mystery mark `? ? ? ?` in the display face (never the real title before the reveal), and the **progress bar**: a `sand` track with a `coral` fill (`.t-bar`). The bar is the primary progress signal, readable by anyone.
- **Reels**: two hubs (`.t-reel`) that spin only while audio is actually playing. The tape packs (`.t-pack`, `tape-brown`) shrink on the left and grow on the right as a *secondary* progress cue, a bonus, never the only one.
- **Foot**: `jm-time` (`0:09 / 0:30`, DM Mono) plus two round icon buttons: **Restart** (play the song from the start) and **Retry** (bring back players whose playback dropped).

## Markup

Wrap in `.jm-tape`. Add `.is-playing` while audio plays (reels spin), and `.jm-tape--bounce` for the optional 3px bob. The SVG has a 300 × 190 viewBox, rendered at `tape-w` (156px) on a phone. Set the bar width to `220 × progress`, the left pack to `scale(1 − 0.6p)`, the right pack to `scale(0.4 + 0.6p)`. See the preview's script.

## States

| State | Reels | Bounce | Notes |
| --- | --- | --- | --- |
| Playing | spin | optional | default |
| Loading next song / paused | still | off | bar keeps its position |
| Playback dropped | still | off | pair with a coral "Retry" in the action-feedback area; the device picker comes back if it fails |
| Revealed | still | off | the label shows the real title + year (not designed yet) |

## Rules

- Bounce is a lever. It is on in the chosen V2 screen but adds motion next to the moving bar; keep it to 3px, 500ms, and switch it off on dense screens if it competes.
- Respect `prefers-reduced-motion`: no spin, no bob, no transitions (bundle.css does this).
- Use the SVG's `role="progressbar"` with `aria-valuenow` (0–100) so the progress is announced.
- Don't use the tape as a decorative icon elsewhere (the logo deliberately has no tape so it never duplicates this).
