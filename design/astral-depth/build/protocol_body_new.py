CSS_X2 = r"""
/* ---- multi-layer parallax in the hero ---- */
.plx{position:absolute;inset:0;z-index:2;pointer-events:none;transform-style:preserve-3d;transition:transform .5s var(--ease)}
.plx.l1{--m:.4}.plx.l2{--m:1}.plx.l3{--m:1.8}
.isle{position:absolute;display:flex;gap:2px;align-items:flex-end;transform-style:preserve-3d;perspective:900px}
.isle .vox{margin-right:-14px}
.hero .water{position:absolute;left:0;right:0;bottom:-2px;z-index:5;--wh:150px}
.proposal{position:absolute;bottom:34px;z-index:6;animation:ride 16s linear infinite;animation-delay:var(--dl,0s);opacity:0;perspective:700px}
.proposal .vox{--vs:22px;animation:bob 2.4s ease-in-out infinite}
@keyframes ride{0%{left:-4%;opacity:0}5%{opacity:1}95%{opacity:1}100%{left:102%;opacity:0}}
@keyframes bob{0%,100%{transform:rotateX(-26deg) rotateY(42deg) translateY(0)}50%{transform:rotateX(-26deg) rotateY(42deg) translateY(-7px)}}
/* ---- continuous spine ---- */
.story{position:relative}
.hero .scrollcue,.hero .edition{bottom:176px;z-index:7}
.story > .sec{position:relative;z-index:1}
.divider{position:relative;margin:64px -96px 0;height:120px}
.divider .water{--wh:120px}
.divider .caption-mid{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:flex;align-items:center;gap:18px;padding:10px 18px;border-radius:999px;font:9.5px var(--mono);letter-spacing:.22em;color:var(--gold);background:rgba(8,13,25,.85);border:1px solid rgba(223,195,140,.35);box-shadow:var(--sh-2)}
/* ---- story rail: extruded gate slabs, chain connectors, sequenced proposal ---- */
.rail{transform:rotateX(3deg)}
.rail .flow{display:flex;align-items:stretch;gap:0;position:relative;margin-top:26px;height:172px;transform-style:preserve-3d}
.rail .flow > *{flex:none}
.ep{width:96px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;border-radius:12px;font:9.5px var(--mono);letter-spacing:.2em;color:var(--gold);background:linear-gradient(160deg,#1b2c45,#101b30);border:1px solid var(--line-strong);box-shadow:var(--sh-1);position:relative;perspective:600px}
.ep.vault{color:var(--ok);border-color:rgba(133,219,192,.5);animation:vaultGlow 24s linear infinite}
.ep.agent{animation:agentGlow 24s linear infinite}
@keyframes vaultGlow{0%,33%{box-shadow:var(--sh-1)}35%,40%{box-shadow:0 0 0 1px rgba(133,219,192,.4),0 0 40px -4px rgba(133,219,192,.8)}44%,100%{box-shadow:var(--sh-1)}}
@keyframes agentGlow{0%,2%{box-shadow:0 0 30px -6px rgba(141,204,237,.8)}6%,50%{box-shadow:var(--sh-1)}52%{box-shadow:0 0 30px -6px rgba(141,204,237,.8)}56%,100%{box-shadow:var(--sh-1)}}
.ep .vox{--vs:28px}
.lnk{width:34px;display:grid;place-items:center;position:relative}
.lnk svg{width:34px;height:22px;overflow:visible}
.lnk svg rect{fill:none;stroke:rgba(223,195,140,.7);stroke-width:1.6}
.lnk svg rect.b{stroke:rgba(141,204,237,.75)}
.lnk::after{content:"";position:absolute;left:0;right:0;top:50%;height:1px;background:rgba(223,195,140,.18);z-index:-1}
.g3{width:104px;position:relative;transform-style:preserve-3d}
.g3 .front{position:absolute;inset:10px 0 0 0;border-radius:8px 8px 10px 10px;border:1px solid;padding:12px 10px 10px;display:flex;flex-direction:column;justify-content:space-between;transition:transform .45s var(--ease)}
.g3 .front::before{content:"";position:absolute;left:5px;right:-5px;top:-10px;height:10px;border-radius:4px 4px 0 0;background:linear-gradient(90deg,rgba(255,255,255,.14),rgba(255,255,255,.06));border:1px solid rgba(255,255,255,.12);border-bottom:0;transform:skewX(-45deg)}
.g3 .front::after{content:"";position:absolute;right:-10px;top:-5px;bottom:5px;width:10px;border-radius:0 4px 4px 0;background:rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.08);border-left:0;transform:skewY(-45deg)}
.g3 .gi{font:600 20px var(--mono);letter-spacing:-.02em;color:inherit;opacity:.95}
.g3 .gl{font-size:11px;line-height:1.3;color:var(--text)}
.g3 .gc{font:8.5px var(--mono);letter-spacing:.04em;color:var(--muted);word-break:break-all;margin-top:4px}
.g3 .gs{position:absolute;top:10px;right:10px;width:16px;height:16px;border-radius:50%;border:1px solid currentColor;opacity:.8}
.g3:hover .front{transform:translateZ(18px) translateY(-4px)}
.g3 .front{border-color:#43516a;background:linear-gradient(160deg,#1b2c45,#101b30);box-shadow:0 1px 0 rgba(255,255,255,.06) inset,0 14px 26px -14px rgba(0,0,0,.9);color:#c4cddd}
@keyframes gate0{0%,5%{border-color:#43516a;background:linear-gradient(160deg,#1b2c45,#101b30);box-shadow:0 1px 0 rgba(255,255,255,.06) inset,0 14px 26px -14px rgba(0,0,0,.9);color:#c4cddd}6%,42%{border-color:rgba(133,219,192,.75);background:linear-gradient(160deg,rgba(133,219,192,.22),#101b30);box-shadow:0 0 0 1px rgba(133,219,192,.25),0 0 28px -4px rgba(133,219,192,.55),0 14px 26px -14px rgba(0,0,0,.9);color:#85dbc0}46%,55%{border-color:#43516a;background:linear-gradient(160deg,#1b2c45,#101b30);box-shadow:0 1px 0 rgba(255,255,255,.06) inset,0 14px 26px -14px rgba(0,0,0,.9);color:#c4cddd}56%,88%{border-color:rgba(133,219,192,.75);background:linear-gradient(160deg,rgba(133,219,192,.22),#101b30);box-shadow:0 0 0 1px rgba(133,219,192,.25),0 0 28px -4px rgba(133,219,192,.55),0 14px 26px -14px rgba(0,0,0,.9);color:#85dbc0}92%,100%{border-color:#43516a;background:linear-gradient(160deg,#1b2c45,#101b30);box-shadow:0 1px 0 rgba(255,255,255,.06) inset,0 14px 26px -14px rgba(0,0,0,.9);color:#c4cddd}}
.g3.k0 .front{animation:gate0 24s linear infinite}
@keyframes gate1{0%,9%{border-color:#43516a;background:linear-gradient(160deg,#1b2c45,#101b30);box-shadow:0 1px 0 rgba(255,255,255,.06) inset,0 14px 26px -14px rgba(0,0,0,.9);color:#c4cddd}10%,42%{border-color:rgba(133,219,192,.75);background:linear-gradient(160deg,rgba(133,219,192,.22),#101b30);box-shadow:0 0 0 1px rgba(133,219,192,.25),0 0 28px -4px rgba(133,219,192,.55),0 14px 26px -14px rgba(0,0,0,.9);color:#85dbc0}46%,59%{border-color:#43516a;background:linear-gradient(160deg,#1b2c45,#101b30);box-shadow:0 1px 0 rgba(255,255,255,.06) inset,0 14px 26px -14px rgba(0,0,0,.9);color:#c4cddd}60%,88%{border-color:rgba(133,219,192,.75);background:linear-gradient(160deg,rgba(133,219,192,.22),#101b30);box-shadow:0 0 0 1px rgba(133,219,192,.25),0 0 28px -4px rgba(133,219,192,.55),0 14px 26px -14px rgba(0,0,0,.9);color:#85dbc0}92%,100%{border-color:#43516a;background:linear-gradient(160deg,#1b2c45,#101b30);box-shadow:0 1px 0 rgba(255,255,255,.06) inset,0 14px 26px -14px rgba(0,0,0,.9);color:#c4cddd}}
.g3.k1 .front{animation:gate1 24s linear infinite}
@keyframes gate2{0%,13%{border-color:#43516a;background:linear-gradient(160deg,#1b2c45,#101b30);box-shadow:0 1px 0 rgba(255,255,255,.06) inset,0 14px 26px -14px rgba(0,0,0,.9);color:#c4cddd}14%,42%{border-color:rgba(133,219,192,.75);background:linear-gradient(160deg,rgba(133,219,192,.22),#101b30);box-shadow:0 0 0 1px rgba(133,219,192,.25),0 0 28px -4px rgba(133,219,192,.55),0 14px 26px -14px rgba(0,0,0,.9);color:#85dbc0}46%,63%{border-color:#43516a;background:linear-gradient(160deg,#1b2c45,#101b30);box-shadow:0 1px 0 rgba(255,255,255,.06) inset,0 14px 26px -14px rgba(0,0,0,.9);color:#c4cddd}64%,88%{border-color:rgba(133,219,192,.75);background:linear-gradient(160deg,rgba(133,219,192,.22),#101b30);box-shadow:0 0 0 1px rgba(133,219,192,.25),0 0 28px -4px rgba(133,219,192,.55),0 14px 26px -14px rgba(0,0,0,.9);color:#85dbc0}92%,100%{border-color:#43516a;background:linear-gradient(160deg,#1b2c45,#101b30);box-shadow:0 1px 0 rgba(255,255,255,.06) inset,0 14px 26px -14px rgba(0,0,0,.9);color:#c4cddd}}
.g3.k2 .front{animation:gate2 24s linear infinite}
@keyframes gate3{0%,17%{border-color:#43516a;background:linear-gradient(160deg,#1b2c45,#101b30);box-shadow:0 1px 0 rgba(255,255,255,.06) inset,0 14px 26px -14px rgba(0,0,0,.9);color:#c4cddd}18%,42%{border-color:rgba(133,219,192,.75);background:linear-gradient(160deg,rgba(133,219,192,.22),#101b30);box-shadow:0 0 0 1px rgba(133,219,192,.25),0 0 28px -4px rgba(133,219,192,.55),0 14px 26px -14px rgba(0,0,0,.9);color:#85dbc0}46%,67%{border-color:#43516a;background:linear-gradient(160deg,#1b2c45,#101b30);box-shadow:0 1px 0 rgba(255,255,255,.06) inset,0 14px 26px -14px rgba(0,0,0,.9);color:#c4cddd}68%,88%{border-color:rgba(133,219,192,.75);background:linear-gradient(160deg,rgba(133,219,192,.22),#101b30);box-shadow:0 0 0 1px rgba(133,219,192,.25),0 0 28px -4px rgba(133,219,192,.55),0 14px 26px -14px rgba(0,0,0,.9);color:#85dbc0}92%,100%{border-color:#43516a;background:linear-gradient(160deg,#1b2c45,#101b30);box-shadow:0 1px 0 rgba(255,255,255,.06) inset,0 14px 26px -14px rgba(0,0,0,.9);color:#c4cddd}}
.g3.k3 .front{animation:gate3 24s linear infinite}
@keyframes gate4{0%,21%{border-color:#43516a;background:linear-gradient(160deg,#1b2c45,#101b30);box-shadow:0 1px 0 rgba(255,255,255,.06) inset,0 14px 26px -14px rgba(0,0,0,.9);color:#c4cddd}22%,42%{border-color:rgba(133,219,192,.75);background:linear-gradient(160deg,rgba(133,219,192,.22),#101b30);box-shadow:0 0 0 1px rgba(133,219,192,.25),0 0 28px -4px rgba(133,219,192,.55),0 14px 26px -14px rgba(0,0,0,.9);color:#85dbc0}46%,71%{border-color:#43516a;background:linear-gradient(160deg,#1b2c45,#101b30);box-shadow:0 1px 0 rgba(255,255,255,.06) inset,0 14px 26px -14px rgba(0,0,0,.9);color:#c4cddd}72%,88%{border-color:rgba(133,219,192,.75);background:linear-gradient(160deg,rgba(133,219,192,.22),#101b30);box-shadow:0 0 0 1px rgba(133,219,192,.25),0 0 28px -4px rgba(133,219,192,.55),0 14px 26px -14px rgba(0,0,0,.9);color:#85dbc0}92%,100%{border-color:#43516a;background:linear-gradient(160deg,#1b2c45,#101b30);box-shadow:0 1px 0 rgba(255,255,255,.06) inset,0 14px 26px -14px rgba(0,0,0,.9);color:#c4cddd}}
.g3.k4 .front{animation:gate4 24s linear infinite}
@keyframes gate5{0%,25%{border-color:#43516a;background:linear-gradient(160deg,#1b2c45,#101b30);box-shadow:0 1px 0 rgba(255,255,255,.06) inset,0 14px 26px -14px rgba(0,0,0,.9);color:#c4cddd}26%,42%{border-color:rgba(133,219,192,.75);background:linear-gradient(160deg,rgba(133,219,192,.22),#101b30);box-shadow:0 0 0 1px rgba(133,219,192,.25),0 0 28px -4px rgba(133,219,192,.55),0 14px 26px -14px rgba(0,0,0,.9);color:#85dbc0}46%,75%{border-color:#43516a;background:linear-gradient(160deg,#1b2c45,#101b30);box-shadow:0 1px 0 rgba(255,255,255,.06) inset,0 14px 26px -14px rgba(0,0,0,.9);color:#c4cddd}76%,77%{border-color:rgba(133,219,192,.75);background:linear-gradient(160deg,rgba(133,219,192,.22),#101b30);box-shadow:0 0 0 1px rgba(133,219,192,.25),0 0 28px -4px rgba(133,219,192,.55),0 14px 26px -14px rgba(0,0,0,.9);color:#85dbc0}78%,88%{border-color:rgba(255,147,164,.85);background:linear-gradient(160deg,rgba(255,147,164,.26),#101b30);box-shadow:0 0 0 1px rgba(255,147,164,.35),0 0 36px -2px rgba(255,147,164,.75),0 14px 26px -14px rgba(0,0,0,.9);color:#ff93a4}92%,100%{border-color:#43516a;background:linear-gradient(160deg,#1b2c45,#101b30);box-shadow:0 1px 0 rgba(255,255,255,.06) inset,0 14px 26px -14px rgba(0,0,0,.9);color:#c4cddd}}
.g3.k5 .front{animation:gate5 24s linear infinite}
@keyframes gate6{0%,29%{border-color:#43516a;background:linear-gradient(160deg,#1b2c45,#101b30);box-shadow:0 1px 0 rgba(255,255,255,.06) inset,0 14px 26px -14px rgba(0,0,0,.9);color:#c4cddd}30%,42%{border-color:rgba(133,219,192,.75);background:linear-gradient(160deg,rgba(133,219,192,.22),#101b30);box-shadow:0 0 0 1px rgba(133,219,192,.25),0 0 28px -4px rgba(133,219,192,.55),0 14px 26px -14px rgba(0,0,0,.9);color:#85dbc0}46%,79%{border-color:#43516a;background:linear-gradient(160deg,#1b2c45,#101b30);box-shadow:0 1px 0 rgba(255,255,255,.06) inset,0 14px 26px -14px rgba(0,0,0,.9);color:#c4cddd}80%,100%{border-color:#43516a;background:linear-gradient(160deg,#1b2c45,#101b30);box-shadow:0 1px 0 rgba(255,255,255,.06) inset,0 14px 26px -14px rgba(0,0,0,.9);color:#c4cddd}}
.g3.k6 .front{animation:gate6 24s linear infinite}
.runner{position:absolute;top:-30px;left:4%;z-index:5;perspective:700px;transform:translateX(-50%);animation:runner 24s ease-in-out infinite}
.runner .vox{--vs:26px;--vc:141,204,237}
@keyframes runner{0%{left:4%;opacity:0}3%{left:4%;opacity:1}6%{left:15.3%}10%{left:26.8%}14%{left:38.4%}18%{left:50.0%}22%{left:61.6%}26%{left:73.2%}30%{left:84.7%}34%{left:96%;filter:drop-shadow(0 0 16px rgba(133,219,192,.95))}38%{left:96%;opacity:0;filter:drop-shadow(0 0 16px rgba(133,219,192,.95))}49.9%{left:4%;opacity:0;filter:none}50%{left:4%;opacity:0}53%{left:4%;opacity:1}56%{left:15.3%}60%{left:26.8%}64%{left:38.4%}68%{left:50.0%}72%{left:61.6%}76%{left:73.2%}78%{left:74.4%;filter:drop-shadow(0 0 16px rgba(255,147,164,.95))}79%{left:72.2%}80%{left:74.0%}86%{left:73.2%;opacity:1;filter:drop-shadow(0 0 16px rgba(255,147,164,.95))}89%{left:73.2%;opacity:0}100%{left:4%;opacity:0}}
.rail .floor{position:relative;height:70px;margin:-8px 20px 0;transform:rotateX(70deg);transform-origin:50% 0;border-radius:50%;background:radial-gradient(ellipse at 50% 0,rgba(141,204,237,.22),rgba(223,195,140,.06) 55%,transparent 75%);filter:blur(4px);pointer-events:none}
.legend{display:flex;gap:22px;align-items:center;margin-top:8px;font:9.5px var(--mono);letter-spacing:.14em;color:var(--muted)}
.legend i{width:10px;height:10px;border-radius:2px;display:inline-block;vertical-align:-1px;margin-right:6px}
.sechead .h2{max-width:720px}
/* ---- open book ---- */
.book{position:relative;perspective:1800px;perspective-origin:50% 40%;margin-top:30px;padding:26px 40px 60px}
.cover{position:absolute;left:22px;right:22px;top:10px;bottom:34px;border-radius:18px 18px 22px 22px;background:linear-gradient(160deg,#1c2a44,#0a1224 60%,#0d1729);border:1px solid rgba(223,195,140,.35);box-shadow:0 60px 90px -30px rgba(0,0,0,.95),inset 0 1px 0 rgba(255,255,255,.06);transform:rotateX(8deg);transform-origin:50% 100%}
.cover::before{content:"";position:absolute;inset:10px;border-radius:12px;border:1px solid rgba(223,195,140,.18)}
.cover::after{content:"";position:absolute;left:50%;top:0;bottom:0;width:34px;margin-left:-17px;background:linear-gradient(90deg,rgba(0,0,0,.2),rgba(0,0,0,.7) 50%,rgba(0,0,0,.2));border-left:1px solid rgba(223,195,140,.25);border-right:1px solid rgba(223,195,140,.25)}
.spread{position:relative;display:grid;grid-template-columns:1fr 1fr;height:440px;transform-style:preserve-3d;transform:rotateX(8deg);transform-origin:50% 100%}
.pg{position:relative;overflow:hidden;background:linear-gradient(180deg,#16233b,#0c1526);border:1px solid var(--line-strong);backface-visibility:hidden}
.pg.left{border-radius:12px 2px 2px 12px;transform-origin:100% 50%;transform:rotateY(12deg);box-shadow:-24px 30px 60px -28px rgba(0,0,0,.9);animation:leftIn .7s var(--ease) both}
.pg.right{border-radius:2px 12px 12px 2px;transform-origin:0 50%;transform:rotateY(-12deg);box-shadow:24px 30px 60px -28px rgba(0,0,0,.9);animation:pageFlip 1s var(--ease) both}
.pg.left::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent 55%,rgba(0,0,0,.35) 88%,rgba(0,0,0,.8)),linear-gradient(0deg,rgba(8,13,25,.7),transparent 45%);pointer-events:none}
.pg.right::before{content:"";position:absolute;inset:0;z-index:2;background:linear-gradient(90deg,rgba(0,0,0,.8),rgba(0,0,0,.35) 8%,transparent 26%),linear-gradient(90deg,transparent 96%,rgba(255,255,255,.06));pointer-events:none}
.pg.right::after{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;z-index:3;background:linear-gradient(180deg,rgba(255,255,255,.1),rgba(255,255,255,.02));pointer-events:none}
.pg.left img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 55%;filter:saturate(.8) brightness(.8);animation:drift 26s ease-in-out infinite alternate}
.pg.left .cap{position:absolute;left:28px;bottom:26px;z-index:2;display:grid;gap:6px;font:9.5px var(--mono);letter-spacing:.18em;color:var(--gold-hi);text-shadow:0 2px 10px rgba(0,0,0,.9)}
.pg.left .cap b{font:italic 30px var(--serif);letter-spacing:0;color:var(--text)}
.pg.right .wc{position:relative;z-index:3;padding:42px 44px 38px 60px;height:100%;display:flex;flex-direction:column}
.pg.right .wc > span{color:var(--gold);font:9.5px var(--mono);letter-spacing:.16em}
.pg.right h3{margin:16px 0 12px;font:44px var(--serif);font-style:italic;color:var(--text)}
.pg.right p{color:#c0cddd;font-size:13.5px;line-height:1.85;max-width:420px;margin:0}
.pg.right .wlink{margin-top:auto;display:inline-flex;align-items:center;gap:32px;color:var(--gold-hi);font-size:12px;padding-bottom:10px;border-bottom:1px solid rgba(223,195,140,.4);align-self:flex-start}
.pg.right .wstats{display:flex;gap:12px;margin-top:22px}
.pg.right .wstat{padding:12px 16px;border-radius:10px;background:rgba(8,14,27,.72);border:1px solid rgba(223,195,140,.3);box-shadow:var(--sh-1)}
.pg.right .wstat small{display:block;font-family:var(--mono);font-size:8px;letter-spacing:.18em;color:var(--muted)}
.pg.right .wstat b{font-family:var(--mono);font-size:15px;font-weight:500;color:var(--gold-hi)}
.pg .folio{position:absolute;bottom:14px;font:9px var(--mono);letter-spacing:.2em;color:var(--muted);z-index:3}
.pg.left .folio{left:22px}.pg.right .folio{right:22px}
.pg .rule{position:absolute;left:28px;right:28px;top:26px;height:1px;background:linear-gradient(90deg,rgba(223,195,140,.4),transparent);z-index:3}
.pg.right .rule{background:linear-gradient(-90deg,rgba(223,195,140,.4),transparent)}
/* page thickness: stacked sheets under both pages */
.sheets{position:absolute;left:40px;right:40px;bottom:44px;height:26px;transform:rotateX(8deg);transform-origin:50% 0;pointer-events:none}
.sheets i{position:absolute;left:calc(var(--n) * 5px);right:calc(var(--n) * 5px);top:calc(var(--n) * 6px);height:8px;border-radius:0 0 8px 8px;background:linear-gradient(180deg,#1a2740,#0e182b);border:1px solid rgba(92,112,143,.35);border-top:0;opacity:calc(1 - var(--n) * .22)}
.sheets::after{content:"";position:absolute;left:50%;top:0;bottom:-6px;width:2px;margin-left:-1px;background:rgba(0,0,0,.6)}
.ribbon-mark{position:absolute;right:92px;top:16px;z-index:6;width:20px;height:92px;background:linear-gradient(180deg,#eed5a3,#b8985a);clip-path:polygon(0 0,100% 0,100% 100%,50% 82%,0 100%);box-shadow:0 10px 20px -8px rgba(0,0,0,.9)}
@keyframes pageFlip{0%{transform:rotateY(-86deg);opacity:.15;filter:brightness(.5)}55%{opacity:1}100%{transform:rotateY(-12deg);opacity:1;filter:none}}
@keyframes leftIn{from{opacity:.3;filter:blur(6px) brightness(.6)}to{opacity:1;filter:none}}
/* ---- fanned chapters ---- */
.fan{position:relative;display:grid;grid-template-columns:repeat(4,1fr);gap:20px;perspective:1600px;padding:16px 0 30px}
.fan .ch{position:relative;padding:28px 26px 30px;border-radius:14px;background:linear-gradient(180deg,rgba(23,36,58,.7),rgba(18,28,48,.98));border:1px solid var(--line-strong);box-shadow:var(--sh-2);transform-style:preserve-3d;transform:rotateY(calc(var(--k) * 7deg - 10deg)) translateZ(calc(var(--k) * -8px)) rotateX(3deg);transition:transform .6s var(--ease),box-shadow .6s var(--ease)}
.fan .ch:hover{transform:translateY(-8px) translateZ(40px) rotateX(0) rotateY(0);box-shadow:var(--sh-3)}
.fan .ch::before{content:"";position:absolute;left:24px;right:24px;top:0;height:1px;background:linear-gradient(90deg,transparent,rgba(223,195,140,.7),transparent)}
.fan .ch small{font:9.5px var(--mono);letter-spacing:.2em;color:var(--gold)}
.fan .ch h4{margin:14px 0 8px;font-size:17px;font-weight:600;color:var(--text)}
.fan .ch p{margin:0;color:#aebed3;font-size:12.5px;line-height:1.7}
.fan .ch .num{position:absolute;right:20px;top:14px;font:44px var(--serif);font-style:italic;color:rgba(223,195,140,.14)}
.fan .ch .vox{position:absolute;right:26px;bottom:26px;--vs:26px}
/* ---- lab framing ---- */
.labwrap{position:relative;perspective:1800px}
.labwrap .lab{transform:rotateX(2deg);transform-origin:50% 100%}
.labwrap .corner-vox{position:absolute;perspective:600px;z-index:3}
.labwrap .corner-vox .vox{--vs:30px}
/* ---- chain ledger ---- */
.ledger3d{position:relative;margin:0 -96px;padding:60px 0 70px;overflow:hidden;perspective:1800px}
.ledger3d::before,.ledger3d::after{content:"";position:absolute;top:0;bottom:0;width:220px;z-index:3;pointer-events:none}
.ledger3d::before{left:0;background:linear-gradient(90deg,var(--bg),transparent)}.ledger3d::after{right:0;background:linear-gradient(-90deg,var(--bg),transparent)}
.track{display:flex;align-items:center;gap:0;width:max-content;transform:rotateX(14deg) rotateY(-6deg);transform-style:preserve-3d;animation:slide 40s linear infinite}
.blk{position:relative;display:flex;align-items:center;gap:0;perspective:900px}
.blk .vox{--vs:74px}
.blk .meta{position:absolute;left:50%;top:100%;transform:translateX(-50%);margin-top:30px;text-align:center;white-space:nowrap;font:9.5px/1.7 var(--mono);letter-spacing:.12em;color:var(--muted)}
.blk .meta b{display:block;color:var(--text-2);font-weight:500}
.blk .chain{margin:0 18px 0 34px}
@keyframes slide{from{transform:rotateX(14deg) rotateY(-6deg) translateX(0)}to{transform:rotateX(14deg) rotateY(-6deg) translateX(-50%)}}
.ledger-floor{position:absolute;left:10%;right:10%;bottom:40px;height:90px;transform:rotateX(74deg);border-radius:50%;background:radial-gradient(ellipse,rgba(141,204,237,.16),rgba(223,195,140,.05) 50%,transparent 72%);filter:blur(6px);pointer-events:none}
"""


def body():
    from shared import header, svg, water, vox, chain, shards
    from protocol import gate_html
    from protocol import GATES
    link = ('<div class="lnk"><svg viewBox="0 0 34 22"><rect x="1" y="6" width="14" height="10" rx="5"></rect>'
            '<rect class="b" x="10" y="8" width="14" height="6" rx="3"></rect><rect x="19" y="6" width="14" height="10" rx="5"></rect></svg></div>')
    def g3(i):
        idx, label, code = GATES[i]
        return f'<div class="g3 k{i}"><div class="front"><span class="gs"></span><span class="gi">{idx}</span><div><div class="gl">{label}</div><div class="gc">{code}</div></div></div></div>'
    rail_flow = link + link.join(g3(i) for i in range(7)) + link
    lab_gates = "".join(gate_html(i, "{{g%d}}" % (i + 1)) for i in range(7))
    l1 = shards([(6, 18, 6, "141,204,237", 0, 9, 0), (30, 12, 8, "223,195,140", 0, 11, 1), (58, 8, 5, "141,204,237", 0, 8, 2), (84, 22, 7, "223,195,140", 0, 10, .5), (40, 70, 6, "133,219,192", 0, 12, 1.5)])
    l2 = shards([(14, 40, 10, "223,195,140", 40, 7, .3), (48, 26, 9, "141,204,237", 40, 8, 1.2), (70, 62, 11, "223,195,140", 40, 6, 2), (90, 44, 8, "133,219,192", 40, 9, .8)])
    l3 = shards([(22, 76, 14, "223,195,140", 90, 6, 0), (62, 84, 12, "141,204,237", 90, 7, 1), (80, 72, 16, "223,195,140", 90, 5, 2.2)])
    isles = (f'<div class="isle" style="left: 46%; top: 66%; scale: .9">{vox("", "vox-info", 26)}{vox("", "", 34)}{vox("", "vox-ok", 22)}</div>'
             f'<div class="isle" style="left: 88%; top: 30%; scale: .7">{vox("", "", 24)}{vox("", "vox-info", 18)}</div>'
             f'<div class="isle" style="left: 58%; top: 18%; scale: .6">{vox("", "vox-ok", 20)}{vox("", "", 28)}</div>')
    proposals = "".join(f'<div class="proposal" style="--dl: {d}s">{vox("", c, 22, False)}</div>' for d, c in [(0, ""), (4, "vox-info"), (8, "vox-ok"), (12, "")])

    def blk(label, slot, cls, sub):
        return f'<div class="blk">{vox(label, cls, 74)}<div class="meta"><b>{slot}</b>{sub}</div>{chain(5)}</div>'
    blocks = "".join([
        blk("07", "SLOT 412,908,101", "vox-ok", "ALLOW · 100 USDC"),
        blk("06", "SLOT 412,908,117", "vox-bad", "SPEND_CAP_EXCEEDED"),
        blk("07", "SLOT 412,908,142", "vox-ok", "ALLOW · 100 USDC"),
        blk("07", "SLOT 412,908,190", "vox-bad", "COOLDOWN_ACTIVE"),
        blk("G", "GRANT · HRRW…WNKN", "", "POLICY DIGEST b4957dc8"),
        blk("07", "SLOT 412,908,233", "vox-ok", "ALLOW · 250 USDC"),
        blk("05", "SLOT 412,908,260", "vox-bad", "DESTINATION_NOT_ALLOWED"),
        blk("R", "REVOKE · GFNM…v1tJ", "vox-info", "OWNER SIGNED"),
    ])
    blocks = blocks + blocks  # seamless loop

    def world_pages(img, cap_small, cap_big, eyebrow, title, copy, s1, v1, s2, v2, folio):
        return f'''<div class="spread">
          <div class="pg left"><img src="{img}" alt=""><span class="rule"></span><div class="cap">{cap_small}<b>{cap_big}</b></div><span class="folio">{folio} · L</span></div>
          <div class="pg right"><span class="rule"></span><div class="wc"><span>{eyebrow}</span><h3>{title}</h3><p>{copy}</p>
            <div class="wstats"><div class="wstat"><small>{s1}</small><b>{v1}</b></div><div class="wstat"><small>{s2}</small><b>{v2}</b></div></div>
            <button type="button" class="wlink">Enter this world {svg("arrowur", 13)}</button></div><span class="folio">{folio} · R</span></div>
        </div>'''

    return f'''
<div class="app">
{header("Protocol")}
<section class="hero" onMouseMove="{{{{ onMove }}}}" onMouseLeave="{{{{ onLeave }}}}">
  <div class="art"><img src="hero.webp" alt=""></div>
  <div class="wash"></div><div class="grid"></div>
  <div class="plx l1" style="transform: translate({{{{ px1 }}}}px, {{{{ py1 }}}}px)">{l1}</div>
  <div class="plx l2" style="transform: translate({{{{ px2 }}}}px, {{{{ py2 }}}}px)">{l2}{isles}</div>
  <div class="plx l3" style="transform: translate({{{{ px3 }}}}px, {{{{ py3 }}}}px)">{l3}</div>
  <div class="copy">
    <span class="kicker rise" style="--i: 0">{svg("spark", 11)} A NEW ORBIT FOR AUTONOMOUS FINANCE</span>
    <h1 class="rise" style="--i: 1">Intelligence,<br>without limits.<span class="acc">Authority, with them.</span></h1>
    <p class="lede rise" style="--i: 2">Let your agents explore. Keep your assets within reach. Seven on-chain gates protect the boundary between ambition and permission.</p>
    <div class="actions rise" style="--i: 3">
      <button type="button" class="btn btn-gold">Launch the protocol {svg("arrowur", 14, "#101827")}</button>
      <button type="button" class="btn btn-ghost">{svg("play", 12)} Explore the flow</button>
    </div>
  </div>
  <div class="scene">
    <div class="halo"></div>
    <div class="floor"></div>
    <div class="system" style="transform: translate(-50%, -50%) rotateX({{{{tx}}}}deg) rotateY({{{{ty}}}}deg)">
      <div class="orbit o0"><i></i><b></b></div>
      <div class="orbit o1"><i></i><b></b></div>
      <div class="orbit o2"><i></i><b></b></div>
      <div class="crystal">
        <div class="face" style="--f: 0"></div><div class="face" style="--f: 1"></div><div class="face" style="--f: 2"></div><div class="face" style="--f: 3"></div>
        <div class="heart">{svg("shield", 34, "#f7e4bc", 1.4)}</div>
      </div>
      <span class="sat" style="--s: 0"></span><span class="sat" style="--s: 1"></span><span class="sat" style="--s: 2"></span><span class="sat" style="--s: 3"></span><span class="sat" style="--s: 4"></span><span class="sat" style="--s: 5"></span><span class="sat" style="--s: 6"></span>
    </div>
    <div class="caption">0 / 07 <i></i> <span>THE SENTINEL CORE</span></div>
    <div class="coord">SOLANA · DEVNET · Fj7MV8…WbS4</div>
  </div>
  {water(150)}
  {proposals}
  <div class="scrollcue">FOLLOW THE CURRENT <i></i></div>
  <div class="edition"><span>REDLINE UNIVERSE</span><i></i><b>01 — GENESIS</b><span>SOLANA DEVNET</span><i></i><b>7 GATES · 1 TX</b></div>
</section>

<div class="story">
  <!-- backbone as a chain -->
  <section class="sec">
    <div class="sechead">
      <div><div class="eyebrow">LIVE POLICY BACKBONE</div><h2 class="h2">Every proposal rides the current<br><em>through seven hard limits.</em></h2></div>
      <p class="lede">The agent proposes. The program evaluates the signed envelope in order, link by link. One failed gate stops the transfer atomically — nothing moves.</p>
    </div>
    <div class="rail-wrap"><div class="panel rail">
      <div class="ph" style="padding: 0 0 14px; border-bottom: 0"><span class="eyebrow">TRANSACTION BOUNDARY · ORDERED · ONE TX</span><span class="chip chip-gold">DEVNET · Fj7MV…WbS4</span></div>
      <div class="flow">
        <div class="runner">{vox("", "vox-info", 26, False)}</div>
        <div class="ep agent">{vox("", "", 28, False)}AGENT</div>
        {rail_flow}
        <div class="ep vault">{vox("", "vox-ok", 28, False)}VAULT</div>
      </div>
      <div class="floor"></div>
      <div class="legend"><span><i style="background: var(--info)"></i>PROPOSAL</span><span><i style="background: var(--ok)"></i>GATE PASSED</span><span><i style="background: var(--bad)"></i>GATE REFUSED · NOTHING MOVES</span><span style="margin-left: auto">LOOP · 24 S · TWO PROPOSALS</span></div>
      <div class="facts">
        <div class="fact"><span class="ico">{svg("layers", 14)}</span><div><small>SCOPE</small><b>Protocol</b></div></div>
        <div class="fact"><span class="ico">{svg("key", 14)}</span><div><small>ACTIVE GRANTS</small><b>1</b></div></div>
        <div class="fact"><span class="ico">{svg("check", 14)}</span><div><small>ALLOWED</small><b style="color: var(--ok)">18</b></div></div>
        <div class="fact"><span class="ico">{svg("x", 14)}</span><div><small>BLOCKED</small><b style="color: var(--bad)">9</b></div></div>
      </div>
    </div></div>
  </section>

  <div class="divider">{water(120, ("223,195,140", "141,204,237", "133,219,192"))}<div class="caption-mid">{svg("book", 12)} CHAPTER 01 → THE THREE WORLDS</div></div>

  <!-- open book -->
  <section class="sec" style="padding-top: 40px">
    <div class="sechead">
      <div><div class="eyebrow">THE REDLINE UNIVERSE / EXPLORE</div><h2 class="h2">One mission. <em>Three worlds.</em></h2></div>
      <span class="mono" style="font-size: 9.5px; letter-spacing: .14em; color: #a5b5cc">TURN THE PAGE →</span>
    </div>
    <div class="wtabs">
      <button type="button" aria-pressed="{{{{ isCitadel }}}}" onClick="{{{{ pickCitadel }}}}"><span>01</span>The Citadel<small>GUARDRAILS</small></button>
      <button type="button" aria-pressed="{{{{ isVault }}}}" onClick="{{{{ pickVault }}}}"><span>02</span>The Vault<small>TREASURY</small></button>
      <button type="button" aria-pressed="{{{{ isObs }}}}" onClick="{{{{ pickObs }}}}"><span>03</span>The Observatory<small>AUDIT TRAIL</small></button>
    </div>
    <div class="book">
      <div class="cover"></div>
      <span class="ribbon-mark"></span>
      <sc-if value="{{{{ isCitadel }}}}" hint-placeholder-val="{{{{ true }}}}">
        {world_pages("citadel.webp", "01 / GUARDRAILS", "The Citadel", "01 / GUARDRAILS", "The Citadel", "Define the boundary. Give every agent a budget, a destination and a deadline — signed once, enforced on every transfer.", "ACTIVE POLICIES", "2", "GATES / TX", "7", "p.01")}
      </sc-if>
      <sc-if value="{{{{ isVault }}}}" hint-placeholder-val="{{{{ false }}}}">
        {world_pages("vault.webp", "02 / TREASURY", "The Vault", "02 / TREASURY", "The Vault", "A program-owned account only the policy can move. Refill on devnet, withdraw as the owner — never through the agent.", "VAULT BALANCE", "7,944 dUSDC", "OWNER SOL", "2.41", "p.02")}
      </sc-if>
      <sc-if value="{{{{ isObs }}}}" hint-placeholder-val="{{{{ false }}}}">
        {world_pages("observatory.webp", "03 / AUDIT TRAIL", "The Observatory", "03 / AUDIT TRAIL", "The Observatory", "Every allow and every rejection, decoded from Solana and corroborated against the indexer. Evidence, not assurances.", "EVENTS", "200", "CORROBORATED", "41", "p.03")}
      </sc-if>
      <div class="sheets"><i style="--n: 0"></i><i style="--n: 1"></i><i style="--n: 2"></i><i style="--n: 3"></i></div>
    </div>
  </section>

  <!-- fanned chapters -->
  <section class="sec" style="padding-top: 56px">
    <div class="sechead"><div><div class="eyebrow">THE PROTOCOL IN FOUR CHAPTERS</div><h2 class="h2">Read it <em>cover to cover.</em></h2></div></div>
    <div class="fan">
      <div class="ch" style="--k: 0"><span class="num">01</span><small>CHAPTER 01</small><h4>Enforcement</h4><p>Seven gates, one transaction. The first failed gate closes the path before value can move.</p>{vox("", "", 26)}</div>
      <div class="ch" style="--k: 1"><span class="num">02</span><small>CHAPTER 02</small><h4>Evidence</h4><p>A live feed of allows and rejections, each one a signature you can open on Solana Explorer.</p>{vox("", "vox-info", 26)}</div>
      <div class="ch" style="--k: 2"><span class="num">03</span><small>CHAPTER 03</small><h4>Ownership</h4><p>Live grants with countdowns, spend meters and a revoke that lands in one block.</p>{vox("", "vox-ok", 26)}</div>
      <div class="ch" style="--k: 3"><span class="num">04</span><small>CHAPTER 04</small><h4>Interrogate</h4><p>Ask the console in English or Vietnamese — <span class="mono">gates</span>, <span class="mono">explain SPEND_CAP_EXCEEDED</span>.</p>{vox("", "vox-bad", 26)}</div>
    </div>
  </section>

  <div class="divider">{water(120, ("133,219,192", "223,195,140", "141,204,237"))}<div class="caption-mid">{svg("flask", 12)} INTERACTIVE FIELD TEST</div></div>

  <!-- policy lab -->
  <section class="sec" id="lab" style="padding-top: 40px">
    <div class="sechead">
      <div><div class="eyebrow">{svg("flask", 11)} INTERACTIVE FIELD TEST / 01</div><h2 class="h2">Test the limits.<br><em>Before they matter.</em></h2></div>
      <p class="lede" style="max-width: 340px">Give a hypothetical agent a mission. See how each proposal passes through the same seven policy checks.</p>
    </div>
    <div class="pill-row" style="margin-bottom: 20px">
      <button type="button" class="pill" aria-pressed="{{{{ isPayroll }}}}" onClick="{{{{ pickPayroll }}}}">Contributor payroll {svg("arrow", 12)}</button>
      <button type="button" class="pill" aria-pressed="{{{{ isOps }}}}" onClick="{{{{ pickOps }}}}">Treasury operations {svg("arrow", 12)}</button>
      <button type="button" class="pill" aria-pressed="{{{{ isSandbox }}}}" onClick="{{{{ pickSandbox }}}}">Agent sandbox {svg("arrow", 12)}</button>
    </div>
    <div class="labwrap">
      <div class="corner-vox" style="left: -18px; top: -22px">{vox("", "", 30)}</div>
      <div class="corner-vox" style="right: -14px; bottom: -6px">{vox("", "vox-info", 30)}</div>
      <div class="lab">
      <div class="labform">
        <div class="policy">
          <span class="eyebrow">MISSION PARAMETERS</span>
          <sc-if value="{{{{ isPayroll }}}}" hint-placeholder-val="{{{{ true }}}}"><p>Space out recurring payments within a shared budget.</p>
            <dl><div><dt>Budget</dt><dd>1,000 USDC</dd></div><div><dt>Transaction cap</dt><dd>10</dd></div><div><dt>Cooldown</dt><dd>60s</dd></div><div><dt>Expires after</dt><dd>24h</dd></div></dl></sc-if>
          <sc-if value="{{{{ isOps }}}}" hint-placeholder-val="{{{{ false }}}}"><p>Fund a single operations desk with a tight ceiling.</p>
            <dl><div><dt>Budget</dt><dd>8,000 USDC</dd></div><div><dt>Transaction cap</dt><dd>4</dd></div><div><dt>Cooldown</dt><dd>1h</dd></div><div><dt>Expires after</dt><dd>7d</dd></div></dl></sc-if>
          <sc-if value="{{{{ isSandbox }}}}" hint-placeholder-val="{{{{ false }}}}"><p>Let an experimental agent run with pocket change.</p>
            <dl><div><dt>Budget</dt><dd>50 USDC</dd></div><div><dt>Transaction cap</dt><dd>25</dd></div><div><dt>Cooldown</dt><dd>10s</dd></div><div><dt>Expires after</dt><dd>2h</dd></div></dl></sc-if>
        </div>
        <label class="field">Amount per proposal · USDC<div class="in focus">250<span class="caret"></span></div></label>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px">
          <label class="field">Attempts<div class="in">5</div></label>
          <label class="field">Interval · seconds<div class="in">60</div></label>
        </div>
        <span class="field" style="margin-bottom: 8px">Scenario</span>
        <div class="pill-row" style="margin-bottom: 22px">
          <button type="button" class="pill btn-sm" aria-pressed="{{{{ scFollow }}}}" onClick="{{{{ pickFollow }}}}">Follow the policy</button>
          <button type="button" class="pill btn-sm" aria-pressed="{{{{ scOver }}}}" onClick="{{{{ pickOver }}}}">Exceed the cap</button>
          <button type="button" class="pill btn-sm" aria-pressed="{{{{ scDest }}}}" onClick="{{{{ pickDest }}}}">Unknown recipient</button>
          <button type="button" class="pill btn-sm" aria-pressed="{{{{ scReplay }}}}" onClick="{{{{ pickReplay }}}}">Replay a nonce</button>
        </div>
        <button type="button" class="btn btn-gold" style="width: 100%; height: 46px; justify-content: space-between" onClick="{{{{ run }}}}">Run simulation {svg("arrow", 14, "#101827")}</button>
        <span class="disc">Hypothetical only · no wallet · no transfers</span>
      </div>
      <div class="labres">
        <sc-if value="{{{{ notRan }}}}" hint-placeholder-val="{{{{ true }}}}">
          <div class="labempty">
            {svg("flask", 34, "currentColor", 1.2)}
            <span>AWAITING YOUR PROPOSAL</span>
            <h3>Every boundary tells a story.</h3>
            <p>Choose a mission and run a simulation to inspect the gate-by-gate result.</p>
            <div class="gate-dots"><i>1</i><i>2</i><i>3</i><i>4</i><i>5</i><i>6</i><i>7</i></div>
          </div>
        </sc-if>
        <sc-if value="{{{{ ran }}}}" hint-placeholder-val="{{{{ false }}}}">
          <div class="labsum"><span><b>5</b>proposals</span><span>evaluated against 7 gates</span><button type="button" class="btn btn-ghost btn-sm" style="margin-left: auto" onClick="{{{{ reset }}}}">{svg("refresh", 12)} Reset</button></div>
          <div class="labgates">{lab_gates}</div>
          <sc-if value="{{{{ scFollow }}}}" hint-placeholder-val="{{{{ true }}}}">
            <div class="verdict" data-allowed="true"><span>VERDICT · PROPOSAL 1 OF 5</span><h3>ALLOWED — funds moved</h3><p>250 USDC to an allowlisted destination. All seven gates passed; the vault balance dropped by exactly the proposed amount and a signature was recorded.</p></div>
          </sc-if>
          <sc-if value="{{{{ scOver }}}}" hint-placeholder-val="{{{{ false }}}}">
            <div class="verdict" data-allowed="false"><span>VERDICT · PROPOSAL 5 OF 5</span><h3>SPEND_CAP_EXCEEDED</h3><p>Cumulative spend would reach 1,250 USDC against a 1,000 USDC envelope. Gate 06 failed, gate 07 never ran, and the balance is unchanged.</p></div>
          </sc-if>
          <sc-if value="{{{{ scDest }}}}" hint-placeholder-val="{{{{ false }}}}">
            <div class="verdict" data-allowed="false"><span>VERDICT · PROPOSAL 1 OF 5</span><h3>DESTINATION_NOT_ALLOWED</h3><p>The recipient was never in the signed allowlist. The program rejected at gate 05 before any budget was consulted.</p></div>
          </sc-if>
          <sc-if value="{{{{ scReplay }}}}" hint-placeholder-val="{{{{ false }}}}">
            <div class="verdict" data-allowed="false"><span>VERDICT · PROPOSAL 2 OF 5</span><h3>NONCE_REPLAY</h3><p>The same intent was submitted twice. Gate 03 recognised the nonce and failed the transaction — a replayed instruction cannot double-spend.</p></div>
          </sc-if>
          <div style="display: flex; justify-content: space-between; margin-top: 20px; font-size: 11.5px; color: #aebed3"><span>Vault before <b class="mono" style="color: var(--gold-hi); font-weight: 500">1,000.00</b></span><span>Vault after <b class="mono" style="color: var(--gold-hi); font-weight: 500">{{{{ after }}}}</b></span><span>Decision latency <b class="mono" style="color: var(--info); font-weight: 500">412 ms</b></span></div>
        </sc-if>
      </div>
      </div>
    </div>
  </section>

  <!-- chain ledger -->
  <section class="sec">
    <div class="sechead">
      <div><div class="eyebrow">THE CHAIN DECIDES</div><h2 class="h2">Every decision, <em>a block you can open.</em></h2></div>
      <p class="lede" style="max-width: 360px">Allows and rejections are written to Solana in the same breath. Green blocks moved funds; red blocks name the gate that refused.</p>
    </div>
    <div class="ledger3d"><div class="ledger-floor"></div><div class="track">{blocks}</div></div>
  </section>

  <section class="sec" style="padding-top: 20px">
    <div class="pillars">
      <div class="pillar"><span class="ico">{svg("bot", 18)}</span><small>01</small><h3>Propose</h3><p>An autonomous agent can request an action, but it never receives unrestricted authority.</p></div>
      <div class="pillar"><span class="ico">{svg("layers", 18)}</span><small>02</small><h3>Constrain</h3><p>The owner's signed policy becomes a hard envelope around asset, recipient, budget, pace and time.</p></div>
      <div class="pillar"><span class="ico">{svg("scroll", 18)}</span><small>03</small><h3>Prove</h3><p>Every allow or rejection leaves evidence that can be inspected independently on Solana.</p></div>
    </div>
  </section>
</div>
<footer class="foot"><span>REDLINE · AUTONOMOUS FINANCE. HARD LIMITS.</span><span>THE AGENT PROPOSES · <b style="color: var(--gold); font-weight: 400">THE CHAIN DECIDES</b></span><span>FCCS LAB · VLU · 2026</span></footer>
</div>'''
