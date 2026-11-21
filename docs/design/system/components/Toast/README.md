# Toast

One line of feedback: what happened, then one short fact, sometimes with one button.

## Anatomy

- `.jm-toast` › `.jm-toast__badge` (round, 30px) + `.jm-toast__text`, and with `.jm-toast--action` a button at the end.
- Badges: `--right` (✓ on `right`) for things that worked, `--wrong` (✕ on `wrong`, paper icon) for refusals and failures, no modifier (`sand`, an *i*) for heads-ups.
- `.jm-toast-dock` places it at the bottom centre of the screen, above the board.

## Rules

- One at a time, gone after 4 seconds. What just happened on this device comes first, then the server's refusal, then music that didn't start. Use `role="status"`; a failure that needs an action uses `role="alert"`.
- Wording: what happened, then one short fact. Nothing more. *Invite link copied.* *Couldn't copy the link. Share the code instead.* *Lea is away. The seat is kept for them.* A refused move shows the server's own sentence (*It is not your turn*).
- Playback problems are toasts, not screens, and only during the game: *Sam's music didn't start.* with Spotify's reason and *Retry*, with a speaker-off badge.
- At most one button, one word, primary.
