# MomentPanel

The centre panel of the top band. It holds exactly one decision at a time, with big targets, so a slightly tipsy player can't miss.

`.jm-panel.jm-moment`, filling the space between the tape and the scoreboard (about 540 × 172).

## States

| State | Content |
| --- | --- |
| Placing | `jm-label` "Guess", `.jm-moment__headline` with the range ("Between 1994 and 2008?"), `jm-btn--primary jm-btn--xl` *Lock it in*, then a `jm-pair`: *Skip song ●1* and *Buy a card ●3*. |
| Challenge | `.jm-moment__head`: label "Challenge", headline "Mara says 1994 to 2008. Is that right?" and the countdown `jm-ring`. Then `.jm-players`, a 2 × 2 grid of `.jm-player` cells: avatar, name, and either *Challenge* (primary) + pass ✕, or a status (*Challenged*, *Passed*). Only appears after the player on turn has locked in. |
| Guessing | Head: label "Challengers guess", headline "Sam, where does it really go?", ring. Then the challengers in the order they challenged, numbered, with the one guessing now as `.jm-player--now` (mustard, like their pick on the board), and *Lock Sam's guess* (primary, XL height). |
| Result | `.jm-result`: `.jm-song` on the left (label "Round result", title, artist, and `.jm-song__library`: the owner's avatar + "From Jonas's library", with where the year came from underneath). On the right: `jm-verdict` *Right* + "Mara nailed it." + the ring for the automatic next song; a one-line summary next to the *Named it ●+1* toggle; then *Keep listening* (`--lg`) and *Next song* (`--next`). |

## Rules

- The host plays for anyone here: every player who has to act gets their own row with their own buttons. There is no "play as" picker.
- One countdown style: the ring in the head's top right.
- The headline is one line; it says what's happening with names and years.
- The year is not repeated in the result: the tape and the board already show it.
