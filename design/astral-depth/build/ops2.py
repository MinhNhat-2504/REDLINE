from shared import *
from shared import water, vox, chain, shards, topline
from protocol import GATES
from ops import CSS_OPS, gate_compact, kpi, spark

def mini_gates():
    """Seven small gate pips used in the transfer lane."""
    return "".join(f'<div class="mg" style="--k: {i}"><b>{GATES[i][0]}</b><small>{GATES[i][1]}</small></div>' for i in range(7))

# =============================================================== GUARDRAILS
GUARD_CSS = CSS_OPS + r"""
.cockpit{display:grid;grid-template-columns:500px minmax(0,1fr);gap:28px;margin-top:22px;align-items:start}
/* --- policy deck: physical grant cards fanned in 3D --- */
.deck{position:relative;height:330px;perspective:1600px}
.gcard{position:absolute;left:0;right:0;top:0;height:230px;border-radius:18px;padding:22px 24px;overflow:hidden;transform-style:preserve-3d;
  background:linear-gradient(135deg,#1d2f4c 0%,#101b30 55%,#0b1424 100%);border:1px solid rgba(223,195,140,.45);
  box-shadow:0 40px 60px -30px rgba(0,0,0,.95),0 0 0 1px rgba(255,255,255,.03) inset,0 0 60px -30px rgba(223,195,140,.5);
  transition:transform .6s var(--ease),box-shadow .6s var(--ease),opacity .4s;cursor:pointer;text-align:left;width:100%}
.gcard::before{content:"";position:absolute;inset:0;background:linear-gradient(115deg,transparent 30%,rgba(255,255,255,.08) 45%,rgba(141,204,237,.12) 50%,rgba(223,195,140,.14) 55%,transparent 70%);mix-blend-mode:screen;animation:holo 6s ease-in-out infinite}
@keyframes holo{0%,100%{transform:translateX(-30%)}50%{transform:translateX(30%)}}
.gcard::after{content:"";position:absolute;left:24px;right:24px;top:0;height:1px;background:linear-gradient(90deg,transparent,rgba(223,195,140,.8),transparent)}
.gcard.c0{transform:translateZ(60px) rotateX(6deg)}
.gcard.c1{transform:translateY(48px) translateZ(0) rotateX(6deg) scale(.965);opacity:.95;filter:brightness(.85)}
.gcard.c2{transform:translateY(94px) translateZ(-60px) rotateX(6deg) scale(.93);opacity:.8;filter:brightness(.7)}
.gcard:hover{transform:translateZ(90px) rotateX(2deg)!important;opacity:1;filter:none}
.gcard .row{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
.gcard .chipset{width:44px;height:34px;border-radius:7px;background:linear-gradient(135deg,#eed5a3,#b8985a);box-shadow:inset 0 0 0 1px rgba(0,0,0,.25),0 4px 8px -4px rgba(0,0,0,.8);position:relative}
.gcard .chipset::before{content:"";position:absolute;inset:8px 10px;border:1px solid rgba(0,0,0,.35);border-radius:3px}
.gcard .who{margin-top:16px}.gcard .who b{font-size:16px;font-weight:600;color:var(--text)}.gcard .who small{display:block;margin-top:2px;font:10.5px var(--mono);color:var(--muted)}
.gcard .nums{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-top:18px}
.gcard .nums small{display:block;font:8px var(--mono);letter-spacing:.2em;color:var(--muted)}
.gcard .nums b{display:block;margin-top:4px;font:15px var(--mono);font-weight:500;color:var(--gold-hi)}
.gcard .bar{margin-top:16px;height:5px}
.gcard .stamp{position:absolute;right:24px;bottom:22px;font:9px var(--mono);letter-spacing:.2em}
.gcard.dead{border-color:rgba(255,147,164,.35)}
.gcard.dead .chipset{filter:grayscale(1) brightness(.6)}
.deck-actions{display:grid;gap:12px;margin-top:6px;padding:18px 20px;border-radius:14px;background:rgba(15,25,43,.85);border:1px solid var(--line-strong);box-shadow:var(--sh-1)}
.deck-actions .row{display:flex;gap:10px;flex-wrap:wrap}
.deck-actions .danger{padding-top:12px;border-top:1px dashed rgba(255,147,164,.35);display:flex;gap:8px;align-items:center}
.deck-actions .danger small{margin-left:auto;font:9px var(--mono);letter-spacing:.16em;color:rgba(255,147,164,.7)}
/* --- transfer lane --- */
.lane{position:relative;margin-top:26px;padding:22px 26px 18px;border-radius:16px;background:linear-gradient(180deg,rgba(23,36,58,.55),rgba(12,20,37,.95));border:1px solid var(--line-strong);box-shadow:var(--sh-2),8px 8px 0 0 rgba(var(--pg),.2);perspective:1400px;overflow:visible}
.lane .track{display:grid;grid-template-columns:110px repeat(7,minmax(0,1fr)) 110px;gap:10px;align-items:center;position:relative;transform:rotateX(8deg);transform-origin:50% 100%;transform-style:preserve-3d}
.lane .ep{width:auto;height:76px;flex-direction:row;gap:10px;font-size:9px}
.mg{position:relative;height:76px;border-radius:9px;padding:10px 8px;background:linear-gradient(160deg,#1b2c45,#101b30);border:1px solid var(--line-strong);display:flex;flex-direction:column;justify-content:space-between;transition:all .35s var(--ease);transform-style:preserve-3d}
.mg b{font:600 14px var(--mono);color:var(--text-2)}.mg small{font-size:9.5px;line-height:1.2;color:var(--muted)}
.mg::before{content:"";position:absolute;left:4px;right:-4px;top:-7px;height:7px;border-radius:3px 3px 0 0;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.08);border-bottom:0;transform:skewX(-45deg)}
.lane[data-phase="fly"] .mg,.lane[data-phase="land"] .mg{animation:mgPass .5s var(--ease) both;animation-delay:calc(.25s + var(--k) * .17s)}
.lane[data-phase="block"] .mg:nth-child(-n+6){animation:mgPass .5s var(--ease) both;animation-delay:calc(.25s + var(--k) * .17s)}
.lane[data-phase="block"] .mg.k6{animation:mgBlock .6s var(--ease) both;animation-delay:1.3s}
@keyframes mgPass{to{border-color:rgba(133,219,192,.75);background:linear-gradient(160deg,rgba(133,219,192,.22),#101b30);box-shadow:0 0 22px -4px rgba(133,219,192,.6);transform:translateZ(8px)}}
@keyframes mgBlock{0%{transform:translateZ(8px)}30%{transform:translateZ(22px) translateX(-4px)}60%{transform:translateZ(22px) translateX(4px)}100%{border-color:rgba(255,147,164,.9);background:linear-gradient(160deg,rgba(255,147,164,.28),#101b30);box-shadow:0 0 34px -2px rgba(255,147,164,.8);transform:translateZ(18px)}}
.lane .coin{top:-4px;left:6%;opacity:0}
.lane[data-phase="fly"] .coin{animation:coinFly 1.9s var(--ease) both}
.lane[data-phase="land"] .coin{opacity:0}
.lane[data-phase="block"] .coin{animation:coinBlock 1.9s var(--ease) both}
@keyframes coinFly{0%{left:6%;opacity:0}8%{opacity:1}85%{left:92%;opacity:1}100%{left:92%;opacity:0;transform:translateY(20px) scale(.6)}}
@keyframes coinBlock{0%{left:6%;opacity:0}8%{opacity:1}70%{left:73%}76%{left:71%}82%{left:74%}100%{left:73%;opacity:0;filter:drop-shadow(0 0 14px rgba(255,147,164,.9))}}
.lane .status{display:flex;align-items:center;justify-content:space-between;margin-top:18px;font:10px var(--mono);letter-spacing:.14em;color:var(--muted)}
.lane .status b{color:var(--text-2);font-weight:500}
.lane .status .live{display:inline-flex;align-items:center;gap:8px}.lane .status .live i{width:6px;height:6px;border-radius:50%;background:var(--ok);box-shadow:0 0 10px var(--ok);animation:pulse 1.6s infinite}
.lane[data-phase="block"] .status .live i{background:var(--bad);box-shadow:0 0 10px var(--bad)}
.newrow{animation:dropIn .7s var(--ease) both}
.newrow.ok{background:linear-gradient(90deg,rgba(133,219,192,.12),transparent 55%)}
.newrow.bad{background:linear-gradient(90deg,rgba(255,147,164,.14),transparent 55%);animation:dropIn .7s var(--ease) both,shake .5s .7s}
.wizard .pb{min-height:400px}
"""

def guardrails_body():
    def gcard(cls, name, ver, grant, spent, cap, tx, left, pct, chip, dead=False, on=None):
        onclick = f' onClick="{{{{ {on} }}}}"' if on else ""
        return f'''<button type="button" class="gcard {cls}{' dead' if dead else ''}"{onclick}>
      <div class="row"><span class="chipset"></span><span class="chip {chip[1]}">● {chip[0]}</span></div>
      <div class="who"><b>{name}</b><small>{ver} · grant {grant}</small></div>
      <div class="nums"><div><small>SPENT / CAP</small><b>{spent} / {cap}</b></div><div><small>TX</small><b>{tx}</b></div><div><small>TIME LEFT</small><b>{left}</b></div></div>
      <div class="bar{' bad' if dead else ''}"><i style="width: {{{{ pct }}}}%"></i></div>
      <span class="stamp" style="color: {'var(--bad)' if dead else 'var(--gold)'}">SIGNED ON-CHAIN · SHA-256</span>
    </button>''' if not dead else f'''<button type="button" class="gcard {cls} dead"{onclick}>
      <div class="row"><span class="chipset"></span><span class="chip {chip[1]}">● {chip[0]}</span></div>
      <div class="who"><b>{name}</b><small>{ver} · grant {grant}</small></div>
      <div class="nums"><div><small>SPENT / CAP</small><b>{spent} / {cap}</b></div><div><small>TX</small><b>{tx}</b></div><div><small>TIME LEFT</small><b>{left}</b></div></div>
      <div class="bar bad"><i style="width: {pct}%"></i></div>
      <span class="stamp" style="color: var(--bad)">REVOKED BY OWNER</span>
    </button>'''
    return f'''
<div class="app">
{header("Guardrails")}
<main class="page" onMouseMove="{{{{ onMove }}}}" onMouseLeave="{{{{ onLeave }}}}">
{topline(4, "Guardrails", "Agents", "Treasury", "Sign a policy once. From then on the program — not this dashboard — decides every transfer the agent proposes.")}
<div class="cockpit">
  <div>
    <div class="eyebrow rise" style="--i: 1; margin: 6px 0 14px">POLICY DECK · 1 ACTIVE · 2 REVOKED</div>
    <div class="deck rise" style="--i: 2">
      {gcard("c2", "YieldGuard Alpha", "v0.1.0", "vdPU…GY6e", "300", "500", "3 / 50", "expired", 60, ("REVOKED", "chip-bad"), True)}
      {gcard("c1", "CSaCLAB", "v1.0.0", "HRRW…WNKN", "1,588", "7,944", "1 / 50", "expired", 20, ("REVOKED", "chip-bad"), True)}
      {gcard("c0", "tui là thắng", "v1.0.0", "GFNM…v1tJ", "{{ spent }}", "500", "{{ txc }} / 50", "23h 12m", 0, ("ACTIVE", "chip-ok"))}
    </div>
    <div class="deck-actions rise" style="--i: 3">
      <div class="row"><button type="button" class="btn btn-gold btn-sm" onClick="{{{{ fire }}}}">{svg("play", 11, "#101827")} Start agent (scripted)</button><button type="button" class="btn btn-ghost btn-sm">{svg("eye", 11)} Show every proposal</button><button type="button" class="btn btn-ghost btn-sm">{svg("ext", 11)} Explorer</button></div>
      <div class="danger"><button type="button" class="btn btn-danger btn-sm" onClick="{{{{ force }}}}">{svg("zap", 11)} Force 500 USDC (over cap)</button><button type="button" class="btn btn-danger btn-sm">{svg("x", 11)} Revoke</button><small>IRREVERSIBLE · OWNER SIGNS</small></div>
    </div>
  </div>

  <section class="panel wizard rise" style="--i: 2">
    <div class="ph"><div style="display: flex; align-items: center; gap: 10px">{svg("spark", 13, "#dfc38c")}<h3>Create Agent Policy</h3></div><span class="chip chip-ok">SOLANA DEVNET</span></div>
    <div class="steps">
      <button type="button" class="step" aria-current="{{{{ cur1 }}}}" data-done="{{{{ done1 }}}}" onClick="{{{{ go1 }}}}"><i>1</i>Scope</button>
      <button type="button" class="step" aria-current="{{{{ cur2 }}}}" data-done="{{{{ done2 }}}}" onClick="{{{{ go2 }}}}"><i>2</i>Spend limits</button>
      <button type="button" class="step" aria-current="{{{{ cur3 }}}}" data-done="{{{{ done3 }}}}" onClick="{{{{ go3 }}}}"><i>3</i>Time bounds</button>
      <button type="button" class="step" aria-current="{{{{ cur4 }}}}" data-done="{{{{ done4 }}}}" onClick="{{{{ go4 }}}}"><i>4</i>Review &amp; sign</button>
    </div>
    <div class="pb">
      <sc-if value="{{{{ is1 }}}}" hint-placeholder-val="{{{{ true }}}}">
        <p class="help">Which published agent version does this grant authorise? The grant records its <code>agentHash</code>, so this is the build the policy is bound to.</p>
        <label class="field">Agent version<div class="in" style="justify-content: space-between">hello v1.0.0 · 41d3d11a…<span>{svg("chevd", 12)}</span></div></label>
        <p class="help">Allowlist the SPL assets this agent may reference. Every other mint remains outside the signed policy.</p>
        <div class="pill-row" style="margin-bottom: 18px">
          <button type="button" class="mint" aria-pressed="{{{{ mSol }}}}" onClick="{{{{ tSol }}}}">SOL</button>
          <button type="button" class="mint" aria-pressed="{{{{ mUsdc }}}}" onClick="{{{{ tUsdc }}}}">USDC</button>
          <button type="button" class="mint" aria-pressed="{{{{ mJup }}}}" onClick="{{{{ tJup }}}}">JUP</button>
          <button type="button" class="mint" aria-pressed="false">JTO</button><button type="button" class="mint" aria-pressed="false">BONK</button><button type="button" class="mint" aria-pressed="false">PYTH</button>
        </div>
        <p class="help">Allowlist the addresses this agent may pay. An address not here cannot receive funds, whatever the agent proposes. Up to 4.</p>
        <div class="dest">{svg("check", 12, "#85dbc0")}7XB2hFTccpjS6sgZZjr8wWnCuk6jYuXk6aYkXRHPu62q<span class="rm">{svg("x", 12)}</span></div>
        <div class="dest" style="border-style: dashed; color: var(--muted)">{svg("plus", 12)}Add a destination address</div>
      </sc-if>
      <sc-if value="{{{{ is2 }}}}" hint-placeholder-val="{{{{ false }}}}">
        <p class="help">The budget is the most the agent can move across the whole grant. The transaction cap bounds how many proposals may succeed.</p>
        <div class="slider"><div class="row"><span>Spend cap</span><b>2,500 USDC</b></div><div class="track"><div class="fill" style="width: 25%"></div><div class="knob" style="left: 25%"></div></div></div>
        <div class="slider"><div class="row"><span>Max transactions</span><b>10</b></div><div class="track"><div class="fill" style="width: 20%"></div><div class="knob" style="left: 20%"></div></div></div>
        <div class="inset" style="display: grid; grid-template-columns: repeat(3, 1fr); padding: 14px 18px; margin-top: 6px">
          <div><small class="mono" style="font-size: 8.5px; letter-spacing: .18em; color: var(--muted)">AVG / TX</small><div class="mono" style="font-size: 15px; color: var(--gold-hi)">$250.00</div></div>
          <div><small class="mono" style="font-size: 8.5px; letter-spacing: .18em; color: var(--muted)">RISK</small><div class="mono" style="font-size: 15px; color: var(--warn)">MED</div></div>
          <div><small class="mono" style="font-size: 8.5px; letter-spacing: .18em; color: var(--muted)">MINTS</small><div class="mono" style="font-size: 15px; color: var(--info)">{{{{ mintCount }}}}</div></div>
        </div>
      </sc-if>
      <sc-if value="{{{{ is3 }}}}" hint-placeholder-val="{{{{ false }}}}">
        <p class="help">Authority never lingers by default. The grant expires on its own, and the cooldown makes runaway loops impossible.</p>
        <div class="slider"><div class="row"><span>Policy lifetime</span><b>24 h</b></div><div class="track"><div class="fill" style="width: 14%"></div><div class="knob" style="left: 14%"></div></div></div>
        <div class="slider"><div class="row"><span>Cooldown between transfers</span><b>60 min</b></div><div class="track"><div class="fill" style="width: 42%"></div><div class="knob" style="left: 42%"></div></div></div>
        <div class="inset" style="padding: 14px 18px; display: flex; gap: 14px; align-items: center">{svg("clock", 16, "#dfc38c")}<span style="font-size: 12.5px; color: var(--text-2); line-height: 1.6">Expires <b class="mono" style="color: var(--gold-hi); font-weight: 500">Sat 05 Sep 2026, 09:14</b> · at most <b class="mono" style="color: var(--gold-hi); font-weight: 500">24</b> transfers could fit in the window.</span></div>
      </sc-if>
      <sc-if value="{{{{ is4 }}}}" hint-placeholder-val="{{{{ false }}}}">
        <div class="summary">You are authorising <b>hello v1.0.0</b> to move at most <b>2,500 USDC</b> in up to <b>10</b> transfers, only in <b>{{{{ mintText }}}}</b>, only to <b>1 address</b>, waiting <b>60 min</b> between transfers, until <b>05 Sep 09:14</b>. You can revoke at any time from your wallet.</div>
        <div class="copilot">
          <div class="score"><b>22</b><small>RISK</small></div>
          <div><h4>AI Risk Copilot · <span class="chip chip-ok" style="vertical-align: middle">ALLOW</span></h4>
            <p>Scope is narrow and the envelope is small relative to the vault.</p>
            <ul><li>{svg("check", 12, "#85dbc0")}Single allowlisted destination limits phishing blast radius.</li><li>{svg("check", 12, "#85dbc0")}Cooldown 60 min · cap 10 → at most 2,500 USDC even if the agent is compromised.</li><li>{svg("zap", 12, "#f1c678")}USDC and SOL both allowed — consider USDC only for payroll.</li></ul></div>
        </div>
        <div class="signzone"><p>Signing publishes the policy digest on-chain. From then on, the program — not this dashboard — decides every transfer.</p><button type="button" class="btn btn-gold" style="height: 46px">{svg("key", 14, "#101827")} Sign &amp; create on-chain grant</button></div>
      </sc-if>
    </div>
    <div class="wizfoot">
      <button type="button" class="btn btn-ghost btn-sm" onClick="{{{{ prev }}}}">{svg("arrowl", 12)} Back</button>
      <span class="mono" style="font-size: 10px; letter-spacing: .18em; color: var(--muted)">STEP {{{{ step }}}} / 4</span>
      <button type="button" class="btn btn-gold btn-sm" onClick="{{{{ next }}}}">Continue {svg("arrow", 12, "#101827")}</button>
    </div>
  </section>
</div>

<!-- transfer lane -->
<div class="lane rise" style="--i: 4" data-phase="{{{{ phase }}}}">
  <div class="ph" style="padding: 0 0 16px; border-bottom: 0"><span class="eyebrow">LIVE TRANSFER LANE · tui là thắng v1.0.0</span><span class="chip chip-info">● SSE</span></div>
  <div class="coin">{vox("", "", 20, False)}</div>
  <div class="track">
    <div class="ep agent">{vox("", "vox-info", 24, False)}AGENT</div>
    {mini_gates()}
    <div class="ep vault">{vox("", "vox-ok", 24, False)}VAULT</div>
  </div>
  <div class="status"><span class="live"><i></i><b>{{{{ statusText }}}}</b></span><span>PRESS <b>START AGENT</b> TO PROPOSE 100 USDC · <b>FORCE</b> TO TRY 500 OVER A 500 CAP</span></div>
</div>

<!-- proposals log -->
<section class="panel rise" style="--i: 5; margin-top: 24px">
  <div class="ph"><h3>Every proposal this agent made</h3><span class="mono" style="font-size: 10px; color: var(--muted)">{{{{ total }}}} PROPOSALS · NEWEST FIRST</span></div>
  <div class="log-head"><span>TIME</span><span>PROPOSAL</span><span>GATES</span><span>AMOUNT</span><span>SIGNATURE</span></div>
  <sc-if value="{{{{ showBlocked }}}}" hint-placeholder-val="{{{{ false }}}}">
    <div class="log-row rejected newrow bad"><span class="t">now</span><span><span class="chip chip-bad" style="margin-right: 8px">SPEND_CAP_EXCEEDED</span>Forced 500 USDC over a 500 cap · nothing moved</span>{gate_compact(["passed"]*5+["blocked","skipped"])}<span class="amt" style="color: var(--bad)">500.00 USDC</span><a class="sig">pending… {svg("ext", 10)}</a></div>
  </sc-if>
  <sc-if value="{{{{ showAllowed }}}}" hint-placeholder-val="{{{{ false }}}}">
    <div class="log-row newrow ok"><span class="t">now</span><span><span class="chip chip-ok" style="margin-right: 8px">ALLOWED</span>Transfer to 7XB2…u62q · 7 gates passed · vault −100</span>{gate_compact(["passed"]*7)}<span class="amt">100.00 USDC</span><a class="sig">confirmed {svg("ext", 10)}</a></div>
  </sc-if>
  <div class="log-row"><span class="t">09:12:41</span><span>Transfer to 7XB2…u62q · allowed</span>{gate_compact(["passed"]*7)}<span class="amt">100.00 USDC</span><a class="sig">4kz…73A {svg("ext", 10)}</a></div>
  <div class="log-row"><span class="t">09:11:38</span><span>Transfer to 7XB2…u62q · allowed</span>{gate_compact(["passed"]*7)}<span class="amt">100.00 USDC</span><a class="sig">9Qm…cE1 {svg("ext", 10)}</a></div>
  <div class="log-row rejected"><span class="t">09:11:02</span><span><span class="chip chip-bad" style="margin-right: 8px">COOLDOWN_ACTIVE</span>Proposed 36 s after the last transfer</span>{gate_compact(["passed"]*6+["blocked"])}<span class="amt" style="color: var(--bad)">100.00 USDC</span><a class="sig">t4X…9su {svg("ext", 10)}</a></div>
  <div class="log-row"><span class="t">09:09:27</span><span>Transfer to 7XB2…u62q · allowed</span>{gate_compact(["passed"]*7)}<span class="amt">100.00 USDC</span><a class="sig">2Hf…pQ8 {svg("ext", 10)}</a></div>
</section>
</main>
</div>'''

GUARD_SCRIPT = r"""<script data-dc-script data-props='{"$preview":{"width":1440,"height":1200}}'>
class Component extends DCLogic {
  constructor(p){ super(p); this.state = { step: 1, mints: { sol: true, usdc: true, jup: false }, phase: 'idle', spent: 300, txc: 3, allowed: false, blocked: false, total: 4 }; }
  renderVals() {
    const s = this.state, st = s.step;
    return {
      step: st, is1: st === 1, is2: st === 2, is3: st === 3, is4: st === 4,
      cur1: st === 1 ? 'step' : 'false', cur2: st === 2 ? 'step' : 'false', cur3: st === 3 ? 'step' : 'false', cur4: st === 4 ? 'step' : 'false',
      done1: st > 1, done2: st > 2, done3: st > 3, done4: false,
      go1: () => this.setState({ step: 1 }), go2: () => this.setState({ step: 2 }), go3: () => this.setState({ step: 3 }), go4: () => this.setState({ step: 4 }),
      next: () => this.setState({ step: Math.min(4, st + 1) }), prev: () => this.setState({ step: Math.max(1, st - 1) }),
      mSol: s.mints.sol, mUsdc: s.mints.usdc, mJup: s.mints.jup,
      tSol: () => this.setState({ mints: { ...s.mints, sol: !s.mints.sol } }), tUsdc: () => this.setState({ mints: { ...s.mints, usdc: !s.mints.usdc } }), tJup: () => this.setState({ mints: { ...s.mints, jup: !s.mints.jup } }),
      mintText: [s.mints.sol && 'SOL', s.mints.usdc && 'USDC', s.mints.jup && 'JUP'].filter(Boolean).join(', ') || 'no assets',
      mintCount: [s.mints.sol, s.mints.usdc, s.mints.jup].filter(Boolean).length,
      phase: s.phase, spent: s.spent.toLocaleString(), txc: s.txc, pct: Math.round(s.spent / 500 * 100), total: s.total,
      showAllowed: s.allowed, showBlocked: s.blocked,
      statusText: s.phase === 'fly' ? 'PROPOSAL IN FLIGHT · EVALUATING GATES' : s.phase === 'land' ? 'ALLOWED · 100 USDC MOVED · SIGNATURE RECORDED' : s.phase === 'block' ? 'REFUSED AT GATE 06 · SPEND_CAP_EXCEEDED · NOTHING MOVED' : 'IDLE · WAITING FOR THE AGENT',
      fire: () => { if (s.phase !== 'idle') return; this.setState({ phase: 'fly', blocked: false, allowed: false });
        setTimeout(() => this.setState({ phase: 'land', allowed: true, spent: Math.min(500, this.state.spent + 100), txc: this.state.txc + 1, total: this.state.total + 1 }), 1900);
        setTimeout(() => this.setState({ phase: 'idle' }), 4200); },
      force: () => { if (s.phase !== 'idle') return; this.setState({ phase: 'block', blocked: false, allowed: false });
        setTimeout(() => this.setState({ blocked: true, total: this.state.total + 1 }), 1900);
        setTimeout(() => this.setState({ phase: 'idle' }), 4200); },
    };
  }
}
</script>"""

def guardrails():
    return wrap(guardrails_body(), GUARD_CSS, GUARD_SCRIPT, pg=PG["guardrails"])

# =============================================================== TREASURY
TREAS_CSS = CSS_OPS + r"""
.scene{position:relative;height:520px;margin:18px -32px 0;overflow:hidden;isolation:isolate;perspective:1600px}
.scene > img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 60%;filter:brightness(.42) saturate(.7);transform:scale(1.06)}
.scene .wash{position:absolute;inset:0;background:radial-gradient(ellipse 60% 70% at 50% 60%,transparent,rgba(8,13,25,.85) 75%),linear-gradient(180deg,rgba(8,13,25,.9),transparent 30%,transparent 70%,var(--bg))}
.scene .water{position:absolute;left:0;right:0;bottom:0;--wh:110px;opacity:.8}
.vault-stage{position:absolute;left:50%;top:56%;width:640px;height:340px;transform:translate(-50%,-50%);transform-style:preserve-3d}
.platform{position:absolute;left:50%;bottom:0;width:440px;height:150px;transform:translateX(-50%) rotateX(72deg);border-radius:50%;background:radial-gradient(ellipse,rgba(13,155,116,.35),rgba(13,155,116,.08) 55%,transparent 72%);box-shadow:0 0 80px rgba(13,155,116,.35);border:1px solid rgba(133,219,192,.35)}
.platform::before{content:"";position:absolute;inset:26px;border-radius:50%;border:1px dashed rgba(133,219,192,.3);animation:spinRing 30s linear infinite}
@keyframes spinRing{to{transform:rotate(360deg)}}
.vstack{position:absolute;left:50%;bottom:44px;transform:translateX(-50%);display:flex;flex-direction:row;align-items:flex-end;gap:26px;transform-style:preserve-3d}
.vcol{display:flex;flex-direction:column-reverse;gap:6px;perspective:800px}
.vcol .vox{--vs:46px;--vc:13,155,116;box-shadow:0 30px 30px -20px rgba(0,0,0,.9)}
.vcol .vox:nth-child(2n){--vc:133,219,192}
.vcol .vox .f{background:linear-gradient(160deg,rgba(var(--vc),.78),rgba(var(--vc),.45))}
.vcol .vox .t{background:linear-gradient(160deg,rgba(var(--vc),.95),rgba(var(--vc),.6))}
.vcol .vox .r{background:linear-gradient(160deg,rgba(var(--vc),.5),rgba(var(--vc),.28))}
.vcol .vox i{border-color:rgba(255,255,255,.35)}
.vcol .vox.drop{animation:cubeDrop .9s var(--ease) both}
@keyframes cubeDrop{0%{opacity:0;transform:translateY(-160px) rotateX(-26deg) rotateY(42deg) rotateZ(20deg)}70%{opacity:1;transform:translateY(8px) rotateX(-26deg) rotateY(42deg)}100%{transform:translateY(0) rotateX(-26deg) rotateY(42deg)}}
.vcol[data-n="2"] .vox:nth-child(3){display:none}
.vcol .vox.out{animation:cubeOut .9s var(--ease) both}
@keyframes cubeOut{0%{opacity:1}100%{opacity:0;transform:translate(-320px,-140px) rotateX(-26deg) rotateY(42deg) scale(.5)}}
.vault-label{position:absolute;left:50%;top:-6px;transform:translateX(-50%);text-align:center;white-space:nowrap}
.vault-label small{display:block;font:9.5px var(--mono);letter-spacing:.24em;color:var(--ok)}
.vault-label b{display:block;margin-top:6px;font:44px var(--mono);font-weight:500;letter-spacing:-.03em;color:var(--text);text-shadow:0 0 30px rgba(133,219,192,.4)}
.vault-label span{font:11px var(--mono);color:var(--muted)}
.side{position:absolute;top:60px;width:330px;padding:20px 22px;border-radius:16px;background:rgba(12,20,37,.72);border:1px solid var(--line-strong);backdrop-filter:blur(10px);box-shadow:var(--sh-2),8px 8px 0 0 rgba(var(--pg),.2)}
.side.l{left:40px}.side.r{right:40px}
.side h3{margin:0;font-size:13px}.side .eyebrow{margin-bottom:8px}
.big{font:30px var(--mono);font-weight:500;color:var(--text);letter-spacing:-.02em;margin:12px 0 4px}
.big small{font-size:12px;color:var(--muted);margin-left:8px}
.meter{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-top:22px}
.meter div{padding:14px 16px;border-radius:12px;background:var(--inset);border:1px solid var(--line);box-shadow:inset 0 2px 8px rgba(0,0,0,.45)}
.meter small{display:block;font:8.5px var(--mono);letter-spacing:.18em;color:var(--muted)}.meter b{display:block;margin-top:6px;font:18px var(--mono);font-weight:500}
.toast{position:absolute;left:50%;bottom:120px;transform:translateX(-50%);padding:10px 16px;border-radius:999px;font:10.5px var(--mono);letter-spacing:.12em;background:rgba(8,13,25,.9);border:1px solid rgba(133,219,192,.5);color:var(--ok);box-shadow:var(--sh-2);animation:popIn .5s var(--ease) both}
.toast.bad{border-color:rgba(255,147,164,.5);color:var(--bad)}
.below{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,.9fr);gap:24px;margin-top:24px;align-items:start}
"""

def treasury_body():
    col3 = "".join(vox("", "", 46, False) for _ in range(3))
    def row(t, ev, cls, who, amt, amtc, sig):
        return f'<div class="log-row" style="grid-template-columns: 90px 1fr 160px 140px 120px"><span class="t">{t}</span><span><span class="chip {cls}" style="margin-right: 8px">{ev[0]}</span>{ev[1]}</span><span class="mono" style="font-size: 11.5px; color: var(--text-2)">{who}</span><span class="amt" style="color: {amtc}">{amt}</span><a class="sig">{sig} {svg("ext", 10)}</a></div>'
    return f'''
<div class="app">
{header("Treasury")}
<main class="page" onMouseMove="{{{{ onMove }}}}" onMouseLeave="{{{{ onLeave }}}}" style="padding-top: 0">
<section class="scene">
  <img src="vault.webp" alt="" style="transform: scale(1.08) translate({{{{ bx }}}}px, {{{{ by }}}}px)">
  <div class="wash"></div>
  {water(110, ("13,155,116", "141,204,237", "133,219,192"))}
  <div class="vault-stage" style="transform: translate(-50%, -50%) rotateX({{{{ gx }}}}deg) rotateY({{{{ gy }}}}deg)">
    <div class="vault-label"><small>PROGRAM VAULT · PDA · LIVE FROM DEVNET</small><b>{{{{ balance }}}}</b><span>dUSDC · 9vaU1tK…Rm4Zq7pE · each cube = 1,000</span></div>
    <div class="platform"></div>
    <div class="vstack">
      <div class="vcol">{col3}</div>
      <div class="vcol">{col3}</div>
      <div class="vcol" data-n="{{{{ n3 }}}}">{vox("", "", 46, False)}{vox("", "", 46, False)}<div class="vox {{{{ topCls }}}}" style="--vs: 46px"><i class="r"></i><i class="t"></i><i class="f"></i></div></div>
    </div>
    <sc-if value="{{{{ toastOk }}}}" hint-placeholder-val="{{{{ false }}}}"><div class="toast">+1,000 dUSDC MINTED · CONFIRMED · 7Lp…mX2</div></sc-if>
    <sc-if value="{{{{ toastOut }}}}" hint-placeholder-val="{{{{ false }}}}"><div class="toast bad">−1,000 dUSDC WITHDRAWN TO 8xkA…p2Qe · OWNER SIGNED</div></sc-if>
  </div>
  <aside class="side l rise" style="--i: 1">
    <div class="eyebrow">OWNER WALLET · FEE PAYER</div><h3>8xkA…p2Qe</h3>
    <div class="big">{{{{ sol }}}}<small>SOL</small></div>
    <div class="kv"><span>dUSDC in wallet</span><b>{{{{ walletUsdc }}}}</b></div>
    <div class="kv"><span>Signed today</span><b class="info">6 tx</b></div>
    <div style="display: flex; gap: 10px; margin-top: 16px"><button type="button" class="tool" style="flex: 1; justify-content: center">{svg("copy", 12)} Copy</button><button type="button" class="tool" style="flex: 1; justify-content: center">{svg("ext", 12)} Explorer</button></div>
  </aside>
  <aside class="side r rise" style="--i: 2">
    <div class="eyebrow">VAULT ACTIONS</div><h3>Move funds as the owner</h3>
    <p class="help" style="margin-top: 10px">Refill mints demo dUSDC into the vault. Withdraw is signed by you directly and bypasses every agent grant.</p>
    <button type="button" class="btn btn-gold" style="width: 100%; justify-content: space-between; margin-top: 8px" onClick="{{{{ refill }}}}">{svg("dl", 14, "#101827")} Refill 1,000 (devnet) <span class="mono" style="font-size: 10px; opacity: .7">FREE</span></button>
    <div class="signzone" style="margin-top: 14px; padding: 14px 16px; border-color: rgba(255,147,164,.45); background: rgba(255,147,164,.05); display: block">
      <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px"><span style="font-size: 12px; color: #aebed3">Committed by grants stays reserved.</span><span class="chip chip-gold">FREE {{{{ free }}}}</span></div>
      <button type="button" class="btn btn-danger" style="width: 100%; margin-top: 12px; height: 42px" onClick="{{{{ withdraw }}}}">{svg("up", 14)} Withdraw 1,000 dUSDC</button>
    </div>
  </aside>
</section>

<div class="below">
  <section class="panel rise" style="--i: 3">
    <div class="ph"><h3>Recent on-chain activity</h3><span class="chip chip-ok">● CONFIRMED</span></div>
    <div class="log-head" style="grid-template-columns: 90px 1fr 160px 140px 120px"><span>TIME</span><span>EVENT</span><span>COUNTERPARTY</span><span>AMOUNT</span><span>SIGNATURE</span></div>
    <sc-if value="{{{{ rowIn }}}}" hint-placeholder-val="{{{{ false }}}}"><div class="log-row newrow ok" style="grid-template-columns: 90px 1fr 160px 140px 120px"><span class="t">now</span><span><span class="chip chip-gold" style="margin-right: 8px">REFILL</span>Devnet faucet mint</span><span class="mono" style="font-size: 11.5px; color: var(--text-2)">faucet</span><span class="amt" style="color: var(--ok)">+1,000.00</span><a class="sig">confirmed {svg("ext", 10)}</a></div></sc-if>
    <sc-if value="{{{{ rowOut }}}}" hint-placeholder-val="{{{{ false }}}}"><div class="log-row newrow bad" style="grid-template-columns: 90px 1fr 160px 140px 120px"><span class="t">now</span><span><span class="chip chip-dim" style="margin-right: 8px">WITHDRAW</span>Owner withdrawal</span><span class="mono" style="font-size: 11.5px; color: var(--text-2)">8xkA…p2Qe</span><span class="amt" style="color: var(--bad)">−1,000.00</span><a class="sig">confirmed {svg("ext", 10)}</a></div></sc-if>
    {row("09:12:41", ("TRANSFER", "Agent transfer · all 7 gates passed"), "chip-ok", "7XB2…u62q", "−100.00", "var(--bad)", "4kz…73A")}
    {row("08:58:03", ("REFILL", "Devnet faucet mint"), "chip-gold", "faucet", "+1,000.00", "var(--ok)", "7Lp…mX2")}
    {row("08:41:57", ("GRANT", "Policy digest published · CSaCLAB v1.0.0"), "chip-info", "HRRW…WNKN", "—", "var(--gold-hi)", "Qw9…7Ff")}
    {row("08:12:10", ("WITHDRAW", "Owner withdrawal"), "chip-dim", "8xkA…p2Qe", "−500.00", "var(--bad)", "Zn1…aa0")}
  </section>
  <section class="panel panel-3d rise" style="--i: 4">
    <div class="ph"><h3>Where the balance is</h3><span class="chip chip-dim">RESERVATIONS</span></div>
    <div class="pb">
      <div class="meter"><div><small>COMMITTED</small><b style="color: var(--gold-hi)">3,000</b></div><div><small>FREE</small><b style="color: var(--ok)">{{{{ free }}}}</b></div><div><small>ENVELOPES</small><b style="color: var(--info)">2</b></div></div>
      <div class="kv" style="margin-top: 16px"><span>tui là thắng · GFNM…v1tJ</span><b>500 cap · 300 spent</b></div>
      <div class="bar" style="margin: 6px 0 12px"><i style="width: 60%"></i></div>
      <div class="kv"><span>hello · pending grant</span><b class="info">2,500 cap · 0 spent</b></div>
      <div class="bar" style="margin: 6px 0 4px"><i style="width: 2%"></i></div>
      <p class="help" style="margin-top: 16px">Only the free balance can be withdrawn. Agents can never touch more than their envelope — even if the vault is refilled.</p>
    </div>
  </section>
</div>
</main>
</div>'''

TREAS_SCRIPT = r"""<script data-dc-script data-props='{"$preview":{"width":1440,"height":1180}}'>
class Component extends DCLogic {
  constructor(p){ super(p); this.state = { cubes: 8, drop: false, out: false, toastOk: false, toastOut: false, rowIn: false, rowOut: false, sol: 2.4138, busy: false }; }
  renderVals() {
    const s = this.state, n = s.cubes; const bal = n * 1000 - 56;
    return {
      balance: bal.toLocaleString('en-US', { minimumFractionDigits: 2 }), free: (bal - 3000).toLocaleString(), sol: s.sol.toFixed(4), walletUsdc: (10000 - bal + 44).toLocaleString(),
      n3: String(n - 6), topCls: s.out ? 'out' : (s.drop ? 'drop' : ''),
      toastOk: s.toastOk, toastOut: s.toastOut, rowIn: s.rowIn, rowOut: s.rowOut,
      refill: () => { if (s.busy || n >= 9) return; this.setState({ busy: true, cubes: 9, drop: true, toastOk: true, rowIn: true, toastOut: false, sol: s.sol - 0.00001 });
        setTimeout(() => this.setState({ toastOk: false, busy: false }), 2600); },
      withdraw: () => { if (s.busy || n <= 7) return; this.setState({ busy: true, out: true, toastOut: true, rowOut: true, toastOk: false });
        setTimeout(() => this.setState({ cubes: n - 1, out: false, drop: false }), 850);
        setTimeout(() => this.setState({ toastOut: false, busy: false }), 2600); },
    };
  }
}
</script>"""

def treasury():
    return wrap(treasury_body(), TREAS_CSS, TREAS_SCRIPT, pg=PG["treasury"])

# =============================================================== AUDIT
AUDIT_CSS = CSS_OPS + r"""
.audit-grid{display:grid;grid-template-columns:360px minmax(0,1fr);gap:28px;margin-top:20px;align-items:start}
.kpi-col{display:grid;gap:14px;perspective:1200px}
.kpi-col .kpi{padding:16px 18px}.kpi-col .kpi b{font-size:26px;padding-right:96px}.kpi-col .kpi .spark{width:76px;top:42px}
.filters-v{display:grid;gap:10px;margin-top:14px}
.timeline{position:relative;padding-left:44px}
.timeline::before{content:"";position:absolute;left:15px;top:6px;bottom:6px;width:2px;background:linear-gradient(180deg,rgb(var(--pg)),rgba(var(--pg),.35) 30%,rgba(45,59,83,.8));box-shadow:0 0 14px rgba(var(--pg),.5)}
.timeline .beam{position:absolute;left:14px;top:0;width:4px;height:60px;border-radius:2px;background:linear-gradient(180deg,transparent,rgb(var(--pg)),transparent);animation:beam 3.2s linear infinite}
@keyframes beam{0%{top:-60px;opacity:0}10%{opacity:1}90%{opacity:1}100%{top:100%;opacity:0}}
.ev{position:relative;margin-bottom:14px;padding:16px 18px 14px;border-radius:14px;background:linear-gradient(180deg,rgba(23,36,58,.55),rgba(18,28,48,.95));border:1px solid var(--line-strong);box-shadow:var(--sh-1);transform-style:preserve-3d;transition:transform .45s var(--ease),box-shadow .45s var(--ease);animation:rowIn .7s var(--ease) both}
.ev:hover{transform:translateZ(16px) translateX(6px);box-shadow:var(--sh-2)}
.ev::before{content:"";position:absolute;left:-36px;top:20px;width:12px;height:12px;border-radius:50%;background:var(--surface);border:2px solid rgb(var(--pg));box-shadow:0 0 12px rgba(var(--pg),.6)}
.ev.rej{border-color:rgba(255,147,164,.45);background:linear-gradient(90deg,rgba(255,147,164,.09),rgba(18,28,48,.95) 45%)}
.ev.rej::before{border-color:var(--bad);box-shadow:0 0 12px rgba(255,147,164,.7)}
.ev.okk::before{border-color:var(--ok);box-shadow:0 0 12px rgba(133,219,192,.7)}
.ev .top{display:grid;grid-template-columns:auto auto 1fr auto;gap:12px;align-items:center}
.ev .t{font:11px var(--mono);color:var(--muted)}
.ev .sig{font:11px var(--mono);color:var(--info)}
.ev pre{margin:10px 0 0;padding:10px 12px;border-radius:8px;background:var(--bg);border:1px solid var(--line);font:11px/1.6 var(--mono);color:var(--text-2);white-space:pre-wrap;word-break:break-all;box-shadow:inset 0 2px 8px rgba(0,0,0,.5)}
.ev .foot{display:flex;align-items:center;gap:14px;margin-top:10px;font:10px var(--mono);letter-spacing:.06em;color:var(--muted)}
.corro{display:inline-grid;place-items:center;width:20px;height:20px;border-radius:5px;color:var(--ok);background:rgba(133,219,192,.12);border:1px solid rgba(133,219,192,.45);box-shadow:0 0 10px rgba(133,219,192,.35)}
.daymark{position:relative;margin:6px 0 14px;font:9.5px var(--mono);letter-spacing:.22em;color:rgb(var(--pg))}
.daymark::before{content:"";position:absolute;left:-34px;top:5px;width:8px;height:8px;transform:rotate(45deg);background:rgb(var(--pg))}
@keyframes rowIn{from{opacity:0;transform:translateX(-14px)}to{opacity:1;transform:none}}
.seal{position:relative;margin-top:24px;perspective:1600px}
.seal .evidence{display:grid;grid-template-columns:1fr 70px 1fr;gap:0;align-items:center;padding:22px 24px;transform-style:preserve-3d}
.seal .side{padding:16px 18px;border-radius:10px;background:var(--inset);border:1px solid var(--line);box-shadow:inset 0 2px 8px rgba(0,0,0,.45);transform:rotateY(8deg)}
.seal .side + .link + .side{transform:rotateY(-8deg)}
.seal .side small{display:block;font:8.5px var(--mono);letter-spacing:.2em;color:var(--muted);margin-bottom:8px}
.seal .side code{display:block;font:11px/1.6 var(--mono);color:var(--text-2);white-space:pre-wrap}
.seal .link{display:grid;place-items:center;color:var(--ok);transform:translateZ(30px)}
.seal .link i{display:grid;place-items:center;width:44px;height:44px;border-radius:50%;border:1px solid rgba(133,219,192,.6);background:rgba(133,219,192,.12);box-shadow:0 0 30px rgba(133,219,192,.5);animation:pulse 3s infinite}
"""

def audit_body():
    def ev(t, tag, cls, extra, detail, src, sig, gates=None, i=0):
        g = gate_compact(gates) if gates else ""
        return f'''<div class="ev {extra}" style="animation-delay: {i*80}ms"><div class="top"><span class="t">{t}</span><span class="chip {cls}">{tag}</span>{g}<a class="sig">{sig} {svg("ext", 10)}</a></div><pre>{detail}</pre><div class="foot"><span class="corro">{svg("shield", 11)}</span>{src}</div></div>'''
    events = "".join([
        '<div class="daymark">TODAY · 04 SEP 2026</div>',
        ev("09:12:41", "TRANSFER", "chip-ok", "okk", '{"grantId":"GFNM…v1tJ","amount":"100000000","dest":"7XB2…u62q","gates":7}', "CORROBORATED · runtime row = decoded program log", "4kz…73A", ["passed"]*7, 0),
        ev("09:11:02", "REJECTED", "chip-bad", "rej", '{"reason":"COOLDOWN_ACTIVE","elapsed":36,"cooldown":60}', "CORROBORATED · error 0x1776 decoded from chain", "t4X…9su", ["passed"]*6+["blocked"], 1),
        ev("09:10:15", "REJECTED", "chip-bad", "rej", '{"reason":"SPEND_CAP_EXCEEDED","proposed":"500000000","remaining":"200000000"}', "CORROBORATED · error 0x1775", "Ab3…k11", ["passed"]*5+["blocked","skipped"], 2),
        ev("08:56:50", "CHAIN GRANT", "chip-gold", "", '{"grantPda":"5dqbHtXgEDbbJp1zZ3ouUkAcqFZBVAZc4RdVh5DsuLys","owner":"FMFo4ieNXQF4uvr7phUsnyEtf9p4oj8ZYC7G"}', "chain log only · indexer", "46z…73A", None, 3),
        ev("08:56:50", "AGENT PUBLISH", "chip-info", "", '{"agentHash":"9b9529ddf3ad228773738c3dc57d9ee412c0f16910993fcdaba89fadfa197889","name":"YieldGuard Alpha"}', "server row · admin key", "—", None, 4),
        '<div class="daymark">YESTERDAY · 03 SEP 2026</div>',
        ev("22:41:57", "CHAIN GRANT", "chip-gold", "", '{"grantPda":"HRRW…WNKN","policyDigest":"b4957dc8…","spendCap":"7944000000","txCap":50}', "CORROBORATED", "Qw9…7Ff", None, 5),
        ev("21:12:10", "WITHDRAW", "chip-dim", "", '{"owner":"8xkA…p2Qe","amount":"500000000","vault":"9vaU…q7pE"}', "CORROBORATED", "Zn1…aa0", None, 6),
    ])
    return f'''
<div class="app">
{header("Audit")}
<main class="page" onMouseMove="{{{{ onMove }}}}" onMouseLeave="{{{{ onLeave }}}}">
{topline(6, "Audit Log", "Treasury", "Analytics", "Two writers fill this trail: the runtime records what it submitted, the indexer decodes the program's own logs. A shield means both agree.")}
<div class="audit-grid">
  <aside>
    <div class="kpi-col rise" style="--i: 1">
      {kpi("Total events", "200", "last 24 h", "scroll", [120,140,150,165,180,192,200], "#dfc38c")}
      {kpi("On-chain signatures", "92", "decoded from program logs", "key", [30,42,55,61,74,85,92], "#8dcced")}
      {kpi("Corroborated", "41", "server row = chain row", "shield", [8,12,19,24,31,37,41], "#85dbc0")}
      {kpi("Rejected by a gate", "9", "SPEND_CAP 4 · COOLDOWN 3 · DEST 2", "x", [1,2,3,4,6,8,9], "#ff93a4")}
    </div>
    <div class="filters-v rise" style="--i: 2">
      <div class="search">{svg("search", 14)}Search events, signatures, reason codes…</div>
      <button type="button" class="tool" style="height: 42px; justify-content: space-between">{svg("key", 13)} All grants {svg("chevd", 12)}</button>
      <button type="button" class="tool" style="height: 42px; justify-content: space-between">{svg("layers", 13)} All event types {svg("chevd", 12)}</button>
      <button type="button" class="btn btn-ghost" style="height: 42px; justify-content: center">{svg("refresh", 13)} Refresh · auto 15 s</button>
    </div>
  </aside>
  <section>
    <div class="ph rise" style="--i: 1; padding: 4px 0 14px; border: 0"><h3>Event stream · <span class="mono" style="font-weight: 400; color: var(--muted)">200 events</span></h3><span class="chip chip-ok">● LIVE</span></div>
    <div class="timeline rise" style="--i: 2"><span class="beam"></span>{events}</div>
  </section>
</div>
<section class="panel seal rise" style="--i: 3">
  <div class="ph"><div><span class="eyebrow">CORROBORATED EVIDENCE</span><h3 style="margin-top: 6px">Server record vs. decoded program log · t4X…9su</h3></div><span class="chip chip-ok">{svg("shield", 11)} MATCH</span></div>
  <div class="evidence">
    <div class="side"><small>RUNTIME · WHAT IT SUBMITTED</small><code>grant   GFNM…v1tJ
amount  100.000000 USDC
dest    7XB2…u62q
nonce   4
sent    09:11:02.114</code></div>
    <div class="link"><i>{svg("check", 18)}</i></div>
    <div class="side"><small>SOLANA · WHAT THE PROGRAM LOGGED</small><code>Program Fj7MV8…WbS4 failed
Error: COOLDOWN_ACTIVE (0x1776)
gate    07 / execution pace
elapsed 36s  &lt;  cooldown 60s
slot    412,908,117</code></div>
  </div>
</section>
</main>
</div>'''

def audit():
    return wrap(audit_body(), AUDIT_CSS, '<script data-dc-script data-props=\'{"$preview":{"width":1440,"height":1720}}\'>class Component extends DCLogic {}</script>', pg=PG["audit"])
