# Button

Pill buttons with a 2px ink outline: coral for the one thing to do now, label-cream for everything else, round icon buttons for repeat controls.

## Variants

| Class | Use |
| --- | --- |
| `.jm-btn.jm-btn--primary` | The single action the moment is about: *Lock it in*, *Challenge*, *Start game*, *Next song*. Coral fill, ink text, `shadow-sticker-sm`; pressing sinks it 2px into its shadow. At most one per player context (a challenger cell counts as one context). |
| `.jm-btn` | Secondary actions: *Skip · 1 token*, *Pass* (as text), *Invite*. |
| `.jm-btn.jm-btn--dark` | Toggles that hold something: *Keep listening*, and a challenger's committed state shown as a button. |
| `.jm-btn--icon` | Round 44px icon button for restart, retry, pass ✕. Always an `aria-label`. |
| `.jm-btn--square` | Square-ish 44px icon button for header controls (game menu). |
| `.jm-select` in `.jm-field` | Acting-as and device choice. Keep the visible label short ("As"). |
| `.jm-chip` | The room code. Not a button. |
| `.jm-status` / `--quiet` | Read-only state where a button was: *Marking…* (ink pill) and *Passed* (quiet). |

## Rules

- Every tappable thing is at least `touch-min` (44px) tall *and* wide.
- Labels are sentence case, verb first, one or two words. If an action costs a token, say so on the button: *Skip · 1 token*.
- Disabled buttons drop to 45% opacity and lose their shadow; prefer hiding an action that can't happen at all.
- Focus ring: 2px ink outline, 2px offset.
- Icons: 24px grid, round caps and joins, stroke 2.4 (3 for ✕), drawn in `currentColor`.
