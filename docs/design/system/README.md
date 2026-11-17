# Jamster

**Jamster** is a party game for one group of friends, built from their own Spotify libraries: a song plays, and you place it on your timeline, earlier or later than the cards you hold. This design system is its look. It's playful and a bit retro, like a mixtape made for a friend, and it stays calm enough that the game is always easy to read across a room.

It came out of a five-round exploration. The chosen screen is **V2, the landscape-phone host screen**: warm "Mixtape Soft" colours (E), the L2 pill logo set in Rubik Mono One (round 6), the tilted sticker cassette (T4) with a progress bar on its label (T2).

## Using this system

- **Load** `tokens.css` and `components/bundle.css`. bundle.css imports the three Google fonts and holds every component as plain CSS classes prefixed `jm-`. There is no JavaScript bundle; the app is React, so wrap these classes in your own components.
- **Design size**: a landscape phone, **844 × 390** CSS px. Everything is drawn at that size; scale up for laptops and TVs (see *PhoneHostScreen*).
- **Start from** the *PhoneHostScreen* preview for any in-game screen, and from the components below for the parts.

## Voice

- Talk like the friend who's hosting: short, plain, a little cheeky. "Mara put it between 1994 and 2008." "Think she's off?" "Lea nailed it. Card is hers."
- Say what just happened in one sentence, with names and years, not system words ("Placement committed" ✗).
- Buttons: sentence case, verb first, one or two words. If it costs a token, say so: *Skip · 1 token*.
- Never reveal anything about the song in play (title, artist, year, whose library) before the reveal.
- No emoji in the UI.

## Visual foundations

### Colour

A warm paper ground with one loud colour for action and one for mystery.

| Role | Token | Rule |
| --- | --- | --- |
| Ground | `paper` | Every screen. |
| Surfaces | `label` | Panels, cards, secondary buttons, always outlined in `ink`. |
| Sunken | `sand`, `slot-empty` | Tracks and remainders, not text grounds. |
| Text & lines | `ink`, `ink-muted`, `ink-subtle` | All text is one of these three (or `coral-text`). |
| Action | `coral` | The one thing to do now: primary buttons, the tape, progress, the logo. Text on coral is **ink**, never white (4.6:1). |
| Mystery & tokens | `mustard` | The hidden card, the token coin. |
| On turn | `turn-tint` | Whatever belongs to the player on turn. |
| Players | `player-1`…`player-5` | Avatars, "via" dots, Standings segments. Always paired with an initial or name. |

`coral` and `mustard` double as player colours 1 and 3. That's fine because player colours never appear without a name, but don't use player colours for UI states.

### Type

- **Rubik Mono One** (brand): the logo and the `? ? ? ?` on the tape only. It's caps-only and very wide, so it can never be mistaken for the UI font. Keep it to a few characters and never set sentences in it. It could later carry one-line big moments ("Lea wins!"); decide that when the reveal and winner screens are designed.
- **Bricolage Grotesque**: everything players read. Years are 800 weight with tabular figures. Headlines are 17px/800, and body text never goes below 13px for anything you need to act on.
- **DM Mono**: small "machine" text: time, room code, uppercase state labels.

### Shape: the sticker

- Every raised thing has a **2px ink outline** (`stroke-control`) and a **hard offset shadow with no blur** (`shadow-sticker-sm` / `shadow-sticker` / `-lg`). That's the whole look; don't add soft shadows or gradients.
- Radii: `radius-pill` for buttons and the logo, `radius-card` for cards and cells, `radius-panel` for panels.
- **Tilt** marks what's special. One angle, the `tilt` token (−4°), used by exactly three things: the logo, the playing tape and the mystery card in its gap. Nothing else rotates.
- Pressing a primary button sinks it 2px into its shadow.

### Motion

- The cassette reels spin only while audio is actually playing. The progress bar and the tape packs move with the song.
- The optional tape bob is 3px every 500ms. It's a lever, so switch it off where it competes with other movement.
- Everything else is still: no idle animations, no parallax. `prefers-reduced-motion` stops spin, bob and transitions.

### Layout

Landscape phone first (844 × 390). There's a 44px header, a main column (tape plus the *moment panel* on top, the timeline below) and a 164px Standings column. Touch targets are at least 44px. Details in *PhoneHostScreen*.

### Iconography

Inline SVG on a 24px grid: stroke 2.4, round caps and joins, `currentColor`. For ✕ use stroke 3. The current set is restart, retry, speaker, pass ✕ and menu ⋯. Icon-only buttons always carry an `aria-label`. No emoji, no filled icon packs.

## Components

| Component | What it is |
| --- | --- |
| Logo | L2: lowercase wordmark in a tilted coral pill. |
| Button | Primary (coral), secondary, dark toggle, icon, select, room-code chip, status pills. |
| TapePlayer | The song in play: sticker cassette, label progress bar, time, restart/retry. |
| SongCard | Revealed card, mystery card, timeline gaps. |
| Timeline | The active player's board. |
| ChallengeWindow | Timed challenge: headline, countdown ring, per-player cells. |
| Standings | Cards toward the goal, tokens, whose turn (provisional). |
| PhoneHostScreen | The reference layout everything sits in. |

## Accessibility

- Text contrast: `ink` 14:1, `ink-muted` 7:1, `ink-subtle` 5.2:1, `coral-text` 4.9:1 on `paper`; ink on `coral` 4.6:1 and on `mustard` 8.2:1. `slot-dash` and `sand-line` are decorative only.
- Never rely on colour alone: player colour + name, right/wrong (when designed) as icon + word.
- Focus: a 2px ink outline with a 2px offset.

## Not designed yet

Entry and sign-in, room code and invite screens, the lobby (players, device choice and playback test, settings), dealing progress, placing a card (before commit), the reveal and round result (right/wrong, challengers' marks, where the card belongs, year source, whose library), naming the song, buying a card, the winner, reconnection, error and action feedback. Build them from these foundations. The reveal is the one that needs a new rule: right and wrong colours, checked for contrast and told apart by lightness, plus icons.
