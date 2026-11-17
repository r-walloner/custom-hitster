# Scoreboard

Everyone's standing in one glance: a narrow column of pills, one per player, each with the avatar initial, the number of cards held and the tokens.

`.jm-scoreboard` › `.jm-scoreboard__row` (`--turn` for the player on turn: `turn-tint`, ink outline, small sticker shadow) › `jm-avatar`, `.jm-scoreboard__score`, `jm-token`.

## Rules

- Always visible on the game screen, in every state, at the right end of the top band (76px wide).
- No names, no progress bars: the initial and two numbers are enough, and the game goal ("First to 10") is in the header.
- Give each row an `aria-label` that says it in words: "Mara, on turn: 4 cards, 3 tokens".
- Short-form timelines per player are not shown here; they would need a tap-to-open view (not designed yet).
