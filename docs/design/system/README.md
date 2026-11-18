# Jamster

**Jamster** is a party game for one group of friends, built from their own Spotify libraries: a song plays, and you place it on your timeline, earlier or later than the cards you hold. This design system is its look. It's playful and a bit retro, like a mixtape made for a friend, and it stays calm enough that the game is always easy to read across a room.

It came out of a six-round exploration (warm "Mixtape Soft" colours, the L2 pill logo in Rubik Mono One, the tilted sticker cassette with a progress bar on its label) and was then finished on the real **game screen**: a landscape phone where the timeline gets the full width, one centre panel holds the decision of the moment, and the host plays for anyone without a separate "play as" menu.

## Using this system

- **Load** `tokens.css` and `components/bundle.css`. bundle.css imports the three Google fonts and holds every component as plain CSS classes prefixed `jm-`. There is no JavaScript bundle; the app is React, so wrap these classes in your own components.
- **Design size**: a landscape phone, **844 × 390** CSS px. Everything is drawn at that size; scale up for laptops and TVs (see *Header*).
- **Build screens** from the components below; the screens themselves are mocked up separately, in [`../screens/`](../screens/).

## Voice

- Talk like the friend who's hosting: short, plain, a little cheeky. "Between 1994 and 2008?" "Mara says 1994 to 2008. Is that right?" "Sam, where does it really go?" "Mara nailed it."
- Say what just happened in one sentence, with names and years, not system words ("Placement committed" ✗, "Challenge window" ✗: just "Challenge").
- Buttons: sentence case, verb first, one or two words. If it costs or earns tokens, put the coin and the number right after the label, with no separator: *Skip song ●1*, *Buy a card ●3*, *Named it ●+1*.
- State labels: *Challenged*, *Passed*, *Guessing…*. Guesses are never secret, so don't say "hidden".
- Never reveal anything about the song in play (title, artist, year, whose library) before the reveal.
- Feedback and errors: say what happened, then one short fact. "Connection dropped. Your progress is safe." "Not your turn. Sam is placing." Nothing more.
- Middle dots only in the header line (*Mara's room · 4 players · First to 10*). Everywhere else use commas and full stops.
- Ways out are words, not arrows: *Back* as the left half of a button pair, *Leave room*, *Close room*, *End game*.
- No emoji in the UI.

## Visual foundations

### Colour

A warm paper ground with one loud colour for action, one for mystery, and a right/wrong pair that only appears after the reveal.

| Role | Token | Rule |
| --- | --- | --- |
| Ground | `paper` | Every screen. |
| Surfaces | `label` | Panels, cards, secondary buttons, always outlined in `ink`. |
| Sunken | `sand`, `slot-empty` | Tracks and remainders (countdown ring, scroll indicator), not text grounds. |
| Text & lines | `ink`, `ink-muted`, `ink-subtle` | All text is one of these three (or `coral-text`, or `paper` on `wrong`/`ink`). |
| Action | `coral` | The one thing to do now: primary buttons, the tape, progress, the countdown, the logo. Text on coral is **ink**, never white (4.6:1). |
| Mystery & tokens | `mustard` | The pick being placed or guessed *right now*, that guesser's row in the panel, the token coin. |
| On turn & settled | `turn-tint` | The on-turn player's scoreboard row, picks already locked in, the card just won. |
| Right | `right` | The *Right* verdict and the ✓ mark. Ink on top. |
| Wrong | `wrong` | The ✕ mark. Paper on top. Darker than coral, so the two read apart by lightness. |
| Players | `player-1`…`player-5` | Avatars only. Always paired with an initial or name. |

`coral` and `mustard` double as player colours 1 and 3. That's fine because player colours never appear without a name, but don't use player colours for UI states. Timeline cards carry **no** player colour: every card on a board belongs to the same player, and the board's heading says whose.

### Type

- **Rubik Mono One** (brand): the logo, and the one big line on the winner screen ("Mara wins!", `jm-big-moment`). It's caps-only and very wide; never set sentences in it.
- **Bricolage Grotesque**: everything players read. Years are 800 weight with tabular figures; the tape label uses the same face for `????` and the year (`tape-year`), so the marks line up like digits. The moment panel's sentence is 22px/800 (`moment`), other headlines 17px/800, and body text never goes below 13px for anything you need to act on.
- **DM Mono**: small "machine" text: time, room code, uppercase state labels.

### Shape: the sticker

- Every raised thing has a **2px ink outline** (`stroke-control`) and a **hard offset shadow with no blur** (`shadow-sticker-sm` / `shadow-sticker` / `-lg`). That's the whole look; don't add soft shadows or gradients.
- Radii: `radius-pill` for buttons, chips, marks and the logo, `radius-card` for cards, gaps and cells, `radius-panel` (18px for the moment panel) for panels.
- **Tilt** marks what's special. One angle, the `tilt` token (−4°), used by exactly three things: the logo, the playing tape and the yellow pick cards on the board. Nothing else rotates, except on a cover (*Hero*): there the floating cards lean freely and the Home slogan sits at `tilt`.
- Pop-ups are `label` panels with `shadow-sticker-lg` over the screen dimmed with ink at 55% (*Dialog*).
- Pressing a primary button sinks it 2px into its shadow.

### Motion

- The cassette reels spin only while audio is actually playing. The progress bar and the tape packs move with the song. The 3px tape bob is on in the game screen; the footer under the tape leaves room for it.
- Countdowns are always the filling ring (`jm-ring`): challenge window, guessing, and the automatic next song. Don't show a countdown any other way. Amounts (an import, cards dealt, cards toward the goal) use the bar (`jm-progress`), which never counts down.
- On covers (Home, the sign-in error, the winner) the tape bobs slower, 1.2 s a swing (`jm-tape--slow`), and the song cards drift a few pixels, each at its own pace (`jm-float`).
- Everything else is still: no idle animations, no parallax. `prefers-reduced-motion` stops spin, bob, drift and transitions.

### Layout

Landscape phone first (844 × 390). Every screen starts with the 44px header (*Header*). In the game, a 172px top band follows (tape, moment panel, scoreboard), with the board below at full width. Touch targets are at least 44px; the only exception is the small restart icon, which is rarely used.

### Iconography

Inline SVG on a 24px grid: stroke 2.4, round caps and joins, `currentColor`. For ✕ and ✓ use stroke 3–3.4. The current set: restart, plus (gaps), skip (next song), pass ✕, right ✓, the gear (game menu), back arrow, speaker, search, link and the device shapes (TV, laptop, phone, speaker). Icon-only buttons are round (`jm-btn--icon`) and always carry an `aria-label`; a pop-up's close ✕ is borderless (`jm-btn--bare`). No emoji, no filled icon packs (the skip triangle is the one filled shape).

## Components

| Component | What it is |
| --- | --- |
| Logo | L2: lowercase wordmark in a tilted coral pill. |
| Button | Primary (coral), secondary, dark, XL, toggle, next, icon, chip, status pills, pair. |
| TapePlayer | The song in play: sticker cassette, label progress bar, time and a small restart icon. |
| SongCard | Revealed card, yellow pick card (now / locked), card just won, dashed + gap, ✓ / ✕ marks. |
| Board | The active player's timeline: full width, tap a gap or a card half, scrolls sideways with an indicator. |
| MomentPanel | The centre panel holding the one decision of the moment: place, challenge, guess, result. |
| Scoreboard | The mini scoreboard: initial, cards held, tokens. Always visible in the game; tapping it opens the full scoreboard. |
| YearChip | A timeline in short form, for the full scoreboard. |
| Header | The 44px row on every screen, and the 844 × 390 screen frame. |
| Dialog | A centred pop-up over the dimmed screen: game menu, scoreboard, adding a player, reconnecting. |
| Toast | One line of feedback, with at most one button. |
| Input | Room code, name, search, and the QR tile. |
| Rows | Setting rows, option rows (speakers), checkbox rows (playlists), players in the lobby. |
| Stepper | − / number / +, and segmented toggles. |
| Progress | A bar for amounts, never for time. |
| Hero | The cover art: slow-bobbing tape, drifting song cards, the big winner line. |

## Accessibility

- Text contrast: `ink` 14:1, `ink-muted` 7:1, `ink-subtle` 5.2:1, `coral-text` 4.9:1 on `paper`; ink on `coral` 4.6:1, on `mustard` 8.2:1, on `right` 7:1; paper on `wrong` 5.9:1. `slot-dash` and `sand-line` are decorative only.
- Never rely on colour alone: player colour + initial or name; right and wrong are ✓ / ✕ plus an initial, and the verdict pill says *Right* in words.
- Focus: a 2px ink outline with a 2px offset; text fields instead turn their own border coral (see Input). Card halves and gaps are real buttons with labels ("Put it before 1994").

## Not designed yet

A guest's in-game menu (leaving a running game), and portrait phones.
