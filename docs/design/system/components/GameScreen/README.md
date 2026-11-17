# GameScreen

The reference layout: the game screen on a landscape phone (844 × 390), composed only from this system's components.

## Regions

```
┌ header 44px ─ logo · room code · Turn 7 · 38 cards left · First to 10 ····· [Reveal now] ⋯ ┐
│ ┌ top band 172px ──────────────────────────────────────────────────────────────────────┐ │
│ │ TapePlayer 172 │ MomentPanel (flex)                                  │ Scoreboard 76 │ │
│ └──────────────────────────────────────────────────────────────────────────────────────┘ │
│ Board: "Mara's timeline · 4 of 10"                                                       │
│ [+] [card] [+] [card] [pick] [card] [+] [card] [+]      full width, scrolls when needed │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

- `.jm-screen` › `.jm-header` + `.jm-screen__top` (`.jm-tape-player`, `.jm-panel.jm-moment`, `.jm-scoreboard`) + `.jm-board`.
- Rhythm: 10/16/12px screen padding, `space-8` between rows, `space-12` between the band's columns.
- *Reveal now* (the referee's early reveal) sits in the header during the challenge and guessing states only. The ⋯ menu will hold settings, playback device, players and *End game*.

## Why it looks like this

- Landscape keeps cards near-square, like real cards, and fits the whole round on one screen.
- The board owns the full width, because seeing the whole timeline is what placing needs.
- One centre panel per decision keeps the middle of the screen busy with the thing to do, and the targets big.
- The host enters every player's choice on that player's row; no mode switching on a shared phone.

## Scaling

- Smaller landscape phones (≈ 740–800 wide): the moment panel shrinks; the board scrolls.
- Notched phones: side padding becomes `max(space-16, env(safe-area-inset-*))`.
- Laptop / TV (16:9): same regions, scaled up (root zoom ≈ 1.5–2×) with `shadow-sticker-lg`.
- Portrait phones are not designed; ask players to rotate.
