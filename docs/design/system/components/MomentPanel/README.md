# MomentPanel

The centre panel of the top band. It holds exactly one decision at a time, with big targets, so a slightly tipsy player can't miss.

`.jm-panel.jm-moment`, filling the space between the tape and the scoreboard (about 540 × 172).

## States

| State | Content |
| --- | --- |
| Placing | `jm-label` "Guess", `.jm-moment__headline` with the range ("Between 1994 and 2008?"), `jm-btn--primary jm-btn--xl` *Lock it in*, then a `jm-pair`: *Skip song ●1* and *Buy a card ●3*. |
| Challenge | `.jm-moment__head`: label "Challenge", headline "Mara says 1994 to 2008. Is that right?" and the countdown `jm-ring`. Then, for a player on their own device, *Challenge ●1* (primary, XL), centred in the space left; there is no Pass, since not challenging before the ring runs out is passing. The host, who also decides for local players, gets `.jm-players` instead: a grid of 48px `.jm-player` cells for just those players, each with avatar, name and *Challenge ●1* (primary), centred. Nobody sees the other players' decisions; the first challenge ends the window. Only appears after the player on turn has locked in. |
| Guessing | Laid out like Placing: `jm-label` "Challenger's guess", headline "Sam, where does it really go?" (then the range, "Between 1994 and 2008?"), a `.jm-moment__sub` with the stakes ("Can you steal the card?"), and *Lock it in* (primary, XL, centred in the space left). Everyone else sees "Sam challenged!", then "Sam thinks 1994 to 2008.", over "Can they steal the card?" |
| Result | `.jm-result`: `.jm-song` on the left (label "Round result", title, artist, and `.jm-song__library`: the owner's avatar + "From Jonas's library", with where the year came from underneath). On the right: `jm-verdict` *Right* + "Mara nailed it." + the ring for the automatic next song; a one-line summary next to the *Named it ●+1* toggle; then *Keep listening* (`--lg`) and *Next song* (`--next`). |

## Rules

- The host plays for anyone here: every player who has to act gets their own row with their own buttons. There is no "play as" picker.
- One countdown style: the ring in the head's top right.
- The headline is one line; it says what's happening with names and years.
- The year is not repeated in the result: the tape and the board already show it.
