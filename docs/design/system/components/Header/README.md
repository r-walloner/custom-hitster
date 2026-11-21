# Header

The 44px row at the top of every screen: logo, room code, one line of where you are, and at most a few buttons on the right.

## Anatomy

- `.jm-screen` is the frame every screen sits in: 844 × 390 (`--screen-w`, `--screen-h`), 10/16/12px padding (side padding grows to `env(safe-area-inset-*)` on notched phones), rows `space-8` apart.
- `.jm-header` › `.jm-logo`, `.jm-chip` (room code), `.jm-header__spacer`, `.jm-header__meta`, then the buttons.
- `.jm-header__meta` holds the one line: `<b>` for the numbers, `<i></i>` for the dot between parts.

## What the line says

- Outside the game: *Mara's room · 4 players · First to 10*. On the winner screen the last part becomes *Game over*. The lobby shows no room code chip: the code is in its own panel there.
- In the game: *Turn 7 · 38 cards left · First to 10*, right after the room code.
- These dots are the only middle dots in the app. Everywhere else, separate with commas and full stops.

## Buttons

- In the game, the menu is a round `.jm-btn--icon` with the gear icon, `aria-label="Game menu: playback device, scoreboard, end game"`. *Reveal now* sits left of it during the challenge and the challenger's guess, for the host only.
- Sub-screens (your songs, game settings, the speaker) replace the logo with a round back arrow and put the screen's name in `headline`; their main action (*Done*, primary, at least 96px) sits on the right, after anything else the screen needs up there (*Imported 3 days ago*, *Refresh library*, *Refresh devices*, *The host sets these.*).
- Never put a back arrow next to the logo. Back is the left half of a `.jm-pair` (*Back* / *Take a seat*), and leaving is a plain secondary button (*Leave room*, *Close room*).

## Scaling

- The 844 × 390 design is zoomed to fit the viewport both ways; whatever is left over goes to the screen in design pixels, so a wider phone gets a wider middle and a taller one a taller screen.
- From about 1024px wide the zoom stops and the desktop layouts take over: a 56px header row (`.dk-header`) in a centred column at most 1280px wide. See *Desktop*.
- Portrait phones get no layout of their own: the logo and *Turn your phone sideways.* *Jamster is played in landscape.*
