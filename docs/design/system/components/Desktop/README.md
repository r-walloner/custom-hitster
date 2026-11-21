# Desktop

The same screens on a window at least 1000 × 640 CSS px: a laptop at arm's length first, with the game still readable from a few metres. The classes are in [`../desktop.css`](../desktop.css), prefixed `dk-`, and load after `tokens.css` and `bundle.css`. The boards are in `../../../screens/` (`Desktop*.dc.html`).

The landscape phone (844 × 390, zoomed to fit) stays the primary design. Desktop changes layout, type sizes and spacing only: the words, colours, outlines, shadows and `jm-` components are the same.

## Sizes in between: two layouts, a hard switch, scaling inside each

There are exactly two layouts, phone and desktop, and the app switches between them at one threshold. It never blends them. Within each layout, sizes scale continuously.

- **Why a switch, not a gradual relaxing.** The two layouts differ in structure, not just size: the scoreboard is a strip of initials on the phone and a list of named rows on desktop; the timeline scrolls sideways on the phone and wraps onto rows on desktop. There's no sensible halfway point between those, and every in-between state would need designing and testing on every screen.
- **The switch** depends on height as well as width, because the desktop game screen needs about 640px of height to fit without scrolling (the 56px header, the 334px top band and two timeline rows):

  ```css
  @media (min-width: 1000px) and (min-height: 640px) { /* desktop */ }
  ```

  The same condition in script: `matchMedia("(min-width: 1000px) and (min-height: 640px)")`. Pointer type doesn't matter: a landscape tablet gets desktop, and every desktop target is still at least 44px.
- **Inside the phone layout**, everything zooms by `min(width / 844, height / 390)`, with the space left over given to the screen in design pixels (see *Header*). A large landscape phone or a short window gets the same layout, bigger.
- **Inside the desktop layout**, the column is fluid up to 1280px, the timeline grid fits as many slot + card columns as there's room for, and spacing tightens below 1180px. Type and column widths should scale smoothly with `clamp()` between 1000 and 1600px wide rather than in steps, so a TV gets bigger lettering without a zoom of its own. (`desktop.css` still uses the 1180px step; moving it to `clamp()` is the next change.)

What that gives at common sizes:

| Window (CSS px) | Layout |
| --- | --- |
| Landscape phone, 844 × 390 to 932 × 430 | Phone, zoomed to fit. |
| Landscape tablet, 1024 × 768 or 1180 × 820 | Desktop, with the tighter spacing below 1180px. |
| Small laptop, 1280 × 720 | Desktop. |
| Short window, e.g. 1280 × 600 | Phone, zoomed to fit: below 640px of height the desktop game screen doesn't fit. |
| Laptop or monitor, 1440 × 900 and up | Desktop; the column stops at 1280px, the rest is paper. |
| TV, 1920 × 1080 | Desktop, type at the top of its `clamp()` range. |
| Narrow, tall window, e.g. 720 × 900 | Phone, zoomed to the width (see below). |

### Narrow, tall windows and the turn-sideways prompt

The phone layout is landscape only, so a window taller than it is wide needs a rule:

- **On a touch device** (`@media (pointer: coarse)`), a portrait screen gets the prompt to turn sideways, as before.
- **Anywhere else** (a laptop browser at half width, say), there's nothing to turn. Show the phone layout zoomed to the window's width, `width / 844`, at the top, with the height left over as plain `paper` below it. Never show the turn-sideways prompt to a mouse or trackpad.

### Building it in the app

- The switch belongs in `Fit.tsx`, which already decides the zoom: with the media query true, it sets no zoom and puts a root class (`.jm-desktop`) on the app; otherwise it zooms the phone layout as now.
- Screens then render the same components in both layouts, and only the styles change. That means keying the desktop rules off the root class (`.jm-desktop .jm-screen`, `.jm-desktop .jm-scoreboard` …) instead of separate `dk-` markup. The `dk-` classes in `desktop.css` are what the mock-ups use; when the frontend takes the layer on, convert them to root-class rules over the existing `jm-` markup. A few parts need markup that only desktop shows (the player list's name and status line, the empty `.dk-slot`s in the timeline); render those always and hide them on the phone.
- One threshold, no hysteresis needed: resizing across it simply swaps layouts, and the room state picks the screen either way.

## Anatomy

- `.dk-screen` is the page: at least the window's height, 40/56/48px of paper around the content (28/32/36px below 1180px). `--center` centres a cover screen (Home, the sign-in error) vertically.
- `.dk-frame` › the content, one centred column at most 1280px wide, rows 28px apart. A screen with one list narrows it (*Your songs*: 920px); a roomier screen widens the gap (lobby, winner: 32px).
- `.dk-header`: the 56px header row, with the same contents as `.jm-header` and bigger lettering (logo 22px, room code 15px, the line 16px, 52px icon buttons).

### The game

- `.dk-top`: the top band, in three columns: tape (232px), moment panel, players (340px).
- `.dk-moment` on `.jm-moment`: the same frame with bigger lettering (sentence 36px, buttons 60px, the main one 68px; reveal: 136px cover, 32px title, 64px ring).
- `.dk-score`: the mini scoreboard grown into a player list. A `<button>` holding a `.dk-score__head` row (Players, Cards, Tokens) and one `.dk-score__row` per player (`--turn` for the player on turn): avatar, full name with a status line in `<small>`, cards, tokens. Seat order, as on the phone. The statuses: *Your turn*, *On turn*, *Leading*, *That's you*, *Local player*, *Reconnecting…* (with the dashed avatar), *Challenged*, joined with commas. Clicking it opens the full scoreboard; the rows have no hover of their own.
- `.dk-board` › `.dk-board__row`: the timeline, wrapping instead of scrolling. 136 × 132px cards with 32px years.

## The timeline grid

- `.dk-board__row` is a grid of alternating columns, a 30px slot and a 136px card, repeated as often as they fit (seven cards a row at 1280px). Every row starts with a slot, so cards line up above and below each other.
- The order is always slot, card, slot, card … slot. A slot holds a `.jm-gap` (30px wide, the + to place the pick) or, where no gap is offered (watching, challenge, reveal), an empty `.dk-slot` of the same size, so no card moves when the gaps go away.
- The pick (`.jm-card--mystery`) and the revealed card take a card column, with an empty slot on each side. The revealed card lands exactly where the pick was.
- `--marks` adds room above the cards for ✓ / ✕ marks. A ✕ sits centred on the slot between two cards.

## Rules

- Never stretch content across a wide window: the column stops at 1280px and the rest is paper.
- Type sizes step up, never down, from the phone. Body text 15–16px, headlines 20–28px.
- No new content on desktop outside the game; layouts only get more room. In the game, the player list and the wrapping timeline are the only additions.
- Pop-ups stay centred over the dimmed screen, wider (up to 980px) but never full screen, with a borderless ✕ to close them.
- Hover only exists with a mouse or trackpad (see *Button*); touch screens never see it.
