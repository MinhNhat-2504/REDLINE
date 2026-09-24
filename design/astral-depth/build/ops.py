from shared import *
from protocol import GATES

CSS_OPS = r"""
.search{display:flex;align-items:center;gap:12px;height:44px;padding:0 16px;border-radius:9px;background:var(--surface);border:1px solid var(--line-strong);color:var(--muted);font-size:12.5px;box-shadow:var(--sh-1)}
.grid2{display:grid;grid-template-columns:minmax(0,.85fr) minmax(0,1.3fr);gap:24px;margin-top:24px;align-items:start}
.grid-eq{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:24px;align-items:start}
.stack{display:flex;flex-direction:column;gap:24px}
.grant{padding:18px 22px;border-bottom:1px solid var(--line);transition:background .25s}
.grant:last-child{border-bottom:0}.grant:hover{background:rgba(223,195,140,.03)}
.grant .top{display:grid;grid-template-columns:36px minmax(0,1fr) auto auto;gap:14px;align-items:start}
.grant .ico{width:36px;height:36px;display:grid;place-items:center;border-radius:9px;color:var(--gold);background:linear-gradient(160deg,#1b2c45,#111d31);border:1px solid rgba(223,195,140,.35);box-shadow:var(--sh-1);transform:rotateX(10deg) rotateY(-12deg)}
.grant b.name{font-size:13px;font-weight:600;color:var(--text)}.grant b.name small{font-family:var(--mono);font-weight:400;color:var(--muted);margin-left:6px}
.grant .meta{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:6px;font:11px var(--mono);color:var(--muted)}
.grant .meta a{color:var(--info)}
.grant .amt{text-align:right}.grant .amt b{display:block;font:14px var(--mono);font-weight:500;color:var(--gold-hi)}.grant .amt small{font:10.5px var(--mono);color:var(--muted)}
.grant .bar{margin-top:14px}
.grant .actions{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-top:14px}
.grant .danger{flex-basis:100%;display:flex;align-items:center;gap:8px;margin-top:4px;padding-top:12px;border-top:1px dashed rgba(255,147,164,.35)}
.grant .danger small{margin-left:auto;font:9px var(--mono);letter-spacing:.16em;color:rgba(255,147,164,.7)}
.grant .log{margin-top:12px;display:flex;align-items:center;gap:8px;font:12px var(--mono);color:var(--text-2)}
.steps{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:14px 22px;border-bottom:1px solid var(--line)}
.steps{perspective:900px}
.step{position:relative;display:flex;align-items:center;gap:10px;height:40px;padding:0 12px;border-radius:8px;font-size:11.5px;color:var(--muted);background:var(--inset);border:1px solid var(--line);text-align:left;transition:all .3s var(--ease);transform-style:preserve-3d}
.step::before{content:"";position:absolute;left:4px;right:-4px;top:-7px;height:7px;border-radius:3px 3px 0 0;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.08);border-bottom:0;transform:skewX(-45deg)}
.step::after{content:"";position:absolute;right:-7px;top:-3px;bottom:4px;width:7px;background:rgba(0,0,0,.5);border-radius:0 3px 3px 0;transform:skewY(-45deg)}
.step:hover{transform:translateZ(10px)}
.step i{display:grid;place-items:center;width:20px;height:20px;border-radius:5px;font:10px var(--mono);border:1px solid var(--line-strong);color:var(--muted)}
.step[aria-current="step"]{color:var(--gold-hi);background:rgba(223,195,140,.1);border-color:rgba(223,195,140,.5);box-shadow:0 0 22px -8px rgba(223,195,140,.7),var(--sh-1);transform:translateZ(16px) translateY(-2px)}
.step[aria-current="step"]::before{background:rgba(223,195,140,.35)}
.step[aria-current="step"] i{background:var(--gold);color:#101827;border-color:var(--gold)}
.step[data-done="true"]{color:var(--ok)}.step[data-done="true"] i{color:var(--ok);border-color:rgba(133,219,192,.5);background:rgba(133,219,192,.1)}
.help{font-size:12.5px;line-height:1.65;color:#aebed3;margin:0 0 12px}
.help code{font-family:var(--mono);color:var(--gold-hi);font-size:11.5px}
.mint{height:36px;padding:0 14px;border-radius:7px;font:12px var(--mono);color:#b8c5d8;background:rgba(23,36,58,.8);border:1px solid #34435c;box-shadow:var(--sh-1);transition:all .2s var(--ease)}
.mint[aria-pressed="true"]{color:var(--gold-hi);background:rgba(223,195,140,.1);border-color:#d9bb81;box-shadow:0 0 18px -6px rgba(223,195,140,.6)}
.mint:hover{transform:translateY(-1px)}
.slider{margin:6px 0 18px}
.slider .row{display:flex;justify-content:space-between;font-size:11.5px;color:var(--text-2)}
.slider .row b{font:13px var(--mono);font-weight:500;color:var(--gold-hi)}
.slider .track{position:relative;height:6px;margin-top:10px;border-radius:4px;background:rgba(255,255,255,.07);box-shadow:inset 0 1px 3px rgba(0,0,0,.7)}
.slider .fill{position:absolute;left:0;top:0;height:100%;border-radius:4px;background:linear-gradient(90deg,#b8985a,#eed5a3);box-shadow:0 0 12px rgba(223,195,140,.5)}
.slider .knob{position:absolute;top:50%;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff5dc,#dfc38c 60%,#b8985a);box-shadow:0 4px 10px rgba(0,0,0,.6),0 0 0 3px rgba(223,195,140,.2)}
.summary{padding:18px 20px;border-radius:12px;background:linear-gradient(160deg,rgba(23,36,58,.9),rgba(12,20,37,.95));border:1px solid var(--line-strong);box-shadow:var(--sh-2);font-size:13.5px;line-height:1.8;color:var(--text-2)}
.summary b{color:var(--gold-hi);font-family:var(--mono);font-weight:500}
.copilot{margin-top:16px;display:grid;grid-template-columns:120px 1fr;gap:18px;padding:18px 20px;border-radius:12px;border:1px solid rgba(133,219,192,.4);background:linear-gradient(90deg,rgba(133,219,192,.08),transparent 60%);box-shadow:var(--sh-1)}
.score{display:grid;place-items:center;width:110px;height:110px;border-radius:50%;position:relative;background:conic-gradient(var(--ok) 0 22%,rgba(255,255,255,.06) 22% 100%);box-shadow:0 0 30px -8px rgba(133,219,192,.7),inset 0 0 0 1px rgba(255,255,255,.05)}
.score::before{content:"";position:absolute;inset:9px;border-radius:50%;background:var(--surface);box-shadow:inset 0 2px 8px rgba(0,0,0,.6)}
.score b{position:relative;font:26px var(--mono);font-weight:500;color:var(--ok)}.score small{position:absolute;bottom:22px;font:8.5px var(--mono);letter-spacing:.2em;color:var(--muted)}
.copilot h4{margin:0 0 6px;font-size:13px;color:var(--text)}.copilot p{margin:0;font-size:12.5px;line-height:1.7;color:#aebed3}
.copilot ul{margin:10px 0 0;padding:0;list-style:none;display:grid;gap:6px}
.copilot li{display:flex;gap:8px;align-items:flex-start;font-size:12px;color:var(--text-2)}
.copilot li svg{flex:none;margin-top:3px}
.signzone{margin-top:20px;padding:18px 20px;border-radius:12px;border:1px solid rgba(223,195,140,.4);background:rgba(223,195,140,.05);display:flex;align-items:center;justify-content:space-between;gap:20px;box-shadow:var(--sh-2)}
.signzone p{margin:0;font-size:12px;line-height:1.6;color:#aebed3;max-width:360px}
.wizfoot{display:flex;justify-content:space-between;align-items:center;padding:16px 22px;border-top:1px solid var(--line)}
.dest{display:flex;align-items:center;gap:10px;height:40px;padding:0 12px;border-radius:8px;background:var(--inset);border:1px solid var(--line);font:12px var(--mono);color:var(--text-2);margin-bottom:8px}
.dest .rm{margin-left:auto;color:var(--muted)}
/* proposals log */
.log-row{display:grid;grid-template-columns:70px 1fr 220px 120px 110px;gap:14px;align-items:center;padding:12px 22px;border-bottom:1px solid rgba(45,59,83,.7);font-size:12px;transition:background .2s}
.log-row:hover{background:rgba(223,195,140,.03)}
.log-row .t{font:11px var(--mono);color:var(--muted)}
.log-row .amt{font:12.5px var(--mono);color:var(--gold-hi)}
.log-row .sig{font:11px var(--mono);color:var(--info)}
.log-row.rejected{background:linear-gradient(90deg,rgba(255,147,164,.06),transparent 50%)}
.log-head{display:grid;grid-template-columns:70px 1fr 220px 120px 110px;gap:14px;padding:10px 22px;border-bottom:1px solid var(--line);font:9px var(--mono);letter-spacing:.2em;color:var(--muted)}
/* kpi tiles */
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:24px;perspective:1400px}
.kpi{position:relative;padding:18px 20px;border-radius:14px;background:linear-gradient(180deg,rgba(23,36,58,.6),rgba(18,28,48,.95));border:1px solid var(--line-strong);box-shadow:var(--sh-2);transform-style:preserve-3d;transition:transform .5s var(--ease),box-shadow .5s var(--ease)}
.kpi:hover{transform:translateY(-4px) rotateX(3deg);box-shadow:var(--sh-3)}
.kpi::before{content:"";position:absolute;left:20px;right:20px;top:0;height:1px;background:linear-gradient(90deg,transparent,rgba(var(--pg),.6),transparent)}
.kpi small{display:flex;align-items:center;gap:8px;font-size:11.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kpi small .ico{width:24px;height:24px;display:grid;place-items:center;border-radius:6px;color:rgb(var(--pg));background:rgba(var(--pg),.12);border:1px solid rgba(var(--pg),.3)}
.kpi b{display:block;margin-top:10px;padding-right:104px;font:28px var(--mono);font-weight:500;color:var(--text);letter-spacing:-.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kpi .sub{margin-top:6px;font-size:11.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kpi .spark{position:absolute;right:18px;top:44px;width:86px;height:34px;opacity:.9}
.kpi .depth{position:absolute;inset:0;border-radius:14px;transform:translateZ(-14px);background:rgba(8,13,25,.9);border:1px solid rgba(45,59,83,.6)}
"""

def gate_compact(states):
    """Compact 7-gate chain for a rejected proposal (context 2)."""
    out = []
    for i, st in enumerate(states):
        idx, label, code = GATES[i]
        cls = {"passed": "ok", "blocked": "bad", "skipped": ""}[st]
        out.append(f'<i class="{cls}" title="{label} · {code}">{i+1}</i>')
    return f'<div class="gate-dots">{"".join(out)}</div>'

# ------------------------------------------------------------------ Guardrails
GUARD_CSS = CSS_OPS

def guardrails_body():
    grants = [
        ("tui là thắng", "v1.0.0", "GFNM…v1tJ", "ddd2d047…", "300 / 500 USDC", "tx 3/50 · nonce 3 · 23h left", "ACTIVE", "chip-ok", 60, False),
        ("CSaCLAB", "v1.0.0", "HRRW…WNKN", "b4957dc8…", "1,588.0 / 7,944 USDC", "tx 1/50 · nonce 1 · expired", "REVOKED", "chip-bad", 20, True),
        ("YieldGuard Alpha", "v0.1.0", "vdPU…GY6e", "81f6832a…", "300 / 500 USDC", "tx 3/50 · nonce 3 · expired", "REVOKED", "chip-bad", 60, True),
    ]
    rows = []
    for i, (n, v, g, p, amt, meta, st, chipcls, pct, dead) in enumerate(grants):
        actions = (f'''<div class="actions">
          <button type="button" class="btn btn-ghost btn-sm">{svg("play", 11)} Start agent (scripted)</button>
          <button type="button" class="btn btn-ghost btn-sm">{svg("eye", 11)} Show every proposal</button>
          <div class="danger"><button type="button" class="btn btn-danger btn-sm">{svg("zap", 11)} Force 500 USDC (over cap)</button><button type="button" class="btn btn-danger btn-sm">{svg("x", 11)} Revoke</button><small>IRREVERSIBLE · OWNER SIGNS</small></div>
        </div>''' if not dead else
                   f'''<div class="actions"><span class="mono" style="font-size: 11px; color: var(--muted)">Read-only · connect owner wallet to manage</span>
          <button type="button" class="btn btn-ghost btn-sm" style="margin-left: auto">{svg("eye", 11)} Show every proposal</button></div>''')
        rows.append(f'''<div class="grant rise" style="--i: {i+3}">
      <div class="top">
        <span class="ico">{svg("key", 15)}</span>
        <div><b class="name">{n}<small>{v}</small></b>
          <div class="meta"><span>grant <a>{g}</a></span><span>policy {p}</span><a>explorer {svg("ext", 10)}</a></div></div>
        <div class="amt"><b>{amt}</b><small>{meta}</small></div>
        <span class="chip {chipcls}">● {st}</span>
      </div>
      <div class="bar{' bad' if dead else ''}"><i style="width: {pct}%"></i></div>
      {actions}
    </div>''')
    grants_html = "".join(rows)

    return f'''
<div class="app">
{header("Guardrails")}
<main class="page" onMouseMove="{{{{ onMove }}}}" onMouseLeave="{{{{ onLeave }}}}">
{journey(4, "Guardrails", "Agents", "Treasury")}
{banner("citadel.webp", "01 / THE CITADEL", "Agent <em>Guardrails</em>", "Design bounded Solana policies, run AI risk checks, and publish verifiable proofs. Sign once — the program enforces it on every transfer.", "layers")}

<div class="grid2">
  <!-- LEFT: active policy accounts -->
  <section class="panel panel-3d rise" style="--i: 2">
    <div class="ph"><h3>Active Policy Accounts</h3><span class="chip chip-gold">1 active · 2 revoked · solana</span></div>
    {grants_html}
  </section>

  <!-- RIGHT: wizard -->
  <section class="panel rise" style="--i: 2">
    <div class="ph"><div style="display: flex; align-items: center; gap: 10px">{svg("spark", 13, "#dfc38c")}<h3>Create Agent Policy</h3></div><span class="chip chip-ok">SOLANA DEVNET</span></div>
    <div class="steps">
      <button type="button" class="step" aria-current="{{{{ cur1 }}}}" data-done="{{{{ done1 }}}}" onClick="{{{{ go1 }}}}"><i>1</i>Scope</button>
      <button type="button" class="step" aria-current="{{{{ cur2 }}}}" data-done="{{{{ done2 }}}}" onClick="{{{{ go2 }}}}"><i>2</i>Spend limits</button>
      <button type="button" class="step" aria-current="{{{{ cur3 }}}}" data-done="{{{{ done3 }}}}" onClick="{{{{ go3 }}}}"><i>3</i>Time bounds</button>
      <button type="button" class="step" aria-current="{{{{ cur4 }}}}" data-done="{{{{ done4 }}}}" onClick="{{{{ go4 }}}}"><i>4</i>Review &amp; sign</button>
    </div>
    <div class="pb" style="min-height: 420px">
      <sc-if value="{{{{ is1 }}}}" hint-placeholder-val="{{{{ true }}}}">
        <p class="help">Which published agent version does this grant authorise? The grant records its <code>agentHash</code>, so this is the build the policy is bound to.</p>
        <label class="field">Agent version<div class="in" style="justify-content: space-between">hello v1.0.0 · 41d3d11a…<span>{svg("chevd", 12)}</span></div></label>
        <p class="help">Allowlist the SPL assets this agent may reference. Every other mint remains outside the signed policy.</p>
        <div class="pill-row" style="margin-bottom: 18px">
          <button type="button" class="mint" aria-pressed="{{{{ mSol }}}}" onClick="{{{{ tSol }}}}">SOL</button>
          <button type="button" class="mint" aria-pressed="{{{{ mUsdc }}}}" onClick="{{{{ tUsdc }}}}">USDC</button>
          <button type="button" class="mint" aria-pressed="{{{{ mJup }}}}" onClick="{{{{ tJup }}}}">JUP</button>
          <button type="button" class="mint" aria-pressed="false">JTO</button>
          <button type="button" class="mint" aria-pressed="false">BONK</button>
          <button type="button" class="mint" aria-pressed="false">PYTH</button>
        </div>
        <p class="help">Allowlist the addresses this agent may pay. The program checks every transfer against this list — an address not here cannot receive funds, whatever the agent proposes. Up to 4.</p>
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
            <p>Scope is narrow and the envelope is small relative to the vault. Two observations:</p>
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

<!-- proposals log -->
<section class="panel rise" style="--i: 6; margin-top: 24px">
  <div class="ph"><h3>Every proposal this agent made · <span class="mono" style="font-weight: 400; color: var(--muted)">tui là thắng v1.0.0</span></h3><span class="chip chip-info">● LIVE · SSE</span></div>
  <div class="log-head"><span>TIME</span><span>PROPOSAL</span><span>GATES</span><span>AMOUNT</span><span>SIGNATURE</span></div>
  <div class="log-row"><span class="t">09:12:41</span><span>Transfer to 7XB2…u62q · allowed</span>{gate_compact(["passed"]*7)}<span class="amt">100.00 USDC</span><a class="sig">4kz…73A {svg("ext", 10)}</a></div>
  <div class="log-row"><span class="t">09:11:38</span><span>Transfer to 7XB2…u62q · allowed</span>{gate_compact(["passed"]*7)}<span class="amt">100.00 USDC</span><a class="sig">9Qm…cE1 {svg("ext", 10)}</a></div>
  <div class="log-row rejected"><span class="t">09:11:02</span><span><span class="chip chip-bad" style="margin-right: 8px">COOLDOWN_ACTIVE</span>Proposed 36 s after the last transfer</span>{gate_compact(["passed"]*6+["blocked"])}<span class="amt" style="color: var(--bad)">100.00 USDC</span><a class="sig">t4X…9su {svg("ext", 10)}</a></div>
  <div class="log-row rejected"><span class="t">09:10:15</span><span><span class="chip chip-bad" style="margin-right: 8px">SPEND_CAP_EXCEEDED</span>Forced 500 USDC over a 500 cap · nothing moved</span>{gate_compact(["passed"]*5+["blocked","skipped"])}<span class="amt" style="color: var(--bad)">500.00 USDC</span><a class="sig">Ab3…k11 {svg("ext", 10)}</a></div>
  <div class="log-row"><span class="t">09:09:27</span><span>Transfer to 7XB2…u62q · allowed</span>{gate_compact(["passed"]*7)}<span class="amt">100.00 USDC</span><a class="sig">2Hf…pQ8 {svg("ext", 10)}</a></div>
</section>
</main>
</div>'''

GUARD_SCRIPT = r"""<script data-dc-script data-props='{"$preview":{"width":1440,"height":1560}}'>
class Component extends DCLogic {
  constructor(p){ super(p); this.state = { step: 1, mints: { sol: true, usdc: true, jup: false } }; }
  renderVals() {
    const s = this.state, st = s.step;
    const cur = (n) => (st === n ? 'step' : 'false');
    const go = (n) => () => this.setState({ step: n });
    const t = (k) => () => this.setState({ mints: { ...s.mints, [k]: !s.mints[k] } });
    return {
      step: st, is1: st === 1, is2: st === 2, is3: st === 3, is4: st === 4,
      cur1: cur(1), cur2: cur(2), cur3: cur(3), cur4: cur(4),
      done1: st > 1, done2: st > 2, done3: st > 3, done4: false,
      go1: go(1), go2: go(2), go3: go(3), go4: go(4),
      next: () => this.setState({ step: Math.min(4, st + 1) }), prev: () => this.setState({ step: Math.max(1, st - 1) }),
      mSol: s.mints.sol, mUsdc: s.mints.usdc, mJup: s.mints.jup, mintText: [s.mints.sol&&'SOL', s.mints.usdc&&'USDC', s.mints.jup&&'JUP'].filter(Boolean).join(', ') || 'no assets', mintCount: [s.mints.sol, s.mints.usdc, s.mints.jup].filter(Boolean).length, tSol: t('sol'), tUsdc: t('usdc'), tJup: t('jup'),
    };
  }
}
</script>"""

def guardrails():
    return wrap(guardrails_body(), GUARD_CSS, GUARD_SCRIPT, pg=PG["guardrails"])

# ------------------------------------------------------------------ Treasury
def spark(points, color, w=90, h=34):
    n = len(points); mx = max(points); mn = min(points)
    pts = " ".join(f"{i*(w/(n-1)):.1f},{h - (p-mn)/(mx-mn or 1)*(h-4) - 2:.1f}" for i, p in enumerate(points))
    return f'<svg class="spark" viewBox="0 0 {w} {h}" aria-hidden="true"><polyline points="{pts}" fill="none" stroke="{color}" stroke-width="1.5" stroke-linejoin="round"/></svg>'

def kpi(label, value, sub, icon, series, color):
    return f'''<div class="kpi"><div class="depth"></div><small><span class="ico">{svg(icon, 12)}</span>{label}</small><b>{value}</b><div class="sub">{sub}</div>{spark(series, color)}</div>'''

def treasury_body():
    return f'''
<div class="app">
{header("Treasury")}
<main class="page" onMouseMove="{{{{ onMove }}}}" onMouseLeave="{{{{ onLeave }}}}">
{journey(5, "Treasury", "Guardrails", "Audit")}
{banner("vault.webp", "02 / THE VAULT", "Treasury <em>&amp; Vault</em>", "Solana Devnet · your wallet and the program-owned vault. Only the policy can move vault funds; only you can withdraw them.", "lock")}

<div class="kpis rise" style="--i: 2">
  {kpi("Owner wallet · SOL", "2.4138", "8xkA…p2Qe · fee payer", "wallet", [2.9,2.8,2.7,2.68,2.55,2.5,2.41], "#8dcced")}
  {kpi("Vault · dUSDC", "7,944.00", "PDA · program owned", "lock", [1000,3000,4000,5000,7000,7944,7944], "#dfc38c")}
  {kpi("Committed by grants", "3,000.00", "2 active envelopes", "layers", [500,500,1000,2500,3000,3000,3000], "#85dbc0")}
  {kpi("Free to withdraw", "4,944.00", "not reserved by any policy", "up", [500,2500,3000,2500,4000,4944,4944], "#f1c678")}
</div>

<div class="grid-eq">
  <section class="panel panel-3d rise" style="--i: 3">
    <div class="ph"><div><span class="eyebrow">PROGRAM VAULT · LIVE FROM DEVNET</span><h3 style="margin-top: 6px">Vault address</h3></div><span class="chip chip-info">PDA</span></div>
    <div class="pb">
      <div class="inset" style="display: flex; align-items: center; gap: 12px; padding: 12px 14px; font: 12px var(--mono); color: var(--text-2)">{svg("lock", 14, "#dfc38c")}9vaU1tK…Rm4Zq7pE<span style="margin-left: auto; display: flex; gap: 8px"><button type="button" class="tool" style="height: 28px; padding: 0 8px">{svg("copy", 12)}</button><button type="button" class="tool" style="height: 28px; padding: 0 8px">{svg("ext", 12)}</button></span></div>
      <div class="kv" style="margin-top: 10px"><span>Owner</span><b class="info">8xkA…p2Qe</b></div>
      <div class="kv"><span>Mint</span><b class="info">dUSDC · 6 decimals</b></div>
      <div class="kv"><span>Program</span><b class="info">Fj7MV8Z2…b4WbS4</b></div>
      <div class="kv"><span>Last movement</span><b>09:12:41 · −100.00</b></div>
      <div style="display: flex; gap: 12px; margin-top: 20px; align-items: center">
        <button type="button" class="btn btn-gold">{svg("dl", 14, "#101827")} Refill 1,000 (devnet)</button>
        <span class="mono" style="font-size: 10.5px; color: var(--muted)">Free demo dUSDC · mints to the vault</span>
      </div>
    </div>
  </section>

  <section class="panel rise" style="--i: 4">
    <div class="ph"><h3>Withdraw to owner wallet</h3><span class="chip chip-dim">OWNER ONLY</span></div>
    <div class="pb">
      <p class="help">Withdrawals are signed directly by the owner and bypass every agent grant. Funds committed to active envelopes stay reserved.</p>
      <label class="field">Amount · dUSDC<div class="in focus" style="justify-content: space-between">1,000.00<span class="caret"></span><span class="chip chip-gold" style="margin-left: auto">MAX 4,944</span></div></label>
      <div class="slider"><div class="row"><span>Share of free balance</span><b>20%</b></div><div class="track"><div class="fill" style="width: 20%"></div><div class="knob" style="left: 20%"></div></div></div>
      <div class="signzone" style="border-color: rgba(255,147,164,.45); background: rgba(255,147,164,.05)"><p>This moves real devnet tokens out of the vault. Agents keep their envelopes; only the free balance changes.</p><button type="button" class="btn btn-danger" style="height: 44px">{svg("up", 14)} Withdraw 1,000 dUSDC</button></div>
    </div>
  </section>
</div>

<section class="panel rise" style="--i: 5; margin-top: 24px">
  <div class="ph"><h3>Recent on-chain activity</h3><span class="chip chip-ok">● CONFIRMED · 12 EVENTS</span></div>
  <div class="log-head" style="grid-template-columns: 90px 1fr 160px 140px 120px"><span>TIME</span><span>EVENT</span><span>COUNTERPARTY</span><span>AMOUNT</span><span>SIGNATURE</span></div>
  <div class="log-row" style="grid-template-columns: 90px 1fr 160px 140px 120px"><span class="t">09:12:41</span><span><span class="chip chip-ok" style="margin-right: 8px">TRANSFER</span>Agent transfer · all 7 gates passed</span><span class="mono" style="font-size: 11.5px; color: var(--text-2)">7XB2…u62q</span><span class="amt" style="color: var(--bad)">−100.00</span><a class="sig">4kz…73A {svg("ext", 10)}</a></div>
  <div class="log-row" style="grid-template-columns: 90px 1fr 160px 140px 120px"><span class="t">08:58:03</span><span><span class="chip chip-gold" style="margin-right: 8px">REFILL</span>Devnet faucet mint</span><span class="mono" style="font-size: 11.5px; color: var(--text-2)">faucet</span><span class="amt" style="color: var(--ok)">+1,000.00</span><a class="sig">7Lp…mX2 {svg("ext", 10)}</a></div>
  <div class="log-row" style="grid-template-columns: 90px 1fr 160px 140px 120px"><span class="t">08:41:57</span><span><span class="chip chip-info" style="margin-right: 8px">GRANT</span>Policy digest published · CSaCLAB v1.0.0</span><span class="mono" style="font-size: 11.5px; color: var(--text-2)">HRRW…WNKN</span><span class="amt">—</span><a class="sig">Qw9…7Ff {svg("ext", 10)}</a></div>
  <div class="log-row" style="grid-template-columns: 90px 1fr 160px 140px 120px"><span class="t">08:12:10</span><span><span class="chip chip-dim" style="margin-right: 8px">WITHDRAW</span>Owner withdrawal</span><span class="mono" style="font-size: 11.5px; color: var(--text-2)">8xkA…p2Qe</span><span class="amt" style="color: var(--bad)">−500.00</span><a class="sig">Zn1…aa0 {svg("ext", 10)}</a></div>
</section>
</main>
</div>'''

def treasury():
    return wrap(treasury_body(), CSS_OPS, '<script data-dc-script data-props=\'{"$preview":{"width":1440,"height":1260}}\'>class Component extends DCLogic {}</script>', pg=PG["treasury"])

# ------------------------------------------------------------------ Audit
AUDIT_CSS = CSS_OPS + r"""
.filters{display:grid;grid-template-columns:1fr 160px 120px;gap:12px;margin-top:24px}
.search{display:flex;align-items:center;gap:12px;height:44px;padding:0 16px;border-radius:9px;background:var(--surface);border:1px solid var(--line-strong);color:var(--muted);font-size:12.5px;box-shadow:var(--sh-1)}
.tbl-head{display:grid;grid-template-columns:90px 130px 1fr 150px 110px 130px;gap:14px;padding:12px 22px;border-bottom:1px solid var(--line);font:9px var(--mono);letter-spacing:.2em;color:var(--muted)}
.tbl-row{display:grid;grid-template-columns:90px 130px 1fr 150px 110px 130px;gap:14px;align-items:center;padding:12px 22px;border-bottom:1px solid rgba(45,59,83,.7);font-size:12px;transition:background .2s;animation:rowIn .6s var(--ease) both}
.tbl-row:hover{background:rgba(196,124,14,.05)}
.tbl-row .t{font:11px var(--mono);color:var(--muted)}
.tbl-row .det{font:11px var(--mono);color:var(--text-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tbl-row .src{display:inline-flex;align-items:center;gap:6px;font:10px var(--mono);letter-spacing:.06em;color:var(--ok)}
.tbl-row .sig{font:11px var(--mono);color:var(--info)}
.tbl-row.rej{background:linear-gradient(90deg,rgba(255,147,164,.06),transparent 40%)}
.corro{display:inline-grid;place-items:center;width:20px;height:20px;border-radius:5px;color:var(--ok);background:rgba(133,219,192,.12);border:1px solid rgba(133,219,192,.45);box-shadow:0 0 10px rgba(133,219,192,.35)}
@keyframes rowIn{from{opacity:0;transform:translateX(-10px)}to{opacity:1;transform:none}}
.evidence{display:grid;grid-template-columns:1fr 60px 1fr;gap:0;align-items:center;padding:20px 22px}
.evidence .side{padding:16px 18px;border-radius:10px;background:var(--inset);border:1px solid var(--line);box-shadow:inset 0 2px 8px rgba(0,0,0,.45)}
.evidence .side small{display:block;font:8.5px var(--mono);letter-spacing:.2em;color:var(--muted);margin-bottom:8px}
.evidence .side code{display:block;font:11px/1.6 var(--mono);color:var(--text-2);white-space:pre-wrap}
.evidence .link{display:grid;place-items:center;color:var(--ok)}
.evidence .link i{display:grid;place-items:center;width:36px;height:36px;border-radius:50%;border:1px solid rgba(133,219,192,.5);background:rgba(133,219,192,.1);box-shadow:0 0 22px rgba(133,219,192,.4);animation:pulse 3s infinite}
"""

def audit_body():
    def row(t, ev, evcls, det, src, sig, gates=None, rej=False, i=0):
        g = gate_compact(gates) if gates else '<span class="mono" style="font-size: 10px; color: var(--muted)">—</span>'
        return f'''<div class="tbl-row{' rej' if rej else ''}" style="animation-delay: {i*70}ms"><span class="t">{t}</span><span><span class="chip {evcls}">{ev}</span></span><span class="det">{det}</span>{g}<span class="src"><i class="corro">{svg("shield", 11)}</i>{src}</span><a class="sig">{sig} {svg("ext", 10)}</a></div>'''
    rows = "".join([
        row("09:12:41", "TRANSFER", "chip-ok", '{"grantId":"GFNM…v1tJ","amount":"100000000","dest":"7XB2…u62q","gates":7}', "chain log", "4kz…73A", ["passed"]*7, False, 0),
        row("09:11:02", "REJECTED", "chip-bad", '{"reason":"COOLDOWN_ACTIVE","elapsed":36,"cooldown":60}', "chain log", "t4X…9su", ["passed"]*6+["blocked"], True, 1),
        row("09:10:15", "REJECTED", "chip-bad", '{"reason":"SPEND_CAP_EXCEEDED","proposed":"500000000","remaining":"200000000"}', "chain log", "Ab3…k11", ["passed"]*5+["blocked","skipped"], True, 2),
        row("08:56:50", "CHAIN GRANT", "chip-gold", '{"grantId":null,"grantPda":"5dqbHtXgEDbbJp1zZ3ouUkAcqFZBVAZc4RdVh5DsuLys","owner":"FMFo4ieNXQF4uvr7phUsnyEtf9p4oj8ZYC7G"}', "chain log", "46z…73A", None, False, 3),
        row("08:56:50", "AGENT PUBLISH", "chip-info", '{"agentHash":"9b9529ddf3ad228773738c3dc57d9ee412c0f16910993fcdaba89fadfa197889","name":"YieldGuard Alpha"}', "admin", "—", None, False, 4),
        row("08:41:57", "CHAIN GRANT", "chip-gold", '{"grantPda":"HRRW…WNKN","policyDigest":"b4957dc8…","spendCap":"7944000000","txCap":50}', "chain log", "Qw9…7Ff", None, False, 5),
        row("08:12:10", "WITHDRAW", "chip-dim", '{"owner":"8xkA…p2Qe","amount":"500000000","vault":"9vaU…q7pE"}', "chain log", "Zn1…aa0", None, False, 6),
    ])
    return f'''
<div class="app">
{header("Audit")}
<main class="page" onMouseMove="{{{{ onMove }}}}" onMouseLeave="{{{{ onLeave }}}}">
{journey(6, "Audit", "Treasury", "Analytics")}
{banner("observatory.webp", "03 / THE OBSERVATORY · VERIFIABLE AUDIT TRAIL", "Audit <em>Log</em>", "Every intent, decision and on-chain signature. Two writers fill this table: the runtime records what it submitted; the indexer decodes the program's own logs. Rows carrying the shield are corroborated by both.", "scroll")}

<div class="kpis rise" style="--i: 2">
  {kpi("Total events", "200", "last 24 h", "scroll", [120,140,150,165,180,192,200], "#dfc38c")}
  {kpi("On-chain signatures", "92", "decoded from program logs", "key", [30,42,55,61,74,85,92], "#8dcced")}
  {kpi("Corroborated", "41", "server row = chain row", "shield", [8,12,19,24,31,37,41], "#85dbc0")}
  {kpi("TX rejected", "9", "by one of the seven gates", "x", [1,2,3,4,6,8,9], "#ff93a4")}
</div>

<div class="filters rise" style="--i: 3">
  <div class="search">{svg("search", 14)}Search events, signatures, reason codes…</div>
  <button type="button" class="tool" style="height: 44px; justify-content: space-between">{svg("key", 13)} All grants {svg("chevd", 12)}</button>
  <button type="button" class="tool" style="height: 44px; justify-content: center">{svg("refresh", 13)} Refresh</button>
</div>

<section class="panel rise" style="--i: 4; margin-top: 16px">
  <div class="ph"><h3>Showing <span class="mono" style="color: var(--gold-hi)">200</span> events</h3><span class="chip chip-ok">● LIVE</span></div>
  <div class="tbl-head"><span>TIME</span><span>EVENT</span><span>DETAILS</span><span>GATES</span><span>SOURCE</span><span>SIGNATURE</span></div>
  {rows}
</section>

<section class="panel panel-3d rise" style="--i: 5; margin-top: 24px">
  <div class="ph"><div><span class="eyebrow">CORROBORATED EVIDENCE</span><h3 style="margin-top: 6px">Server record vs. decoded program log · t4X…9su</h3></div><span class="chip chip-ok">{svg("shield", 11)} MATCH</span></div>
  <div class="evidence">
    <div class="side"><small>RUNTIME · WHAT IT SUBMITTED</small><code>grant   GFNM…v1tJ
amount  100.000000 USDC
dest    7XB2…u62q
nonce   4
sent    09:11:02.114</code></div>
    <div class="link"><i>{svg("check", 16)}</i></div>
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
    return wrap(audit_body(), AUDIT_CSS, '<script data-dc-script data-props=\'{"$preview":{"width":1440,"height":1440}}\'>class Component extends DCLogic {}</script>', pg=PG["audit"])
