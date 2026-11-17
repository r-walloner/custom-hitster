# Standings

Everyone's progress at a glance: one row per player with avatar, name, tokens, cards out of the goal, and a 10-segment bar in their colour.

## Parts

- `.jm-panel.jm-standings`: 164px column on the right of the phone screen.
- `.jm-standing` row (`radius-row`, `paper` ground); `.jm-standing--turn` tints the player on turn with `turn-tint`. Put `.jm-p1`…`.jm-p5` on the row so the segments take the player's colour.
- `.jm-token`: mustard coin dot + count. `.jm-score`: cards / goal ("4/10").
- `.jm-slots`: one segment per card needed to win (10 by default; match the game's setting), filled segments `.on`.

## Open

This component is **provisional**. The brief also asks for each player's timeline in short form (years as small chips); the phone layout dropped it for space. Revisit Standings as its own design task: options are a tap-to-expand row, or year chips on wider screens only.
