# Header

The 44px row at the top of every screen: logo, room code, one line of where you are, and at most one or two buttons on the right.

## Anatomy

- `.jm-screen` is the frame every screen sits in: 844 × 390, 10/16/12px padding (side padding grows to `env(safe-area-inset-*)` on notched phones), rows `space-8` apart.
- `.jm-header` › `.jm-logo`, `.jm-chip` (room code), `.jm-header__spacer`, `.jm-header__meta`, then the buttons.
- `.jm-header__meta` holds the one line: `<b>` for the numbers, `<i></i>` for the dot between parts.

## What the line says

- Outside the game: *Mara's room · 4 players · First to 10*. On the winner screen the last part becomes *Game over*.
- In the game: *Turn 7 · 38 cards left · First to 10*.
- On the account screen: the signed-in name and *Spotify Premium*.
- These dots are the only middle dots in the app. Everywhere else, separate with commas and full stops.

## Buttons

- In the game, the menu is a round `.jm-btn--icon` with the gear icon, `aria-label="Game menu"`. *Reveal now* sits left of it during the challenge and guessing states.
- Sub-screens (game settings, the speaker) replace the logo with a round back arrow and put the screen's name in `headline`; their main action (*Done*) sits on the right.
- Never put a back arrow next to the logo. Back is the left half of a `.jm-pair` (*Back* / *Take a seat*), and leaving is a plain secondary button (*Leave room*, *Close room*).

## Scaling

- Smaller landscape phones (≈ 740–800 wide): the middle shrinks; the board scrolls.
- Laptop / TV (16:9): the same regions scaled up (root zoom ≈ 1.5–2×), with `shadow-sticker-lg`.
- Portrait phones are not designed; ask players to rotate.
