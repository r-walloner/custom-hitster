# Logo

The Jamster wordmark: "jamster" in Rubik Mono One (which draws it in capitals) inside a coral pill tilted −4° with an ink outline and a hard sticker shadow.

## Use

- `.jm-logo` in the phone header (17px), `.jm-logo jm-logo--xl` (48px) on join, landing and TV idle screens.
- It's type, not an image: render it as text so it stays crisp at every size. Where a picture is needed (the iPhone launch screen), use [`../../assets/logo.svg`](../../assets/logo.svg), the same pill with the letters as outlines. The favicon and the home screen icons are the cassette, not the logo (see *AppIcon*).
- Write it lowercase in markup (the font renders capitals, screen readers read a word). Always coral fill (`coral`), ink text and outline. On a dark ground swap the fill to `mustard` and the outline to `paper`.
- Give it room: at least `space-10` on every side; it is the only thing besides the tape and the mystery card that is tilted.

## Don't

- No cassette or reel in the logo on game screens: the TapePlayer sits right next to it, and two tapes compete.
- Don't recolour it per player or per state, and don't animate it.
