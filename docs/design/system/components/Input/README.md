# Input

Text fields: the room code, a player's name and search, plus the QR tile that sits beside the room code.

## Variants

| Class | Use |
| --- | --- |
| `.jm-input.jm-input--code` | The four-letter room code on Home: DM Mono, wide spacing, uppercase, 56px tall. Pair it with a primary *Join* of the same height. |
| `.jm-input` | A name (*Jonas*, a local player's *Ilse*): Bricolage 800 at 20px, 52px tall. |
| `.jm-search` › `svg` + `input` | Search in a list (playlists and artists): pill, magnifier on the left, 44px tall. |
| `.jm-qr` › `svg` | The room's invite link as a QR code, 98px, on a `label` tile with an ink outline. Draw it with `shape-rendering: crispEdges`. |

## Rules

- Every field has a real `<label>`: a `jm-label` above it, or the screen's headline as the label (*What should we call you?*).
- Ground is `paper` inside a `label` panel, so the field reads as a hole in the panel.
- Focus ring: 2px ink outline, 2px offset, like buttons.
- Room codes are four letters; set `maxlength="4"`, `autocomplete="off"`, `autocapitalize="characters"`.
