"""Export the app icons, favicon, link preview, install screenshots and iPhone launch images.

Usage, from docs/design/: python3 tools/export_app_assets.py [--chrome PATH] [--fonts-css FILE]

Writes app-assets/export/ from two sources:
- system/assets/*.svg (the app icon, favicon and wordmark, all without fonts), with
  rsvg-convert (librsvg) and Pillow (`pip install pillow`) for favicon.ico;
- app-assets/preview/ShareImage.html and Screenshot*.html, with headless Chrome. They load the
  brand fonts from Google Fonts; offline, pass --fonts-css with a stylesheet of local @font-face
  rules for Rubik Mono One, Bricolage Grotesque and DM Mono.

The manifest and the <head> tags in app-assets/export/ are written by hand; this script only
adds launch/links.html, the <link> tags for the launch images it draws.
"""
import argparse
import io
import os
import re
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # docs/design
ASSETS = os.path.join(HERE, "system", "assets")
PREVIEW = os.path.join(HERE, "app-assets", "preview")
OUT = os.path.join(HERE, "app-assets", "export")
PAPER = "#f6eedf"

# iPhones on iOS 26, by CSS viewport (portrait) and pixel ratio. Each gets a launch image per
# orientation, in device pixels. Add a row when Apple ships a new screen size.
IPHONES = [
    (440, 956, 3, "17 Pro Max, 16 Pro Max"),
    (430, 932, 3, "16 Plus, 15 Plus, 15 Pro Max, 14 Pro Max"),
    (428, 926, 3, "14 Plus, 13 Pro Max, 12 Pro Max"),
    (420, 912, 3, "Air"),
    (414, 896, 3, "11 Pro Max, XS Max"),
    (414, 896, 2, "11, XR"),
    (402, 874, 3, "17, 17 Pro, 16 Pro"),
    (393, 852, 3, "16, 15, 15 Pro, 14 Pro"),
    (390, 844, 3, "16e, 14, 13, 13 Pro, 12, 12 Pro"),
    (375, 812, 3, "13 mini, 12 mini, 11 Pro, XS, X"),
    (375, 667, 2, "SE (2nd and 3rd generation), 8"),
]


def rsvg(src, out, width):
    subprocess.run(["rsvg-convert", "-w", str(width), "-o", out, src], check=True)


def png_bytes(svg_text, width):
    return subprocess.run(["rsvg-convert", "-w", str(width)], input=svg_text.encode(),
                          capture_output=True, check=True).stdout


def icons():
    a = lambda name: os.path.join(ASSETS, name)  # noqa: E731
    o = lambda name: os.path.join(OUT, name)  # noqa: E731
    shutil.copyfile(a("favicon.svg"), o("favicon.svg"))
    rsvg(a("app-icon.svg"), o("icon-192.png"), 192)
    rsvg(a("app-icon.svg"), o("icon-512.png"), 512)
    rsvg(a("app-icon-maskable.svg"), o("icon-maskable-512.png"), 512)
    rsvg(a("apple-touch-icon.svg"), o("apple-touch-icon.png"), 180)
    from PIL import Image

    # favicon.ico: the 16 px layer is drawn on its own grid; 32 and 48 come from favicon.svg.
    # librsvg ignores prefers-color-scheme, so these are the light colours.
    layers = [Image.open(io.BytesIO(png_bytes(open(a("favicon-16.svg")).read(), 16)))]
    fav = open(a("favicon.svg")).read()
    layers += [Image.open(io.BytesIO(png_bytes(fav, n))) for n in (32, 48)]
    layers[-1].save(o("favicon.ico"), format="ICO", sizes=[(16, 16), (32, 32), (48, 48)],
                    append_images=layers[:-1])
    print("icons and favicon")


def launch_images():
    """The wordmark at its .jm-logo--xl size, centred on paper, at each iPhone's pixel size."""
    logo = open(os.path.join(ASSETS, "logo.svg")).read()
    lw, lh = (float(v) for v in re.search(r'width="([\d.]+)" height="([\d.]+)"', logo).groups())
    inner = re.sub(r"<title>.*?</title>", "", logo.split(">", 1)[1].rsplit("</svg>", 1)[0], flags=re.S)
    vb = re.search(r'viewBox="([^"]+)"', logo).group(1)
    folder = os.path.join(OUT, "launch")
    os.makedirs(folder, exist_ok=True)
    links = []
    for cw, ch, dpr, models in IPHONES:
        for orientation, (w, h) in (("portrait", (cw, ch)), ("landscape", (ch, cw))):
            pw, ph = w * dpr, h * dpr
            name = f"apple-launch-{pw}x{ph}.png"
            x, y = (pw - lw * dpr) / 2, (ph - lh * dpr) / 2
            svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{pw}" height="{ph}">'
                   f'<rect width="{pw}" height="{ph}" fill="{PAPER}"/>'
                   f'<svg x="{x:.1f}" y="{y:.1f}" width="{lw * dpr:.1f}" height="{lh * dpr:.1f}" viewBox="{vb}">{inner}</svg></svg>')
            with open(os.path.join(folder, name), "wb") as fh:
                fh.write(png_bytes(svg, pw))
            links.append(f'<!-- iPhone {models}, {orientation} -->\n'
                         f'<link rel="apple-touch-startup-image" href="/launch/{name}" media="(device-width: {cw}px) '
                         f'and (device-height: {ch}px) and (-webkit-device-pixel-ratio: {dpr}) and (orientation: {orientation})">')
    with open(os.path.join(folder, "links.html"), "w") as fh:
        fh.write("\n".join(links) + "\n")
    print(f"{len(links)} launch images")


def chrome_shot(chrome, page, out, width, height, scale, fonts_css):
    """Screenshot a preview page with animations stopped, from a temporary copy beside it."""
    src = open(os.path.join(PREVIEW, page)).read()
    extra = "<style>*,*::before,*::after{animation:none!important;transition:none!important}</style>"
    if fonts_css:
        extra += f'<link rel="stylesheet" href="file://{os.path.abspath(fonts_css)}">'
    tmp = os.path.join(PREVIEW, f"_export_{page}")
    with open(tmp, "w") as fh:
        fh.write(src.replace("</head>", extra + "\n</head>", 1))
    try:
        subprocess.run([chrome, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-sandbox",
                        "--allow-file-access-from-files", f"--force-device-scale-factor={scale}",
                        f"--window-size={width},{height}", "--virtual-time-budget=5000",
                        f"--screenshot={out}", f"file://{tmp}"], check=True, capture_output=True)
    finally:
        os.remove(tmp)


def pages(chrome, fonts_css):
    chrome_shot(chrome, "ShareImage.html", os.path.join(OUT, "og-image.png"), 1200, 630, 1, fonts_css)
    folder = os.path.join(OUT, "screenshots")
    os.makedirs(folder, exist_ok=True)
    for page, name in (("ScreenshotHome.html", "home"), ("ScreenshotPlacing.html", "placing"),
                       ("ScreenshotReveal.html", "reveal")):
        chrome_shot(chrome, page, os.path.join(folder, f"{name}.png"), 844, 390, 2, fonts_css)
    print("link preview and screenshots")


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    p.add_argument("--chrome", default=shutil.which("google-chrome") or shutil.which("chromium") or "chromium")
    p.add_argument("--fonts-css")
    args = p.parse_args()
    os.makedirs(OUT, exist_ok=True)
    icons()
    launch_images()
    pages(args.chrome, args.fonts_css)
    sys.exit(0)
