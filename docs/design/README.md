# Jamster design

The visual language of Jamster, and how it was found.

| Folder | What |
| --- | --- |
| [`system/`](system/) | **The design system.** Start with [`system/README.md`](system/README.md) (the brand book), then the component guidelines in `system/components/*/README.md`. |
| [`screens/`](screens/) | **The app's screens**, mocked up on the system: entry and sign-in, joining a room, the lobby and its settings, the game screen (placing, challenge, challengers guess, reveal) with its menu and pop-ups, and the winner. |
| [`exploration/`](exploration/) | The six-round brainstorm that led to the system, kept as a record. |
| [`tools/`](tools/) | Three small scripts to regenerate the files below. |

## Using the system in the frontend

- `system/tokens.json` holds every value (colours, type, spacing, radii, shadows, tilt, sizes). `system/tokens.css` is the same as CSS custom properties, generated from it: `python3 tools/tokens_to_css.py`.
- `system/components/bundle.css` holds every component as plain CSS classes prefixed `jm-`, on top of `tokens.css`. It also imports the three Google fonts (Rubik Mono One, Bricolage Grotesque, DM Mono). There's no JavaScript; wrap the classes in React components.
- Design size is a landscape phone, 844 × 390 CSS px. See `system/components/Header/README.md`, and build each screen like its board in `screens/`.

## Looking at it

GitHub shows the source of HTML files, not the page, so open these locally in a browser (or serve the folder, e.g. `python3 -m http.server` from `docs/design/`):

- `system/preview/index.html`: every component rendered.
- `screens/preview/index.html`: the screens, with the reasoning behind them. The boards are live: tap gaps and card halves.
- `exploration/preview/index.html`: every exploration board by round; click one to open it full size. Animated boards (tapes, phone screens, heroes) play.

## Where the files come from

All three were designed with Claude, as artifacts: the exploration and the screens as design canvases, the system as a design-system page. The files here are a **snapshot** of them. Later edits in either place don't sync on their own, so copy changes across, or treat this folder as the source from now on.

- `exploration/canvas/` holds the canvas's own files (`*.dc.html` boards plus `canvas.json` for the layout). They only render in the Claude canvas.
- `exploration/preview/` holds the same boards as plain HTML. They run on `dc-runtime.js`, a small stand-in for the canvas runtime that supports exactly what these boards use. Regenerate one with `python3 tools/export_canvas.py exploration/canvas/<Board>.dc.html exploration/preview/<Board>.html dc-runtime.js`.
- `screens/canvas/` and `screens/preview/` are the same pair for the screens canvas. In the canvas the boards load the canvas's own copy of the system (`ds/jamster/`, not kept here); the previews link `system/tokens.css` and `system/components/bundle.css` instead: `python3 tools/export_canvas.py screens/canvas/<Board>.dc.html screens/preview/<Board>.html ../../exploration/preview/dc-runtime.js ../../system/tokens.css ../../system/components/bundle.css`.
- `system/components/*/preview.html` are the design-system page's preview cards; `system/preview/*.html` are the same cards with the two stylesheets linked, so they open on their own: `python3 tools/system_previews.py`.

## Decisions, in one place

1. **Round 1: direction.** Mixtape (light, chunky, cassette stickers) over Vinyl Night and Signal.
2. **Round 2: palette.** "Mixtape Soft" (E): warm paper, ink, coral and mustard.
3. **Round 3: logo shape.** L2, the tilted pill.
4. **Round 4: playing tape.** T4's tilted sticker cassette with T2's progress bar on the label; turning reels; no "Side A".
5. **Round 5: layout.** V2, the landscape-phone host screen.
6. **Round 6: brand font.** Rubik Mono One, with the pill logo.

Since then, one tilt (−4°) is used for everything that tilts: the logo, the tape and the pick cards.

7. **Game screen.** Landscape, with the timeline at full width along the bottom, one centre panel for the decision of the moment, a compact scoreboard, and the host entering choices on each player's row (no "play as" menu). Portrait layouts and an earlier/later stepper were tried and dropped; see `screens/preview/index.html` for the reasoning.
8. **The other screens.** Built from the same parts, which then moved into the system as Header, Dialog, Toast, Input, Rows, Stepper, Progress, YearChip and Hero. Home, the sign-in error and the winner share one cover (slow-bobbing tape, drifting song cards). Pop-ups are centred over the dimmed game. Playback problems are toasts, not screens. Ways out are words (Back, Leave room, Close room, End game), never an arrow beside the logo. The game menu is a gear.
