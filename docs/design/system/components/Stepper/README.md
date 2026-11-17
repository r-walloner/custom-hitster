# Stepper

Number settings with − and +, and a row of toggles for picking one of a few values.

## Variants

| Class | Use |
| --- | --- |
| `.jm-stepper` › `.jm-btn--icon` − · `.jm-stepper__value` · `.jm-btn--icon` + | Cards to win, starting tokens, deck size. The value is a plain number at 22px/800 with tabular figures: no coin, no unit unless it's needed. |
| `.jm-segmented` › `.jm-btn--toggle` | One of a few fixed values: *10 s · 15 s · 20 s · 30 s*, or *One speaker* / *Everyone's Spotify*. Exactly one has `aria-pressed="true"`. |

## Rules

- Put the group in a `role="group"` labelled by the setting's name.
- Give − and + an `aria-label` that says what changes (*Fewer cards*, *More cards*).
- Four toggles at most; more choices go in a `.jm-select`.
