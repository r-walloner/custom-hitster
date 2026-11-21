# Rows

The list rows outside the game: a setting with its button, a choice among options (playback mode, speakers), a checkbox (library sources), and a player in the lobby.

## Variants

| Class | Use |
| --- | --- |
| `.jm-setting` › `.jm-setting__text` (`jm-label` + `.jm-setting__value`, optional `jm-caption`) + a button | *Music plays on / Living room TV*, *Your songs / 1,940 songs*, *Rules / First to 10 cards*, each with *Change* (*View* for a guest's rules, *Sign in* without Spotify). Rows are split by 2px `sand-line`; the last has none. On the settings screen the text is a `jm-section` name with a `jm-caption`, and the control (stepper, toggles, select) sits on the right; a guest sees the value there instead, at the stepper's 22px/800. |
| `.jm-option` › icon + text + `.jm-option__dot` | One of several: *One speaker* / *Separate speakers*, *Living room TV* / *Whichever device is active*. A real `<button>` with `aria-pressed`. Pressed: ink outline, `turn-tint`, `shadow-sticker-sm`, filled dot. Can't be picked: `disabled`, dashed outline, says why. |
| `.jm-option-box` › `.jm-option` + `.jm-option-box__more` | A picked option with one more line inside its card, lined up under the name: the speaker's *Test* button and what it does. A button can't hold another button, so the box wraps both. |
| `.jm-check-row` › `.jm-check` + `.jm-check-row__text` (`__name` + `jm-caption`) + `.jm-check-row__count` | Many of several: the library sources that feed the deck. A `<label>` holding a real checkbox. `--off` mutes the name of one that's left out; `--pinned` sets the most important item first with an 800 name and a rule under it. The caption says what it is (*Playlist*, *Your last 50 plays*) or how its import is going (*Waiting to import*, a bar and *Importing…*). Pair the list with `.jm-search` and *All* / *None*. |
| `.jm-player.jm-player--list` | A player in the lobby: avatar, name, a small status line (*Host, 1,940 songs in library*, *Importing library…*, *Guest*, *Local player*, *Reconnecting…*), then a fixed 44px slot for the pencil (rename yourself) or the bare ✕ (the host removes someone), empty otherwise, so the badges line up. `--you` tints the player looking at the screen. |

## Avatars

`.jm-avatar.jm-p1`…`jm-p5`: the initial on the player's colour, 24px; `--sm` 22px, `--lg` 28px (the scoreboard, the winner's list, the table you join), `--xl` 44px (a name pop-up). `--away`: a dashed outline for a player who is reconnecting, never a colour change.

## Rules

- Every row is at least 44px tall and tappable as a whole.
- A row's status line is one short fact. Separate parts with a comma, never a middle dot.
