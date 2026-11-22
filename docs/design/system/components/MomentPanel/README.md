# MomentPanel

The centre panel of the top band. It holds exactly one decision at a time, with big targets, so a slightly tipsy player can't miss.

`.jm-panel.jm-moment`, filling the space between the tape and the scoreboard (about 540 × 172).

## Frame

- The phase name (`jm-label`) is always the first line, in the top-left corner, the same place in every phase: *Guess*, *Challenge*, *Challenger's guess*, *Reveal*.
- A countdown goes in `.jm-moment__ring` (a 50px `jm-ring`), pinned to the top-right corner; add `.jm-moment--ring` to the panel so the first block after the ring runs beside it, leaves its width free and reaches below it.
- `.jm-moment__headline` (22px/800, one line) says what's happening with names and years; `.jm-moment__sub` adds one quieter line.
- Every button in the panel is 44px tall at 15px/800, whatever its size class says, so the phases look alike.

## States

Each phase shows only the decisions this device makes. Everyone else gets the same panel with words instead of buttons.

| State | Content |
| --- | --- |
| Placing | "Guess", headline "Mara, where does it go?" (then the range, "Between 1994 and 2008?"), and `.jm-moment__decide`: *Lock it in* (primary, across the full width; *Tap a gap first* and greyed out until a gap is picked), then *Skip song ●1* and *Buy this card ●3* side by side. Buying trades 3 tokens for the card in play instead of guessing. Everyone else: "Mara is placing the card." / "Mara thinks 1994 to 2008." over "You can challenge Mara's decision after it's locked in." |
| Away | The player on turn has left: "Mara is away." over "Waiting for Mara to come back." The host gets *Skip Mara's turn* (`.jm-moment__decide--one`), which takes a second tap: *Tap again to throw the card away*. |
| Challenge | "Challenge", the ring, headline "Mara says 1994 to 2008. Is that right?". A device with one player to decide for gets one *Challenge ●1* (primary) in `.jm-moment__decide--one`, with "Deciding for Tobi." above it when that player is a local one. A device deciding for several players (the host with local players) gets `.jm-players` instead: a 48px `.jm-player` row each, with avatar, name and *Challenge ●1*. There is no Pass: not challenging before the ring runs out is passing. The first challenge ends the window. The player on turn sees "The others can challenge until the time runs out." |
| Challenger's guess | Laid out like Placing: "Challenger's guess", headline "Sam, where does it really go?" (then the range), sub "Can you steal the card?", and *Lock it in* (primary, centred in the space left). Everyone else: "Sam challenged!", then "Sam thinks 2008 to 2016.", over "Can they steal the card?". No countdown. |
| Result | "Reveal" and the ring for the automatic next song. Under them, `.jm-result`: the album cover (`.jm-result__cover`, 82px square, ink border; `--none` shows a music note on sand), then `.jm-song`, a line each, cut short with "…" rather than wrapped: the title, the artist, and after a 10px gap `.jm-song__library`: up to three overlapping avatars (`.jm-song__avatars`, then a `.jm-song__more` "+2" bubble) and "From Jonas's library", "From Jonas and Sam", "From Jonas, Sam and Lea", "From Jonas, Sam, Lea and 2 more". No verdict text: the board's marks say who was right. Then `.jm-moment__actions`, for the host only: *Named the song ●+1* (a toggle, pressed by colour alone), then *Keep listening* (greyed out once the countdown is stopped, left out when the next song waits for a tap) and *Next song* (primary), sharing the rest of the row half each. After the game's last card (someone has reached the target, or the deck is out) *Next song* reads *Finish game* and the ring's label "Game ends in 6 seconds"; the winner screen follows. Everyone else gets `.jm-moment--watch`: "Mara named the song ●+1" (`.jm-named`) as plain text once it's given, which keeps its space while hidden (`--off`); the row is only as tall as the line, so the song sits a little lower. |

## Rules

- The host plays for local players here, and only for them: each one who has to act gets their own row with their own buttons. There is no "play as" picker.
- Only the host reveals early, judges *Named the song* and moves on to the next song, so the player on turn can neither award themselves the token nor cut the others short.
- One countdown style: the ring, top right.
- The year is not repeated in the result: the tape and the board already show it.
