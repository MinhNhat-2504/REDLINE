from shared import *
from ops import CSS_OPS, kpi, spark, gate_compact

# ------------------------------------------------------------------ Marketplace
MKT_CSS = CSS_OPS + r"""
.search{display:flex;align-items:center;gap:12px;height:44px;padding:0 16px;border-radius:9px;background:var(--surface);border:1px solid var(--line-strong);color:var(--muted);font-size:12.5px;box-shadow:var(--sh-1)}
.mgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;margin-top:20px;perspective:1600px}
.card{position:relative;display:flex;flex-direction:column;border-radius:16px;overflow:hidden;background:linear-gradient(180deg,rgba(23,36,58,.6),rgba(18,28,48,.96));border:1px solid var(--line-strong);box-shadow:var(--sh-2);transform-style:preserve-3d;transition:transform .55s var(--ease),box-shadow .55s var(--ease),border-color .3s}
.card:hover{transform:translateY(-8px) rotateX(3deg) rotateY(-2deg);box-shadow:var(--sh-3);border-color:#69788c}
.card::before{content:"";position:absolute;left:32px;right:32px;top:0;height:1px;background:linear-gradient(90deg,transparent,rgba(var(--acc),.8),transparent)}
.card .body{padding:24px;display:flex;flex-direction:column;gap:16px;flex:1}
.card .head{display:flex;gap:14px;align-items:flex-start}
.card .avatar{width:46px;height:46px;display:grid;place-items:center;border-radius:12px;color:rgb(var(--acc));background:rgba(var(--acc),.14);border:1px solid rgba(var(--acc),.35);box-shadow:0 10px 24px -10px rgba(0,0,0,.9),0 0 22px -8px rgba(var(--acc),.6);transform:translateZ(20px) rotateX(10deg) rotateY(-12deg)}
.card .head b{font-size:14.5px;font-weight:600;color:var(--text)}
.card .head small{display:flex;align-items:center;gap:8px;margin-top:4px;font:11px var(--mono);color:rgb(var(--acc))}
.card p{margin:0;font-size:12.5px;line-height:1.7;color:#b4c1d4}
.card .hash{padding:12px 14px;border-radius:10px;background:var(--bg);border:1px solid var(--line);box-shadow:inset 0 2px 8px rgba(0,0,0,.5);display:grid;grid-template-columns:1fr 1fr;gap:6px;font:11px var(--mono)}
.card .hash small{font:8.5px var(--mono);letter-spacing:.18em;color:var(--dim)}
.card .hash span{color:var(--info)}.card .hash span.pub{color:var(--muted);text-align:right}
.card .foot{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 24px;border-top:1px solid var(--line);background:rgba(8,13,25,.5)}
.card .price b{display:block;font:18px var(--mono);font-weight:500;color:var(--gold-hi)}.card .price small{font-size:10.5px;color:var(--muted)}
.dur{display:inline-flex;border-radius:7px;overflow:hidden;border:1px solid var(--line-strong);box-shadow:var(--sh-1)}
.dur button{height:32px;padding:0 12px;font:11px var(--mono);color:var(--muted);background:var(--inset);border-right:1px solid var(--line-strong);transition:all .2s}
.dur button:last-child{border-right:0}
.dur button[aria-pressed="true"]{color:#101827;background:linear-gradient(180deg,#eed5a3,#dfc38c);box-shadow:inset 0 1px 0 rgba(255,255,255,.4)}
.ribbon{position:absolute;top:16px;right:-30px;transform:rotate(35deg);padding:4px 40px;font:8.5px var(--mono);letter-spacing:.2em;color:#101827;background:var(--gold);box-shadow:0 6px 14px -6px rgba(0,0,0,.9)}
"""

def mkt_card(i, acc, name, ver, hires, strategy, hash_, pub, price, per, mine=False, dsel=None):
    hires_html = f'<span class="chip chip-gold" style="height: 18px; font-size: 9px">{hires} active hire{"s" if hires != 1 else ""}</span>' if hires else ""
    dur = ""
    if dsel:
        dur = f'''<div class="dur"><button type="button" aria-pressed="{{{{ d{i}a }}}}" onClick="{{{{ s{i}a }}}}">1 day</button><button type="button" aria-pressed="{{{{ d{i}b }}}}" onClick="{{{{ s{i}b }}}}">3 days</button><button type="button" aria-pressed="{{{{ d{i}c }}}}" onClick="{{{{ s{i}c }}}}">7 days</button></div>'''
    cta = ('<span class="chip chip-info">YOUR LISTING</span>' if mine else
           (f'<button type="button" class="btn btn-gold btn-sm">{svg("key", 12, "#101827")} Rent</button>' if dsel else
            f'<button type="button" class="btn btn-ghost btn-sm">{svg("key", 12)} Claim listing</button>'))
    return f'''<div class="card rise" style="--i: {i+3}; --acc: {acc}">
    {'<span class="ribbon">MINE</span>' if mine else ''}
    <div class="body">
      <div class="head"><span class="avatar">{svg("bot", 20)}</span><div><b>{name}</b><small>{ver}{hires_html}</small></div></div>
      <p>{strategy}</p>
      <div class="hash"><small>AGENT HASH</small><small style="text-align: right">PUBLISHER</small><span>{hash_}</span><span class="pub">{pub}</span></div>
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px">{dur}<span class="mono" style="font-size: 10.5px; color: var(--muted); display: inline-flex; gap: 6px; align-items: center">{svg("clock", 10)} published 29 Aug 2026</span></div>
    </div>
    <div class="foot"><div class="price"><b>{price}</b><small>{per}</small></div>{cta}</div>
  </div>'''

def marketplace_body():
    cards = "".join([
        mkt_card(0, "223,195,140", "YieldGuard Alpha", "v0.1.0", 2, "Conservative stablecoin rebalancer. Moves idle USDC between two lending venues when the spread exceeds 40 bps; never touches SOL.", "9b9529…7889", "FMFo…7G", "0.25 SOL", "per day · verified on devnet", False, True),
        mkt_card(1, "141,204,237", "Payroll Runner", "v1.2.0", 4, "Scheduled contributor payouts against a signed allowlist. Idempotent nonces, weekly cadence, refuses unknown addresses by construction.", "4c1e07…a2f1", "8xkA…p2Qe", "0.10 SOL", "per day · 4 active hires", False, True),
        '<sc-if value="{{ showAll }}" hint-placeholder-val="{{ true }}">' + mkt_card(2, "133,219,192", "CSaCLAB Ops", "v1.0.0", 0, "Operations desk agent for the FCCS lab treasury. Pays approved vendors, caps every session at the grant envelope.", "b4957d…c8e0", "HRRW…WNKN", "—", "not rentable · private", True, False) + '</sc-if>',
        mkt_card(3, "214,64,142", "hello", "v1.0.0", 1, "Reference agent from the four-minute demo: one destination, one mint, a 500 USDC envelope and a 60 s cooldown.", "41d3d1…1a9c", "FMFo…7G", "0.05 SOL", "per day · demo listing", False, True),
        mkt_card(4, "241,198,120", "Grant Sentinel", "v0.3.1", 0, "Watches other grants and proposes revokes when spend velocity spikes. Proposes only — the owner still signs.", "e77a02…1b44", "3Qm…Yy1", "0.40 SOL", "per day · new", False, True),
        '<sc-if value="{{ showAll }}" hint-placeholder-val="{{ true }}">' + mkt_card(5, "124,92,231", "Rebalance Lite", "v0.9.0", 0, "Single-asset rebalancing for lean funds. Per-session budget, tx count and cooldown make runaway loops impossible.", "7f0b31…dd02", "unclaimed", "—", "unclaimed publisher", False, False) + '</sc-if>',
    ])
    return f'''
<div class="app">
{header("Marketplace")}
<main class="page" onMouseMove="{{{{ onMove }}}}" onMouseLeave="{{{{ onLeave }}}}">
{journey(2, "Marketplace", "Protocol", "Agents")}
{banner("hero.webp", "AGENT MARKETPLACE · DEVNET", "Published <em>Agent Versions</em>", "Every listing is a real, immutable agent version. Renting sends SOL to the publisher's wallet and is verified on Devnet before the agreement is recorded.", "globe")}
<div class="filters rise" style="--i: 2; grid-template-columns: 1fr 210px 230px; display: grid; gap: 12px; margin-top: 24px">
  <div class="search">{svg("search", 14)}Search agents by name…</div>
  <button type="button" class="tool" style="height: 44px; justify-content: space-between" aria-pressed="{{{{ priced }}}}" onClick="{{{{ togglePriced }}}}">{svg("shield", 13)} Rentable only <span class="chip {{{{ pricedChip }}}}" style="height: 18px">{{{{ pricedLabel }}}}</span></button>
  <button type="button" class="tool" style="height: 44px; justify-content: space-between">{svg("chart", 13)} Sort · active hires {svg("chevd", 12)}</button>
</div>
<div style="display: flex; justify-content: space-between; margin-top: 16px; font-size: 12px; color: var(--muted)"><span>Showing <b style="color: var(--text)">{{{{ count }}}}</b> listings</span><span class="mono" style="font-size: 10.5px">RENT = SOL TRANSFER TO PUBLISHER · VERIFIED BEFORE HIRE</span></div>
<div class="mgrid">{cards}</div>
</main>
</div>'''

MKT_SCRIPT = r"""<script data-dc-script data-props='{"$preview":{"width":1440,"height":1320}}'>
class Component extends DCLogic {
  constructor(p){ super(p); this.state = { priced: false, d: { 0: 'a', 1: 'a', 3: 'b', 4: 'a' } }; }
  renderVals() {
    const s = this.state, v = {};
    [0,1,3,4].forEach((i) => { ['a','b','c'].forEach((k) => { v['d'+i+k] = s.d[i] === k; v['s'+i+k] = () => this.setState({ d: { ...s.d, [i]: k } }); }); });
    return { ...v, priced: s.priced, showAll: !s.priced, count: s.priced ? 4 : 6, pricedChip: s.priced ? 'chip-ok' : 'chip-dim', pricedLabel: s.priced ? 'ON' : 'OFF', togglePriced: () => this.setState({ priced: !s.priced }) };
  }
}
</script>"""

def marketplace():
    return wrap(marketplace_body(), MKT_CSS + ".filters{display:grid}", MKT_SCRIPT, pg=PG["marketplace"])

# ------------------------------------------------------------------ Agents
AG_CSS = CSS_OPS + r"""
.agrid{display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1.3fr);gap:24px;margin-top:24px;align-items:start}
.arow{display:grid;grid-template-columns:40px 1fr auto;gap:14px;align-items:center;padding:14px 22px;border-bottom:1px solid var(--line);text-align:left;transition:background .25s;width:100%}
.arow:last-child{border-bottom:0}
.arow:hover{background:rgba(14,145,205,.05)}
.arow[aria-pressed="true"]{background:linear-gradient(90deg,rgba(14,145,205,.12),transparent 70%);box-shadow:inset 3px 0 0 rgb(var(--pg))}
.arow .av{width:40px;height:40px;display:grid;place-items:center;border-radius:10px;color:rgb(var(--acc));background:rgba(var(--acc),.14);border:1px solid rgba(var(--acc),.4);box-shadow:var(--sh-1);transform:rotateX(10deg) rotateY(-12deg)}
.arow b{font-size:13px;font-weight:600;color:var(--text)}.arow small{display:block;font:10.5px var(--mono);color:var(--muted);margin-top:2px}
.arow .n{font:12px var(--mono);color:var(--gold-hi);text-align:right}.arow .n small{text-align:right}
.stat4{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.stat{padding:14px 16px;border-radius:10px;background:var(--inset);border:1px solid var(--line);box-shadow:inset 0 2px 8px rgba(0,0,0,.45)}
.stat small{display:block;font:8.5px var(--mono);letter-spacing:.18em;color:var(--muted)}
.stat b{display:block;margin-top:6px;font:18px var(--mono);font-weight:500}
.hashbox{margin-top:18px;padding:16px 18px;border-radius:10px;background:var(--bg);border:1px solid var(--line);box-shadow:inset 0 2px 8px rgba(0,0,0,.5)}
.hashbox small{display:block;font:8.5px var(--mono);letter-spacing:.2em;color:var(--dim);margin-bottom:8px}
.hashbox code{font:12px/1.7 var(--mono);color:var(--info);word-break:break-all}
.formula{display:grid;grid-template-columns:1fr auto 1fr auto 1fr;gap:10px;align-items:center;margin-top:14px;font:11px var(--mono);color:var(--text-2)}
.formula > span{line-height:1.6}
.formula span{padding:10px 12px;border-radius:8px;background:var(--surface-hi);border:1px solid var(--line);text-align:center}
.formula i{color:var(--gold);font-style:normal}
.formula .op{color:var(--gold);font-weight:400;font-size:14px}
"""

def agents_body():
    def arow(i, acc, name, ver, hash_, grants, pressed, on):
        return f'''<button type="button" class="arow rise" style="--i: {i+3}; --acc: {acc}" aria-pressed="{{{{ {pressed} }}}}" onClick="{{{{ {on} }}}}"><span class="av">{svg("bot", 18)}</span><span><b>{name}</b><small>{ver} · {hash_}</small></span><span class="n">{grants}<small>{"grant" if grants == 1 else "grants"}</small></span></button>'''
    return f'''
<div class="app">
{header("Agents")}
<main class="page" onMouseMove="{{{{ onMove }}}}" onMouseLeave="{{{{ onLeave }}}}">
{journey(3, "Agents", "Marketplace", "Guardrails")}
{banner("citadel.webp", "AGENT REGISTRY", "My <em>Agents</em>", "Real agent versions and grants from the REDLINE API. Each version is pinned by an agentHash — SHA-256 of model, code and configuration — so a grant can only ever bind to one exact build.", "bot")}
<div class="agrid">
  <section class="panel rise" style="--i: 2">
    <div class="ph"><h3>Agent versions</h3><button type="button" class="btn btn-ghost btn-sm">{svg("plus", 12)} Publish agent version</button></div>
    {arow(0, "14,145,205", "tui là thắng", "v1.0.0", "ddd2d0…47f1", 1, "isA", "pickA")}
    {arow(1, "223,195,140", "CSaCLAB", "v1.0.0", "b4957d…c8e0", 2, "isB", "pickB")}
    {arow(2, "133,219,192", "YieldGuard Alpha", "v0.1.0", "9b9529…7889", 3, "isC", "pickC")}
    {arow(3, "214,64,142", "hello", "v1.0.0", "41d3d1…1a9c", 1, "isD", "pickD")}
  </section>
  <section class="panel panel-3d rise" style="--i: 3">
    <sc-if value="{{{{ isA }}}}" hint-placeholder-val="{{{{ true }}}}">
      <div class="ph"><div><span class="eyebrow">AGENT VERSION</span><h3 style="margin-top: 6px">tui là thắng <span class="mono" style="font-weight: 400; color: var(--muted)">v1.0.0</span></h3></div><span class="chip chip-ok">● 1 ACTIVE GRANT</span></div>
      <div class="pb">
        <div class="stat4"><div class="stat"><small>ACTIVE GRANTS</small><b style="color: var(--gold-hi)">1</b></div><div class="stat"><small>TOTAL GRANTS</small><b style="color: var(--info)">1</b></div><div class="stat"><small>TOTAL SPENT</small><b style="color: var(--warn)">300 USDC</b></div><div class="stat"><small>TRANSFERS</small><b style="color: var(--gold-hi)">3</b></div></div>
        <div class="hashbox"><small>AGENT HASH · SHA-256</small><code>ddd2d047c1a2b8e93f6a7d0c4e5b1f2a8c9d0e1f2a3b4c5d6e7f8091a2b3c47f1</code>
          <div class="formula"><span>modelRef<br><i>manual:dashboard</i></span><b class="op">+</b><span>codeRef<br><i>manual:tui-la-thang</i></span><b class="op">+</b><span>config<br><i>{{"strategy":…}}</i></span></div></div>
        <p class="help" style="margin-top: 16px">Strategy — Scripted payroll agent from the demo. Pays 100 USDC to one allowlisted address every 60 seconds until the envelope closes.</p>
      </div>
    </sc-if>
    <sc-if value="{{{{ isB }}}}" hint-placeholder-val="{{{{ false }}}}">
      <div class="ph"><div><span class="eyebrow">AGENT VERSION</span><h3 style="margin-top: 6px">CSaCLAB <span class="mono" style="font-weight: 400; color: var(--muted)">v1.0.0</span></h3></div><span class="chip chip-bad">● 2 REVOKED</span></div>
      <div class="pb">
        <div class="stat4"><div class="stat"><small>ACTIVE GRANTS</small><b style="color: var(--gold-hi)">0</b></div><div class="stat"><small>TOTAL GRANTS</small><b style="color: var(--info)">2</b></div><div class="stat"><small>TOTAL SPENT</small><b style="color: var(--warn)">2,034 USDC</b></div><div class="stat"><small>TRANSFERS</small><b style="color: var(--gold-hi)">2</b></div></div>
        <div class="hashbox"><small>AGENT HASH · SHA-256</small><code>b4957dc8e0f1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b</code>
          <div class="formula"><span>modelRef<br><i>manual:dashboard</i></span><b class="op">+</b><span>codeRef<br><i>manual:CSaCLAB</i></span><b class="op">+</b><span>config<br><i>{{"strategy":…}}</i></span></div></div>
        <p class="help" style="margin-top: 16px">Strategy — Operations desk agent for the FCCS lab treasury. Both grants were revoked by the owner after the demo session.</p>
      </div>
    </sc-if>
    <sc-if value="{{{{ isC }}}}" hint-placeholder-val="{{{{ false }}}}">
      <div class="ph"><div><span class="eyebrow">AGENT VERSION</span><h3 style="margin-top: 6px">YieldGuard Alpha <span class="mono" style="font-weight: 400; color: var(--muted)">v0.1.0</span></h3></div><span class="chip chip-gold">● LISTED · 2 HIRES</span></div>
      <div class="pb">
        <div class="stat4"><div class="stat"><small>ACTIVE GRANTS</small><b style="color: var(--gold-hi)">0</b></div><div class="stat"><small>TOTAL GRANTS</small><b style="color: var(--info)">3</b></div><div class="stat"><small>TOTAL SPENT</small><b style="color: var(--warn)">310 USDC</b></div><div class="stat"><small>TRANSFERS</small><b style="color: var(--gold-hi)">8</b></div></div>
        <div class="hashbox"><small>AGENT HASH · SHA-256</small><code>9b9529ddf3ad228773738c3dc57d9ee412c0f16910993fcdaba89fadfa197889</code>
          <div class="formula"><span>modelRef<br><i>hf:yieldguard-0.1</i></span><b class="op">+</b><span>codeRef<br><i>git:7f3a9c1</i></span><b class="op">+</b><span>config<br><i>{{"spreadBps":40}}</i></span></div></div>
        <p class="help" style="margin-top: 16px">Strategy — Conservative stablecoin rebalancer. Moves idle USDC between two lending venues when the spread exceeds 40 bps.</p>
      </div>
    </sc-if>
    <sc-if value="{{{{ isD }}}}" hint-placeholder-val="{{{{ false }}}}">
      <div class="ph"><div><span class="eyebrow">AGENT VERSION</span><h3 style="margin-top: 6px">hello <span class="mono" style="font-weight: 400; color: var(--muted)">v1.0.0</span></h3></div><span class="chip chip-info">● DEMO</span></div>
      <div class="pb">
        <div class="stat4"><div class="stat"><small>ACTIVE GRANTS</small><b style="color: var(--gold-hi)">1</b></div><div class="stat"><small>TOTAL GRANTS</small><b style="color: var(--info)">1</b></div><div class="stat"><small>TOTAL SPENT</small><b style="color: var(--warn)">0 USDC</b></div><div class="stat"><small>TRANSFERS</small><b style="color: var(--gold-hi)">0</b></div></div>
        <div class="hashbox"><small>AGENT HASH · SHA-256</small><code>41d3d11a9c0b1e2f3a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90a1</code>
          <div class="formula"><span>modelRef<br><i>manual:dashboard</i></span><b class="op">+</b><span>codeRef<br><i>manual:hello</i></span><b class="op">+</b><span>config<br><i>{{"strategy":…}}</i></span></div></div>
        <p class="help" style="margin-top: 16px">Strategy — Reference agent from the four-minute demo. Waiting for its first scripted run.</p>
      </div>
    </sc-if>
  </section>
</div>
</main>
</div>'''

AG_SCRIPT = r"""<script data-dc-script data-props='{"$preview":{"width":1440,"height":1040}}'>
class Component extends DCLogic {
  constructor(p){ super(p); this.state = { sel: 'A' }; }
  renderVals() { const s = this.state.sel; const pick = (k) => () => this.setState({ sel: k });
    return { isA: s==='A', isB: s==='B', isC: s==='C', isD: s==='D', pickA: pick('A'), pickB: pick('B'), pickC: pick('C'), pickD: pick('D') }; }
}
</script>"""

def agents():
    return wrap(agents_body(), AG_CSS, AG_SCRIPT, pg=PG["agents"])

# ------------------------------------------------------------------ Analytics
AN_CSS = CSS_OPS + r"""
.angrid{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:24px;margin-top:24px;align-items:start}
.ledger{display:grid;grid-template-columns:repeat(4,1fr);margin-top:24px;border-radius:14px;overflow:hidden;border:1px solid var(--line-strong);background:var(--surface);box-shadow:var(--sh-2)}
.ledger > div{padding:20px 22px;border-right:1px solid var(--line);position:relative}
.ledger > div:last-child{border-right:0}
.ledger small{font-size:12px;color:var(--muted)}
.ledger b{display:block;margin-top:8px;font:26px var(--mono);font-weight:500;color:var(--text)}
.ledger .delta{position:absolute;right:20px;top:20px;font:10.5px var(--mono);color:var(--ok)}
.chartbox{position:relative;height:260px;padding:10px 0 0;perspective:1200px}
.bars{position:absolute;left:44px;right:10px;top:10px;bottom:28px;display:grid;grid-template-columns:repeat(7,1fr);gap:22px;align-items:end;transform:rotateX(4deg);transform-origin:50% 100%;transform-style:preserve-3d}
.bar3{position:relative;border-radius:5px 5px 2px 2px;background:linear-gradient(180deg,rgba(223,195,140,.95),rgba(223,195,140,.18));box-shadow:0 0 22px -6px rgba(223,195,140,.7),inset 0 1px 0 rgba(255,255,255,.35);transform-style:preserve-3d;animation:grow 1.1s var(--ease) both;transform-origin:50% 100%}
.bar3::after{content:"";position:absolute;left:0;right:0;top:0;height:8px;border-radius:5px 5px 0 0;background:rgba(255,255,255,.35);transform:rotateX(60deg) translateZ(4px);transform-origin:50% 100%}
.bar3 i{position:absolute;left:0;right:0;top:-24px;text-align:center;font:10.5px var(--mono);color:var(--gold-hi)}
.axis{position:absolute;left:44px;right:10px;bottom:0;display:grid;grid-template-columns:repeat(7,1fr);gap:22px;font:10px var(--mono);color:var(--muted);text-align:center}
.yax{position:absolute;left:0;top:10px;bottom:28px;display:flex;flex-direction:column;justify-content:space-between;font:10px var(--mono);color:var(--dim)}
.gridl{position:absolute;left:44px;right:10px;top:10px;bottom:28px;background:linear-gradient(rgba(255,255,255,.06) 1px,transparent 1px);background-size:100% 25%}
@keyframes grow{from{transform:scaleY(0)}to{transform:scaleY(1)}}
.rank{display:grid;grid-template-columns:1fr 130px 80px;align-items:center;gap:12px;padding:12px 22px;border-bottom:1px solid rgba(45,59,83,.7);font-size:12.5px}
.rank:last-child{border-bottom:0}
.rank .who{display:flex;align-items:center;gap:10px}
.rank .who i{width:26px;height:26px;display:grid;place-items:center;border-radius:7px;color:var(--gold);background:rgba(223,195,140,.1);border:1px solid rgba(223,195,140,.3)}
.rank .vol{font:12.5px var(--mono);color:var(--gold-hi);text-align:right}
.rank .gr{font:11.5px var(--mono);color:var(--muted);text-align:right}
.donut{display:grid;place-items:center;width:150px;height:150px;border-radius:50%;position:relative;background:conic-gradient(var(--ok) 0 67%,var(--bad) 67% 100%);box-shadow:0 0 34px -10px rgba(133,219,192,.6),0 20px 40px -20px rgba(0,0,0,.9)}
.donut::before{content:"";position:absolute;inset:14px;border-radius:50%;background:var(--surface);box-shadow:inset 0 2px 10px rgba(0,0,0,.6)}
.donut b{position:relative;font:24px var(--mono);font-weight:500;color:var(--text)}.donut small{position:absolute;bottom:34px;font:8.5px var(--mono);letter-spacing:.2em;color:var(--muted)}
.legend{display:grid;gap:10px;font-size:12.5px;color:var(--text-2)}
.legend span{display:flex;align-items:center;gap:10px}.legend i{width:10px;height:10px;border-radius:3px}
.legend b{margin-left:auto;font:12.5px var(--mono);font-weight:500;color:var(--text)}
"""

def analytics_body():
    vals = [(1200, "Mon"), (2400, "Tue"), (900, "Wed"), (3100, "Thu"), (1800, "Fri"), (400, "Sat"), (2600, "Sun")]
    mx = 3200
    bars = "".join(f'<div class="bar3" style="height: {v/mx*100:.0f}%; animation-delay: {i*80}ms"><i>{v:,}</i></div>' for i, (v, d) in enumerate(vals))
    axis = "".join(f"<span>{d}</span>" for v, d in vals)
    return f'''
<div class="app">
{header("Analytics")}
<main class="page" onMouseMove="{{{{ onMove }}}}" onMouseLeave="{{{{ onLeave }}}}">
{journey(7, "Analytics", "Audit", "Settings")}
{banner("observatory.webp", "ANALYTICS · COMPUTED FROM THE AUDIT TRAIL", "Analytics", "Computed from your grants' real audit trail — no price feed, so no P&amp;L or APY. What you see is what the chain settled.", "chart")}
<div class="kpis rise" style="--i: 2">
  {kpi("Active grants", "2", "+1 this week", "key", [0,1,1,1,1,2,2], "#dfc38c")}
  {kpi("Total volume", "12,400 USDC", "+2,600 · 7 days", "chart", [1200,3600,4500,7600,9400,9800,12400], "#8dcced")}
  {kpi("Success rate", "67%", "18 allowed / 27 proposals", "check", [50,55,60,58,64,66,67], "#85dbc0")}
  {kpi("Avg decision latency", "412 ms", "−38 ms vs. last week", "clock", [520,498,470,455,440,430,412], "#f1c678")}
</div>
<div class="angrid">
  <section class="panel panel-3d rise" style="--i: 3">
    <div class="ph"><div style="display: flex; align-items: center; gap: 10px">{svg("chart", 13, "#dfc38c")}<h3>Confirmed volume — last 7 days</h3></div><span class="chip chip-gold">USDC</span></div>
    <div class="pb"><div class="chartbox"><div class="yax"><span>3.2k</span><span>2.4k</span><span>1.6k</span><span>800</span><span>0</span></div><div class="gridl"></div><div class="bars">{bars}</div><div class="axis">{axis}</div></div></div>
  </section>
  <div class="stack">
    <section class="panel rise" style="--i: 4">
      <div class="ph"><h3>Allowed vs. rejected</h3><span class="chip chip-dim">27 PROPOSALS</span></div>
      <div class="pb" style="display: grid; grid-template-columns: 150px 1fr; gap: 24px; align-items: center">
        <div class="donut"><b>67%</b><small>ALLOWED</small></div>
        <div class="legend"><span><i style="background: var(--ok)"></i>Allowed · moved funds<b>18</b></span><span><i style="background: var(--bad)"></i>Rejected by a gate<b>9</b></span><span style="padding-left: 20px; color: var(--muted); font-size: 11.5px">SPEND_CAP_EXCEEDED<b style="color: var(--muted)">4</b></span><span style="padding-left: 20px; color: var(--muted); font-size: 11.5px">COOLDOWN_ACTIVE<b style="color: var(--muted)">3</b></span><span style="padding-left: 20px; color: var(--muted); font-size: 11.5px">DESTINATION_NOT_ALLOWED<b style="color: var(--muted)">2</b></span></div>
      </div>
    </section>
    <section class="panel rise" style="--i: 5">
      <div class="ph"><h3>Top agents by volume</h3></div>
      <div class="rank"><span class="who"><i>{svg("bot", 13)}</i>CSaCLAB</span><span class="vol">2,034 USDC</span><span class="gr">2 grants</span></div>
      <div class="rank"><span class="who"><i>{svg("bot", 13)}</i>YieldGuard Alpha</span><span class="vol">310 USDC</span><span class="gr">3 grants</span></div>
      <div class="rank"><span class="who"><i>{svg("bot", 13)}</i>tui là thắng</span><span class="vol">300 USDC</span><span class="gr">1 grant</span></div>
    </section>
  </div>
</div>
<p class="rise" style="--i: 6; margin: 18px 0 0; font-size: 12.5px; color: var(--muted)">18 confirmed · 9 rejected by the on-chain gates across 7 grants.</p>
</main>
</div>'''

def analytics():
    return wrap(analytics_body(), AN_CSS, '<script data-dc-script data-props=\'{"$preview":{"width":1440,"height":1160}}\'>class Component extends DCLogic {}</script>', pg=PG["analytics"])

# ------------------------------------------------------------------ Settings
ST_CSS = CSS_OPS + r"""
.dur{display:inline-flex;border-radius:7px;overflow:hidden;border:1px solid var(--line-strong);box-shadow:var(--sh-1)}
.dur button{height:32px;padding:0 12px;font:11px var(--mono);color:var(--muted);background:var(--inset);border-right:1px solid var(--line-strong);transition:all .2s}
.dur button:last-child{border-right:0}
.dur button[aria-pressed="true"]{color:#101827;background:linear-gradient(180deg,#eed5a3,#dfc38c);box-shadow:inset 0 1px 0 rgba(255,255,255,.4)}
.sgrid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:24px;align-items:start}
.toggle{width:40px;height:22px;border-radius:12px;position:relative;background:var(--line);box-shadow:inset 0 2px 4px rgba(0,0,0,.6);transition:background .25s}
.toggle::after{content:"";position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#c4cddd;box-shadow:0 2px 6px rgba(0,0,0,.6);transition:all .25s var(--ease)}
.toggle[aria-checked="true"]{background:rgba(223,195,140,.5)}
.toggle[aria-checked="true"]::after{left:21px;background:var(--gold-hi);box-shadow:0 0 12px rgba(223,195,140,.7)}
.health{display:flex;align-items:center;gap:14px;padding:14px 18px;border-radius:10px;background:linear-gradient(90deg,rgba(133,219,192,.08),transparent);border:1px solid rgba(133,219,192,.35)}
.health i{width:10px;height:10px;border-radius:50%;background:var(--ok);box-shadow:0 0 14px var(--ok);animation:pulse 2.4s infinite}
"""

def settings_body():
    return f'''
<div class="app">
{header("Settings")}
<main class="page" onMouseMove="{{{{ onMove }}}}" onMouseLeave="{{{{ onLeave }}}}">
{journey(8, "Settings", "Analytics", "Protocol")}
{banner("vault.webp", "CONFIGURATION", "Settings", "Network, backend adapter and the wallet this session is signing with. Nothing here changes an on-chain policy — those are signed, not configured.", "gear")}
<div class="sgrid">
  <div class="stack">
    <section class="panel panel-3d rise" style="--i: 2">
      <div class="ph"><h3>Network</h3><span class="chip chip-ok">● HEALTHY</span></div>
      <div class="pb">
        <div class="health"><i></i><span style="font-size: 12.5px; color: var(--text-2)">Backend adapter <b class="mono" style="color: var(--ok); font-weight: 500">anchor · devnet</b> · latency <b class="mono" style="color: var(--ok); font-weight: 500">88 ms</b></span></div>
        <div class="kv" style="margin-top: 10px"><span>Cluster</span><b>Solana Devnet</b></div>
        <div class="kv"><span>Program</span><b class="info">Fj7MV8Z2…b4WbS4</b></div>
        <div class="kv"><span>Executor</span><b class="info">3Qm1kd9E…8Yy1</b></div>
        <div class="kv"><span>Commitment</span><b>confirmed</b></div>
        <div class="kv"><span>API URL</span><b class="info">https://redline-api.onrender.com</b></div>
      </div>
    </section>
    <section class="panel rise" style="--i: 3">
      <div class="ph"><h3>Policy invariants</h3><span class="chip chip-dim">READ-ONLY</span></div>
      <div class="pb">
        <div class="kv"><span>Gates enforced on-chain</span><b>7</b></div>
        <div class="kv"><span>Policy digest</span><b>SHA-256</b></div>
        <div class="kv"><span>Allowlist size limit</span><b class="info">4 mints · 4 destinations</b></div>
        <div class="kv"><span>Amount bounds</span><b class="info">1 .. u64::MAX</b></div>
        <div class="kv"><span>Mock clock speed</span><b class="warn">1×</b></div>
      </div>
    </section>
  </div>
  <div class="stack">
    <section class="panel rise" style="--i: 3">
      <div class="ph"><h3>Wallet &amp; demo assets</h3><span class="chip chip-gold">PHANTOM</span></div>
      <div class="pb">
        <div class="kv"><span>Connected owner</span><b class="info">8xkA…p2Qe</b></div>
        <div class="kv"><span>Program ID (frontend)</span><b class="info">Fj7MV8Z2…b4WbS4</b></div>
        <div class="kv"><span>Demo USDC mint</span><b class="info">Es9vMFrz…nwNYB</b></div>
        <div class="kv"><span>Demo destination</span><b class="info">7XB2hFTc…Pu62q</b></div>
        <div class="kv"><span>Write key</span><b class="ok">configured</b></div>
      </div>
    </section>
    <section class="panel rise" style="--i: 4">
      <div class="ph"><h3>Experience</h3></div>
      <div class="pb">
        <div class="kv"><span>Sound cues for page changes, success and rejections</span><button type="button" class="toggle" role="switch" aria-checked="{{{{ sound }}}}" onClick="{{{{ tSound }}}}"></button></div>
        <div class="kv"><span>3D depth &amp; parallax</span><button type="button" class="toggle" role="switch" aria-checked="{{{{ depth }}}}" onClick="{{{{ tDepth }}}}"></button></div>
        <div class="kv"><span>Reduce motion (follows OS setting)</span><button type="button" class="toggle" role="switch" aria-checked="{{{{ reduce }}}}" onClick="{{{{ tReduce }}}}"></button></div>
        <div class="kv"><span>Language</span><div class="dur"><button type="button" aria-pressed="{{{{ en }}}}" onClick="{{{{ tEn }}}}">EN</button><button type="button" aria-pressed="{{{{ vi }}}}" onClick="{{{{ tVi }}}}">VI</button></div></div>
      </div>
    </section>
  </div>
</div>
</main>
</div>'''

ST_SCRIPT = r"""<script data-dc-script data-props='{"$preview":{"width":1440,"height":1160}}'>
class Component extends DCLogic {
  constructor(p){ super(p); this.state = { sound: false, depth: true, reduce: false, lang: 'en' }; }
  renderVals() { const s = this.state; const t = (k) => () => this.setState({ [k]: !s[k] });
    return { sound: s.sound, depth: s.depth, reduce: s.reduce, tSound: t('sound'), tDepth: t('depth'), tReduce: t('reduce'),
      en: s.lang === 'en', vi: s.lang === 'vi', tEn: () => this.setState({ lang: 'en' }), tVi: () => this.setState({ lang: 'vi' }) }; }
}
</script>"""

def settings():
    return wrap(settings_body(), ST_CSS, ST_SCRIPT, pg=PG["settings"])
