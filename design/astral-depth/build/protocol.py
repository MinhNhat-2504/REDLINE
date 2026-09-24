from shared import *

CSS_X = r"""
/* ---- hero ---- */
.hero{position:relative;height:880px;display:flex;align-items:center;padding:0 96px;overflow:hidden;isolation:isolate;perspective:1400px}
.hero .art{position:absolute;inset:0;z-index:0}
.hero .art img{width:100%;height:100%;object-fit:cover;object-position:center 40%;filter:saturate(.7) brightness(.55);transform:scale(1.05);animation:drift 30s ease-in-out infinite alternate}
.hero .wash{position:absolute;inset:0;z-index:1;background:linear-gradient(90deg,#080e1bf5 0%,#080e1bb8 48%,#080e1b55 74%,#080e1b30),linear-gradient(0deg,#080d19 0%,transparent 26%),linear-gradient(180deg,#080d19cc,transparent 18%)}
.hero .grid{position:absolute;inset:0;z-index:1;opacity:.22;background-image:linear-gradient(#7ba7d322 1px,transparent 1px),linear-gradient(90deg,#7ba7d322 1px,transparent 1px);background-size:110px 110px;mask-image:linear-gradient(90deg,transparent 20%,#000 60%)}
.hero .copy{position:relative;z-index:4;width:600px}
.kicker{display:inline-flex;align-items:center;gap:10px;height:30px;padding:0 14px;border-radius:4px;font-family:var(--mono);font-size:9.5px;letter-spacing:.24em;color:var(--gold);background:rgba(8,14,27,.72);border:1px solid rgba(223,195,140,.35);box-shadow:var(--sh-1),0 0 24px -8px rgba(223,195,140,.5)}
.hero h1{margin:28px 0 0;font-size:84px;line-height:.98;letter-spacing:-.06em;font-weight:500;color:var(--text);text-shadow:0 24px 60px rgba(0,0,0,.6)}
.hero h1 .acc{display:block;margin-top:.14em;padding-left:22px;border-left:3px solid var(--gold);font-family:var(--serif);font-style:italic;font-weight:400;font-size:.66em;letter-spacing:-.04em;color:var(--gold-hi);text-shadow:0 0 40px rgba(223,195,140,.35)}
.hero .lede{margin-top:28px;max-width:440px;font-size:14.5px;line-height:1.9;color:#aebed3}
.hero .actions{display:flex;align-items:center;gap:22px;margin-top:36px}
.hero .actions .btn-gold{height:48px;padding:0 24px;gap:28px;font-size:12.5px}
.hero .actions .btn-ghost{height:48px;padding:0 20px;background:rgba(8,14,27,.6)}
.scrollcue{position:absolute;left:96px;bottom:40px;z-index:4;display:flex;align-items:center;gap:12px;font-family:var(--mono);font-size:9px;letter-spacing:.22em;color:#9eafc7}
.scrollcue i{width:1px;height:26px;background:linear-gradient(180deg,var(--gold),transparent);animation:pulse 2s infinite}
.edition{position:absolute;right:72px;bottom:36px;z-index:4;display:grid;grid-template-columns:auto 60px auto;gap:8px 18px;color:#93a9c4;font:9px/1.6 var(--mono);letter-spacing:.16em}
.edition b{color:var(--gold);font-weight:400}.edition i{height:1px;background:#91a3ba55;align-self:center}
/* celestial core */
.scene{position:absolute;z-index:3;right:0;top:0;width:52%;height:100%;perspective:1100px;pointer-events:none}
.halo{position:absolute;width:92%;aspect-ratio:1;top:50%;left:50%;transform:translate(-50%,-50%);background:radial-gradient(ellipse,#8ec7e52e,#496ba21a 34%,transparent 64%)}
.system{position:absolute;width:440px;height:440px;top:47%;left:50%;transform-style:preserve-3d;transition:transform .35s ease-out}
.orbit{position:absolute;inset:0;border:1px solid #dfc38ca8;border-radius:50%;transform-style:preserve-3d;box-shadow:0 0 24px #b5d9f014,inset 0 0 18px #b5d9f014}
.orbit::before{content:"";position:absolute;inset:-14px;border:1px dashed #abcdea40;border-radius:50%}
.orbit i{position:absolute;top:50%;left:-4px;width:8px;height:8px;background:#f7e2b7;box-shadow:0 0 22px #f7e2b7;border-radius:50%}
.orbit b{position:absolute;bottom:-3px;left:50%;width:5px;height:5px;background:#9bd5ff;box-shadow:0 0 20px #9bd5ff}
.o0{animation:orbA 40s linear infinite}.o1{inset:26px;border-color:#b1ddffc0;animation:orbB 32s linear infinite}.o2{inset:52px;border-width:2px;animation:orbC 48s linear infinite}
.crystal{position:absolute;inset:104px;transform-style:preserve-3d;animation:crys 18s ease-in-out infinite}
.face{position:absolute;inset:0;clip-path:polygon(50% 0,100% 48%,50% 100%,0 48%);background:linear-gradient(120deg,#d7edffc0,#769bd848 45%,#89bdffb8);border:1px solid #d5ecff;transform:rotateY(calc(var(--f) * 90deg + 45deg)) rotateX(8deg)}
.heart{position:absolute;inset:0;display:grid;place-items:center;color:#f7e4bc;filter:drop-shadow(0 0 18px #d1e6ff);transform:translateZ(44px)}
.sat{position:absolute;top:50%;left:50%;width:9px;height:9px;background:#d7bc8d;box-shadow:0 0 16px #dcc48c88;transform:rotate(calc(var(--s) * 51.4deg)) translateX(250px) rotate(45deg)}
.floor{position:absolute;left:50%;top:78%;width:560px;height:140px;transform:translateX(-50%) rotateX(72deg);border-radius:50%;background:radial-gradient(ellipse,rgba(141,204,237,.22),rgba(223,195,140,.06) 45%,transparent 70%);filter:blur(6px)}
.caption{position:absolute;left:50%;top:84%;width:240px;transform:translateX(-50%);display:flex;align-items:center;gap:14px;font:8.5px var(--mono);letter-spacing:.15em;color:#b9cce4;white-space:nowrap}
.caption span{color:var(--gold)}.caption i{width:26px;height:1px;background:#c9b183}
.coord{position:absolute;right:30px;top:50%;writing-mode:vertical-rl;color:#9fb3cf;letter-spacing:.22em;font:8.5px var(--mono)}
@keyframes orbA{from{transform:rotateZ(-25deg) rotateX(65deg) rotateZ(0)}to{transform:rotateZ(-25deg) rotateX(65deg) rotateZ(360deg)}}
@keyframes orbB{from{transform:rotateZ(40deg) rotateY(60deg) rotateZ(0)}to{transform:rotateZ(40deg) rotateY(60deg) rotateZ(-360deg)}}
@keyframes orbC{from{transform:rotateZ(-35deg) rotateY(55deg) rotateZ(0)}to{transform:rotateZ(-35deg) rotateY(55deg) rotateZ(360deg)}}
@keyframes crys{0%,100%{transform:translateY(-9px) rotateY(-12deg) rotateZ(8deg)}50%{transform:translateY(9px) rotateY(18deg) rotateZ(-8deg)}}
/* ---- story sections ---- */
.story{position:relative;z-index:2;padding:0 96px}
.sec{padding:88px 0 0}
.sechead{display:flex;align-items:flex-end;justify-content:space-between;gap:30px;margin-bottom:34px}
.sechead .lede{margin-top:14px}
/* backbone rail (3D) */
.rail-wrap{perspective:1600px}
.rail{position:relative;padding:26px 28px 24px;transform:rotateX(6deg);transform-origin:50% 100%;transform-style:preserve-3d}
.rail .flow{display:grid;grid-template-columns:96px repeat(7,minmax(0,1fr)) 96px;gap:12px;align-items:stretch;position:relative;margin-top:22px;transform-style:preserve-3d}
.endpoint{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;border-radius:10px;font-family:var(--mono);font-size:9.5px;letter-spacing:.2em;color:var(--gold);background:linear-gradient(160deg,#1b2c45,#111d31);border:1px solid var(--line-strong);box-shadow:var(--sh-1)}
.endpoint.vault{color:var(--ok);border-color:rgba(133,219,192,.5)}
.endpoint .ico{width:34px;height:34px;display:grid;place-items:center;border-radius:8px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08)}
.rail .line{position:absolute;left:96px;right:96px;top:50%;height:1px;background:linear-gradient(90deg,rgba(223,195,140,.1),rgba(223,195,140,.45),rgba(133,219,192,.45));transform:translateZ(-8px);pointer-events:none}
.rail .pulse{position:absolute;top:50%;width:64px;height:4px;margin-top:-2px;border-radius:2px;background:linear-gradient(90deg,transparent,#eed5a3,#8dcced);box-shadow:0 0 18px #eed5a3;animation:travelRail 5.5s var(--ease) infinite;transform:translateZ(-4px)}
@keyframes travelRail{0%{left:8%;opacity:0}8%{opacity:1}92%{opacity:1}100%{left:86%;opacity:0}}
.facts{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:22px}
.fact{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:10px;background:var(--inset);border:1px solid var(--line);box-shadow:inset 0 2px 8px rgba(0,0,0,.45)}
.fact .ico{width:30px;height:30px;display:grid;place-items:center;border-radius:7px;color:var(--gold);background:rgba(223,195,140,.08);border:1px solid rgba(223,195,140,.25)}
.fact small{display:block;font-family:var(--mono);font-size:8.5px;letter-spacing:.18em;color:var(--muted)}
.fact b{font-family:var(--mono);font-size:13px;font-weight:500;color:var(--gold-hi)}
/* worlds */
.wtabs{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid var(--line)}
.wtabs button{display:flex;align-items:center;gap:14px;color:#afbbcf;padding:22px 12px;border-top:2px solid transparent;text-align:left;font-size:13px;transition:all .25s}
.wtabs button > span{color:#8697b0;font:10px var(--mono)}.wtabs button small{margin-left:auto;font-family:var(--mono);font-size:8px;letter-spacing:.14em;color:var(--muted)}
.wtabs button:hover{color:var(--gold-hi)}
.wtabs button[aria-pressed="true"]{border-color:var(--gold);color:var(--gold-hi);background:linear-gradient(rgba(223,195,140,.08),transparent)}
.wstage{perspective:1600px;margin-top:8px}
.world{position:relative;height:420px;overflow:hidden;border-radius:16px;border:1px solid var(--line-strong);box-shadow:var(--sh-3);transform-style:preserve-3d;animation:worldIn .6s var(--ease) both}
.world img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 55%;filter:saturate(.75) brightness(.72);transform:scale(1.03);animation:drift 26s ease-in-out infinite alternate}
.world::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,#080e1bf4,#0a14279c 40%,transparent 80%),linear-gradient(0deg,#080e1b99,transparent 40%)}
.world .wc{position:relative;z-index:1;padding:52px;max-width:470px;transform:translateZ(30px)}
.world .wc > span{color:var(--gold);font:9.5px var(--mono);letter-spacing:.16em}
.world h3{margin:22px 0 14px;font:46px var(--serif);font-style:italic;color:var(--text);text-shadow:0 20px 40px rgba(0,0,0,.6)}
.world p{color:#c0cddd;font-size:13.5px;line-height:1.8;max-width:380px}
.world .wlink{margin-top:28px;display:inline-flex;align-items:center;gap:32px;color:var(--gold-hi);font-size:12px;padding-bottom:10px;border-bottom:1px solid rgba(223,195,140,.4)}
.world .wstats{position:absolute;right:40px;bottom:36px;z-index:1;display:flex;gap:12px}
.world .wstat{padding:12px 16px;border-radius:10px;background:rgba(8,14,27,.72);border:1px solid rgba(223,195,140,.3);backdrop-filter:blur(6px);box-shadow:var(--sh-2)}
.world .wstat small{display:block;font-family:var(--mono);font-size:8px;letter-spacing:.18em;color:var(--muted)}
.world .wstat b{font-family:var(--mono);font-size:15px;font-weight:500;color:var(--gold-hi)}
@keyframes worldIn{from{opacity:.2;transform:rotateX(6deg) translateY(16px)}to{opacity:1;transform:none}}
/* policy lab */
.lab{display:grid;grid-template-columns:400px minmax(0,1fr);border-radius:16px;overflow:hidden;border:1px solid var(--line-strong);box-shadow:var(--sh-3);background:linear-gradient(135deg,#152139,#0b1322)}
.labform{padding:30px;border-right:1px solid var(--line)}
.labres{padding:30px;position:relative;perspective:1400px}
.policy dl{display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:16px 0 22px;border-bottom:1px solid var(--line);margin:12px 0 22px}
.policy dt{color:#a4b3c9;font-size:10.5px}.policy dd{margin:4px 0 0;color:#e5d4b2;font:12.5px var(--mono)}
.policy p{color:#afbbcf;font-size:12.5px;line-height:1.7;margin:10px 0 0}
.labgates{display:grid;grid-template-columns:repeat(7,1fr);gap:8px;margin-top:26px;transform-style:preserve-3d}
.labgates .gate{min-height:112px;transform:rotateX(0)}
.verdict{margin-top:24px;padding:22px 24px;border-radius:12px;border-left:3px solid var(--bad);background:linear-gradient(90deg,rgba(255,147,164,.09),transparent 60%);box-shadow:var(--sh-1);animation:rise .6s var(--ease) both}
.verdict[data-allowed="true"]{border-color:var(--ok);background:linear-gradient(90deg,rgba(133,219,192,.09),transparent 60%)}
.verdict > span{color:#aebed3;font:9.5px var(--mono);letter-spacing:.16em}
.verdict h3{margin:10px 0;font:16px var(--mono);color:var(--bad);letter-spacing:.02em}
.verdict[data-allowed="true"] h3{color:var(--ok)}
.verdict p{margin:0;color:#c4cddd;font-size:12.5px;line-height:1.7}
.labsum{display:flex;gap:24px;align-items:center;color:#aebed3;font-size:11.5px;padding-bottom:20px;border-bottom:1px solid var(--line)}
.labsum b{color:var(--gold-hi);font-size:26px;font-weight:400;margin-right:6px;font-family:var(--mono)}
.labempty{display:flex;flex-direction:column;justify-content:center;align-items:center;min-height:380px;text-align:center}
.labempty > svg{color:var(--gold);margin-bottom:22px;filter:drop-shadow(0 0 16px rgba(223,195,140,.5))}
.labempty span{font:9.5px var(--mono);color:#91a7c5;letter-spacing:.16em}
.labempty h3{font:26px var(--serif);font-style:italic;margin:18px 0 12px;color:#e9e3d8}
.labempty p{max-width:320px;font-size:12.5px;line-height:1.8;color:#a6b5ca;margin:0}
.labempty .gate-dots{margin-top:30px;gap:12px}.labempty .gate-dots i{width:26px;height:30px;font-size:10px}
.disc{display:block;color:#9aaac2;font-size:10.5px;line-height:1.7;margin-top:12px;text-align:center}
/* chapters */
.chapters{display:grid;grid-template-columns:repeat(4,1fr);border-radius:14px;overflow:hidden;border:1px solid var(--line-strong);box-shadow:var(--sh-2);background:var(--surface)}
.chapters .ch{padding:26px 26px 28px;border-right:1px solid var(--line);position:relative;transition:background .3s}
.chapters .ch:last-child{border-right:0}
.chapters .ch:hover{background:rgba(223,195,140,.04)}
.chapters .ch small{font:9.5px var(--mono);letter-spacing:.2em;color:var(--gold)}
.chapters .ch h4{margin:12px 0 6px;font-size:16px;font-weight:600;color:var(--text)}
.chapters .ch p{margin:0;color:#aebed3;font-size:12.5px;line-height:1.7}
.chapters .ch .num{position:absolute;right:22px;top:20px;font:40px var(--serif);font-style:italic;color:rgba(223,195,140,.16)}
.pillars{display:grid;grid-template-columns:repeat(3,1fr);gap:0;margin-top:72px;border-top:1px solid var(--line)}
.pillar{padding:38px 34px 46px;border-right:1px solid var(--line);position:relative}
.pillar:last-child{border-right:0}
.pillar small{font:9.5px var(--mono);letter-spacing:.2em;color:var(--gold)}
.pillar h3{margin:22px 0 12px;font-size:22px;font-weight:500;color:var(--text)}
.pillar p{margin:0;color:#aebed3;font-size:13.5px;line-height:1.8;max-width:320px}
.pillar .ico{position:absolute;right:30px;top:32px;width:44px;height:44px;display:grid;place-items:center;border-radius:11px;color:var(--gold);background:linear-gradient(160deg,#1b2c45,#111d31);border:1px solid rgba(223,195,140,.35);box-shadow:var(--sh-2);transform:rotateX(12deg) rotateY(-14deg)}
.foot{margin-top:80px;padding:28px 96px 40px;border-top:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;color:#8ea0ba;font:10px var(--mono);letter-spacing:.14em}
"""

GATES = [
    ("01", "Active grant", "REVOKED"),
    ("02", "Time window", "EXPIRED"),
    ("03", "Fresh intent", "NONCE_REPLAY"),
    ("04", "Allowed asset", "MINT_NOT_ALLOWED"),
    ("05", "Allowed recipient", "DESTINATION_NOT_ALLOWED"),
    ("06", "Budget envelope", "SPEND_CAP_EXCEEDED"),
    ("07", "Execution pace", "COOLDOWN_ACTIVE"),
]

def gate_html(i, state_hole, cls=""):
    idx, label, code = GATES[i]
    return f'''<div class="{("gate " + cls).strip()}" data-state="{state_hole}">
      <div class="gs"></div>
      <span class="gi">{idx}</span>
      <div><div class="gl">{label}</div><div class="gc">{code}</div></div>
    </div>'''

from protocol_body_new import body, CSS_X2

SCRIPT = r"""<script data-dc-script data-props='{"$preview":{"width":1440,"height":4900}}'>
class Component extends DCLogic {
  constructor(p){ super(p); this.state = { world: 'citadel', preset: 'payroll', scenario: 'follow', ran: false, tx: 0, ty: 0 }; }
  renderVals() {
    const s = this.state;
    const outcomes = {
      follow: ['passed','passed','passed','passed','passed','passed','passed'],
      over:   ['passed','passed','passed','passed','passed','blocked','skipped'],
      dest:   ['passed','passed','passed','passed','blocked','skipped','skipped'],
      replay: ['passed','passed','blocked','skipped','skipped','skipped','skipped'],
    };
    const g = s.ran ? outcomes[s.scenario] : ['idle','idle','idle','idle','idle','idle','idle'];
    const after = s.scenario === 'follow' ? '750.00' : '1,000.00';
    return {
      tx: s.tx, ty: s.ty, px1: s.ty * .4, py1: -s.tx * .4, px2: s.ty * 1.1, py2: -s.tx * 1.1, px3: s.ty * 2, py3: -s.tx * 2,
      onMove: (e) => { const r = e.currentTarget.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width - .5; const y = (e.clientY - r.top) / r.height - .5; this.setState({ tx: -y * 16, ty: x * 22 }); },
      onLeave: () => this.setState({ tx: 0, ty: 0 }),
      isCitadel: s.world === 'citadel', isVault: s.world === 'vault', isObs: s.world === 'obs',
      pickCitadel: () => this.setState({ world: 'citadel' }), pickVault: () => this.setState({ world: 'vault' }), pickObs: () => this.setState({ world: 'obs' }),
      isPayroll: s.preset === 'payroll', isOps: s.preset === 'ops', isSandbox: s.preset === 'sandbox',
      pickPayroll: () => this.setState({ preset: 'payroll', ran: false }), pickOps: () => this.setState({ preset: 'ops', ran: false }), pickSandbox: () => this.setState({ preset: 'sandbox', ran: false }),
      scFollow: s.scenario === 'follow', scOver: s.scenario === 'over', scDest: s.scenario === 'dest', scReplay: s.scenario === 'replay',
      pickFollow: () => this.setState({ scenario: 'follow', ran: false }), pickOver: () => this.setState({ scenario: 'over', ran: false }),
      pickDest: () => this.setState({ scenario: 'dest', ran: false }), pickReplay: () => this.setState({ scenario: 'replay', ran: false }),
      run: () => this.setState({ ran: true }), reset: () => this.setState({ ran: false }),
      ran: s.ran, notRan: !s.ran,
      g1: g[0], g2: g[1], g3: g[2], g4: g[3], g5: g[4], g6: g[5], g7: g[6],
      after,
    };
  }
}
</script>"""

def build():
    return wrap(body(), CSS_X + CSS_X2, SCRIPT, pg=PG["protocol"])
