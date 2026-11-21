# Button

Pill buttons with a 2px ink outline: coral for the one thing to do now, label-cream for everything else, plus a few sizes the screens need.

## Variants

| Class | Use |
| --- | --- |
| `.jm-btn.jm-btn--primary` | The single action the moment is about: *Lock it in*, *Challenge ●1*, *Next song*, *Start game*, *Join*. Coral fill, ink text, `shadow-sticker-sm`; pressing sinks it 2px into its shadow. At most one per player context (a player's row counts as one context). |
| `.jm-btn` | Secondary actions: *Skip song ●1*, *Buy this card ●3*, *Keep listening*, *Reveal now*, *Change*. |
| `.jm-btn--xl` | The big main action, full width, 56px tall, 19px/800: *Start game*. Inside the moment panel every button, XL or not, is 44px at 15px/800 (see MomentPanel). |
| `.jm-btn--next` | A 50px button that fills its row: *Play again* on the winner screen. |
| `.jm-btn--lg` | A 52px secondary. Not used on any screen right now. |
| `.jm-btn--toggle` | On/off with `aria-pressed`. Pressed = ink fill, paper text. *Named the song ●+1* is pressed by colour alone. Add `.jm-btn--check` and a `.jm-btn__check` ✓ for a toggle that also shows a ✓: the ✓ sits in the left padding, which is wide enough in both states, so the label and the width stay put. In a `.jm-segmented` row the toggles have no ✓. |
| `.jm-btn--danger` | A destructive secondary action: *Close room*, *Delete my account*. `coral-text` label; still outlined, never filled. |
| `.jm-btn--nav` | A button that leads to another view: label on the left, the arrow (or another icon) on the right. *Scoreboard →*, *Sign out*. |
| `.jm-btn.jm-btn--dark` | The way out of a running game in the game menu: *End game*, *Leave game*. |
| `.jm-btn--icon` | Round 44px icon button: the gear for the game menu, the back arrow on sub-screens, − and + in a stepper. Always an `aria-label`. |
| `.jm-btn--icon.jm-btn--bare` | Borderless round icon button: a pop-up's close ✕, removing a player from the lobby, the pencil to rename yourself. |
| `.jm-btn--icon-sm` | Round 36px icon button for rare controls: restart under the tape. The one exception to the 44px rule. |
| `.jm-pair` | Two equal buttons side by side: *Back* / *Take a seat*, *Cancel* / *Add Ilse*. |
| `.jm-chip` | The room code. Not a button. |
| `.jm-status` / `--quiet` | Read-only state where a button would be: *Waiting for Mara*, *Reconnecting…* (ink pill); `--quiet` for a muted one. |
| `.jm-select` | A choice from a list too long for toggles: *Deck mix* on the settings screen. |

A link that looks like a button is `a.jm-btn` (no underline, ink text).

## Rules

- Every tappable thing is at least `touch-min` (44px) tall *and* wide, except `--icon-sm`.
- Labels are sentence case, verb first, one or two words. If an action costs or earns tokens, end the label with the coin (`jm-token`, 14px inside a button) and the number (`+1` when it earns), with no dot or other separator; the button's gap spaces it.
- Something you can't take back that affects everyone (*Close room*, *End game*, skipping an away player's turn) takes a second tap: the first one swaps the label to *Tap again to close it for everyone*.
- Disabled buttons drop to 45% opacity and lose their shadow; prefer hiding an action that can't happen at all.
- Hover, only with a mouse or trackpad (`@media (hover: hover) and (pointer: fine)`): the ink outline gets 1px heavier (an inset 1px ink ring). No lift and no added shadow; a primary button keeps its own. `--bare` buttons show a thin `ink-subtle` outline. Touch screens never see hover.
- Focus ring: 2px ink outline, 2px offset.
- Icons: 24px grid, round caps and joins, stroke 2.4 (3 for ✕ and ✓), drawn in `currentColor`.
