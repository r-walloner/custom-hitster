# Toast

One line of feedback after an action: what happened, then one short fact, sometimes with one button.

## Anatomy

- `.jm-toast` › `.jm-toast__badge` (round, 30px) + `.jm-toast__text`, and with `.jm-toast--action` a button at the end.
- Badges: `--right` (✓ on `right`) for things that worked, `--wrong` (✕ on `wrong`, paper icon) for refusals and failures, no modifier (`sand`) for heads-ups.

## Rules

- One at a time, bottom centre above the board, gone after 4 seconds or on tap. Use `role="status"`; a failure that needs an action uses `role="alert"`.
- Wording: what happened, then one short fact. Nothing more. *Not your turn. Sam is placing.* *Lea's connection dropped. Her seat is safe.* *Invite link copied.*
- Coins only when tokens are the point: *Not enough tokens. A card costs ●3.*
- Playback problems are toasts, not screens: *Sam's music dropped.* with *Retry*; *Living room TV stopped playing.* with *Change*.
- At most one button, one word, primary.
