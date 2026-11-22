# AppIcon

The app's own icon: the browser tab, the home screen on iPhone and Android, and the install prompt. It is the cassette from the covers (*Hero*), the one picture of the game everybody has already seen on Home, cut down to an icon.

## Anatomy

- **The cassette**, drawn exactly as the TapePlayer's: `coral` shell with the ink outline and screws, `label` sticker with `????`, the `tape-window` with two reels, the progress bar at 38 % and the `coral-deep` foot. The year stays `????`: the icon is the mystery, never a song.
- **Tilt and shadow**: turned `tilt` (−4°), with a hard ink shadow offset by 2.4 % of its width, as `drop-shadow` on the cover's tape. The cassette is centred with the shadow counted in.
- **Ground**: transparent where the platform draws its own (the `any` icons), `paper` where the icon must be a full square (iPhone, Android's adaptive icon).

## Files

All in [`../../assets/`](../../assets/), drawn without fonts (the `????` and the wordmark's letters are outlines), so they render the same everywhere.

| File | What | Cassette width |
| --- | --- | --- |
| `app-icon.svg` | `any` icon, transparent: the 192 and 512 PNGs in the manifest | 90 % |
| `app-icon-maskable.svg` | Android's adaptive icon, on paper; the cassette stays inside the centre circle Android may crop to (40 % radius) | 62 % |
| `apple-touch-icon.svg` | iPhone home screen, on paper; iOS rounds the corners itself | 76 % |
| `favicon.svg` | The tab icon on a 32 grid, with its dark-tab colours inside (`prefers-color-scheme`) | — |
| `favicon-16.svg` | The 16 px layer of `favicon.ico`, drawn on its own grid | — |
| `logo.svg` | The wordmark at `.jm-logo--xl` size, for the iPhone launch screen and any other place that needs the logo as a picture | — |

The PNGs, `favicon.ico`, the link preview and the launch images are exported from these into [`../../../app-assets/export/`](../../../app-assets/export/) with `python3 tools/export_app_assets.py`. How the app uses them: [`../../../app-assets/README.md`](../../../app-assets/README.md).

## Favicon

- Straight, not tilted: at 16 px a 4° turn only blurs the edges.
- 32 grid: shell outline, label, window, two reels, foot. The `????` and the bar drop out.
- 16 grid: shell outline, window and the two reels; 1 px outline, 2 px shadow, edges on whole pixels.
- Dark tabs keep the coral; the outline and the shadow turn `paper` so the shape still reads.

## Don't

- Don't put the wordmark in the icon, and don't add a letter: the alternative with a "J" in a coral sticker was tried and dropped.
- Don't recolour the cassette per platform or season, put it on a ground other than `paper`, or animate it.
- Don't draw rounded corners or a frame into the square icons: iOS and Android cut their own shape.
- In the app's UI the tape is still only the TapePlayer and the covers; the icon is for the platform's surfaces.
