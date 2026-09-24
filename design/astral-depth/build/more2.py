from shared import *
from shared import water, vox, chain, shards, topline
from ops import CSS_OPS, kpi, spark, gate_compact

LISTINGS = [  # acc, name, ver, hires, strategy, hash, publisher, price
    ("223,195,140", "YieldGuard Alpha", "v0.1.0", 2, "Conservative stablecoin rebalancer. Moves idle USDC between two lending venues when the spread exceeds 40 bps; never touches SOL.", "9b9529…7889", "FMFo…7G", "0.25"),
    ("141,204,237", "Payroll Runner", "v1.2.0", 4, "Scheduled contributor payouts against a signed allowlist. Idempotent nonces, weekly cadence, refuses unknown addresses by construction.", "4c1e07…a2f1", "8xkA…p2Qe", "0.10"),
    ("214,64,142", "hello", "v1.0.0", 1, "Reference agent from the four-minute demo: one destination, one mint, a 500 USDC envelope and a 60 s cooldown.", "41d3d1…1a9c", "FMFo…7G", "0.05"),
    ("241,198,120", "Grant Sentinel", "v0.3.1", 0, "Watches other grants and proposes revokes when spend velocity spikes. Proposes only — the owner still signs.", "e77a02…1b44", "3Qm…Yy1", "0.40"),
    ("133,219,192", "CSaCLAB Ops", "v1.0.0", 0, "Operations desk agent for the FCCS lab treasury. Pays approved vendors, caps every session at the grant envelope.", "b4957d…c8e0", "HRRW…WNKN", "—"),
]

# =============================================================== MARKETPLACE
MKT_CSS = CSS_OPS + r"""
.search{display:flex;align-items:center;gap:12px;height:44px;padding:0 16px;border-radius:9px;background:var(--surface);border:1px solid var(--line-strong);color:var(--muted);font-size:12.5px;box-shadow:var(--sh-1)}
.mkt-head{display:grid;grid-template-columns:auto 1fr 210px 200px;gap:16px;align-items:center;margin-top:18px}
.mkt-head .tl-id b{font-size:30px}
.spot{display:grid;grid-template-columns:560px minmax(0,1fr);gap:32px;margin-top:26px;align-items:stretch}
.feature{position:relative;perspective:1600px;min-height:420px}
.fcard{position:relative;height:100%;min-height:420px;border-radius:22px;padding:30px 32px;overflow:hidden;transform-style:preserve-3d;transform:rotateY(6deg) rotateX(2deg);transition:transform .7s var(--ease);
  background:linear-gradient(140deg,rgba(var(--acc),.22),#101b30 45%,#0b1424);border:1px solid rgba(var(--acc),.55);box-shadow:var(--sh-3),12px 12px 0 0 rgba(var(--acc),.22);animation:fcardIn .8s var(--ease) both}
.fcard:hover{transform:rotateY(0) rotateX(0) translateZ(20px)}
@keyframes fcardIn{from{opacity:0;transform:rotateY(-40deg) translateX(-60px)}to{opacity:1;transform:rotateY(6deg) rotateX(2deg)}}
.fcard::before{content:"";position:absolute;inset:0;background:linear-gradient(115deg,transparent 35%,rgba(255,255,255,.07) 48%,rgba(var(--acc),.18) 52%,transparent 66%);animation:holo 7s ease-in-out infinite;pointer-events:none}
@keyframes holo{0%,100%{transform:translateX(-30%)}50%{transform:translateX(30%)}}
.fcard .kick{display:flex;justify-content:space-between;align-items:center}
.fcard .kick small{font:9.5px var(--mono);letter-spacing:.22em;color:rgb(var(--acc))}
.fcard h2{margin:70px 0 6px;font-size:40px;line-height:1.05;letter-spacing:-.04em;font-weight:600;color:var(--text)}
.fcard h2 span{display:block;font:italic 22px var(--serif);color:rgb(var(--acc));letter-spacing:0;margin-top:4px}
.fcard p{margin:14px 0 0;max-width:420px;font-size:13.5px;line-height:1.8;color:#c0cddd}
.fcard .cluster{position:absolute;right:34px;top:74px;display:flex;align-items:flex-end;perspective:700px;transform:translateZ(40px)}
.fcard .cluster .vox{--vc:var(--acc);margin-right:-14px}
.fcard .cluster .vox:nth-child(2){--vc:141,204,237;margin-bottom:24px}.fcard .cluster .vox:nth-child(3){--vc:133,219,192}
.fcard .meta{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-top:22px}
.fcard .meta div{padding:12px 14px;border-radius:10px;background:rgba(8,13,25,.6);border:1px solid var(--line);box-shadow:inset 0 2px 8px rgba(0,0,0,.5)}
.fcard .meta small{display:block;font:8.5px var(--mono);letter-spacing:.18em;color:var(--muted)}
.fcard .meta b{display:block;margin-top:5px;font:13px var(--mono);font-weight:500;color:var(--info)}
.fcard .cta{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:22px;padding-top:18px;border-top:1px solid var(--line);flex-wrap:wrap}
.fcard .dur button{white-space:nowrap}
.fcard .dur{display:inline-flex;flex:none}
.fcard .price b{display:block;font:26px var(--mono);font-weight:500;color:var(--gold-hi)}.fcard .price small{font-size:10.5px;color:var(--muted)}
.rentbtn{min-width:240px;justify-content:space-between}
.rentbtn[data-state="verifying"]{background:linear-gradient(180deg,#2a3c5c,#17243a);color:var(--info);box-shadow:0 5px 0 0 #0a1121,0 0 30px -8px rgba(141,204,237,.6)}
.rentbtn[data-state="verifying"] i{width:12px;height:12px;border:2px solid rgba(141,204,237,.35);border-top-color:var(--info);border-radius:50%;animation:spin .9s linear infinite}
.rentbtn[data-state="hired"]{background:linear-gradient(180deg,#9ee6cf,#85dbc0 55%,#5fb89e);color:#0a1a16;box-shadow:0 5px 0 0 #2f6b58,0 0 34px -6px rgba(133,219,192,.8);animation:popIn .4s var(--ease)}
@keyframes spin{to{transform:rotate(360deg)}}
.dur{display:inline-flex;flex:none;border-radius:7px;overflow:hidden;border:1px solid var(--line-strong);box-shadow:var(--sh-1)}
.dur button{height:32px;padding:0 12px;font:11px var(--mono);color:var(--muted);background:var(--inset);border-right:1px solid var(--line-strong);transition:all .2s;white-space:nowrap}
.dur button:last-child{border-right:0}
.dur button[aria-pressed="true"]{color:#101827;background:linear-gradient(180deg,#eed5a3,#dfc38c);box-shadow:inset 0 1px 0 rgba(255,255,255,.4)}
/* coverflow */
.flow-wrap{position:relative;perspective:1500px;min-height:420px;display:flex;flex-direction:column}
.cover-flow{position:relative;flex:1;min-height:340px;overflow:hidden;border-radius:18px}
.cf{position:absolute;left:50%;top:50%;width:300px;height:300px;margin:-150px 0 0 -150px;border-radius:18px;padding:22px 22px 20px;overflow:hidden;text-align:left;
  background:linear-gradient(180deg,rgba(23,36,58,.85),rgba(12,20,37,.98));border:1px solid rgba(var(--acc),.45);box-shadow:var(--sh-2);transform-style:preserve-3d;
  transition:transform .7s var(--ease),opacity .5s,filter .5s;cursor:pointer}
.cf::before{content:"";position:absolute;left:22px;right:22px;top:0;height:1px;background:linear-gradient(90deg,transparent,rgba(var(--acc),.8),transparent)}
.cf[data-pos="0"]{transform:translateZ(60px);z-index:5}
.cf[data-pos="1"]{transform:translateX(230px) translateZ(-80px) rotateY(-32deg);z-index:4;opacity:.85;filter:brightness(.8)}
.cf[data-pos="-1"]{transform:translateX(-230px) translateZ(-80px) rotateY(32deg);z-index:4;opacity:.85;filter:brightness(.8)}
.cf[data-pos="2"]{transform:translateX(340px) translateZ(-260px) rotateY(-50deg);z-index:3;opacity:.45;filter:brightness(.55)}
.cf[data-pos="-2"]{transform:translateX(-340px) translateZ(-260px) rotateY(50deg);z-index:3;opacity:.45;filter:brightness(.55)}
.cf .av{width:44px;height:44px;display:grid;place-items:center;border-radius:12px;color:rgb(var(--acc));background:rgba(var(--acc),.14);border:1px solid rgba(var(--acc),.4);box-shadow:var(--sh-1)}
.cf b{display:block;margin-top:14px;font-size:16px;font-weight:600;color:var(--text)}
.cf small{display:block;margin-top:3px;font:10.5px var(--mono);color:rgb(var(--acc))}
.cf p{margin:12px 0 0;font-size:12px;line-height:1.65;color:#aebed3;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}
.cf .pr{position:absolute;left:22px;right:22px;bottom:18px;display:flex;justify-content:space-between;align-items:center;font:12px var(--mono);color:var(--gold-hi)}
.cf .pr span{font-size:10px;color:var(--muted)}
.cf-nav{display:flex;justify-content:center;align-items:center;gap:14px;margin-top:6px}
.cf-nav .dots{display:flex;gap:6px}.cf-nav .dots i{width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.18)}.cf-nav .dots i.on{background:var(--gold);box-shadow:0 0 10px var(--gold)}
.cf-floor{position:absolute;left:10%;right:10%;bottom:20px;height:70px;transform:rotateX(72deg);border-radius:50%;background:radial-gradient(ellipse,rgba(var(--pg),.22),transparent 70%);filter:blur(6px);pointer-events:none}
/* compact listing table */
.listing{display:grid;grid-template-columns:40px 1.3fr 1fr 1fr 110px 110px 120px;gap:14px;align-items:center;padding:12px 22px;border-bottom:1px solid rgba(45,59,83,.7);font-size:12.5px}
.listing .av{width:30px;height:30px;display:grid;place-items:center;border-radius:8px;color:rgb(var(--acc));background:rgba(var(--acc),.14);border:1px solid rgba(var(--acc),.4)}
.listing b{font-weight:600;color:var(--text)}.listing small{display:block;font:10.5px var(--mono);color:var(--muted)}
.listing .m{font:11.5px var(--mono);color:var(--info)}.listing .p{font:12.5px var(--mono);color:var(--gold-hi)}
"""

def marketplace_body():
    def cf(i, acc, name, ver, hires, strategy, hash_, pub, price):
        return f'''<button type="button" class="cf" style="--acc: {acc}" data-pos="{{{{ pos{i} }}}}" onClick="{{{{ sel{i} }}}}"><span class="av">{svg("bot", 18)}</span><b>{name}</b><small>{ver}{' · ' + str(hires) + ' active hire' + ('s' if hires != 1 else '') if hires else ''}</small><p>{strategy}</p><div class="pr">{price if price == '—' else price + ' SOL'}<span>{'private' if price == '—' else 'per day'}</span></div></button>'''
    cards = "".join(cf(i, *L) for i, L in enumerate(LISTINGS))
    def feature(i, acc, name, ver, hires, strategy, hash_, pub, price):
        cta = (f'<button type="button" class="btn btn-gold rentbtn" data-state="{{{{ rent }}}}" onClick="{{{{ doRent }}}}"><span style="display: inline-flex; gap: 10px; align-items: center"><i></i>{{{{ rentLabel }}}}</span>{svg("arrow", 14, "currentColor")}</button>'
               if price != '—' else '<span class="chip chip-info" style="height: 30px">PRIVATE · YOUR LISTING</span>')
        return f'''<sc-if value="{{{{ isF{i} }}}}" hint-placeholder-val="{{{{ {'true' if i == 0 else 'false'} }}}}"><div class="fcard" style="--acc: {acc}">
      <div class="kick"><small>FEATURED · {ver.upper()} · {hires} ACTIVE HIRE{'S' if hires != 1 else ''}</small><span class="chip chip-ok">VERIFIED ON DEVNET</span></div>
      <div class="cluster">{vox("", "", 44)}{vox("", "", 30, False)}{vox("", "", 36, False)}</div>
      <h2>{name}<span>immutable agent version</span></h2>
      <p>{strategy}</p>
      <div class="meta"><div><small>AGENT HASH</small><b>{hash_}</b></div><div><small>PUBLISHER</small><b style="color: var(--muted)">{pub}</b></div><div><small>PUBLISHED</small><b style="color: var(--text-2)">29 Aug 2026</b></div></div>
      <div class="cta"><div class="price"><b>{price if price == '—' else price + ' SOL'}</b><small>{'not rentable' if price == '—' else 'per day · paid to the publisher · verified before hire'}</small></div>
        <div style="display: flex; align-items: center; gap: 12px"><div class="dur"><button type="button" aria-pressed="{{{{ dA }}}}" onClick="{{{{ sA }}}}">1 day</button><button type="button" aria-pressed="{{{{ dB }}}}" onClick="{{{{ sB }}}}">3 days</button><button type="button" aria-pressed="{{{{ dC }}}}" onClick="{{{{ sC }}}}">7 days</button></div>{cta}</div></div>
      <sc-if value="{{{{ burst }}}}" hint-placeholder-val="{{{{ false }}}}"><div class="burst">{"".join(f'<i style="--bx: {x}px; --by: {y}px; animation-delay: {d}ms; background: {c}"></i>' for x, y, d, c in [(120,-90,0,'var(--gold)'),(-110,-70,40,'var(--ok)'),(90,80,80,'var(--info)'),(-80,100,20,'var(--gold)'),(150,20,60,'var(--ok)'),(-150,-10,100,'var(--info)'),(30,-130,30,'var(--gold)'),(-40,130,70,'var(--ok)')])}</div></sc-if>
    </div></sc-if>'''
    features = "".join(feature(i, *L) for i, L in enumerate(LISTINGS))
    rows = "".join(f'''<div class="listing" style="--acc: {acc}"><span class="av">{svg("bot", 14)}</span><span><b>{name}</b><small>{ver}</small></span><span class="m">{hash_}</span><span class="m" style="color: var(--muted)">{pub}</span><span>{f'<span class="chip chip-gold">{hires} hire{"s" if hires != 1 else ""}</span>' if hires else '<span class="chip chip-dim">new</span>'}</span><span class="p">{price if price == '—' else price + ' SOL'}</span><button type="button" class="btn btn-ghost btn-sm" onClick="{{{{ sel{i} }}}}">{svg("eye", 11)} View</button></div>''' for i, (acc, name, ver, hires, strategy, hash_, pub, price) in enumerate(LISTINGS))
    return f'''
<div class="app">
{header("Marketplace")}
<main class="page" onMouseMove="{{{{ onMove }}}}" onMouseLeave="{{{{ onLeave }}}}">
<div class="mkt-head rise" style="--i: 0">
  <div class="tl-id"><span class="tl-vox">{vox("", "", 18, False)}</span><small>02 / 11 · DEVNET</small><b>Marketplace</b></div>
  <div class="search">{svg("search", 14)}Search agents by name, hash or publisher…</div>
  <button type="button" class="tool" style="height: 44px; justify-content: space-between" aria-pressed="{{{{ priced }}}}" onClick="{{{{ togglePriced }}}}">{svg("shield", 13)} Rentable only <span class="chip {{{{ pricedChip }}}}" style="height: 18px">{{{{ pricedLabel }}}}</span></button>
  <button type="button" class="tool" style="height: 44px; justify-content: space-between">{svg("chart", 13)} Sort · active hires {svg("chevd", 12)}</button>
</div>
<div class="spot">
  <div class="feature rise" style="--i: 1">{features}</div>
  <div class="flow-wrap rise" style="--i: 2">
    <div class="cover-flow"><div class="cf-floor"></div>{cards}</div>
    <div class="cf-nav"><button type="button" class="btn btn-ghost btn-sm" onClick="{{{{ prevC }}}}">{svg("arrowl", 12)}</button><div class="dots"><i class="{{{{ dot0 }}}}"></i><i class="{{{{ dot1 }}}}"></i><i class="{{{{ dot2 }}}}"></i><i class="{{{{ dot3 }}}}"></i><i class="{{{{ dot4 }}}}"></i></div><button type="button" class="btn btn-ghost btn-sm" onClick="{{{{ nextC }}}}">{svg("arrow", 12)}</button><span class="mono" style="margin-left: 14px; font-size: 9.5px; letter-spacing: .16em; color: var(--muted)">CLICK A CARD · RENT = SOL TRANSFER TO PUBLISHER</span></div>
  </div>
</div>
<section class="panel rise" style="--i: 3; margin-top: 28px">
  <div class="ph"><h3>All published versions · <span class="mono" style="font-weight: 400; color: var(--muted)">{{{{ count }}}} listings</span></h3><span class="chip chip-info">IMMUTABLE · agent hash = SHA-256(model | code | config)</span></div>
  <div class="log-head" style="grid-template-columns: 40px 1.3fr 1fr 1fr 110px 110px 120px"><span></span><span>AGENT</span><span>HASH</span><span>PUBLISHER</span><span>HIRES</span><span>PRICE</span><span></span></div>
  {rows}
</section>
</main>
</div>'''

MKT_SCRIPT = r"""<script data-dc-script data-props='{"$preview":{"width":1440,"height":1300}}'>
class Component extends DCLogic {
  constructor(p){ super(p); this.state = { sel: 0, dur: 'A', priced: false, rent: 'idle', burst: false }; }
  renderVals() {
    const s = this.state, n = 5, v = {};
    for (let i = 0; i < n; i++) { let d = i - s.sel; if (d > 2) d -= n; if (d < -2) d += n; v['pos' + i] = String(d); v['sel' + i] = () => this.setState({ sel: i, rent: 'idle', burst: false }); v['dot' + i] = i === s.sel ? 'on' : ''; v['isF' + i] = s.sel === i; }
    return { ...v,
      prevC: () => this.setState({ sel: (s.sel + n - 1) % n, rent: 'idle', burst: false }), nextC: () => this.setState({ sel: (s.sel + 1) % n, rent: 'idle', burst: false }),
      dA: s.dur === 'A', dB: s.dur === 'B', dC: s.dur === 'C', sA: () => this.setState({ dur: 'A' }), sB: () => this.setState({ dur: 'B' }), sC: () => this.setState({ dur: 'C' }),
      priced: s.priced, pricedChip: s.priced ? 'chip-ok' : 'chip-dim', pricedLabel: s.priced ? 'ON' : 'OFF', count: s.priced ? 4 : 5, togglePriced: () => this.setState({ priced: !s.priced }),
      rent: s.rent, rentLabel: s.rent === 'verifying' ? 'Verifying SOL transfer on devnet…' : s.rent === 'hired' ? 'Hired · agreement recorded' : 'Rent with wallet',
      burst: s.burst,
      doRent: () => { if (s.rent !== 'idle') return; this.setState({ rent: 'verifying' }); setTimeout(() => this.setState({ rent: 'hired', burst: true }), 1800); setTimeout(() => this.setState({ burst: false }), 3000); },
    };
  }
}
</script>"""

def marketplace():
    return wrap(marketplace_body(), MKT_CSS, MKT_SCRIPT, pg=PG["marketplace"])

# =============================================================== AGENTS
AG_CSS = CSS_OPS + r"""
.agents-grid{display:grid;grid-template-columns:240px minmax(0,1fr) 380px;gap:26px;margin-top:22px;align-items:start}
.rail-list{display:grid;gap:8px}
.arow2{display:grid;grid-template-columns:34px 1fr auto;gap:12px;align-items:center;padding:12px 14px;border-radius:12px;text-align:left;background:rgba(15,25,43,.85);border:1px solid var(--line);transition:all .35s var(--ease);transform-style:preserve-3d}
.arow2:hover{transform:translateX(4px) translateZ(8px);border-color:#69788c}
.arow2[aria-pressed="true"]{background:linear-gradient(90deg,rgba(var(--acc),.18),rgba(15,25,43,.9) 70%);border-color:rgba(var(--acc),.6);box-shadow:0 0 24px -8px rgba(var(--acc),.7),6px 6px 0 0 rgba(var(--acc),.18);transform:translateX(8px) translateZ(14px)}
.arow2 .av{width:34px;height:34px;display:grid;place-items:center;border-radius:9px;color:rgb(var(--acc));background:rgba(var(--acc),.14);border:1px solid rgba(var(--acc),.4)}
.arow2 b{font-size:12.5px;font-weight:600;color:var(--text)}.arow2 small{display:block;font:10px var(--mono);color:var(--muted)}
.arow2 .n{font:11px var(--mono);color:var(--gold-hi)}
.idstage{perspective:1600px;min-height:440px}
.idcard{position:relative;height:440px;transform-style:preserve-3d;transition:transform .9s var(--ease);cursor:pointer}
.idcard[data-flip="true"]{transform:rotateY(180deg)}
.face{position:absolute;inset:0;border-radius:22px;padding:30px 32px;overflow:hidden;backface-visibility:hidden;
  background:linear-gradient(140deg,rgba(var(--acc),.2),#101b30 45%,#0b1424);border:1px solid rgba(var(--acc),.55);box-shadow:var(--sh-3),12px 12px 0 0 rgba(var(--acc),.2)}
.face.back{transform:rotateY(180deg);background:linear-gradient(140deg,#0b1424,#101b30 50%,rgba(var(--acc),.16))}
.face::before{content:"";position:absolute;inset:0;background:linear-gradient(115deg,transparent 35%,rgba(255,255,255,.07) 48%,rgba(var(--acc),.18) 52%,transparent 66%);animation:holo 7s ease-in-out infinite;pointer-events:none}
@keyframes holo{0%,100%{transform:translateX(-30%)}50%{transform:translateX(30%)}}
.face .kick{display:flex;justify-content:space-between;align-items:center;font:9.5px var(--mono);letter-spacing:.22em;color:rgb(var(--acc))}
.face .avatar{position:absolute;right:34px;top:70px;perspective:700px;display:flex;align-items:flex-end}
.face .avatar .vox{--vc:var(--acc);margin-right:-14px}.face .avatar .vox:nth-child(2){--vc:141,204,237;margin-bottom:26px}
.face h2{margin:64px 0 4px;font-size:40px;letter-spacing:-.04em;font-weight:600;color:var(--text);line-height:1.05}
.face h2 span{display:block;font:italic 20px var(--serif);color:rgb(var(--acc));letter-spacing:0;margin-top:6px}
.face .stat4{margin-top:22px}
.face .hint{position:absolute;left:32px;bottom:22px;font:9.5px var(--mono);letter-spacing:.18em;color:var(--muted);display:flex;align-items:center;gap:8px}
.face.back h3{margin:22px 0 10px;font-size:14px;color:var(--text)}
.face.back code{display:block;padding:14px 16px;border-radius:10px;background:var(--bg);border:1px solid var(--line);font:12px/1.8 var(--mono);color:var(--info);word-break:break-all;box-shadow:inset 0 2px 8px rgba(0,0,0,.5)}
.formula{display:grid;grid-template-columns:1fr auto 1fr auto 1fr;gap:10px;align-items:center;margin-top:14px;font:11px var(--mono);color:var(--text-2)}
.formula span{padding:10px 12px;border-radius:8px;background:var(--surface-hi);border:1px solid var(--line);text-align:center;line-height:1.6}
.formula i{color:var(--gold);font-style:normal}.formula .op{color:var(--gold);font-size:14px}
.stat4{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.stat{padding:14px 16px;border-radius:10px;background:rgba(8,13,25,.6);border:1px solid var(--line);box-shadow:inset 0 2px 8px rgba(0,0,0,.45)}
.stat small{display:block;font:8.5px var(--mono);letter-spacing:.18em;color:var(--muted)}.stat b{display:block;margin-top:6px;font:18px var(--mono);font-weight:500}
.grant-mini{display:grid;grid-template-columns:1fr auto;gap:8px 12px;padding:12px 0;border-bottom:1px solid rgba(45,59,83,.7)}
.grant-mini:last-child{border-bottom:0}
.grant-mini b{font:12px var(--mono);font-weight:500;color:var(--info)}.grant-mini small{font:10.5px var(--mono);color:var(--muted)}
.grant-mini .bar{grid-column:1 / -1;height:4px}
.pubform .field{margin-bottom:12px}
"""

AGENTS = [
    ("14,145,205", "tui là thắng", "v1.0.0", "ddd2d047c1a2b8e93f6a7d0c4e5b1f2a8c9d0e1f2a3b4c5d6e7f8091a2b3c47f1", 1, 1, "300 USDC", 3, "manual:dashboard", "manual:tui-la-thang", '{"strategy":…}', "Scripted payroll agent from the demo. Pays 100 USDC to one allowlisted address every 60 seconds until the envelope closes.", [("GFNM…v1tJ", "ACTIVE · 300 / 500", 60, "chip-ok")]),
    ("223,195,140", "CSaCLAB", "v1.0.0", "b4957dc8e0f1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b", 0, 2, "2,034 USDC", 2, "manual:dashboard", "manual:CSaCLAB", '{"strategy":…}', "Operations desk agent for the FCCS lab treasury. Both grants were revoked by the owner after the demo session.", [("HRRW…WNKN", "REVOKED · 1,588 / 7,944", 20, "chip-bad"), ("HrJL…XW2g", "REVOKED · 446 / 2,234", 20, "chip-bad")]),
    ("133,219,192", "YieldGuard Alpha", "v0.1.0", "9b9529ddf3ad228773738c3dc57d9ee412c0f16910993fcdaba89fadfa197889", 0, 3, "310 USDC", 8, "hf:yieldguard-0.1", "git:7f3a9c1", '{"spreadBps":40}', "Conservative stablecoin rebalancer. Moves idle USDC between two lending venues when the spread exceeds 40 bps.", [("vdPU…GY6e", "REVOKED · 300 / 500", 60, "chip-bad"), ("4Lqb…5kvC", "EXPIRED · 10 / 10", 100, "chip-dim")]),
    ("214,64,142", "hello", "v1.0.0", "41d3d11a9c0b1e2f3a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90a1", 1, 1, "0 USDC", 0, "manual:dashboard", "manual:hello", '{"strategy":…}', "Reference agent from the four-minute demo. Waiting for its first scripted run.", [("pending", "DRAFT · 0 / 2,500", 0, "chip-info")]),
]

def agents_body():
    rail = "".join(f'<button type="button" class="arow2" style="--acc: {a[0]}" aria-pressed="{{{{ is{i} }}}}" onClick="{{{{ pick{i} }}}}"><span class="av">{svg("bot", 16)}</span><span><b>{a[1]}</b><small>{a[2]} · {a[3][:6]}…</small></span><span class="n">{a[5]} gr</span></button>' for i, a in enumerate(AGENTS))
    def card(i, a):
        acc, name, ver, h, active, total, spent, tx, mref, cref, cfg, strat, grants = a
        gm = "".join(f'<div class="grant-mini"><b>{g[0]}</b><span class="chip {g[3]}">{g[1]}</span><div class="bar{" bad" if g[3]=="chip-bad" else ""}"><i style="width: {g[2]}%"></i></div></div>' for g in grants)
        return f'''<sc-if value="{{{{ is{i} }}}}" hint-placeholder-val="{{{{ {'true' if i == 0 else 'false'} }}}}">
      <div class="idstage"><div class="idcard" style="--acc: {acc}" data-flip="{{{{ flip }}}}" onClick="{{{{ doFlip }}}}">
        <div class="face front">
          <div class="kick"><span>AGENT IDENTITY · {ver.upper()}</span><span class="chip {'chip-ok' if active else 'chip-dim'}">{'● ' + str(active) + ' ACTIVE GRANT' if active else 'NO ACTIVE GRANT'}</span></div>
          <div class="avatar">{vox("", "", 52)}{vox("", "", 32, False)}</div>
          <h2>{name}<span>{strat.split('.')[0]}.</span></h2>
          <div class="stat4"><div class="stat"><small>ACTIVE</small><b style="color: var(--gold-hi)">{active}</b></div><div class="stat"><small>TOTAL GRANTS</small><b style="color: var(--info)">{total}</b></div><div class="stat"><small>SPENT</small><b style="color: var(--warn)">{spent}</b></div><div class="stat"><small>TRANSFERS</small><b style="color: var(--gold-hi)">{tx}</b></div></div>
          <div class="hint">{svg("refresh", 11)} CLICK THE CARD · SEE HOW THE HASH IS BUILT</div>
        </div>
        <div class="face back">
          <div class="kick"><span>AGENT HASH · SHA-256 · IMMUTABLE</span><span class="chip chip-info">PINNED BY EVERY GRANT</span></div>
          <h3>{name} · {ver}</h3>
          <code>{h}</code>
          <div class="formula"><span>modelRef<br><i>{mref}</i></span><b class="op">+</b><span>codeRef<br><i>{cref}</i></span><b class="op">+</b><span>config<br><i>{cfg}</i></span></div>
          <p class="help" style="margin-top: 16px">Name and version are not part of the hash. Two differently-named agents with the same refs would collapse into one identity — so the refs carry the operator's intent.</p>
          <div class="hint">{svg("refresh", 11)} CLICK TO FLIP BACK</div>
        </div>
      </div></div>
      <section class="panel rise" style="--i: 3">
        <div class="ph"><h3>Grants bound to this build</h3><span class="chip chip-gold">{total}</span></div>
        <div class="pb" style="padding-top: 6px">{gm}</div>
      </section>
    </sc-if>'''
    cards = "".join(card(i, a) for i, a in enumerate(AGENTS))
    return f'''
<div class="app">
{header("Agents")}
<main class="page" onMouseMove="{{{{ onMove }}}}" onMouseLeave="{{{{ onLeave }}}}">
{topline(3, "My Agents", "Marketplace", "Guardrails", "Each version is pinned by an agentHash — SHA-256 of model, code and configuration — so a grant can only ever bind to one exact build.")}
<div class="agents-grid">
  <aside class="rise" style="--i: 1"><div class="eyebrow" style="margin-bottom: 12px">VERSIONS · 4</div><div class="rail-list">{rail}</div>
    <button type="button" class="btn btn-ghost" style="width: 100%; margin-top: 14px; justify-content: center">{svg("plus", 12)} Publish agent version</button></aside>
  <div class="rise" style="--i: 2">{cards}</div>
  <aside class="rise" style="--i: 3">
    <section class="panel pubform">
      <div class="ph"><h3>Publish a new version</h3><span class="chip chip-dim">DRAFT</span></div>
      <div class="pb">
        <label class="field">Name<div class="in focus">Payroll Runner<span class="caret"></span></div></label>
        <label class="field">Version<div class="in">v1.3.0</div></label>
        <label class="field">Strategy<div class="in" style="height: 84px; align-items: flex-start; padding-top: 12px; font-family: var(--sans); font-size: 12.5px; color: var(--text-2); line-height: 1.6">Weekly contributor payouts against the signed allowlist…</div></label>
        <div class="inset" style="padding: 12px 14px; font: 10.5px/1.7 var(--mono); color: var(--muted)">agentHash preview<br><span style="color: var(--info)">sha256(manual:dashboard | manual:payroll-runner | {{"strategy":…}})</span></div>
        <button type="button" class="btn btn-gold" style="width: 100%; margin-top: 16px; justify-content: space-between">{svg("up", 13, "#101827")} Publish to registry {svg("arrow", 13, "#101827")}</button>
      </div>
    </section>
  </aside>
</div>
</main>
</div>'''

AG_SCRIPT = r"""<script data-dc-script data-props='{"$preview":{"width":1440,"height":900}}'>
class Component extends DCLogic {
  constructor(p){ super(p); this.state = { sel: 0, flip: false }; }
  renderVals() { const s = this.state, v = {};
    for (let i = 0; i < 4; i++) { v['is' + i] = s.sel === i; v['pick' + i] = () => this.setState({ sel: i, flip: false }); }
    return { ...v, flip: s.flip, doFlip: () => this.setState({ flip: !s.flip }) }; }
}
</script>"""

def agents():
    return wrap(agents_body(), AG_CSS, AG_SCRIPT, pg=PG["agents"])

# =============================================================== ANALYTICS (bento)
AN_CSS = CSS_OPS + r"""
.bento{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));grid-auto-rows:150px;gap:18px;margin-top:22px;perspective:1600px}
.bento .panel{overflow:hidden}
.b-chart{grid-column:span 2;grid-row:span 2}
.b-donut{grid-column:span 1;grid-row:span 2}
.b-tile{grid-column:span 1;grid-row:span 1}
.b-wide{grid-column:span 2;grid-row:span 1}
.b-wide .tile{flex-direction:row;align-items:center;justify-content:space-between}
.b-wide .tile b{font-size:34px}
.b-rank{grid-column:span 2;grid-row:span 2}
.b-gates{grid-column:span 2;grid-row:span 2}
.chartbox{position:relative;height:100%;min-height:200px;padding:10px 0 0}
.bars{position:absolute;left:44px;right:10px;top:10px;bottom:28px;display:grid;grid-template-columns:repeat(7,1fr);gap:18px;align-items:end;transform:rotateX(6deg);transform-origin:50% 100%;transform-style:preserve-3d}
.bar3{position:relative;border-radius:5px 5px 2px 2px;background:linear-gradient(180deg,rgba(124,92,231,.95),rgba(124,92,231,.15));box-shadow:0 0 22px -6px rgba(124,92,231,.8),inset 0 1px 0 rgba(255,255,255,.35);transform-style:preserve-3d;animation:grow 1.1s var(--ease) both;transform-origin:50% 100%;transition:transform .3s}
.bar3:hover{transform:translateZ(16px) scaleY(1.02)}
.bar3::after{content:"";position:absolute;left:0;right:0;top:0;height:8px;border-radius:5px 5px 0 0;background:rgba(255,255,255,.35);transform:rotateX(60deg) translateZ(4px);transform-origin:50% 100%}
.bar3 i{position:absolute;left:0;right:0;top:-22px;text-align:center;font:10.5px var(--mono);color:var(--gold-hi)}
.axis{position:absolute;left:44px;right:10px;bottom:0;display:grid;grid-template-columns:repeat(7,1fr);gap:18px;font:10px var(--mono);color:var(--muted);text-align:center}
.yax{position:absolute;left:0;top:10px;bottom:28px;display:flex;flex-direction:column;justify-content:space-between;font:10px var(--mono);color:var(--dim)}
.gridl{position:absolute;left:44px;right:10px;top:10px;bottom:28px;background:linear-gradient(rgba(255,255,255,.06) 1px,transparent 1px);background-size:100% 25%}
@keyframes grow{from{transform:scaleY(0)}to{transform:scaleY(1)}}
.tile{padding:18px 20px;height:100%;display:flex;flex-direction:column;justify-content:space-between}
.tile small{font-size:11.5px;color:var(--muted);display:flex;align-items:center;gap:8px}
.tile b{font:30px var(--mono);font-weight:500;color:var(--text);letter-spacing:-.02em}
.tile .d{font:10.5px var(--mono);color:var(--ok)}
.donut{display:grid;place-items:center;width:150px;height:150px;border-radius:50%;position:relative;background:conic-gradient(var(--ok) 0 67%,var(--bad) 67% 100%);box-shadow:0 0 34px -10px rgba(133,219,192,.6),0 20px 40px -20px rgba(0,0,0,.9);transform:rotateX(18deg);transition:transform .5s var(--ease)}
.b-donut:hover .donut{transform:rotateX(0)}
.donut::before{content:"";position:absolute;inset:14px;border-radius:50%;background:var(--surface);box-shadow:inset 0 2px 10px rgba(0,0,0,.6)}
.donut b{position:relative;font:24px var(--mono);font-weight:500;color:var(--text)}.donut small{position:absolute;bottom:34px;font:8.5px var(--mono);letter-spacing:.2em;color:var(--muted)}
.legend{display:grid;gap:8px;font-size:12px;color:var(--text-2);margin-top:16px}
.legend span{display:flex;align-items:center;gap:10px}.legend i{width:10px;height:10px;border-radius:3px}
.legend b{margin-left:auto;font:12px var(--mono);font-weight:500;color:var(--text)}
.rank{display:grid;grid-template-columns:1fr 130px 80px;align-items:center;gap:12px;padding:12px 22px;border-bottom:1px solid rgba(45,59,83,.7);font-size:12.5px}
.rank:last-child{border-bottom:0}.rank .who{display:flex;align-items:center;gap:10px}
.rank .who i{width:26px;height:26px;display:grid;place-items:center;border-radius:7px;color:var(--gold);background:rgba(223,195,140,.1);border:1px solid rgba(223,195,140,.3)}
.rank .vol{font:12.5px var(--mono);color:var(--gold-hi);text-align:right}.rank .gr{font:11.5px var(--mono);color:var(--muted);text-align:right}
.hbar{display:grid;grid-template-columns:200px 1fr 40px;gap:12px;align-items:center;padding:8px 0;font:11px var(--mono);color:var(--text-2)}
.hbar .tr{height:14px;border-radius:4px;background:rgba(255,255,255,.05);overflow:hidden;box-shadow:inset 0 1px 3px rgba(0,0,0,.6);perspective:400px}
.hbar .tr i{display:block;height:100%;border-radius:4px;background:linear-gradient(90deg,rgba(255,147,164,.5),var(--bad));box-shadow:0 0 12px rgba(255,147,164,.5);animation:growX 1.2s var(--ease) both;transform-origin:0 50%}
@keyframes growX{from{transform:scaleX(0)}to{transform:scaleX(1)}}
.hbar b{text-align:right;color:var(--bad);font-weight:500}
"""

def analytics_body():
    vals = [(1200, "Mon"), (2400, "Tue"), (900, "Wed"), (3100, "Thu"), (1800, "Fri"), (400, "Sat"), (2600, "Sun")]
    bars = "".join(f'<div class="bar3" style="height: {v/3200*100:.0f}%; animation-delay: {i*80}ms"><i>{v:,}</i></div>' for i, (v, d) in enumerate(vals))
    axis = "".join(f"<span>{d}</span>" for v, d in vals)
    def tile(label, value, delta, icon, cls="b-tile"):
        return f'<div class="panel {cls}"><div class="tile"><small><span class="ico" style="width: 22px; height: 22px; display: grid; place-items: center; border-radius: 6px; color: rgb(var(--pg)); background: rgba(var(--pg),.12); border: 1px solid rgba(var(--pg),.3)">{svg(icon, 11)}</span>{label}</small><b>{value}</b><span class="d">{delta}</span></div></div>'
    return f'''
<div class="app">
{header("Analytics")}
<main class="page" onMouseMove="{{{{ onMove }}}}" onMouseLeave="{{{{ onLeave }}}}">
{topline(7, "Analytics", "Audit", "Settings", "Computed from your grants' real audit trail — no price feed, so no P&amp;L or APY. What you see is what the chain settled.")}
<div class="bento rise" style="--i: 1">
  <section class="panel b-chart"><div class="ph"><div style="display: flex; align-items: center; gap: 10px">{svg("chart", 13, "#dfc38c")}<h3>Confirmed volume — last 7 days</h3></div><span class="chip chip-gold">USDC</span></div>
    <div class="pb" style="height: calc(100% - 56px)"><div class="chartbox"><div class="yax"><span>3.2k</span><span>2.4k</span><span>1.6k</span><span>800</span><span>0</span></div><div class="gridl"></div><div class="bars">{bars}</div><div class="axis">{axis}</div></div></div></section>
  <section class="panel b-donut"><div class="ph"><h3>Allowed vs. rejected</h3></div>
    <div class="pb" style="display: grid; justify-items: center"><div class="donut"><b>67%</b><small>ALLOWED</small></div>
      <div class="legend" style="width: 100%"><span><i style="background: var(--ok)"></i>Allowed<b>18</b></span><span><i style="background: var(--bad)"></i>Rejected<b>9</b></span></div></div></section>
  {tile("Active grants", "2", "+1 this week", "key")}
  {tile("Avg decision latency", "412 ms", "−38 ms vs. last week", "clock")}
  <section class="panel b-rank"><div class="ph"><h3>Top agents by volume</h3><span class="chip chip-dim">7 GRANTS</span></div>
    <div class="rank"><span class="who"><i>{svg("bot", 13)}</i>CSaCLAB</span><span class="vol">2,034 USDC</span><span class="gr">2 grants</span></div>
    <div class="rank"><span class="who"><i>{svg("bot", 13)}</i>YieldGuard Alpha</span><span class="vol">310 USDC</span><span class="gr">3 grants</span></div>
    <div class="rank"><span class="who"><i>{svg("bot", 13)}</i>tui là thắng</span><span class="vol">300 USDC</span><span class="gr">1 grant</span></div>
    <div class="rank"><span class="who"><i>{svg("bot", 13)}</i>hello</span><span class="vol">0 USDC</span><span class="gr">1 grant</span></div></section>
  <section class="panel b-gates"><div class="ph"><h3>Rejections by gate</h3><span class="chip chip-bad">9 REFUSED · 0 MOVED</span></div>
    <div class="pb" style="padding-top: 10px">
      <div class="hbar"><span>06 · SPEND_CAP_EXCEEDED</span><div class="tr"><i style="width: 100%"></i></div><b>4</b></div>
      <div class="hbar"><span>07 · COOLDOWN_ACTIVE</span><div class="tr"><i style="width: 75%; animation-delay: .1s"></i></div><b>3</b></div>
      <div class="hbar"><span>05 · DESTINATION_NOT_ALLOWED</span><div class="tr"><i style="width: 50%; animation-delay: .2s"></i></div><b>2</b></div>
      <div class="hbar"><span>03 · NONCE_REPLAY</span><div class="tr"><i style="width: 0%"></i></div><b style="color: var(--muted)">0</b></div>
      <div class="hbar"><span>01 · 02 · 04</span><div class="tr"><i style="width: 0%"></i></div><b style="color: var(--muted)">0</b></div>
      <p class="help" style="margin-top: 10px">Every refused proposal left the vault untouched. The gate that refuses most often is the budget envelope — the agent keeps trying to overspend.</p></div></section>
  {tile("Total volume", "12,400 USDC", "+2,600 · 7 days", "chart", "b-wide")}
  {tile("Success rate", "67%", "18 of 27 proposals allowed", "check", "b-wide")}
</div>
</main>
</div>'''

def analytics():
    return wrap(analytics_body(), AN_CSS, '<script data-dc-script data-props=\'{"$preview":{"width":1440,"height":1120}}\'>class Component extends DCLogic {}</script>', pg=PG["analytics"])

# =============================================================== SETTINGS (sidebar)
ST_CSS = CSS_OPS + r"""
.dur{display:inline-flex;border-radius:7px;overflow:hidden;border:1px solid var(--line-strong);box-shadow:var(--sh-1)}
.dur button{height:32px;padding:0 12px;font:11px var(--mono);color:var(--muted);background:var(--inset);border-right:1px solid var(--line-strong);transition:all .2s;white-space:nowrap}
.dur button:last-child{border-right:0}
.dur button[aria-pressed="true"]{color:#101827;background:linear-gradient(180deg,#eed5a3,#dfc38c);box-shadow:inset 0 1px 0 rgba(255,255,255,.4)}
.set-grid{display:grid;grid-template-columns:280px minmax(0,1fr);gap:28px;margin-top:22px;align-items:start}
.set-nav{display:grid;gap:8px;perspective:900px}
.set-nav button{display:grid;grid-template-columns:36px 1fr auto;gap:12px;align-items:center;padding:14px 16px;border-radius:12px;text-align:left;background:rgba(15,25,43,.85);border:1px solid var(--line);color:var(--text-2);transition:all .35s var(--ease);transform-style:preserve-3d}
.set-nav button i{width:36px;height:36px;display:grid;place-items:center;border-radius:9px;color:rgb(var(--pg));background:rgba(var(--pg),.12);border:1px solid rgba(var(--pg),.3)}
.set-nav button b{display:block;font-size:13px;font-weight:600;color:var(--text)}.set-nav button small{display:block;font-size:11px;color:var(--muted)}
.set-nav button:hover{transform:translateX(4px) translateZ(8px)}
.set-nav button[aria-pressed="true"]{background:linear-gradient(90deg,rgba(var(--pg),.2),rgba(15,25,43,.9) 70%);border-color:rgba(var(--pg),.6);box-shadow:6px 6px 0 0 rgba(var(--pg),.2);transform:translateX(8px) translateZ(14px)}
.set-nav button[aria-pressed="true"] i{background:rgb(var(--pg));color:#0b1424}
.set-health{margin-top:14px;padding:16px 18px;border-radius:12px;background:linear-gradient(90deg,rgba(133,219,192,.1),rgba(15,25,43,.85));border:1px solid rgba(133,219,192,.35)}
.set-health i{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--ok);box-shadow:0 0 14px var(--ok);animation:pulse 2.4s infinite;margin-right:8px}
.toggle{cursor:pointer;width:44px;height:24px;border-radius:12px;position:relative;background:var(--line);box-shadow:inset 0 2px 4px rgba(0,0,0,.6);transition:background .25s;perspective:200px}
.toggle::after{content:"";position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#e8eef7,#9fadc3);box-shadow:0 2px 6px rgba(0,0,0,.6);transition:all .3s var(--ease)}
.toggle[aria-checked="true"]{background:rgba(223,195,140,.45)}
.toggle[aria-checked="true"]::after{left:23px;background:radial-gradient(circle at 35% 30%,#fff5dc,#dfc38c 60%,#b8985a);box-shadow:0 0 14px rgba(223,195,140,.8),0 2px 6px rgba(0,0,0,.6)}
.toggle:active::after{transform:scale(.9)}
.pane{animation:popIn .45s var(--ease) both}
.pane .kv{padding:14px 0}
.keyrow{display:grid;grid-template-columns:1fr auto auto;gap:10px;align-items:center}
.keyrow .in{height:40px}
"""

def settings_body():
    def nav(i, icon, title, sub):
        return f'<button type="button" aria-pressed="{{{{ t{i} }}}}" onClick="{{{{ go{i} }}}}"><i>{svg(icon, 15)}</i><span><b>{title}</b><small>{sub}</small></span>{svg("chev", 12)}</button>'
    return f'''
<div class="app">
{header("Settings")}
<main class="page" onMouseMove="{{{{ onMove }}}}" onMouseLeave="{{{{ onLeave }}}}">
{topline(8, "Settings", "Analytics", "Protocol", "Network, backend adapter and the wallet this session signs with. Nothing here changes an on-chain policy — those are signed, not configured.")}
<div class="set-grid">
  <aside class="rise" style="--i: 1">
    <div class="set-nav">
      {nav(0, "globe", "Network", "Cluster · program · executor")}
      {nav(1, "wallet", "Wallet &amp; demo assets", "Owner · mints · destinations")}
      {nav(2, "lock", "Policy invariants", "What the program enforces")}
      {nav(3, "sun", "Experience", "Sound · depth · motion · language")}
    </div>
    <div class="set-health"><i></i><span style="font-size: 12.5px; color: var(--text-2)">Backend <b class="mono" style="color: var(--ok); font-weight: 500">anchor · devnet</b> · <b class="mono" style="color: var(--ok); font-weight: 500">88 ms</b></span></div>
  </aside>
  <section class="panel rise" style="--i: 2; min-height: 520px">
    <sc-if value="{{{{ t0 }}}}" hint-placeholder-val="{{{{ true }}}}"><div class="pane">
      <div class="ph"><h3>Network</h3><span class="chip chip-ok">● HEALTHY</span></div>
      <div class="pb">
        <div class="kv"><span>Cluster</span><div class="dur"><button type="button" aria-pressed="true">Devnet</button><button type="button" aria-pressed="false">Testnet</button><button type="button" aria-pressed="false">Mainnet-beta</button></div></div>
        <div class="kv"><span>Program</span><b class="info">Fj7MV8Z2a3RdH4W8VF2XKfWAsWHT3jxhoqGMcmb4WbS4</b></div>
        <div class="kv"><span>Executor</span><b class="info">3Qm1kd9E…8Yy1</b></div>
        <div class="kv"><span>Commitment</span><div class="dur"><button type="button" aria-pressed="false">processed</button><button type="button" aria-pressed="true">confirmed</button><button type="button" aria-pressed="false">finalized</button></div></div>
        <label class="field" style="margin-top: 14px">API URL<div class="keyrow"><div class="in">https://redline-api.onrender.com</div><button type="button" class="btn btn-ghost btn-sm">{svg("refresh", 11)} Test</button><button type="button" class="btn btn-gold btn-sm">Save</button></div></label>
      </div></div></sc-if>
    <sc-if value="{{{{ t1 }}}}" hint-placeholder-val="{{{{ false }}}}"><div class="pane">
      <div class="ph"><h3>Wallet &amp; demo assets</h3><span class="chip chip-gold">PHANTOM</span></div>
      <div class="pb">
        <div class="kv"><span>Connected owner</span><b class="info">8xkA…p2Qe</b></div>
        <div class="kv"><span>Program ID (frontend)</span><b class="info">Fj7MV8Z2…b4WbS4</b></div>
        <div class="kv"><span>Demo USDC mint</span><b class="info">Es9vMFrz…nwNYB</b></div>
        <div class="kv"><span>Demo destination</span><b class="info">7XB2hFTc…Pu62q</b></div>
        <div class="kv"><span>Write key</span><b class="ok">configured</b></div>
        <div class="signzone" style="margin-top: 14px"><p>Disconnecting the wallet ends this session's ability to sign. On-chain grants are unaffected.</p><button type="button" class="btn btn-danger btn-sm">{svg("x", 11)} Disconnect wallet</button></div>
      </div></div></sc-if>
    <sc-if value="{{{{ t2 }}}}" hint-placeholder-val="{{{{ false }}}}"><div class="pane">
      <div class="ph"><h3>Policy invariants</h3><span class="chip chip-dim">READ-ONLY · ENFORCED BY THE PROGRAM</span></div>
      <div class="pb">
        <div class="kv"><span>Gates enforced on-chain</span><b>7</b></div>
        <div class="kv"><span>Policy digest</span><b>SHA-256</b></div>
        <div class="kv"><span>Allowlist size limit</span><b class="info">4 mints · 4 destinations</b></div>
        <div class="kv"><span>Amount bounds</span><b class="info">1 .. u64::MAX</b></div>
        <div class="kv"><span>Mock clock speed</span><b class="warn">1×</b></div>
        <p class="help" style="margin-top: 14px">These are properties of the deployed program, not preferences. Changing them means deploying a new program and re-signing every grant.</p>
      </div></div></sc-if>
    <sc-if value="{{{{ t3 }}}}" hint-placeholder-val="{{{{ false }}}}"><div class="pane">
      <div class="ph"><h3>Experience</h3></div>
      <div class="pb">
        <div class="kv"><span>Sound cues for page changes, success and rejections</span><button type="button" class="toggle" role="switch" aria-checked="{{{{ sound }}}}" onClick="{{{{ tSound }}}}"></button></div>
        <div class="kv"><span>3D depth &amp; parallax</span><button type="button" class="toggle" role="switch" aria-checked="{{{{ depth }}}}" onClick="{{{{ tDepth }}}}"></button></div>
        <div class="kv"><span>Reduce motion (follows OS setting)</span><button type="button" class="toggle" role="switch" aria-checked="{{{{ reduce }}}}" onClick="{{{{ tReduce }}}}"></button></div>
        <div class="kv"><span>Language</span><div class="dur"><button type="button" aria-pressed="{{{{ en }}}}" onClick="{{{{ tEn }}}}">EN</button><button type="button" aria-pressed="{{{{ vi }}}}" onClick="{{{{ tVi }}}}">VI</button></div></div>
      </div></div></sc-if>
  </section>
</div>
</main>
</div>'''

ST_SCRIPT = r"""<script data-dc-script data-props='{"$preview":{"width":1440,"height":900}}'>
class Component extends DCLogic {
  constructor(p){ super(p); this.state = { tab: 0, sound: false, depth: true, reduce: false, lang: 'en' }; }
  renderVals() { const s = this.state;
    return { t0: s.tab === 0, t1: s.tab === 1, t2: s.tab === 2, t3: s.tab === 3,
      go0: () => this.setState({ tab: 0 }), go1: () => this.setState({ tab: 1 }), go2: () => this.setState({ tab: 2 }), go3: () => this.setState({ tab: 3 }),
      sound: s.sound, depth: s.depth, reduce: s.reduce, tSound: () => this.setState({ sound: !s.sound }), tDepth: () => this.setState({ depth: !s.depth }), tReduce: () => this.setState({ reduce: !s.reduce }),
      en: s.lang === 'en', vi: s.lang === 'vi', tEn: () => this.setState({ lang: 'en' }), tVi: () => this.setState({ lang: 'vi' }) }; }
}
</script>"""

def settings():
    return wrap(settings_body(), ST_CSS, ST_SCRIPT, pg=PG["settings"])
