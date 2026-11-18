# Dialog

A centred pop-up over the dimmed screen: the game menu, the full scoreboard, adding a local player, reconnecting.

## Anatomy

- `.jm-overlay` wraps the screen; the screen behind goes in `.jm-overlay__under`, then `.jm-scrim` (ink at 55%) and `.jm-dialog`.
- `.jm-overlay__under` must stay: it puts the whole screen in its own layer, so things in it that raise themselves (the board's + gaps) can't show through the scrim.
- `.jm-dialog`: 380px wide, `label` surface, ink outline, `radius-panel`, `shadow-sticker-lg`. `.jm-dialog--wide` fills the screen but 28px / 24px for content that needs room (the scoreboard).
- `.jm-dialog__head`: the title in `headline` and a close ✕ as `.jm-btn.jm-btn--icon.jm-btn--bare`, `aria-label="Close …"`.
  The ✕ hangs into the padding by negative margins, so the head row is only as tall as the title and the first line below it sits one gap (10px) under the title.

## Rules

- One dialog at a time; no dialog opens another.
- Content is short: a sentence, a setting row or two, one or two buttons. Put a pair of actions in `.jm-pair`: *Cancel* / *Add Ilse*.
- Mark it up as `role="dialog"` with `aria-modal="true"` and `aria-labelledby` on its title; reconnecting, which blocks the game, is `role="alertdialog"` and has no ✕.
- The game keeps running behind it, so a dialog never covers a decision the player has to make right now.
