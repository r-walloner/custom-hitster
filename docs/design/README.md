# Jamster design

The visual language of Jamster, and how it was found.

| Folder | What |
| --- | --- |
| [`system/`](system/) | **The design system.** Start with [`system/README.md`](system/README.md) (the brand book), then the component guidelines in `system/components/*/README.md`. |
| [`screens/`](screens/) | **The app's screens**, mocked up on the system as the app builds them: Home, your account and your songs, sign-in and room errors, joining a room, the lobby with its settings and speaker screens, dealing, the game screen (placing, challenge, challenger's guess, reveal) with its menu and pop-ups, and the winner. Plus desktop versions of representative screens (`Desktop*`): Home, the lobby, your songs, placing, the reveal, the scoreboard pop-up and the winner. |
| [`exploration/`](exploration/) | The six-round brainstorm that led to the system, kept as a record. |
| [`tools/`](tools/) | Three small scripts to regenerate the files below. |

## Using the system in the frontend

- `system/tokens.json` holds every value (colours, type, spacing, radii, shadows, tilt, sizes). `system/tokens.css` is the same as CSS custom properties, generated from it: `python3 tools/tokens_to_css.py`.
- `system/components/bundle.css` holds every component as plain CSS classes prefixed `jm-`, on top of `tokens.css`. It also imports the three Google fonts (Rubik Mono One, Bricolage Grotesque, DM Mono). There's no JavaScript; wrap the classes in React components.
- Design size is a landscape phone, 844 × 390 CSS px. See `system/components/Header/README.md`, and build each screen like its board in `screens/`.
- From about 1024px wide, `system/components/desktop.css` adds the desktop layouts (`dk-` classes, on top of `bundle.css`); see `system/components/Desktop/README.md` and the `Desktop*` boards. The frontend doesn't use it yet. The hover rules are in `bundle.css` itself.
- The frontend uses copies of both stylesheets, in `frontend/src/styles/` (`tokens.css`, and `jamster.css` = `bundle.css` without the font `@import`, since `index.html` loads the fonts). Re-copy them after changing the system here.
- Several parts came into the system from the app (the moment panel's frame and result, the cover screen, import progress, the scroll area, avatar sizes, the toast dock and more). The frontend still draws them with its own classes in `frontend/src/styles/app.css` and the screens' `.css` files, which match the `jm-` rules here; switching it to the `jm-` names would let those go.

## Looking at it

GitHub shows the source of HTML files, not the page, so open these locally in a browser (or serve the folder, e.g. `python3 -m http.server` from `docs/design/`):

- `system/preview/index.html`: every component rendered.
- `screens/preview/index.html`: the screens, with the reasoning behind them, each board in its variants (host and guest, acting and watching). The boards with controls are live: tap gaps, toggle *Named the song*, pick songs and speakers, step the settings.
- `exploration/preview/index.html`: every exploration board by round; click one to open it full size. Animated boards (tapes, phone screens, heroes) play.

## Where the files come from

All three were designed with Claude, as artifacts: the exploration and the screens as design canvases, the system as a design-system page. The files here started as a **snapshot** of them and are now the source: the system and the screens were brought in line with the app as built (November 2026), and the artifacts were not. Keep this folder in step with the frontend when a screen changes.

- `exploration/canvas/` holds the canvas's own files (`*.dc.html` boards plus `canvas.json` for the layout). They only render in the Claude canvas.
- `exploration/preview/` holds the same boards as plain HTML. They run on `dc-runtime.js`, a small stand-in for the canvas runtime that supports exactly what these boards use. Regenerate one with `python3 tools/export_canvas.py exploration/canvas/<Board>.dc.html exploration/preview/<Board>.html dc-runtime.js`.
- `screens/canvas/` and `screens/preview/` are the same pair for the screens canvas. A board's props (the canvas's Tweaks) pick its variant; in a preview the page's query does (`Lobby.html?role=guest`), and a `<dc-import name="X" query="…">` passes them to a board shown behind a pop-up. In the canvas the boards load the canvas's own copy of the system (`ds/jamster/`, not kept here; copied from `system/` in November 2026, with `desktop.css`); the previews link `system/tokens.css` and `system/components/bundle.css` instead: `python3 tools/export_canvas.py screens/canvas/<Board>.dc.html screens/preview/<Board>.html ../../exploration/preview/dc-runtime.js ../../system/tokens.css ../../system/components/bundle.css`. The `Desktop*` boards also need `../../system/components/desktop.css` at the end.
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
9. **After building it.** The app changed a few decisions, and the system and screens follow it: a pick is placed only with the + gaps (no card halves); one challenger per turn, the first to challenge, with one decision per device; the player on turn may buy the card in play; only the host reveals early, judges *Named the song* and moves on; every moment-panel button has one slimmer style; the reveal shows the song's cover and whose libraries it came from. Home became the menu outside a room (with your account as a pop-up and your songs as their own screen), guests got the host's lobby layout, the playback mode moved to the speaker screen, and toasts, a waiting screen, room errors and a portrait prompt were added.
10. **Desktop.** From about 1024px wide the screens get their own layouts instead of the zoomed phone, laptop first but readable from a few metres: one centred column at most 1280px wide, bigger type, more room. Outside the game only the layout relaxes. In the game the mini scoreboard grows into a player list with full names and a status line, and the timeline wraps onto a second row on a fixed slot + card grid, so the whole timeline is visible at a glance and no card moves between phases. Hover exists only with a mouse or trackpad: a heavier ink outline, never a shadow, which stays for emphasis.
