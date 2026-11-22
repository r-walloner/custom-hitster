"""Regenerate system/preview/: each component's preview card as a standalone page, plus index.html.

The cards in system/components/*/preview.html expect the design-system page to load the
stylesheets for them. The copies here link tokens.css and bundle.css themselves.

Usage, from docs/design/: python3 tools/system_previews.py
"""
import re
from pathlib import Path

SYSTEM = Path(__file__).resolve().parent.parent / "system"
ORDER = ["Cover", "Logo", "Button", "TapePlayer", "SongCard", "Board", "MomentPanel", "Scoreboard", "YearChip", "Header", "Dialog", "Toast", "Input", "Rows", "MixCard", "Stepper", "Progress", "ScrollArea", "Hero"]
LINKS = '<meta name="viewport" content="width=device-width, initial-scale=1">\n<link rel="stylesheet" href="../tokens.css">\n<link rel="stylesheet" href="../components/bundle.css">\n'

INDEX_HEAD = """<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Jamster design system — previews</title>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&display=swap" rel="stylesheet">
<style>body{margin:0;background:#EDE2CE;color:#2A211C;font-family:"Bricolage Grotesque",system-ui,sans-serif}
main{max-width:1500px;margin:0 auto;padding:40px 32px 80px;display:flex;flex-direction:column;gap:32px}
h1{margin:0;font-size:34px} h2{margin:0 0 4px;font-size:18px} p{margin:0 0 10px;color:#5C4F44}
.item{background:#F6EEDF;border:2px solid #2A211C;border-radius:16px;box-shadow:3px 3px 0 #2A211C;padding:18px 20px;overflow-x:auto}
iframe{display:block;border:0;max-width:none;background:#F6EEDF;margin:6px 0 10px}
a{color:#B83A20}</style></head>
<body><main>
  <h1>Jamster design system</h1>
  <p>Every component, rendered with <code>tokens.css</code> and <code>components/bundle.css</code>. Rules live in <a href="../README.md">the brand book</a>.</p>
"""


def card_meta(text):
    line = text.split("\n", 1)[0]
    attr = lambda key: (re.search(key + r'=(?:"([^"]*)"|(\S+))', line) or [None, None, None])
    group, height, width, subtitle = attr("group"), attr("height"), attr("width"), attr("subtitle")
    pick = lambda m: (m[1] or m[2]) if m[0] else None
    return pick(group), int(pick(height) or 200), int(pick(width) or 960), pick(subtitle)


def main():
    sections = []
    for name in ORDER:
        text = (SYSTEM / "components" / name / "preview.html").read_text()
        group, height, width, subtitle = card_meta(text)
        page = text.split("\n", 1)[1]
        page = page.replace("<head>", "<head>\n" + LINKS, 1)
        (SYSTEM / "preview" / f"{name}.html").write_text(page)
        title = f"{name} · {group}" if group else name
        sub = f"<p>{subtitle}</p>" if subtitle else ""
        guide = "" if name == "Cover" else f' · <a href="../components/{name}/README.md">guidelines</a>'
        sections.append(f"""  <section class="item">
    <h2>{title}</h2>{sub}
    <iframe src="{name}.html" title="{name} preview" style="width: {width}px; height: {height + 24}px"></iframe>
    <a href="{name}.html">Open {name} on its own</a>{guide}
  </section>
""")
    (SYSTEM / "preview" / "index.html").write_text(INDEX_HEAD + "".join(sections) + "</main></body></html>\n")


if __name__ == "__main__":
    main()
