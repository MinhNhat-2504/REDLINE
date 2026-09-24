from shared import *
from shared import water, vox, chain
from ops import CSS_OPS, gate_compact
from protocol import gate_html

SYS_CSS = CSS_OPS + r"""
.motifs{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.motif{position:relative;min-height:190px;padding:16px 18px;border-radius:12px;background:var(--surface);border:1px solid var(--line-strong);box-shadow:var(--sh-1);overflow:hidden;perspective:900px}
.motif small{font:9px var(--mono);letter-spacing:.2em;color:var(--gold)}
.motif b{display:block;margin-top:8px;font:12px var(--mono);font-weight:500;color:var(--text)}
.motif p{margin:6px 0 0;font-size:11.5px;color:var(--muted);line-height:1.6;max-width:210px}
.motif .demo{position:absolute;right:16px;bottom:18px;display:flex;align-items:center;gap:8px}
.motif .water{position:absolute;left:0;right:0;bottom:0;--wh:56px}
.minibook{display:grid;grid-template-columns:1fr 1fr;width:120px;height:66px;perspective:400px}
.minibook i{display:block;background:linear-gradient(180deg,#1d2e4a,#0f1a2e);border:1px solid var(--line-strong)}
.minibook i:first-child{transform-origin:100% 50%;transform:rotateY(22deg);border-radius:6px 0 0 6px}
.minibook i:last-child{transform-origin:0 50%;transform:rotateY(-22deg);border-radius:0 6px 6px 0;animation:pageFlipMini 3s var(--ease) infinite}
@keyframes pageFlipMini{0%{transform:rotateY(-80deg)}30%,100%{transform:rotateY(-22deg)}}
.sys{padding:40px 48px 56px;display:grid;gap:40px}
.sys h2{margin:0;font-size:28px;font-weight:500;letter-spacing:-.03em}
.sys h2 em{font-family:var(--serif);font-style:italic;font-weight:400;color:var(--gold)}
.sys .sub{margin:6px 0 0;font-size:12.5px;color:var(--muted);max-width:720px;line-height:1.7}
.block{display:grid;gap:18px}
.blockhead{display:flex;align-items:baseline;gap:16px}
.blockhead h3{margin:0;font-size:15px;font-weight:600}
.blockhead small{font:9.5px var(--mono);letter-spacing:.2em;color:var(--gold)}
.swatches{display:grid;grid-template-columns:repeat(8,1fr);gap:12px}
.sw{border-radius:10px;overflow:hidden;border:1px solid var(--line-strong);box-shadow:var(--sh-1)}
.sw i{display:block;height:64px}
.sw div{padding:8px 10px;font:10px/1.5 var(--mono);color:var(--text-2);background:var(--surface)}
.sw div b{display:block;font-weight:500;color:var(--text)}
.shadowrow{display:grid;grid-template-columns:repeat(4,1fr);gap:28px;padding:24px 0 12px;perspective:1400px}
.shbox{height:120px;border-radius:14px;background:linear-gradient(180deg,rgba(23,36,58,.6),rgba(18,28,48,.96));border:1px solid var(--line-strong);display:grid;place-items:center;text-align:center;font:10.5px/1.6 var(--mono);color:var(--muted);transform-style:preserve-3d}
.shbox b{display:block;font-size:12px;color:var(--text);font-weight:500;margin-bottom:4px}
.depthrow{display:grid;grid-template-columns:repeat(3,1fr);gap:28px;perspective:1400px;padding:12px 0}
.depthcard{position:relative;height:170px;border-radius:14px;transform-style:preserve-3d;transform:rotateX(14deg) rotateY(-18deg);background:linear-gradient(180deg,rgba(23,36,58,.7),rgba(18,28,48,.98));border:1px solid var(--line-strong);box-shadow:var(--sh-3);padding:18px 20px}
.depthcard .l2{position:absolute;inset:0;border-radius:14px;transform:translateZ(-22px);background:rgba(8,13,25,.9);border:1px solid rgba(45,59,83,.7)}
.depthcard .l3{position:absolute;inset:0;border-radius:14px;transform:translateZ(-44px);background:rgba(5,9,20,.9);border:1px solid rgba(45,59,83,.5)}
.depthcard .fg{position:relative;transform:translateZ(18px)}
.depthcard small{font:9px var(--mono);letter-spacing:.2em;color:var(--gold)}
.depthcard b{display:block;margin-top:10px;font:22px var(--mono);font-weight:500;color:var(--text)}
.depthcard p{margin:8px 0 0;font-size:11.5px;color:var(--muted);line-height:1.6}
.gaterow{display:grid;grid-template-columns:repeat(7,1fr);gap:8px;padding:6px 0}
.motion{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.mo{padding:16px 18px;border-radius:12px;background:var(--surface);border:1px solid var(--line-strong);box-shadow:var(--sh-1)}
.mo small{font:9px var(--mono);letter-spacing:.2em;color:var(--gold)}
.mo b{display:block;margin-top:8px;font:12px var(--mono);font-weight:500;color:var(--text)}
.mo p{margin:6px 0 0;font-size:11.5px;color:var(--muted);line-height:1.6}
.mo .demo{height:28px;margin-top:12px;position:relative;border-radius:6px;background:var(--inset);overflow:hidden}
.mo .demo i{position:absolute;top:8px;width:12px;height:12px;border-radius:3px;background:var(--gold);box-shadow:0 0 12px var(--gold)}
.d1 i{animation:mo1 1.8s var(--ease) infinite alternate}.d2 i{animation:travel 3s var(--ease) infinite}.d3 i{left:calc(50% - 6px);animation:mo3 1.6s ease-in-out infinite}.d4 i{left:calc(50% - 6px);animation:mo4 2.2s var(--ease) infinite}
@keyframes mo1{from{left:6px}to{left:calc(100% - 18px)}}
@keyframes mo3{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-6px) scale(1.15)}}
@keyframes mo4{0%{transform:rotateX(0)}50%{transform:rotateX(180deg)}100%{transform:rotateX(360deg)}}
.type{display:grid;gap:14px;padding:22px 24px;border-radius:14px;background:var(--surface);border:1px solid var(--line-strong);box-shadow:var(--sh-1)}
.type div{display:grid;grid-template-columns:200px 1fr;gap:20px;align-items:baseline;border-bottom:1px solid rgba(45,59,83,.7);padding-bottom:12px}
.type div:last-child{border-bottom:0;padding-bottom:0}
.type small{font:10px var(--mono);color:var(--muted)}
.gridspec{display:grid;grid-template-columns:1fr 1fr;gap:24px}
.gridvis{position:relative;height:150px;border-radius:12px;background:var(--inset);border:1px solid var(--line);overflow:hidden}
.gridvis .cols{position:absolute;inset:14px 32px;display:grid;grid-template-columns:repeat(12,1fr);gap:24px}
.gridvis .cols i{background:rgba(223,195,140,.12);border:1px dashed rgba(223,195,140,.4);border-radius:3px}
.gridvis .gut{position:absolute;top:0;bottom:0;width:32px;background:repeating-linear-gradient(45deg,rgba(255,147,164,.18) 0 4px,transparent 4px 8px)}
.gridvis .gut.l{left:0}.gridvis .gut.r{right:0}
.spec{display:grid;gap:0;padding:0 4px}
"""

def sys_body():
    sw = lambda c, n, use: f'<div class="sw"><i style="background: {c}"></i><div><b>{n}</b>{c}<br>{use}</div></div>'
    swatches = "".join([
        sw("#080d19", "bg", "canvas"), sw("#121c30", "surface", "panels"), sw("#17243a", "surface-hi", "chips · inputs"), sw("#0c1425", "inset", "wells · code"),
        sw("#dfc38c", "gold", "accent · CTA"), sw("#8dcced", "info", "addresses · links"), sw("#85dbc0", "verified", "passed · ALLOW"), sw("#ff93a4", "blocked", "rejected · danger"),
    ])
    route_sw = "".join(f'<div class="sw"><i style="background: rgb({PG[k]})"></i><div><b>{k}</b>rgb({PG[k]})</div></div>' for k in ["protocol","marketplace","agents","guardrails","treasury","audit","analytics","settings"])
    gates_full = "".join(gate_html(i, "passed" if i < 5 else ("blocked" if i == 5 else "skipped")) for i in range(7))
    return f'''
<div class="app" style="--pg: 223,195,140">
<div class="sys">
  <div><div class="eyebrow">REDLINE · ASTRAL DEPTH</div><h2 style="margin-top: 12px">Design system — <em>depth, motion, shadow, rhythm.</em></h2>
    <p class="sub">One shared vocabulary for all eight screens. Colours and type are the existing Astral tokens from <span class="mono">theme.ts</span> / <span class="mono">astral.css</span>; what is new is a three-tier shadow scale, a layered-depth model for every panel, one easing curve, and a strict 1440 / 12-column grid with 32 px gutters and 24 px gaps.</p></div>

  <div class="block"><div class="blockhead"><h3>Colour tokens</h3><small>UNCHANGED FROM ASTRAL</small></div><div class="swatches">{swatches}</div>
    <div class="blockhead" style="margin-top: 6px"><h3 style="font-size: 13px">Route accents (--pg)</h3><small>BANNER EM · CORNERS · KPI RULE · PAGE BLOOM — GOLD EVERYWHERE ELSE</small></div>
    <div class="swatches">{route_sw}</div></div>

  <div class="block"><div class="blockhead"><h3>Shadow scale</h3><small>--sh-1 · --sh-2 · --sh-3 · --sh-gold</small></div>
    <div class="shadowrow">
      <div class="shbox" style="box-shadow: var(--sh-1)"><span><b>sh-1 · resting</b>inputs, chips, tools<br>1px top light + 24px soft</span></div>
      <div class="shbox" style="box-shadow: var(--sh-2)"><span><b>sh-2 · raised</b>panels, cards, KPI tiles<br>two-layer 34 / 70px</span></div>
      <div class="shbox" style="box-shadow: var(--sh-3)"><span><b>sh-3 · floating</b>hover, hero worlds, modals<br>+ 70px gold ambient</span></div>
      <div class="shbox" style="box-shadow: var(--sh-gold), 0 14px 30px -14px rgba(0,0,0,.9); background: linear-gradient(180deg,#eed5a3,#dfc38c 60%,#cdb077); color: #101827"><span><b style="color: #101827">sh-gold · primary CTA</b>26px gold bloom<br>+ inset 1px rim</span></div>
    </div></div>

  <div class="block"><div class="blockhead"><h3>Layered depth</h3><small>PRESERVE-3D · TRANSLATEZ −22 / −44 · HOVER +18</small></div>
    <div class="depthrow">
      <div class="depthcard"><div class="l3"></div><div class="l2"></div><div class="fg"><small>KPI TILE</small><b>7,944.00</b><p>Three stacked planes; the front plane lifts 18 px on hover, the rear planes stay put.</p></div></div>
      <div class="depthcard" style="transform: rotateX(8deg) rotateY(10deg)"><div class="l3"></div><div class="l2"></div><div class="fg"><small>PANEL</small><b>panel-3d</b><p>translateY −4 · rotateX 1.2° · sh-3. Only on Protocol and hover; operational pages stay flat at rest.</p></div></div>
      <div class="depthcard" style="transform: rotateX(18deg) rotateY(-6deg)"><div class="l3"></div><div class="l2"></div><div class="fg"><small>BANNER GLYPH</small><b>float 6s</b><p>Route icon tilted 14° / −16°, drifting 8 px. Signals where you are before the heading is read.</p></div></div>
    </div></div>

  <div class="block"><div class="blockhead"><h3>The seven gates — one component, three contexts</h3><small>FULL · COMPACT · BADGE</small></div>
    <div class="panel" style="padding: 22px 24px; perspective: 1400px"><div class="gaterow">{gates_full}</div>
      <div style="display: flex; align-items: center; gap: 28px; margin-top: 22px; padding-top: 18px; border-top: 1px solid var(--line); font-size: 12px; color: var(--text-2)">
        <span>Compact (log row)</span>{gate_compact(["passed"]*5+["blocked","skipped"])}<span style="margin-left: 12px">Badge (audit)</span><span class="gate-badge bad"><i>6</i>SPEND_CAP_EXCEEDED</span><span class="gate-badge ok"><i>7</i>ALL GATES PASSED</span>
        <span style="margin-left: auto; font: 10px var(--mono); color: var(--muted)">idle · passed · blocked · skipped</span></div></div></div>

  <div class="block"><div class="blockhead"><h3>3D motifs</h3><small>VOXEL · CHAIN · WATER · OPEN BOOK — PROTOCOL PAGE, BANNERS ONLY</small></div>
    <div class="motifs">
      <div class="motif"><small>PIXEL / VOXEL</small><b>.vox · 3 faces · preserve-3d</b><p>One cube, three tinted faces (rotateX −26° · rotateY 42°). Colour classes vox-ok / vox-bad / vox-info carry the gate verdict.</p><div class="demo">{vox("07", "vox-ok", 44)}{vox("06", "vox-bad", 44)}{vox("", "vox-info", 30)}</div></div>
      <div class="motif"><small>CHAIN</small><b>.chain · alternating rotateX 72°</b><p>Links glow in sequence (180 ms stagger) — the transaction moving link by link. Odd links gold, even links info-blue.</p><div class="demo">{chain(7)}</div></div>
      <div class="motif"><small>WATER</small><b>.water · 3 bands · 9 / 14 / 22 s</b><p>Three seamless wave paths sliding at different speeds; the slowest runs in reverse. Used as the section current and under every banner.</p>{water(56)}</div>
      <div class="motif"><small>OPEN BOOK</small><b>.spread · rotateY ±14° · pageFlip .9 s</b><p>Two pages folded toward a dark gutter; changing a world flips the right page in from −88°. Stacked sheets beneath give it thickness.</p><div class="demo"><div class="minibook"><i></i><i></i></div></div></div>
    </div></div>

  <div class="block"><div class="blockhead"><h3>Motion</h3><small>ONE CURVE · cubic-bezier(.16,1,.3,1)</small></div>
    <div class="motion">
      <div class="mo d1"><small>ENTRANCE</small><b>rise · 900 ms · stagger 90 ms</b><p>translateY 22 → 0, blur 6 → 0. Used once per page load, never on scroll.</p><div class="demo"><i></i></div></div>
      <div class="mo d2"><small>LIVE FEED</small><b>travel · 5.5 s loop</b><p>A pulse crosses the backbone rail from AGENT to VAULT; a real SSE event replaces the loop.</p><div class="demo"><i></i></div></div>
      <div class="mo d3"><small>STATE CHANGE</small><b>gate blocked · 450 ms</b><p>translateZ 18 · scale 1.04 · red bloom. The only place saturated red appears.</p><div class="demo"><i></i></div></div>
      <div class="mo d4"><small>AMBIENT</small><b>orbit 32–48 s · float 6 s</b><p>Hero only. Respects prefers-reduced-motion — everything collapses to a still frame.</p><div class="demo"><i></i></div></div>
    </div></div>

  <div class="gridspec">
    <div class="block"><div class="blockhead"><h3>Type</h3><small>INTER · JETBRAINS MONO · GEORGIA ITALIC</small></div>
      <div class="type">
        <div><small>display · 84 / .98 · −.06em</small><span style="font-size: 42px; line-height: 1; letter-spacing: -.05em; font-weight: 500">Intelligence, without limits. <em class="serif" style="color: var(--gold)">Authority, with them.</em></span></div>
        <div><small>h1 banner · 40 / 1.05 · 600</small><span style="font-size: 28px; letter-spacing: -.04em; font-weight: 600">Agent <em class="serif" style="color: var(--gold)">Guardrails</em></span></div>
        <div><small>h3 panel · 14 / 600</small><span style="font-size: 14px; font-weight: 600">Active Policy Accounts</span></div>
        <div><small>body · 13.5 / 1.65</small><span style="font-size: 13.5px; color: var(--text-2)">Sans = interpretation. Mono = anything verifiable on-chain.</span></div>
        <div><small>mono data · 12.5 / 500</small><span class="mono" style="font-size: 12.5px; color: var(--gold-hi)">1,588.0 / 7,944 USDC · SPEND_CAP_EXCEEDED</span></div>
        <div><small>eyebrow · 9.5 / .22em</small><span class="eyebrow">LIVE POLICY BACKBONE</span></div>
      </div></div>
    <div class="block"><div class="blockhead"><h3>Layout grid</h3><small>1440 · 12 COL · 32 GUTTER · 24 GAP</small></div>
      <div class="gridvis"><span class="gut l"></span><span class="gut r"></span><div class="cols"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div></div>
      <div class="spec">
        <div class="kv"><span>Header</span><b>64 px · sticky</b></div>
        <div class="kv"><span>Journey bar → banner → content</span><b>52 · 210 · 24 px gaps</b></div>
        <div class="kv"><span>Two-column pages</span><b>.85/1.3 Guardrails · .8/1.3 Agents · 1.5/1 Analytics · 1/1 Treasury, Settings</b></div>
        <div class="kv"><span>Panel padding · radius</span><b>20 / 22 px · 14 px</b></div>
        <div class="kv"><span>Baseline</span><b>8 px · hit targets ≥ 32 px</b></div>
      </div></div>
  </div>
</div>
</div>'''

def system():
    return wrap(sys_body(), SYS_CSS, '<script data-dc-script data-props=\'{"$preview":{"width":1440,"height":2120}}\'>class Component extends DCLogic {}</script>')
