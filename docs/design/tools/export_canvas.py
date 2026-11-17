"""Export Claude canvas .dc.html boards to standalone HTML pages that use dc-runtime.js."""
import json, re, sys, os, html

def export(src_path, out_path, runtime_rel):
    s = open(src_path, encoding="utf-8").read()
    title = re.search(r"<title>(.*?)</title>", s, re.S).group(1)
    xdc = re.search(r"<x-dc>(.*)</x-dc>", s, re.S).group(1)
    helmet = ""
    m = re.search(r"<helmet>(.*?)</helmet>", xdc, re.S)
    if m:
        helmet = m.group(1).strip()
        xdc = xdc[:m.start()] + xdc[m.end():]
    sm = re.search(r"<script type=\"text/x-dc\" data-dc-script data-props='(.*?)'>(.*?)</script>", s, re.S)
    props_raw = html.unescape(sm.group(1))
    code = sm.group(2)
    decl = json.loads(props_raw)
    props = {k: v.get("default") for k, v in decl.items() if not k.startswith("$") and isinstance(v, dict) and "default" in v}
    out = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
{helmet}
</head>
<body>
<div id="dc-root"></div>
<template id="dc-template">{xdc.strip()}</template>
<script src="{runtime_rel}"></script>
<script>
{code.strip()}
DCRuntime.mount(Component, document.getElementById('dc-root'), document.getElementById('dc-template').content, {json.dumps(props)});
</script>
</body>
</html>
"""
    open(out_path, "w", encoding="utf-8").write(out)

if __name__ == "__main__":
    export(sys.argv[1], sys.argv[2], sys.argv[3])
