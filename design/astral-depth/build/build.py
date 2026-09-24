import json, os, shutil, sys
sys.path.insert(0, os.path.dirname(__file__))
import protocol, ops, more, system, ops2, more2, extra

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "artboards")
os.makedirs(OUT, exist_ok=True)

files = {
    "Main.dc.html": protocol.build(),
    "Guardrails.dc.html": ops2.guardrails(),
    "Treasury.dc.html": ops2.treasury(),
    "Audit.dc.html": ops2.audit(),
    "Marketplace.dc.html": more2.marketplace(),
    "Agents.dc.html": more2.agents(),
    "Analytics.dc.html": more2.analytics(),
    "Settings.dc.html": more2.settings(),
    "Copilot.dc.html": extra.copilot(),
    "Models.dc.html": extra.models(),
    "Profile.dc.html": extra.profile(),
    "DesignSystem.dc.html": system.system(),
}
for name, html in files.items():
    with open(os.path.join(OUT, name), "w", encoding="utf-8") as f:
        f.write(html)
    print(f"{name:24s} {len(html):>8,d} bytes")

# the four hero images already live beside the artboards

# Canvas layout: screens on page 1 in the product-journey order, system sheet on page 2.
GAP_X, GAP_Y = 120, 160
W = 1440
heights = {
    "Main.dc.html": 4900, "Marketplace.dc.html": 1300, "Agents.dc.html": 900, "Guardrails.dc.html": 1200,
    "Treasury.dc.html": 1180, "Audit.dc.html": 1720, "Analytics.dc.html": 1120, "Settings.dc.html": 900, "Copilot.dc.html": 1120, "Models.dc.html": 1400, "Profile.dc.html": 1120,
}
order = ["Main.dc.html", "Marketplace.dc.html", "Agents.dc.html", "Guardrails.dc.html",
         "Treasury.dc.html", "Audit.dc.html", "Analytics.dc.html", "Settings.dc.html", "Copilot.dc.html", "Models.dc.html", "Profile.dc.html"]
titles = {"Main.dc.html": "01 · Protocol", "Marketplace.dc.html": "02 · Marketplace", "Agents.dc.html": "03 · Agents",
          "Guardrails.dc.html": "04 · Guardrails", "Treasury.dc.html": "05 · Treasury", "Audit.dc.html": "06 · Audit",
          "Analytics.dc.html": "07 · Analytics", "Settings.dc.html": "08 · Settings", "Copilot.dc.html": "09 · Copilot (local model)", "Models.dc.html": "10 · Model profiling", "Profile.dc.html": "11 · Profile"}
artboards = []
# Protocol alone in column 0; the seven operational screens in a 3-wide grid to its right.
artboards.append({"file": "Main.dc.html", "title": titles["Main.dc.html"], "x": 0, "y": 0, "w": W, "h": heights["Main.dc.html"], "page": "screens", "is_interactive": True})
x0 = W + GAP_X
col_h = [0, 0, 0]
for i, f in enumerate(order[1:]):
    c = i % 3
    x = x0 + c * (W + GAP_X)
    y = col_h[c]
    artboards.append({"file": f, "title": titles[f], "x": x, "y": y, "w": W, "h": heights[f], "page": "screens",
                      "is_interactive": f != "Analytics.dc.html"})
    col_h[c] = y + heights[f] + GAP_Y
artboards.append({"file": "DesignSystem.dc.html", "title": "Astral Depth · System", "x": 0, "y": 0, "w": W, "h": 2120, "page": "system"})

canvas = {
    "pages": [{"id": "screens", "name": "Screens"}, {"id": "system", "name": "Design System"}],
    "artboards": artboards,
    "annotations": [
        {"id": "brief", "page": "screens", "x": 0, "y": -320, "w": 640,
         "text": "REDLINE — Astral Depth redesign\nKeeps the Astral palette (navy / champagne gold / Georgia italic) and adds: a 3-tier shadow scale, layered 3D depth on panels & KPI tiles, one easing curve for all motion, and a strict 1440 / 12-col grid (32 gutter · 24 gap).\nButtons are tactile: 4–5 px extruded edge that collapses on press, plus a ripple. Every panel carries a stepped route-coloured extrusion; rows lift toward the viewer on hover."},
        {"id": "proto-notes", "page": "screens", "x": W + GAP_X, "y": -320, "w": 560,
         "text": "NEW · Copilot chats with a model running on your machine (Ollama, OpenAI-compatible endpoint the backend already supports) · Models profiles that model: speed, calibration vs. gate outcomes, adversarial suite · Profile is the owner's wallet identity.\nEach operational page has its own layout: Guardrails = policy deck + wizard + live transfer lane · Treasury = vault scene (cubes = balance) · Audit = timeline stream · Marketplace = spotlight + coverflow · Agents = ID card that flips · Analytics = bento · Settings = sidebar tabs.\nTransaction fx to try: Guardrails ▸ Start agent / Force over cap · Treasury ▸ Refill / Withdraw · Marketplace ▸ Rent with wallet · Protocol ▸ Run simulation."},
        {"id": "sys-note", "page": "system", "x": W + GAP_X, "y": 0, "w": 420,
         "text": "Map to code:\n--sh-1/2/3, --sh-gold → theme.css\n.panel / .panel-3d / .kpi / .gate → replace the 5 stacked CSS layers (index → astral → layout → hoyoverse → pixel-onchain) with one astral-depth.css."},
    ],
    "launch": {"view": "focused", "file": "Main.dc.html"},
}
with open(os.path.join(OUT, "canvas.json"), "w", encoding="utf-8") as f:
    json.dump(canvas, f, indent=2, ensure_ascii=False)
print("canvas.json written;", len(artboards), "artboards")
