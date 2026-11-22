# MixCard

One deck mix (a curation strategy) as a card: a picture of what the deck will feel like, the mix's name and one line on what to expect. A row of them is the *Deck mix* setting, the first and most prominent one on the settings screen.

## Parts

- `.jm-mix-card`: a `label` card, 2px `sand-line` outline, `radius-card`, 132px tall on the phone. Its width comes from the row it sits in.
  - `.jm-mix-card__art`: the picture box, always 62px tall (130px on desktop), on `sand`. Holds the picture and the ✓ (`.jm-mix-card__tick`, 22px, top right, shown only when picked).
  - `.jm-mix-card__name` (14px/800) and `.jm-mix-card__line` (`caption`, `ink-muted`, two lines at most). The fixed picture box and the two-line limit keep every card the same height, so the pictures line up.
  - `.jm-mix-card__soon`: a small dashed *Soon* tag beside the name of a mix that's planned but not built yet.
- `.jm-mix-card--picked`: the mix in use. Ink outline, `turn-tint`, `shadow-sticker-sm` and the ✓, like a picked option row (*Rows*); the picture box turns `label`.
- `.jm-mix-card--planned`: can't be picked yet. Dashed `slot-dash` outline, no fill, the picture at half strength, *Soon*.

## Host and everyone else

- For the host, the name is a `<button class="jm-mix-card__pick">` with `aria-pressed`; its hit area covers the whole card, so the card is one big button with a short accessible name (*Balanced*). A planned mix's button is `disabled`.
- Everyone else sees the same row, with the host's pick picked, and nothing to press: the name is plain text.
- The row is a list (`<ul>` of `<li class="jm-mix-card">`) labelled by the *Deck mix* heading; the picked card's `<li>` carries `aria-current="true"`.
- Hover (mouse or trackpad only): an idle card's outline turns `ink-subtle`.

## The pictures

`.jm-mix-art`: an inline SVG drawn on a 120 × 72 grid and shown at 104 × 62 (190 × 114 on desktop). Shapes are outlined in ink with their own stroke widths and filled from the palette through classes (`a-ink`, `a-coral`, `a-mustard`, `a-label`, `a-sand`, `a-window`, `a-muted`, `a-subtle`; `a-line-subtle` for an `ink-subtle` line), so they follow the tokens. They're decoration (`aria-hidden`): the name says what the mix is. The markup for each is in `preview.html`.

| Mix | Picture |
| --- | --- |
| Balanced | Two cassettes level on a seesaw. |
| Show & Tell | A hand holding one card up to show it. |
| Wildcards | A joker card in front of a face-down card. |
| Deep Dive | A profile head with a question mark, and stars around it. |
| Nostalgia | A dusty cassette from 2009, a cobweb in its corner. |

A new mix needs its own picture in the same style: one clear subject that reads at 104 × 62, flat fills, no gradients, no text beyond a year.

## The row

- **Phone:** one row, 8px apart, each card at least 152px wide. Five share the 844px width (156px each); from a sixth the row scrolls sideways, with no scroll bar, the next card peeking in at the right edge.
- **Desktop** (`desktop.css`): every card at once, sharing the column's width (248 × 228px at 1440px wide), in a grid of columns at least 204px wide that wraps when more mixes come. Name 19px, line 15px.

## Copy

| Mix | Line |
| --- | --- |
| Balanced | Songs you all know, a fair share from every library. |
| Show & Tell | Everyone brings the songs only they know. |
| Wildcards | Obscure picks. Good luck. |
| Deep Dive | A single artist, start to finish. |
| Nostalgia | Songs you loved years ago. |

Keep a line to two lines at 152px: Balanced's is the longest that fits.

## Rules

- The card never tilts. Shapes inside a picture may lean (the joker), as the drawings they are.
- Never pick a mix by colour alone: the picked card has the ✓ and `aria-pressed` / `aria-current`.
