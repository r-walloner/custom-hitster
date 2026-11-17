# Button

Pill buttons with a 2px ink outline: coral for the one thing to do now, label-cream for everything else, plus a few sizes the game screen needs.

## Variants

| Class | Use |
| --- | --- |
| `.jm-btn.jm-btn--primary` | The single action the moment is about: *Lock it in*, *Challenge*, *Lock Sam's guess*, *Next song*. Coral fill, ink text, `shadow-sticker-sm`; pressing sinks it 2px into its shadow. At most one per player context (a player cell counts as one context). |
| `.jm-btn` | Secondary actions: *Skip song · ●1*, *Buy a card · ●3*, *Keep listening*, *Reveal now*. |
| `.jm-btn--xl` | The moment panel's main action, full width, 56px tall, 19px/800. |
| `.jm-btn--next` | *Next song*: skip icon + label on one line, fills the row next to *Keep listening*. |
| `.jm-btn--lg` | 52px secondary that sits beside `--next` (*Keep listening*). |
| `.jm-btn--toggle` | On/off with `aria-pressed`. Pressed = ink fill, paper text, plus a ✓ icon: *Named it · +●1*. Tap again to undo. |
| `.jm-btn.jm-btn--dark` | A held state shown as a button. |
| `.jm-btn--icon` | Round 44px icon button: pass ✕ in a player cell. Always an `aria-label`. |
| `.jm-btn--icon-sm` | Round 36px icon button for rare controls: restart under the tape. The one exception to the 44px rule. |
| `.jm-btn--square` | Square 44px icon button for the header ⋯ game menu. |
| `.jm-pair` | Two equal buttons side by side (*Skip song* / *Buy a card*). |
| `.jm-chip` | The room code. Not a button. |
| `.jm-status` / `--quiet` | Read-only state where a button was: *Challenged*, *Guessing…* (ink pill) and *Passed* (quiet). |
| `.jm-select` in `.jm-field` | Device choice in the lobby. Not used in game: the host enters choices on each player's own row instead. |

## Rules

- Every tappable thing is at least `touch-min` (44px) tall *and* wide, except `--icon-sm`.
- Labels are sentence case, verb first, one or two words. If an action costs or earns tokens, show the coin (`jm-token`) and the number on the button.
- Disabled buttons drop to 45% opacity and lose their shadow; prefer hiding an action that can't happen at all.
- Focus ring: 2px ink outline, 2px offset.
- Icons: 24px grid, round caps and joins, stroke 2.4 (3 for ✕ and ✓), drawn in `currentColor`.
