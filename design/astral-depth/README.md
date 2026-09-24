# Astral Depth — design source

Artboards of the REDLINE redesign as authored on the design canvas
(one `.dc.html` per screen, `canvas.json` for layout, four downsampled hero
images). The Python files in `build/` generate the artboards — edit those,
not the `.dc.html` output.

| Artboard | Screen |
|---|---|
| `Main.dc.html` | 01 · Protocol (hero, gate chain, open book, policy lab, chain ledger) |
| `Marketplace.dc.html` … `Settings.dc.html` | 02–08 · operational pages, one layout each |
| `Copilot.dc.html` | 09 · chat with a local model (Ollama) |
| `Models.dc.html` | 10 · model profiling |
| `Profile.dc.html` | 11 · owner profile |
| `DesignSystem.dc.html` | tokens, shadow scale, depth model, motifs, motion, type, grid |

The `.dc.html` format is the canvas's Design Component format: plain HTML with
`{{ holes }}`, `<sc-if>` / `<sc-for>` and a `DCLogic` class for interaction.
It is reference material for implementation (see `docs/ASTRAL_DEPTH.md`),
not something the app imports.
