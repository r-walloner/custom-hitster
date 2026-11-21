# Desktop

The same screens on a window from about 1024px wide: a laptop at arm's length first, with the game still readable from a few metres. The classes are in [`../desktop.css`](../desktop.css), prefixed `dk-`, and load after `tokens.css` and `bundle.css`. The boards are in `../../../screens/` (`Desktop*.dc.html`).

The landscape phone (844 × 390, zoomed to fit) stays the primary design. Below the breakpoint the app keeps it; from the breakpoint up it switches to these layouts. Desktop changes layout, type sizes and spacing only: the words, colours, outlines, shadows and `jm-` components are the same.

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
