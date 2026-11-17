# ChallengeWindow

The short, timed moment after a placement: one sentence saying what was placed, a countdown ring, and one cell per other player to Challenge or Pass.

## Parts

- `.jm-panel.jm-challenge`: the panel.
- Head: `.jm-label` "Challenge window" (coral-text, mono caps) over a `.jm-headline` that says the placement in plain words: "Mara put it between 1994 and 2008."
- `.jm-ring`: countdown. Set `--p` to the elapsed share (0–100); the coral wedge grows as time runs out, with the whole seconds left in the centre. Give it `role="timer"` and an `aria-label`.
- `.jm-challengers`: a 2-column grid of `.jm-challenger` cells (46px tall). Each has an avatar, the name (with "no phone" under it when the host plays for them) and one of:
  - **Open**: `.jm-btn--primary` *Challenge* + `.jm-btn--icon` ✕ (*Pass*, labelled "Pass for <name>").
  - **Challenging**: `.jm-status` *Marking…* while they pick a gap (their mark stays hidden).
  - **Passed**: `.jm-status--quiet` *Passed*.

## Rules

- The host can tap any cell. Cells for players without a phone look identical apart from the "no phone" line, so one device can run the whole window inside the time limit.
- On wider layouts the cells go four across; on a phone, keep two columns.
- When the timer ends, all open cells become *Passed* automatically; never leave the window waiting.
- The same panel shape works for the other short, timed moments (naming the song, buying a card): label + headline + ring + per-player cells.
