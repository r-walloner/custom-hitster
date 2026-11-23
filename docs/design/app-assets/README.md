# App icons, install and link preview

Everything Jamster needs to look like an app outside its own screens: the tab icon, the icons and screenshots for installing it on a phone or computer, the iPhone launch screens, and the picture a chat shows when someone posts a room link.

The icon is the cassette from the covers (see [`../system/components/AppIcon/`](../system/components/AppIcon/README.md)). The link preview is the same cassette with song cards around it, and no text: the title and slogan go in the preview's own text, so a chat's small square crop still shows the whole tape.

| Folder | What |
| --- | --- |
| [`export/`](export/) | **The files to ship**, ready to copy into `frontend/public/`, plus the manifest and the `<head>` tags. |
| [`canvas/`](canvas/) | The design canvas's own files (`*.dc.html` boards and `canvas.json`). They only render in the Claude canvas. |
| [`preview/`](preview/) | The same boards as plain HTML. Start with `preview/Main.html` (the overview), then `SharePreview.html` (the link preview in WhatsApp and iMessage at real size) and `CassetteVariant.html` (the icon at every size). |

## Implementing it

1. **Copy the files.** Everything in `export/` goes into `frontend/public/`, keeping the `launch/` and `screenshots/` folders, except `head.html` and `launch/links.html`, which are for pasting. The new `favicon.svg` replaces the old one (the dark Signal-round icon). Vite copies `public/` to the root of the build, so the files are served at `/favicon.svg`, `/launch/apple-launch-2556x1179.png` and so on.

   | File | Size | Used by |
   | --- | --- | --- |
   | `favicon.svg` | vector, 32 grid | Tabs and bookmarks in current browsers; carries its own dark-tab colours |
   | `favicon.ico` | 16, 32, 48 | Older browsers, and anything that asks for `/favicon.ico` by name |
   | `apple-touch-icon.png` | 180 × 180 | iPhone and iPad home screen (iOS reads this, not the manifest) |
   | `icon-192.png`, `icon-512.png` | 192, 512 | Manifest `any` icons: Android launcher, install dialog, Android's launch screen |
   | `icon-maskable-512.png` | 512 | Manifest `maskable` icon: Android's adaptive icon, cropped to a circle or squircle |
   | `manifest.webmanifest` | | Name, colours, landscape, standalone, the icons and the screenshots |
   | `screenshots/*.png` | 1688 × 780 | Chrome's install sheet (Home, placing a card, the reveal), the phone screens at 2× |
   | `og-image.png` | 1200 × 630 | The link preview in chats |
   | `launch/apple-launch-*.png` | per iPhone | iPhone launch screens, portrait and landscape: the logo on paper |

2. **Add the tags.** Paste `export/head.html` into `frontend/index.html`'s `<head>`, in place of the current `<link rel="icon">`, and paste `export/launch/links.html` where it says so. The existing `theme-color` meta (paper, `#f6eedf`) stays.

3. **Point `og:image` at the real host.** Chats only fetch an absolute URL; `head.html` has `https://jamster.example.com/og-image.png` as a placeholder. The preview's title is *Play Jamster*, its description the Home slogan, *The music game built from your own playlists.*

4. **Check the server.** `frontend/Caddyfile` already serves everything outside `/assets/` with `no-cache`, which suits these files. Check that `/manifest.webmanifest` comes back as `application/manifest+json`; if not, add a `header` rule for it.

5. **Test.**
   - Chrome DevTools › Application › Manifest lists the name, both icon kinds and the screenshots, with no errors; *Install* appears in the address bar.
   - On Android, install from Chrome's menu: the launcher shows the cassette on paper in the phone's icon shape, and the app opens landscape with a paper launch screen.
   - On iPhone (iOS 26: Share › Add to Home Screen, *Open as Web App* on): the cassette on paper, then the logo on paper instead of a white flash.
   - Paste a room link into a WhatsApp chat. WhatsApp caches a link's preview, so test with a URL it hasn't seen, e.g. add `?v=2`.

## Decisions

- **Manifest**: `display: standalone` (the one mode iOS supports), with `display_override: ["fullscreen"]` so the installed Android app hides the status bar too (iOS and desktop Chrome stay standalone), `orientation: landscape` (the game is landscape-only; on Android the installed app opens turned), `background_color` and `theme_color` both `paper`. The screenshots carry no `form_factor`, so they're offered on phones and computers alike.
- **Favicon**: straight, not tilted, simplified to the shell, label, window and reels. On dark tabs the outline and shadow turn paper; the coral stays.
- **Launch images**: iOS only shows one whose size matches the screen exactly, so there's one per iPhone screen size on iOS 26 and per orientation (22 files). They're plain: the logo at its `xl` size, centred on paper, so the jump to Home is calm. A new iPhone size needs a row in `IPHONES` in the export script; until then that iPhone shows a white screen while the app loads, as every iPhone does today.
- **Screenshots** are the mock-ups from [`../screens/`](../screens/) with Robin as the player (Home signed in, placing, the reveal), not captures of the running app. Replace them with real captures at 1688 × 780 any time; keep the size and the three labels in the manifest in step.

## Regenerating

From `docs/design/`: `python3 tools/export_app_assets.py`. It needs `rsvg-convert` (librsvg), Pillow and Chrome or Chromium:

- the icons, `favicon.ico` and the launch images come from the font-free SVGs in [`../system/assets/`](../system/assets/);
- `og-image.png` and the screenshots are screenshots of `preview/ShareImage.html` and `preview/Screenshot*.html` with animations stopped. Those pages load the brand fonts from Google Fonts; offline, pass `--fonts-css` with local `@font-face` rules.

After changing a board in `canvas/`, export its preview first: `python3 tools/export_canvas.py app-assets/canvas/<Board>.dc.html app-assets/preview/<Board>.html ../../exploration/preview/dc-runtime.js ../../system/tokens.css ../../system/components/bundle.css`.
