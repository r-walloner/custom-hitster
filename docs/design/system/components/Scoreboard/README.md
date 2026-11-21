# Scoreboard

Everyone's standing in one glance: a narrow column of pills, one per player, each with the avatar initial, the number of cards held and the tokens.

`button.jm-scoreboard` › `.jm-scoreboard__row` (`--turn` for the player on turn: `turn-tint`, ink outline, small sticker shadow) › `jm-avatar`, `.jm-scoreboard__score`, `jm-token`.

## Rules

- Always visible on the game screen, in every state, at the right end of the top band (76px wide).
- It's one button: tapping it opens the full scoreboard (a wide Dialog, best first, with progress to the goal, tokens, each timeline in short form as YearChips, and a note per player: *On turn*, *Leading*, *Local player*, *That's you*).
- No names, no progress bars here: the initial and two numbers are enough, and the game goal ("First to 10") is in the header.
- Give the button an `aria-label` that says it all in words: "Scoreboard. Mara, on turn: 4 cards, 3 tokens. … Open the full scoreboard."
- A token given for naming the song shows here as soon as the host gives it.
