"""Regenerate system/tokens.css from system/tokens.json.

Usage, from docs/design/: python3 tools/tokens_to_css.py
"""
import json
import re
from pathlib import Path

SYSTEM = Path(__file__).resolve().parent.parent / "system"


def color_value(value):
    if isinstance(value, dict):
        value = value.get("light") or next(iter(value.values()))
    alias = re.fullmatch(r"\{(.+)\}", value)
    return f"var(--{alias.group(1)})" if alias else value


def main():
    tokens = json.loads((SYSTEM / "tokens.json").read_text())
    lines = ["/* Jamster — generated from tokens.json. Do not edit by hand; edit tokens.json and regenerate. */", ":root {"]
    for tok in tokens["color"]["tokens"]:
        lines.append(f"  --{tok['name']}: {color_value(tok['value'])};")
    for family in ("shadow", "spacing", "radius", "stroke", "tilt", "size"):
        for tok in tokens.get(family, {}).get("tokens", []):
            lines.append(f"  --{tok['name']}: {tok['value']};")
    for key, stack in tokens["type"]["families"].items():
        lines.append(f"  --font-{key}: {stack};")
    lines.append("}")
    for group in tokens["type"]["groups"]:
        for style in group["styles"]:
            decl = [f"font-family: var(--font-{style.get('family', group['family'])})", f"font-size: {style['fontSize']}"]
            for key, prop in (("lineHeight", "line-height"), ("fontWeight", "font-weight"), ("letterSpacing", "letter-spacing")):
                if key in style:
                    decl.append(f"{prop}: {style[key]}")
            lines.append(f".{style['name']} {{ {'; '.join(decl)}; }}")
    (SYSTEM / "tokens.css").write_text("\n".join(lines) + "\n")


if __name__ == "__main__":
    main()
