# Progress

A filling bar for how much of something is done: a library import, a player's way to the goal.

## Anatomy

- `.jm-progress` › `span` with an inline `width` in %. `sand` track, ink outline, `coral` fill. `.jm-progress--sm` (12px) for rows in a list.
- Give it `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax` and an `aria-label`.

## Import progress

- `.jm-importing`: *Importing…* in `jm-caption` over a small bar (96 × 8px, 1.5px outline). It stands where a count would be: at the end of the *Your songs* button on Home.
- `.jm-importing--strong`: the text in the type of the value it replaces, over a longer, 10px bar. In a setting row's value (*Your songs* in the lobby) it keeps the row's height.
- In a library row the bar comes first, then *Importing…*, in the row's caption.
- Each step slides (300 ms), so the jumps read as progress; `prefers-reduced-motion` stops that. In the library, a source's bar stays full for a moment after its import ends, before its count comes back.

## Rules

- The bar is for amounts; time is always the ring (`jm-ring`). A bar never counts down.
- Pair it with the numbers in words nearby where there are any: *6/10*.
- The tape's label has its own progress bar for the song; don't add another one for it.
