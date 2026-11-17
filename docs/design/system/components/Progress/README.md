# Progress

A filling bar for how much of something is done: a library import, the opening cards dealt, a player's way to the goal.

## Anatomy

- `.jm-progress` › `span` with an inline `width` in %. `sand` track, ink outline, `coral` fill. `.jm-progress--sm` (12px) for rows in a list.
- Give it `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax` and an `aria-label`.

## Rules

- The bar is for amounts; time is always the ring (`jm-ring`). A bar never counts down.
- Pair it with the numbers in words nearby: *812 of 1,940 songs*, *2 of 4 dealt*, *6/10*.
- The tape's label has its own progress bar for the song; don't add another one for it.
