# Jamster

**Jamster** is a party game for one group of friends, built from their own Spotify libraries: a song plays, and you place it on your timeline, earlier or later than the cards you hold. This design system is its look. It's playful and a bit retro, like a mixtape made for a friend, and it stays calm enough that the game is always easy to read across a room.

It came out of a six-round exploration (warm "Mixtape Soft" colours, the L2 pill logo in Rubik Mono One, the tilted sticker cassette with a progress bar on its label) and was then finished on the real **game screen**: a landscape phone where the timeline gets the full width, one centre panel holds the decision of the moment, and the host plays for local players without a separate "play as" menu.

## Using this system

- **Load** `tokens.css` and `components/bundle.css`. bundle.css imports the three Google fonts and holds every component as plain CSS classes prefixed `jm-`. There is no JavaScript bundle; the app is React, so wrap these classes in your own components.
- **Design size**: a landscape phone, **844 × 390** CSS px. Everything is drawn at that size and zoomed to fit (see *Header*).
- **Desktop**: in a window at least 1000 × 640, also load `components/desktop.css` (the `dk-` classes) and lay screens out like the `Desktop*` boards (see *Desktop*).
- **Build screens** from the components below; the screens themselves are mocked up separately, in [`../screens/`](../screens/).

## Voice

- Talk like the friend who's hosting: short, plain, a little cheeky. "Between 1994 and 2008?" "Mara says 1994 to 2008. Is that right?" "Sam, where does it really go?" "Can you steal the card?"
- Say what just happened in one sentence, with names and years, not system words ("Placement committed" ✗, "Challenge window" ✗: just "Challenge").
- Buttons: sentence case, verb first, one or two words. If it costs or earns tokens, put the coin and the number right after the label, with no separator: *Skip song ●1*, *Buy this card ●3*, *Named the song ●+1*.
- State labels: *Waiting for Mara*, *Reconnecting…*, *Importing…*. Guesses are never secret, so don't say "hidden".
- Never reveal anything about the song in play (title, artist, year, whose library) before the reveal.
- Feedback and errors: say what happened, then one short fact. "Connection dropped. Your progress is safe." "Lea is away. The seat is kept for them." Nothing more.
- Middle dots only in the header line (*Mara's room · 4 players · First to 10*). Everywhere else use commas and full stops.
- Ways out are words, not arrows: *Back* as the left half of a button pair, *Leave room*, *Close room*, *End game*, *Leave game*. Sub-screens are the exception: a round back arrow replaces the logo.
- What ends something for everyone asks for a second tap, in words: *Tap again to close it for everyone*.
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
| Action | `coral` | The one thing to do now: primary buttons, the tape, progress, the countdown, the logo. Text on coral is **ink**, never white (4.6:1). `coral-text` labels a destructive secondary button (*Close room*, *Delete my account*). |
| Mystery & tokens | `mustard` | The pick being placed or guessed *right now*, the token coin. |
| On turn & settled | `turn-tint` | The on-turn player's scoreboard row, picks already locked in, the card just won, the picked option, the winners. |
| Right | `right` | The ✓ mark and a toast that worked. Ink on top. |
| Wrong | `wrong` | The ✕ mark, the tag on an error (*No such room*), a refused or failed toast. Paper on top. Darker than coral, so the two read apart by lightness. |
| Players | `player-1`…`player-5` | Avatars only. Always paired with an initial or name. |

`coral` and `mustard` double as player colours 1 and 3. That's fine because player colours never appear without a name, but don't use player colours for UI states. Timeline cards carry **no** player colour: every card on a board belongs to the same player, and the board's heading says whose.

### Type

- **Rubik Mono One** (brand): the logo, and the one big line on the winner screen ("Mara wins!", `jm-big-moment`). It's caps-only and very wide; never set sentences in it.
- **Bricolage Grotesque**: everything players read. Years are 800 weight with tabular figures; the tape label uses the same face for `????` and the year (`tape-year`), so the marks line up like digits. The moment panel's sentence is 22px/800 (`moment`), other headlines 17px/800, and body text never goes below 13px for anything you need to act on.
- **DM Mono**: small "machine" text: time, room code, uppercase state labels.

### Shape: the sticker

- Every raised thing has a **2px ink outline** (`stroke-control`) and a **hard offset shadow with no blur** (`shadow-sticker-sm` / `shadow-sticker` / `-lg`). That's the whole look; don't add soft shadows or gradients.
- Radii: `radius-pill` for buttons, chips, marks and the logo, `radius-card` for cards, gaps and cells, `radius-panel` (18px for the moment panel) for panels.
- **Tilt** marks what's special. One angle, the `tilt` token (−4°), used by exactly three things: the logo, the playing tape and the yellow pick cards on the board. Nothing else rotates, except on a cover (*Hero*), where the floating cards lean freely and the Home slogan sits at `tilt`, and inside a mix card's picture (*MixCard*), which is a drawing.
- Pop-ups are `label` panels with `shadow-sticker-lg` over the screen dimmed with ink at 55% (*Dialog*).
- Pressing a primary button sinks it 2px into its shadow.

### Motion

- The cassette reels spin only while audio is actually playing. The progress bar and the tape packs move with the song. The 3px tape bob is on in the game screen; the footer under the tape leaves room for it.
- Countdowns are always the filling ring (`jm-ring`): the challenge window and the automatic next song. Don't show a countdown any other way. Amounts (an import, cards toward the goal) use the bar (`jm-progress`), which never counts down; an import's bar slides from step to step.
- Dealing: each opening card drops in face up with a little spin and settles; the empty places breathe until theirs lands.
- On covers (Home, the sign-in error, the winner) the tape bobs slower, 1.2 s a swing (`jm-tape--slow`), and the song cards drift a few pixels, each at its own pace (`jm-float`).
- Everything else is still: no idle animations, no parallax. `prefers-reduced-motion` stops spin, bob, drift, the dealing and transitions.

### Layout

Landscape phone first (844 × 390), zoomed to fit; a portrait touch screen is asked to turn sideways. Every screen starts with the 44px header (*Header*). In the game, a 172px top band follows (tape, moment panel, scoreboard), with the board below at full width. Lists that can outgrow the screen scroll inside it (*ScrollArea*). Touch targets are at least 44px; the only exception is the small restart icon, which is rarely used.

In a window at least 1000 × 640 (landscape tablets, laptops and up) the screens get their own layouts instead of the zoomed phone (*Desktop*): one centred column at most 1280px wide with paper around it, bigger type, a player list with full names in the game and a timeline that wraps onto a second row instead of scrolling. Only the layout changes; the words and the parts are the same.

Sizes in between get one of the two layouts, never a blend: a hard switch at `(min-width: 1000px) and (min-height: 640px)`, with each layout scaling continuously on its own side (the phone by zooming, the desktop by its fluid column and `clamp()`ed sizes). A narrow, tall window on a computer gets the phone layout zoomed to its width; only touch screens are asked to turn sideways. The reasoning, a table of common sizes and how to build it are in *Desktop*.

### Hover

Only with a mouse or trackpad (`@media (hover: hover) and (pointer: fine)`); touch screens never see it. A button's ink outline gets 1px heavier. Nothing lifts and no shadow is added, because shadows mark emphasis (a primary button keeps the one it has). Borderless icon buttons show a thin `ink-subtle` outline. Gaps fill with `turn-tint`, as when picked.

### Iconography

Inline SVG on a 24px grid: stroke 2.4, round caps and joins, `currentColor`. For ✕ and ✓ use stroke 3–3.4. The current set: restart, refresh, plus (gaps, steppers), minus, skip (next song), edit (rename), close, pass ✕, right ✓, the gear (game menu), back and forward arrows, music, speaker and speaker off, info, search, link, trash, sign out, offline, and the device shapes (TV, laptop, phone, speaker). Icon-only buttons are round (`jm-btn--icon`) and always carry an `aria-label`; a pop-up's close ✕ and the lobby's ✕ and pencil are borderless (`jm-btn--bare`). No emoji, no filled icon packs (the skip triangle is the one filled shape).

The app's own icon (the browser tab, the home screen) is a different thing: the tilted cassette from the covers, in full colour (*AppIcon*).

## Components

| Component | What it is |
| --- | --- |
| Logo | L2: lowercase wordmark in a tilted coral pill. |
| AppIcon | The cover's cassette as the app's icon: favicon, home screen icons, Android's adaptive icon. Font-free SVG sources in `assets/`. |
| Button | Primary (coral), secondary, dark, danger, XL, toggle, next, leads-somewhere, icon, chip, status pills, pair. |
| TapePlayer | The song in play: sticker cassette, label progress bar, time and a small restart icon. |
| SongCard | Revealed card, yellow pick card (now / locked), card just won, a card that went elsewhere, dashed + gap, ✓ / ✕ marks. |
| Board | The active player's timeline: full width, tap a + gap, scrolls sideways with an indicator. |
| MomentPanel | The centre panel holding the one decision of the moment: place, challenge, the challenger's guess, the result with the song's cover. |
| Scoreboard | The mini scoreboard: initial, cards held, tokens. Always visible in the game; tapping it opens the full scoreboard. |
| YearChip | A timeline in short form, for the full scoreboard. |
| Header | The 44px row on every screen, sub-screen headers, and the 844 × 390 screen frame. |
| Dialog | A centred pop-up over the dimmed screen: game menu, scoreboard, your account, a name, a confirmation, reconnecting. |
| Toast | One line of feedback, with at most one button. |
| Input | Room code, name, search, and the QR tile. |
| Rows | Setting rows, option rows (playback mode, speakers), checkbox rows (library sources), players in the lobby, and the avatar sizes. |
| MixCard | One deck mix: its picture, name and one line on what to expect. A row of them is the Deck mix setting. |
| Stepper | − / number / +, and segmented toggles. |
| Progress | A bar for amounts, never for time, and an import's progress. |
| ScrollArea | A list that scrolls inside the screen, with the timeline's bar standing up. |
| Hero | The cover art and the cover screen: slow-bobbing tape, drifting song cards, the big winner line. |
| Desktop | The layer for windows at least 1000 × 640 (`desktop.css`): the centred page frame, the player list, the wrapping timeline grid, and the rules for sizes in between. |

## Accessibility

- Text contrast: `ink` 14:1, `ink-muted` 7:1, `ink-subtle` 5.2:1, `coral-text` 4.9:1 on `paper`; ink on `coral` 4.6:1, on `mustard` 8.2:1, on `right` 7:1; paper on `wrong` 5.9:1. `slot-dash` and `sand-line` are decorative only.
- Never rely on colour alone: player colour + initial or name; right and wrong are ✓ / ✕ plus an initial, and the verdict pill says what happened in words. A pressed toggle (*Named the song*) is told by its ink fill, so it always carries `aria-pressed`.
- Focus: a 2px ink outline with a 2px offset; text fields instead turn their own border coral (see Input). Gaps are real buttons with labels ("Put it here: between 1994 and 2008").

## Not designed

A portrait layout: portrait touch screens only get the prompt to turn sideways, and a narrow, tall window on a computer gets the landscape phone layout zoomed to its width.
