# Stepper

Number settings with − and +, and a row of toggles for picking one of a few values.

## Variants

| Class | Use |
| --- | --- |
| `.jm-stepper` › `.jm-btn--icon` − · `.jm-stepper__value` · `.jm-btn--icon` + | Cards to win, starting tokens, deck size (in steps of 10). The value is a plain number at 22px/800 with tabular figures: no coin, no unit unless it's needed. − and + grey out at the limits. |
| `.jm-segmented` › `.jm-btn--toggle` | One of a few fixed values: *5 s · 10 s · 15 s · 20 s* to challenge, *5 s · 10 s · 15 s · Tap* for the next song. Exactly one has `aria-pressed="true"`. |

## Rules

- Put the group in a `role="group"` labelled by the setting's name.
- Give − and + an `aria-label` that says what changes (*Fewer cards*, *More cards*).
- Four toggles at most; more choices go in a `.jm-select`. A choice between two things that each need a sentence goes in option rows (see Rows).
