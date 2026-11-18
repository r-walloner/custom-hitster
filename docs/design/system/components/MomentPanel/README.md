# MomentPanel

The centre panel of the top band. It holds exactly one decision at a time, with big targets, so a slightly tipsy player can't miss.

`.jm-panel.jm-moment`, filling the space between the tape and the scoreboard (about 540 × 172).

## States

| State | Content |
| --- | --- |
| Placing | `jm-label` "Guess", `.jm-moment__headline` with the range ("Between 1994 and 2008?"), `jm-btn--primary jm-btn--xl` *Lock it in*, then a `jm-pair`: *Skip song ●1* and *Buy a card ●3*. |
| Challenge | `.jm-moment__head`: label "Challenge", headline "Mara says 1994 to 2008. Is that right?" and the countdown `jm-ring`. Then, for a player on their own device, *Challenge ●1* (primary, XL), centred in the space left; there is no Pass, since not challenging before the ring runs out is passing. The host, who also decides for local players, gets `.jm-players` instead: a grid of 48px `.jm-player` cells for just those players, each with avatar, name and *Challenge ●1* (primary), centred. Nobody sees the other players' decisions; the first challenge ends the window. Only appears after the player on turn has locked in. |
| Guessing | Laid out like Placing: `jm-label` "Challenger's guess", headline "Sam, where does it really go?" (then the range, "Between 1994 and 2008?"), a `.jm-moment__sub` with the stakes ("Can you steal the card?"), and *Lock it in* (primary, XL, centred in the space left). Everyone else sees "Sam challenged!", then "Sam thinks 1994 to 2008.", over "Can they steal the card?" |
| Result | Label "Reveal" and the ring for the automatic next song. Under them, `.jm-result`: the album cover (82px square, ink border, or a music note on sand when there is none), then `.jm-song`, a line each, cut short with "…" rather than wrapped: the title, the artist, and after a 10px gap `.jm-song__library`: up to three overlapping avatars (then a "+2" bubble) and "From Jonas's library", "From Jonas and Sam", "From Jonas, Sam and Lea", "From Jonas, Sam, Lea and 2 more". No verdict text: the board's marks say who was right. The row underneath, for the host and the player on turn: *Named the song ●+1* (the host only), then *Keep listening* (greyed out once the countdown is stopped) and *Next song* (primary), sharing the rest of the row half each. Everyone but the host sees "Mara named the song ●+1" as plain text there once it's on; it keeps its space while hidden, and for those without the buttons the row is only as tall as the line, so the song sits a little lower. |

## Rules

- The host plays for anyone here: every player who has to act gets their own row with their own buttons. There is no "play as" picker.
- The phase name (`jm-label`) is always the first line, in the top-left corner, in the same place in every state.
- One countdown style: the ring, pinned to the panel's top-right corner. The block under the phase name runs beside it and leaves its width free.
- The headline is one line; it says what's happening with names and years.
- The year is not repeated in the result: the tape and the board already show it.
