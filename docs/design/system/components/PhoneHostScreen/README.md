# PhoneHostScreen

The reference layout: the chosen V2 host screen on a landscape phone (844 × 390), composed only from this system's components.

## Regions

```
┌ header 44px ─ logo · room code · turn meta ··········· As [select] · ⋯ ┐
│ ┌ main (flex) ─────────────────────────────────┐ ┌ Standings 164px ┐ │
│ │ ┌ tape 168px ┐ ┌ challenge window (flex) ──┐ │ │                 │ │
│ │ │ TapePlayer │ │ label · headline · ring   │ │ │ 5 rows          │ │
│ │ │ time · ⟲ ↻ │ │ 2×2 challenger cells      │ │ │                 │ │
│ │ └────────────┘ └───────────────────────────┘ │ │                 │ │
│ │ timeline head                                │ │                 │ │
│ │ [card] gap [card] [????] [card] gap [card]   │ │                 │ │
│ └──────────────────────────────────────────────┘ └─────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

- `.jm-screen` › `.jm-header` + `.jm-screen__body` › `.jm-screen__main` (`.jm-screen__top` 172px, `.jm-screen__timeline`) + `.jm-standings`.
- Rhythm: `space-14`/`space-16` screen padding, `space-8` between rows, `space-12` between columns.
- The top-right slot (`.jm-screen__top` beside the tape) is the **moment panel**: it holds whatever the round needs right now. That's placement controls (*Lock it in*, *Skip · 1 token*), the challenge window, the round result, *Name the song*, *Next song* / *Keep listening*. Only one at a time.

## Scaling

- Design at 844 × 390 CSS px. Smaller landscape phones (≈ 740–800 wide): let the main column shrink; the timeline scrolls.
- Notched phones: side padding becomes `max(space-16, env(safe-area-inset-*))`.
- Laptop / TV (16:9): same regions, scaled up (root zoom ≈ 1.5–2×) with `shadow-sticker-lg`; there's room for 4-across challenger cells and the short-form timelines in Standings.
- Portrait phones are not designed; ask players to rotate, or design a stacked variant later.
