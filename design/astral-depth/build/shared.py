# Shared shell for every REDLINE artboard: tokens, chrome, components.
# Each .dc.html is self-contained, so the CSS is inlined into every file.

W = 1440

CSS = r"""
:root{
  --bg:#080d19;--bg-deep:#050914;--surface:#121c30;--surface-hi:#17243a;--inset:#0c1425;
  --line:#2d3b53;--line-strong:#43516a;--text:#f2eee5;--text-2:#c4cddd;--muted:#9fadc3;--dim:#7f8ea6;
  --gold:#dfc38c;--gold-hi:#eed5a3;--gold-deep:#b8985a;--info:#8dcced;--ok:#85dbc0;--bad:#ff93a4;--warn:#f1c678;
  --ease:cubic-bezier(.16,1,.3,1);
  --sh-1: inset 0 1px 0 rgba(255,255,255,.05), 0 1px 2px rgba(0,0,0,.45), 0 10px 24px -10px rgba(0,0,0,.55);
  --sh-2: inset 0 1px 0 rgba(255,255,255,.06), 0 14px 34px -12px rgba(0,0,0,.65), 0 34px 70px -24px rgba(0,0,0,.6);
  --sh-3: inset 0 1px 0 rgba(255,255,255,.09), 0 26px 54px -14px rgba(0,0,0,.72), 0 70px 130px -34px rgba(0,0,0,.65), 0 0 70px -22px rgba(223,195,140,.28);
  --sh-gold: 0 8px 26px -8px rgba(223,195,140,.55), 0 0 0 1px rgba(239,216,170,.7) inset;
  --mono:'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,monospace;
  --sans:'Inter',system-ui,-apple-system,'Segoe UI',sans-serif;
  --serif:Georgia,'Times New Roman',serif;
  --pg:223,195,140;
}
*{box-sizing:border-box}
.sc-interp{font:inherit!important;color:inherit!important;letter-spacing:inherit!important;display:inline}
body{margin:0;background:var(--bg);color:var(--text);font-family:var(--sans);font-size:14px;line-height:1.5;-webkit-font-smoothing:antialiased}
a{color:var(--gold-hi);text-decoration:none}a:hover{color:#fff}
button{font-family:inherit;cursor:pointer;border:0;background:none;color:inherit;font-size:inherit}
input,select{font-family:inherit}
.mono{font-family:var(--mono)}
.serif{font-family:var(--serif);font-style:italic;font-weight:400}
.app{position:relative;width:1440px;min-height:100%;background:
  radial-gradient(ellipse 70% 40% at 88% -6%, rgba(var(--pg),.14), transparent 60%),
  radial-gradient(ellipse 50% 40% at 0% 100%, rgba(141,204,237,.07), transparent 60%),
  linear-gradient(rgba(105,139,188,.045) 1px, transparent 1px),
  linear-gradient(90deg, rgba(105,139,188,.045) 1px, transparent 1px),
  var(--bg);
  background-size:auto,auto,48px 48px,48px 48px,auto;overflow:hidden}
/* ---------- header ---------- */
.hdr{position:relative;z-index:20;display:flex;align-items:center;gap:20px;height:64px;padding:0 32px;
  background:linear-gradient(90deg, rgba(19,31,51,.96), rgba(8,15,28,.96));border-bottom:1px solid rgba(92,112,143,.42);
  box-shadow:0 1px 0 rgba(255,255,255,.04) inset, 0 10px 30px -14px rgba(0,0,0,.8)}
.brand{display:flex;align-items:center;gap:10px;font-family:var(--mono);font-size:12px;letter-spacing:.32em;color:var(--text)}
.emblem{width:30px;height:30px;display:grid;place-items:center;border-radius:8px;color:var(--gold);
  background:linear-gradient(160deg,#1b2c45,#0d172a);border:1px solid rgba(223,195,140,.45);
  box-shadow:0 0 0 3px rgba(223,195,140,.08), 0 6px 14px -6px rgba(0,0,0,.8), inset 0 1px 0 rgba(255,255,255,.08)}
.nav{display:flex;align-items:center;gap:2px;margin-left:12px}
.nav button{position:relative;padding:8px 9px;border-radius:6px;font-size:12px;color:#bac6d9;letter-spacing:.01em;transition:color .2s,background .2s}
.nav button:hover{color:var(--gold-hi);background:rgba(92,130,188,.10)}
.nav button[aria-current="page"]{color:var(--gold-hi)}
.nav button[aria-current="page"]::after{content:"";position:absolute;left:50%;bottom:-1px;width:6px;height:6px;margin-left:-3px;transform:rotate(45deg);background:var(--gold);box-shadow:0 0 12px var(--gold)}
.tools{display:flex;align-items:center;gap:10px;margin-left:auto}
.tool{display:inline-flex;align-items:center;gap:8px;height:34px;padding:0 12px;border-radius:6px;font-size:12px;color:#b5c4d9;
  background:#152038;border:1px solid var(--line);box-shadow:var(--sh-1);transition:transform .2s var(--ease),box-shadow .2s;white-space:nowrap}
.tool:hover{transform:translateY(-1px);box-shadow:var(--sh-2);color:var(--gold-hi);border-color:#69788c}
.tool kbd{font-family:var(--mono);font-size:10px;padding:2px 6px;border-radius:4px;color:#d9d3c4;background:var(--inset);border:1px solid #3c4b63}
.netpill{display:inline-flex;align-items:center;gap:8px;font-family:var(--mono);font-size:10px;letter-spacing:.16em;color:#93a9c4}
.netpill i{width:6px;height:6px;border-radius:50%;background:var(--ok);box-shadow:0 0 10px var(--ok);animation:pulse 2.4s infinite}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;height:40px;padding:0 18px;border-radius:6px;font-size:12.5px;font-weight:600;letter-spacing:.01em;
  transition:transform .22s var(--ease),box-shadow .22s var(--ease),background .2s;white-space:nowrap}
.btn{position:relative;overflow:hidden;transform-style:preserve-3d}
.btn::after{content:"";position:absolute;left:50%;top:50%;width:10px;height:10px;border-radius:50%;background:rgba(255,255,255,.55);opacity:0;transform:translate(-50%,-50%) scale(1);pointer-events:none}
.btn:active::after{animation:ripple .55s var(--ease)}
@keyframes ripple{0%{opacity:.6;transform:translate(-50%,-50%) scale(1)}100%{opacity:0;transform:translate(-50%,-50%) scale(28)}}
.btn-gold{color:#101827;background:linear-gradient(180deg,#f3e0b5,#dfc38c 55%,#cdb077);border-bottom:0;box-shadow:0 5px 0 0 #8f7340,0 6px 0 0 rgba(0,0,0,.35),0 16px 30px -12px rgba(223,195,140,.55),inset 0 1px 0 rgba(255,255,255,.7)}
.btn-gold:hover{transform:translateY(-2px);box-shadow:0 7px 0 0 #8f7340,0 8px 0 0 rgba(0,0,0,.35),0 22px 40px -10px rgba(223,195,140,.7),inset 0 1px 0 rgba(255,255,255,.8)}
.btn-gold:active{transform:translateY(4px);box-shadow:0 1px 0 0 #8f7340,0 2px 0 0 rgba(0,0,0,.35),0 6px 14px -8px rgba(223,195,140,.5),inset 0 2px 6px rgba(0,0,0,.25);transition-duration:.06s}
.btn-ghost{color:var(--text-2);background:rgba(23,36,58,.85);border:1px solid var(--line-strong);box-shadow:0 3px 0 0 #0a1121,var(--sh-1)}
.btn-ghost:hover{color:var(--gold-hi);border-color:#69788c;transform:translateY(-1px);box-shadow:0 4px 0 0 #0a1121,var(--sh-2)}
.btn-ghost:active{transform:translateY(3px);box-shadow:0 0 0 0 #0a1121,inset 0 2px 6px rgba(0,0,0,.5);transition-duration:.06s}
.btn-danger{color:var(--bad);background:rgba(255,147,164,.06);border:1px solid rgba(255,147,164,.4);box-shadow:0 3px 0 0 rgba(120,40,55,.9)}
.btn-danger:hover{background:rgba(255,147,164,.14);transform:translateY(-1px);box-shadow:0 4px 0 0 rgba(120,40,55,.9),0 0 24px -6px rgba(255,147,164,.6)}
.btn-danger:active{transform:translateY(3px);box-shadow:0 0 0 0 rgba(120,40,55,.9),inset 0 2px 6px rgba(0,0,0,.5);transition-duration:.06s}
.btn-sm{height:32px;padding:0 12px;font-size:11.5px}
.avatar-btn{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(160deg,#1b2c45,#0d172a);border:1px solid rgba(223,195,140,.45);box-shadow:var(--sh-1);perspective:300px;transition:all .25s var(--ease)}
.avatar-btn:hover,.avatar-btn[aria-current="page"]{border-color:var(--gold);box-shadow:0 0 18px -4px rgba(223,195,140,.7)}
.avatar-btn .av-vox{display:grid;place-items:center}
/* ---------- page frame ---------- */
.page{position:relative;width:1440px;padding:24px 32px 56px}
.journey{display:grid;grid-template-columns:auto auto 1fr auto auto;align-items:center;gap:16px;height:52px;padding:0 10px 0 8px;margin:0 auto 20px;
  border-radius:10px;background:rgba(15,25,43,.92);border:1px solid var(--line-strong);box-shadow:var(--sh-1)}
.jbtn{display:flex;align-items:center;gap:8px;height:36px;padding:0 12px;border-radius:6px;background:var(--surface-hi);border:1px solid var(--line-strong);color:var(--gold);font-size:11px;text-align:left;line-height:1.15}
.jbtn small{display:block;font-family:var(--mono);font-size:8px;letter-spacing:.18em;color:var(--muted)}
.jtitle{display:flex;align-items:center;gap:10px;padding-left:8px;border-left:1px solid var(--line)}
.jtitle small{font-family:var(--mono);font-size:8px;letter-spacing:.2em;color:var(--muted);display:block}
.jtitle b{font-size:13px;font-weight:600;color:var(--text)}
.jtitle span.idx{font-family:var(--mono);font-size:12px;color:var(--gold)}
.jtrack{display:flex;align-items:center;gap:6px;padding:0 20px}
.jtrack i{flex:1;height:2px;background:rgba(var(--pg),.22);border-radius:2px;position:relative;overflow:hidden}
.jtrack i.on{background:rgba(var(--pg),.95);box-shadow:0 0 14px rgba(var(--pg),.7)}
.jtrack i.on::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.7),transparent);animation:shimmer 2.6s linear infinite}
.banner{position:relative;height:210px;border-radius:16px;overflow:hidden;border:1px solid var(--line-strong);box-shadow:var(--sh-2),10px 10px 0 0 rgba(var(--pg),.2);isolation:isolate;transform-style:preserve-3d;perspective:1200px}
.banner .plx{position:absolute;inset:0;pointer-events:none;transition:transform .5s var(--ease)}
.banner .cluster{position:absolute;right:250px;top:40px;display:flex;align-items:flex-end;gap:0;perspective:700px;transform-style:preserve-3d;transition:transform .5s var(--ease);z-index:2}
.banner .cluster .vox{--vc:var(--pg);margin-right:-12px}
.banner .cluster .vox:nth-child(2){--vc:141,204,237;margin-bottom:18px}
.banner .cluster .vox:nth-child(3){--vc:133,219,192;margin-bottom:4px}
.banner img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 55%;filter:brightness(.6) saturate(.7);transform:scale(1.04);animation:drift 22s ease-in-out infinite alternate}
.banner .wash{position:absolute;inset:0;background:linear-gradient(90deg,rgba(16,26,45,.98),rgba(16,26,45,.78) 42%,rgba(16,26,45,.12) 82%),linear-gradient(0deg,rgba(8,13,25,.6),transparent 40%)}
.banner .corner{position:absolute;width:22px;height:22px;border:2px solid rgba(var(--pg),.9);filter:drop-shadow(0 0 8px rgba(var(--pg),.6))}
.banner .corner.tl{top:14px;left:14px;border-right:0;border-bottom:0}.banner .corner.br{bottom:14px;right:14px;border-left:0;border-top:0}
.banner .copy{position:absolute;left:36px;top:50%;transform:translateY(-50%);max-width:640px;z-index:2}
.banner .eyebrow{display:flex;align-items:center;gap:10px;font-family:var(--mono);font-size:9.5px;letter-spacing:.22em;color:rgb(var(--pg))}
.banner h1{margin:10px 0 0;font-size:40px;line-height:1.05;letter-spacing:-.04em;font-weight:600;color:var(--text)}
.banner h1 em{font-family:var(--serif);font-style:italic;font-weight:400;color:rgb(var(--pg))}
.banner p{margin:12px 0 0;font-size:13.5px;line-height:1.65;color:#bcc9db;max-width:560px}
.banner .glyph{position:absolute;right:48px;top:50%;width:76px;height:76px;transform:translateY(-50%) rotateX(calc(14deg + var(--gx,0deg))) rotateY(calc(-16deg + var(--gy,0deg)));transform-style:preserve-3d;display:grid;place-items:center;border-radius:14px;color:rgb(var(--pg));
  background:linear-gradient(150deg,rgba(27,44,69,.95),rgba(13,23,42,.95));border:1px solid rgba(var(--pg),.55);
  box-shadow:0 0 0 1px rgba(255,255,255,.04) inset,0 30px 50px -18px rgba(0,0,0,.9),0 0 40px -10px rgba(var(--pg),.5);animation:float 6s ease-in-out infinite}
.banner-water{position:absolute;left:0;right:0;bottom:-6px;z-index:1;opacity:.75}
.banner .glyph-vox{position:absolute;right:140px;top:26px;perspective:500px;animation:float2 7s ease-in-out infinite;z-index:2}
@keyframes float2{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
.banner .glyph::after{content:"";position:absolute;inset:8px;border-radius:8px;border:1px dashed rgba(var(--pg),.35)}
.topline{display:grid;grid-template-columns:auto minmax(0,1fr) 220px auto;align-items:center;gap:26px;padding:6px 4px 18px;margin-bottom:8px;border-bottom:1px solid var(--line)}
.tl-id{display:flex;align-items:center;gap:14px}
.tl-id .tl-vox{perspective:400px;display:grid;place-items:center;width:34px;height:34px}
.tl-id .tl-vox .vox{--vc:var(--pg)}
.tl-id small{font:9.5px var(--mono);letter-spacing:.22em;color:rgb(var(--pg))}
.tl-id b{display:block;font-size:30px;line-height:1;letter-spacing:-.04em;font-weight:600;color:var(--text)}
.topline p{margin:0;font-size:12.5px;line-height:1.6;color:#aebed3;max-width:560px}
.tl-dots{display:flex;gap:5px}.tl-dots i{flex:1;height:3px;border-radius:2px;background:rgba(var(--pg),.2)}.tl-dots i.on{background:rgb(var(--pg));box-shadow:0 0 12px rgba(var(--pg),.7)}
.tl-nav{display:flex;gap:8px}
/* generic transaction fx */
.coin{position:absolute;z-index:9;pointer-events:none;perspective:600px}
.coin .vox{--vs:20px;--vc:223,195,140}
@keyframes shake{0%,100%{translate:0 0}20%{translate:-6px 0}40%{translate:6px 0}60%{translate:-4px 0}80%{translate:4px 0}}
@keyframes dropIn{0%{opacity:0;transform:translateY(-60px) scale(.9)}60%{opacity:1;transform:translateY(6px)}100%{transform:none}}
@keyframes popIn{0%{opacity:0;transform:translateY(-14px) scale(.96)}100%{opacity:1;transform:none}}
@keyframes burst{0%{opacity:1;transform:translate(0,0) scale(1)}100%{opacity:0;transform:translate(var(--bx),var(--by)) scale(.4) rotate(120deg)}}
.burst{position:absolute;inset:0;pointer-events:none}
.burst i{position:absolute;left:50%;top:50%;width:8px;height:8px;background:var(--gold);box-shadow:0 0 10px var(--gold);animation:burst .9s var(--ease) both}
/* ---------- surfaces ---------- */
.panel{position:relative;background:linear-gradient(180deg,rgba(23,36,58,.55),rgba(18,28,48,.9)),var(--surface);border:1px solid var(--line-strong);border-radius:14px;box-shadow:var(--sh-2),8px 8px 0 -1px rgba(var(--pg),.13),8px 8px 0 0 rgba(var(--pg),.22);transform-style:preserve-3d;perspective:1400px;transition:transform .5s var(--ease),box-shadow .5s var(--ease),border-color .3s}
.panel:hover{transform:translateY(-3px);box-shadow:var(--sh-3),10px 10px 0 -1px rgba(var(--pg),.16),10px 10px 0 0 rgba(var(--pg),.3);border-color:#69788c}
.panel::before{content:"";position:absolute;left:24px;right:24px;top:0;height:1px;background:linear-gradient(90deg,transparent,rgba(var(--pg),.55),transparent);pointer-events:none}
.panel-3d{transform-style:preserve-3d;transition:transform .5s var(--ease),box-shadow .5s var(--ease),border-color .3s}
.panel-3d:hover{transform:translateY(-4px) rotateX(1.2deg);box-shadow:var(--sh-3),10px 10px 0 -1px rgba(var(--pg),.16),10px 10px 0 0 rgba(var(--pg),.3);border-color:#69788c}
.ph{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px 22px;border-bottom:1px solid var(--line)}
.ph h3{margin:0;font-size:14px;font-weight:600;color:var(--text)}
.ph .eyebrow{font-family:var(--mono);font-size:9px;letter-spacing:.2em;color:var(--gold)}
.pb{padding:20px 22px}
.inset{background:var(--inset);border:1px solid var(--line);border-radius:10px;box-shadow:inset 0 2px 8px rgba(0,0,0,.45)}
.chip{display:inline-flex;align-items:center;gap:6px;height:22px;padding:0 9px;border-radius:5px;font-family:var(--mono);font-size:10px;letter-spacing:.08em;border:1px solid}
.chip-ok{color:var(--ok);background:rgba(133,219,192,.1);border-color:rgba(133,219,192,.4)}
.chip-bad{color:var(--bad);background:rgba(255,147,164,.1);border-color:rgba(255,147,164,.4)}
.chip-gold{color:var(--gold-hi);background:rgba(223,195,140,.1);border-color:rgba(223,195,140,.4)}
.chip-info{color:var(--info);background:rgba(141,204,237,.1);border-color:rgba(141,204,237,.4)}
.chip-dim{color:var(--muted);background:rgba(159,173,195,.08);border-color:rgba(159,173,195,.3)}
.kv{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid rgba(45,59,83,.7);font-size:12.5px}
.kv:last-child{border-bottom:0}
.kv span{color:var(--text-2)}.kv b{font-family:var(--mono);font-weight:500;color:var(--gold-hi)}
.kv b.info{color:var(--info)}.kv b.ok{color:var(--ok)}.kv b.bad{color:var(--bad)}.kv b.warn{color:var(--warn)}
.bar{height:6px;border-radius:4px;background:rgba(255,255,255,.06);overflow:hidden;box-shadow:inset 0 1px 2px rgba(0,0,0,.6)}
.bar i{display:block;height:100%;border-radius:4px;background:linear-gradient(90deg,#8dcced,#85dbc0 60%,#dfc38c);box-shadow:0 0 12px rgba(133,219,192,.6);position:relative;overflow:hidden}
.bar i::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.5),transparent);animation:shimmer 2.8s linear infinite}
.bar.bad i{background:linear-gradient(90deg,#ff93a4,#f1c678);box-shadow:0 0 12px rgba(255,147,164,.6)}
.field{display:block;font-size:11.5px;color:var(--text-2);margin-bottom:14px}
.field .in{display:flex;align-items:center;height:42px;margin-top:7px;padding:0 14px;border-radius:8px;color:var(--text);font-family:var(--mono);font-size:13px;background:var(--inset);border:1px solid #3a4a65;box-shadow:inset 0 2px 8px rgba(0,0,0,.5)}
.field .in.focus{border-color:var(--gold);box-shadow:inset 0 2px 8px rgba(0,0,0,.5),0 0 0 3px rgba(223,195,140,.18)}
.field .in .caret{width:1px;height:16px;background:var(--gold-hi);margin-left:2px;animation:blink 1s steps(1) infinite}
.pill-row{display:flex;flex-wrap:wrap;gap:8px}
.pill{height:34px;padding:0 14px;border-radius:7px;display:inline-flex;align-items:center;gap:8px;font-family:var(--mono);font-size:11.5px;color:#b8c5d8;background:rgba(23,36,58,.8);border:1px solid #34435c;box-shadow:var(--sh-1);transition:all .22s var(--ease)}
.pill:hover{transform:translateY(-1px);border-color:#69788c;color:var(--gold-hi)}
.pill:active,.mint:active,.tool:active,.step:active,.dur button:active{transform:translateY(2px) scale(.98);transition-duration:.06s}
.pill[aria-pressed="true"]{color:var(--gold-hi);background:rgba(223,195,140,.1);border-color:#d9bb81;box-shadow:0 0 18px -6px rgba(223,195,140,.6),var(--sh-1)}
.eyebrow{display:flex;align-items:center;gap:10px;font-family:var(--mono);font-size:9.5px;letter-spacing:.22em;color:var(--gold)}
.eyebrow::before{content:"";width:22px;height:1px;background:var(--gold)}
.h2{margin:14px 0 0;font-size:38px;line-height:1.1;letter-spacing:-.045em;font-weight:500;color:var(--text)}
.h2 em{font-family:var(--serif);font-style:italic;font-weight:400;color:var(--gold)}
.lede{color:#aebed3;font-size:13.5px;line-height:1.8;max-width:520px}
/* ---------- gates component (3 sizes) ---------- */
.gate{position:relative;display:flex;flex-direction:column;justify-content:space-between;gap:10px;padding:12px 10px;border-radius:9px;text-align:left;color:#c4cddd;
  background:linear-gradient(160deg,#1b2c45,#111d31);border:1px solid var(--line-strong);transform-style:preserve-3d;
  box-shadow:0 1px 0 rgba(255,255,255,.06) inset,0 12px 24px -12px rgba(0,0,0,.9);transition:transform .45s var(--ease),box-shadow .45s var(--ease),border-color .3s}
.gate .gi{font-family:var(--mono);font-size:11px;color:var(--gold)}
.gate .gl{font-size:11px;line-height:1.3;color:#c4cddd}
.gate .gc{font-family:var(--mono);font-size:8.5px;letter-spacing:.06em;color:var(--dim);word-break:break-all}
.gate .gs{position:absolute;top:10px;right:10px;width:16px;height:16px;border-radius:50%;border:1px solid var(--line-strong);display:grid;place-items:center}
.gate[data-state="passed"]{border-color:rgba(133,219,192,.55);color:var(--ok);background:linear-gradient(160deg,rgba(133,219,192,.14),#111d31)}
.gate[data-state="passed"] .gs{border-color:var(--ok);background:rgba(133,219,192,.15);box-shadow:0 0 12px rgba(133,219,192,.6)}
.gate[data-state="blocked"]{border-color:rgba(255,147,164,.7);color:var(--bad);background:linear-gradient(160deg,rgba(255,147,164,.18),#111d31);box-shadow:0 0 0 1px rgba(255,147,164,.3),0 0 30px -6px rgba(255,147,164,.7),0 18px 30px -14px rgba(0,0,0,.9);transform:translateZ(18px) scale(1.04)}
.gate[data-state="blocked"] .gs{border-color:var(--bad);background:rgba(255,147,164,.2);box-shadow:0 0 12px rgba(255,147,164,.7)}
.gate[data-state="skipped"]{opacity:.45}
.gate[data-state="idle"]:hover{transform:translateZ(14px) translateY(-3px);border-color:rgba(223,195,140,.6);box-shadow:0 0 0 1px rgba(223,195,140,.2),0 22px 36px -14px rgba(0,0,0,.95)}
.gate-badge{display:inline-flex;align-items:center;gap:6px;height:22px;padding:0 8px;border-radius:5px;font-family:var(--mono);font-size:10px;letter-spacing:.06em;border:1px solid}
.gate-badge i{display:inline-grid;place-items:center;width:14px;height:14px;font-size:8px;border-radius:3px;transform:skewY(-8deg);background:rgba(255,255,255,.06)}
.gate-badge.ok{color:var(--ok);border-color:rgba(133,219,192,.45);background:rgba(133,219,192,.08)}
.gate-badge.bad{color:var(--bad);border-color:rgba(255,147,164,.5);background:rgba(255,147,164,.1)}
.gate-dots{display:flex;gap:4px}
.gate-dots i{width:18px;height:20px;display:grid;place-items:center;font-family:var(--mono);font-size:9px;border-radius:3px;border:1px solid var(--line-strong);color:var(--muted);transform:skewY(-8deg)}
.gate-dots i.ok{color:var(--ok);border-color:rgba(133,219,192,.5);background:rgba(133,219,192,.1)}
.gate-dots i.bad{color:var(--bad);border-color:rgba(255,147,164,.6);background:rgba(255,147,164,.14);box-shadow:0 0 10px rgba(255,147,164,.5)}
.kv,.log-row,.tbl-row,.rank,.arow,.grant,.dest,.mint,.step{transition:transform .35s var(--ease),background .25s,box-shadow .35s var(--ease)}
.log-row:hover,.tbl-row:hover,.rank:hover,.grant:hover{transform:translateZ(14px) translateX(4px)}
.inset,.fact,.stat,.hash{transform:translateZ(-6px)}
/* ---------- 3D motifs: voxel · chain · water · pixel shards ---------- */
.vox{position:relative;width:var(--vs,56px);height:var(--vs,56px);transform-style:preserve-3d;transform:rotateX(-26deg) rotateY(42deg);--vc:223,195,140}
.vox i{position:absolute;inset:0;border:1px solid rgba(var(--vc),.55);background:linear-gradient(160deg,rgba(var(--vc),.32),rgba(var(--vc),.08));box-shadow:inset 0 0 18px rgba(var(--vc),.12)}
.vox .f{transform:translateZ(calc(var(--vs,56px) / 2))}
.vox .r{transform:rotateY(90deg) translateZ(calc(var(--vs,56px) / 2));background:linear-gradient(160deg,rgba(var(--vc),.14),rgba(var(--vc),.04))}
.vox .t{transform:rotateX(90deg) translateZ(calc(var(--vs,56px) / 2));background:linear-gradient(160deg,rgba(var(--vc),.5),rgba(var(--vc),.2))}
.vox .lb{position:absolute;inset:0;display:grid;place-items:center;transform:translateZ(calc(var(--vs,56px) / 2 + 1px));font:10px var(--mono);color:rgb(var(--vc));text-shadow:0 0 10px rgba(var(--vc),.8)}
.vox-ok{--vc:133,219,192}.vox-bad{--vc:255,147,164}.vox-info{--vc:141,204,237}
.vox-shadow{position:absolute;left:50%;bottom:-18px;width:120%;height:14px;transform:translateX(-50%);border-radius:50%;background:radial-gradient(ellipse,rgba(0,0,0,.7),transparent 70%);filter:blur(3px)}
.chain{display:flex;align-items:center;gap:0;transform-style:preserve-3d}
.chain i{width:30px;height:14px;border:2px solid rgba(223,195,140,.85);border-radius:8px;flex:none;margin-right:-8px;box-shadow:0 0 10px rgba(223,195,140,.25),inset 0 0 6px rgba(223,195,140,.15);animation:chainGlow 3.2s ease-in-out infinite;animation-delay:calc(var(--k,0) * .18s)}
.chain i:nth-child(even){transform:rotateX(72deg);border-color:rgba(141,204,237,.8)}
@keyframes chainGlow{0%,100%{box-shadow:0 0 6px rgba(223,195,140,.15)}50%{box-shadow:0 0 18px rgba(223,195,140,.85),0 0 30px rgba(223,195,140,.35)}}
.water{position:relative;display:block;width:100%;height:var(--wh,90px);overflow:hidden;pointer-events:none}
.water svg{position:absolute;left:0;top:0;width:200%;height:100%}
.water .w1{animation:flow 14s linear infinite}.water .w2{animation:flow 22s linear infinite reverse;opacity:.6}.water .w3{animation:flow 9s linear infinite;opacity:.35}
@keyframes flow{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.spine-flow{position:absolute;left:50%;width:2px;margin-left:-1px;background:repeating-linear-gradient(180deg,rgba(141,204,237,0) 0 18px,rgba(141,204,237,.9) 18px 30px,rgba(223,195,140,.9) 30px 40px,rgba(141,204,237,0) 40px 64px);background-size:100% 64px;animation:spineRun 1.6s linear infinite;filter:drop-shadow(0 0 8px rgba(141,204,237,.6));opacity:.55;pointer-events:none}
@keyframes spineRun{from{background-position:0 0}to{background-position:0 64px}}
.shards{position:absolute;inset:0;pointer-events:none;transform-style:preserve-3d}
.shard{position:absolute;width:var(--sz,10px);height:var(--sz,10px);background:rgba(var(--sc,223,195,140),.85);box-shadow:0 0 14px rgba(var(--sc,223,195,140),.7),4px 4px 0 rgba(0,0,0,.55);animation:shardFloat var(--dur,7s) ease-in-out infinite alternate;animation-delay:var(--dl,0s);transform:translateZ(var(--z,0px))}
@keyframes shardFloat{from{translate:0 0}to{translate:var(--dx,6px) var(--dy,-14px)}}
/* ---------- motion ---------- */
.rise{animation:rise .9s var(--ease) both;animation-delay:calc(var(--i,0) * 90ms)}
@keyframes rise{from{opacity:0;transform:translateY(22px);filter:blur(6px)}to{opacity:1;transform:none;filter:blur(0)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
@keyframes shimmer{from{transform:translateX(-100%)}to{transform:translateX(100%)}}
@keyframes float{0%,100%{translate:0 0}50%{translate:0 -8px}}
@keyframes drift{from{transform:scale(1.04) translateX(0)}to{transform:scale(1.08) translateX(-14px)}}
@keyframes blink{50%{opacity:0}}
@keyframes travel{0%{left:-6%;opacity:0}8%{opacity:1}92%{opacity:1}100%{left:104%;opacity:0}}
@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}
"""

FONT_LINK = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&amp;family=JetBrains+Mono:wght@400;500;600&amp;display=swap">'

NAV = ["Protocol", "Marketplace", "Agents", "Guardrails", "Treasury", "Audit", "Analytics", "Copilot", "Models", "Settings"]

# Route accents (rgb triplets) borrowed from the per-route identity layer.
PG = {
    "protocol": "223,195,140", "agents": "14,145,205", "analytics": "124,92,231", "marketplace": "214,64,142",
    "treasury": "13,155,116", "audit": "196,124,14", "guardrails": "214,68,96", "settings": "96,116,142",
}

def svg(name, size=14, color="currentColor", sw=1.6):
    paths = {
        "shield": '<path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3z"/><path d="M9 12l2 2 4-4"/>',
        "search": '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4-4"/>',
        "sound": '<path d="M4 10v4h3l4 3V7L7 10H4z"/><path d="M16 9a4 4 0 010 6"/>',
        "wallet": '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><circle cx="16.5" cy="14.5" r="1"/>',
        "arrow": '<path d="M5 12h14M13 6l6 6-6 6"/>',
        "arrowl": '<path d="M19 12H5M11 6l-6 6 6 6"/>',
        "arrowur": '<path d="M7 17L17 7M8 7h9v9"/>',
        "check": '<path d="M5 12l4 4L19 7"/>',
        "x": '<path d="M6 6l12 12M18 6L6 18"/>',
        "layers": '<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/><path d="M3 17l9 5 9-5"/>',
        "scroll": '<path d="M6 4h10a2 2 0 012 2v12a2 2 0 002 2H8a2 2 0 01-2-2V4z"/><path d="M6 4a2 2 0 00-2 2v2h2"/><path d="M10 9h6M10 13h6"/>',
        "bot": '<rect x="4" y="8" width="16" height="11" rx="3"/><path d="M12 4v4"/><circle cx="9" cy="13" r="1.2"/><circle cx="15" cy="13" r="1.2"/>',
        "globe": '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18"/>',
        "chart": '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
        "gear": '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/>',
        "flask": '<path d="M9 3h6M10 3v6l-5 9a2 2 0 001.8 3h10.4a2 2 0 001.8-3l-5-9V3"/>',
        "clock": '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
        "key": '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M15 5l3 3M18 8l2-2"/>',
        "lock": '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
        "refresh": '<path d="M20 12a8 8 0 01-14 5M4 12a8 8 0 0114-5"/><path d="M4 4v5h5M20 20v-5h-5"/>',
        "dl": '<path d="M12 4v11M7 10l5 5 5-5M4 20h16"/>',
        "up": '<path d="M12 20V9M7 14l5-5 5 5M4 4h16"/>',
        "ext": '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5"/>',
        "copy": '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a1 1 0 011-1h10"/>',
        "menu": '<path d="M4 7h16M4 12h16M4 17h16"/>',
        "play": '<path d="M7 5v14l11-7z"/>',
        "zap": '<path d="M13 3L4 14h7l-1 7 9-11h-7l1-7z"/>',
        "plus": '<path d="M12 5v14M5 12h14"/>',
        "chev": '<path d="M9 6l6 6-6 6"/>',
        "chevd": '<path d="M6 9l6 6 6-6"/>',
        "eye": '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
        "spark": '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z"/>',
        "book": '<path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2V5z"/><path d="M4 19a2 2 0 012-2h13"/>',
        "sun": '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/>',
    }
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="{sw}" '
            f'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{paths[name]}</svg>')

def water(h=90, colors=("141,204,237", "223,195,140", "133,219,192"), cls=""):
    """Three layered wave bands that slide at different speeds - reads as flowing water."""
    def wave(amp, y, col, k):
        # a seamless 2-period wave path over a 0..2000 box (the svg is 200% wide and slides -50%)
        pts = []
        for x in range(0, 2001, 50):
            import math
            pts.append(f"{x},{y + amp * math.sin((x / 2000) * math.pi * 8 + k):.1f}")
        return (f'<path class="w{k+1}" d="M{pts[0]} L{" L".join(pts[1:])} L2000,200 L0,200 Z" '
                f'fill="url(#wg{k})"></path>')
    defs = "".join(
        f'<linearGradient id="wg{i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color: rgb({c}); stop-opacity: .55"></stop><stop offset="1" style="stop-color: rgb({c}); stop-opacity: 0"></stop></linearGradient>'
        for i, c in enumerate(colors))
    paths = wave(18, 70, colors[0], 0) + wave(12, 92, colors[1], 1) + wave(24, 110, colors[2], 2)
    return (f'<div class="water {cls}" style="--wh: {h}px" aria-hidden="true">'
            f'<svg viewBox="0 0 2000 200" preserveAspectRatio="none"><defs>{defs}</defs>{paths}</svg></div>')

def vox(label="", cls="", size=56, shadow=True):
    lb = f'<span class="lb">{label}</span>' if label else ""
    sh = '<span class="vox-shadow"></span>' if shadow else ""
    return f'<div class="vox {cls}" style="--vs: {size}px"><i class="r"></i><i class="t"></i><i class="f"></i>{lb}{sh}</div>'

def chain(n=6):
    return '<div class="chain">' + "".join(f'<i style="--k: {k}"></i>' for k in range(n)) + '</div>'

def shards(spec):
    """spec: list of (left%, top%, size, color, z, dur, delay)."""
    out = []
    for (l, t, sz, col, z, dur, dl) in spec:
        out.append(f'<span class="shard" style="left: {l}%; top: {t}%; --sz: {sz}px; --sc: {col}; --z: {z}px; --dur: {dur}s; --dl: {dl}s; --dx: {(-1)**len(out) * 8}px; --dy: {-10 - sz}px"></span>')
    return f'<div class="shards">{"".join(out)}</div>'

def header(active):
    cur = ' aria-current="page"'
    items = "".join(
        f'<button type="button"{cur if n == active else ""}>{n}</button>' for n in NAV)
    return f'''
<header class="hdr">
  <div class="brand"><span class="emblem">{svg("shield", 16)}</span>REDLINE</div>
  <nav class="nav" aria-label="Primary navigation">{items}</nav>
  <div class="tools">
    <button type="button" class="tool">{svg("search", 13)}Find <kbd>⌘K</kbd></button>
    <button type="button" class="tool">{svg("sound", 13)}Sound off</button>
    <span class="netpill"><i></i>DEVNET</span>
    <button type="button" class="btn btn-gold" style="height: 36px">{svg("wallet", 14, "#101827")}8xkA…p2Qe {svg("chevd", 12, "#101827")}</button>
    <button type="button" class="avatar-btn"{' aria-current="page"' if active == "Profile" else ''}><span class="av-vox">{vox("", "", 16, False)}</span></button>
  </div>
</header>'''

def journey(idx, name, prev, nxt, total=8):
    dashes = "".join(f'<i class="{"on" if i <= idx else ""}"></i>' for i in range(1, total + 1))
    return f'''
<div class="journey rise" style="--i: 0">
  <button type="button" class="jbtn">{svg("arrowl", 12)}<span><small>RETURN TO</small>Protocol</span></button>
  <div class="jtitle"><span><small>PRODUCT JOURNEY</small><span class="idx">0{idx}</span> <b>{name}</b></span></div>
  <div class="jtrack">{dashes}</div>
  <button type="button" class="jbtn">{svg("arrowl", 12)}<span><small>PREVIOUS</small>{prev}</span></button>
  <button type="button" class="jbtn"><span><small>NEXT</small>{nxt}</span>{svg("arrow", 12)}</button>
</div>'''

def topline(idx, name, prev, nxt, blurb, total=11):
    dots = "".join(f'<i class="{"on" if i <= idx else ""}"></i>' for i in range(1, total + 1))
    return f'''
<div class="topline rise" style="--i: 0">
  <div class="tl-id"><span class="tl-vox">{vox("", "", 18, False)}</span><small>{idx:02d} / {total:02d}</small><b>{name}</b></div>
  <p>{blurb}</p>
  <div class="tl-dots">{dots}</div>
  <div class="tl-nav"><button type="button" class="jbtn">{svg("arrowl", 12)}<span><small>PREV</small>{prev}</span></button><button type="button" class="jbtn"><span><small>NEXT</small>{nxt}</span>{svg("arrow", 12)}</button></div>
</div>'''

def banner(img, eyebrow, title_html, lede, glyph):
    far = shards([(52, 18, 6, "var(--pg)", 0, 9, 0), (61, 62, 9, "var(--pg)", 0, 7, 1), (72, 30, 5, "141,204,237", 0, 8, .4)])
    near = shards([(80, 70, 7, "var(--pg)", 0, 10, 1.6), (90, 22, 6, "133,219,192", 0, 6, .8), (66, 78, 10, "var(--pg)", 0, 8, .2)])
    return f'''
<section class="banner rise" style="--i: 1; --gx: {{{{ gx }}}}deg; --gy: {{{{ gy }}}}deg">
  <img src="{img}" alt="" style="transform: scale(1.06) translate({{{{ bx }}}}px, {{{{ by }}}}px)">
  <div class="wash"></div>
  <span class="corner tl"></span><span class="corner br"></span>
  <div class="plx" style="transform: translate({{{{ px1 }}}}px, {{{{ py1 }}}}px)">{far}</div>
  <div class="plx" style="transform: translate({{{{ px2 }}}}px, {{{{ py2 }}}}px)">{near}</div>
  <div class="copy">
    <div class="eyebrow">{eyebrow}</div>
    <h1>{title_html}</h1>
    <p>{lede}</p>
  </div>
  <div class="banner-water">{water(70, ("141,204,237", "var(--pg)", "133,219,192"))}</div>
  <div class="cluster" style="transform: translate({{{{ px2 }}}}px, {{{{ py2 }}}}px) rotateX({{{{ gx }}}}deg) rotateY({{{{ gy }}}}deg)">{vox("", "", 30)}{vox("", "", 20, False)}{vox("", "", 24, False)}</div>
  <div class="glyph">{svg(glyph, 30)}</div>
</section>'''

PARALLAX_MIXIN = r"""class Base extends DCLogic {
  plx() {
    const s = this.state || {}; const tx = s.ptx || 0, ty = s.pty || 0;
    return { gx: -tx * 10, gy: ty * 14, bx: -ty * 6, by: -tx * 6, px1: ty * 8, py1: -tx * 8, px2: ty * 18, py2: -tx * 18,
      onMove: (e) => { const r = e.currentTarget.getBoundingClientRect(); this.setState({ ptx: (e.clientY - r.top) / r.height - .5, pty: (e.clientX - r.left) / r.width - .5 }); },
      onLeave: () => this.setState({ ptx: 0, pty: 0 }) };
  }
}
class Component extends Base {"""

def with_parallax(script):
    """Give every artboard the banner-parallax bindings: inject a Base class and spread its values into renderVals()."""
    if script is None:
        return None
    if "class Component extends DCLogic {}" in script:
        return script.replace("class Component extends DCLogic {}", PARALLAX_MIXIN + " constructor(p){ super(p); this.state = {}; } renderVals() { return { ...this.plx() }; } }")
    out = script.replace("return {", "return { ...this.plx(),", 1)   # first return is renderVals()'s
    return out.replace("class Component extends DCLogic {", PARALLAX_MIXIN, 1)

def wrap(body, css_extra="", script=None, pg="223,195,140", extra_head=""):
    scr = with_parallax(script) or ""
    return f'''<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  {FONT_LINK}
  <style>{CSS}
  .app{{--pg:{pg}}}
  {css_extra}</style>
</helmet>
{body}
</x-dc>
{scr}
</body>
</html>
'''
