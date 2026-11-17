# Rows

The list rows outside the game: a setting with its *Change* button, a choice among options (speakers), a checkbox (playlists), and a player in the lobby.

## Variants

| Class | Use |
| --- | --- |
| `.jm-setting` › `.jm-setting__text` (`jm-label` + `.jm-setting__value`) + a button | *Music plays on / Living room TV* with *Change*; *Rules / First to 10 cards* with *Change*. Rows are split by 2px `sand-line`; the last has none. On the settings screen the text is a `jm-section` name with a `jm-caption`, and the control (stepper, toggles, select) sits on the right. |
| `.jm-option` › icon + text + `.jm-option__dot` | One of several (*Living room TV*, *This browser*). A real `<button>` with `aria-pressed`. Pressed: ink outline, `turn-tint`, `shadow-sticker-sm`, filled dot. Unreachable: `disabled`, dashed outline, says why (*Asleep. Open Spotify on it to wake it.*). |
| `.jm-check-row` › `.jm-check` + text + `.jm-check-row__count` | Many of several: playlists and artists that feed the deck. A `<label>` holding a real checkbox. Pin the most important item first (*Liked songs*) with an 800 name and a `sand-line` rule under it. Pair the list with `.jm-search` and *All* / *None*. |
| `.jm-player.jm-player--list` | A player in the lobby: avatar, name, a small status line (*Host, 1,940 songs in library*, *Guest, reconnecting…*, *Local player*), and an optional bare ✕ to remove them. |

## Rules

- Every row is at least 44px tall and tappable as a whole.
- A row's status line is one short fact. Separate parts with a comma, never a middle dot.
- A player who is reconnecting gets a dashed avatar outline, not a colour change.
