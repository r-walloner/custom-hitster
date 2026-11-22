"""Export Claude canvas .dc.html boards to standalone HTML pages that use dc-runtime.js.

Usage: python3 tools/export_canvas.py <board.dc.html> <out.html> <runtime.js> [stylesheet ...]
Boards that link a stylesheet only the canvas has (an upload under /_blob/..., or the canvas's
copy of the design system under ds/jamster/) need it passed again as local stylesheets.
A <dc-import name="X"> (a board shown inside another, like the game screen behind a pop-up)
becomes an iframe of X.html, so export X too, into the same folder; a <dc-import> may pass the
board's props as a query, `name="X" query="role=guest"`, or as attributes, `name="X" size="192"`.
A page's query string overrides the board's default props, so one board shows each of its
variants: Lobby.html?role=guest.
"""
import json, re, sys, os, html

def export(src_path, out_path, runtime_rel, stylesheets=()):
    s = open(src_path, encoding="utf-8").read()
    title = re.search(r"<title>(.*?)</title>", s, re.S).group(1)
    xdc = re.search(r"<x-dc>(.*)</x-dc>", s, re.S).group(1)
    helmet = ""
    m = re.search(r"<helmet>(.*?)</helmet>", xdc, re.S)
    if m:
        helmet = m.group(1).strip()
        xdc = xdc[:m.start()] + xdc[m.end():]

    def child(m):
        name = m.group(1)
        size = re.search(r'hint-size="([^,"]+),([^"]+)"', m.group(0))
        w, h = (size.group(1), size.group(2)) if size else ("100%", "100%")
        query = re.search(r'query="([^"]*)"', m.group(0))
        # Props passed as attributes (mark="cassette" size="192") join the query too.
        props = [f"{k}={v}" for k, v in re.findall(r'\s([a-z][a-zA-Z0-9]*)="([^"]*)"', m.group(0))
                 if k not in ("name", "query") and not k.startswith("hint")]
        parts = ([query.group(1)] if query else []) + props
        src = f"{name}.html?{'&'.join(parts)}" if parts else f"{name}.html"
        return (f'<iframe src="{src}" title="{name}" tabindex="-1" aria-hidden="true" '
                f'style="display: block; width: {w}; height: {h}; border: 0;"></iframe>')
    xdc = re.sub(r'<dc-import name="([A-Za-z0-9_]+)"[^>]*></dc-import>', child, xdc)
    sm = re.search(r"<script type=\"text/x-dc\" data-dc-script data-props='(.*?)'>(.*?)</script>", s, re.S)
    props_raw = html.unescape(sm.group(1))
    code = sm.group(2)
    decl = json.loads(props_raw)
    props = {k: v.get("default") for k, v in decl.items() if not k.startswith("$") and isinstance(v, dict) and "default" in v}
    links = "".join(f'<link rel="stylesheet" href="{href}">\n' for href in stylesheets)
    out = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
{links}{helmet}
</head>
<body>
<div id="dc-root"></div>
<template id="dc-template">{xdc.strip()}</template>
<script src="{runtime_rel}"></script>
<script>
{code.strip()}
DCRuntime.mount(Component, document.getElementById('dc-root'), document.getElementById('dc-template').content, Object.assign({json.dumps(props)}, Object.fromEntries(new URLSearchParams(location.search))));
</script>
</body>
</html>
"""
    open(out_path, "w", encoding="utf-8").write(out)

if __name__ == "__main__":
    export(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4:])
