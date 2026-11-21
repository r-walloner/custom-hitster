# ScrollArea

A list that can outgrow the screen scrolls inside it, never the page.

## Variants

| Class | Use |
| --- | --- |
| `.jm-scroll` | A column that scrolls up and down with the browser's thin bar: the lobby's players, the table you join, the full scoreboard, the winner's list, the challenge rows. |
| `.jm-scroll-area` › `.jm-scroll-area__box` + `.jm-scroll-area__bar` › `span` | A list in a panel, with the timeline's bar standing up beside it (5px `sand` track, `ink-subtle` thumb, 4px from the list) instead of the browser's: your library's sources, the lobby's setup rows, the speakers. Show the bar only while the list overflows; the thumb's height is the visible share, its top how far it has scrolled. |

## Rules

- Buttons that finish the screen (*Start game*, *Done*) stay outside the scrolling part, so they never scroll away.
- Leave room inside the box for the shadows of what's in it (the picked option's sticker shadow).
