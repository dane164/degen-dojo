/* DEGEN DOJO — the 24 special moves: logic, poses, projectiles and effects.
   Every special is update(H,f,o,S,t,d): H = fight, f = user, o = opponent, S = special state, t = frame (1..), d = facing.
   Visuals go through fx / projectiles / zones so they replay on the online guest. */
(function(){
const K = ()=>DD.Game.K;
const R=(a,b)=>a+Math.random()*(b-a);
const end=(H,f)=>H.endSpecial(f);
const near=(f,o,r)=>Math.abs(o.x-f.x)<r;
const ghost=(H,f,col,life=14)=>{ const [pose,fr]=H.poseFor(f); H.addFx({kind:'ghost',idx:H.p.indexOf(f),x:f.x,y:f.y,face:f.face,pose,fr,col,life,max:life}); };
const streaks=(H,x,y,dir,col,n=6)=>{ for(let i=0;i<n;i++) H.addFx({kind:'streak',x:x-dir*R(0,40),y:y-R(10,110),vx:-dir*R(4,7),col,life:12,len:R(14,36)}); };
const burst=(H,x,y,cols,n=16,sp=3,g=0.08)=>{ for(let i=0;i<n;i++){ const a=Math.random()*6.283, v=R(sp*0.4,sp); H.addFx({kind:'px',x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-1,g,col:cols[i%cols.length],life:16+(i%10),s:i%3?2:3}); } };

const U = {};   // logic
const POSE = {}; // [pose, frame] while the special runs
const FX = {};   // fx drawn over fighters
const UNDER = {};// fx drawn behind fighters
const PROJ = {}; // projectile sprites (ctx already translated to the projectile)
const ZONE = {}; // per-tick zone effects
const DRAWF = {};// replace the fighter sprite entirely

// 1 DIAMOND HANDS — Unbreakable: crystal shell. Hits on you shatter it and blow the attacker away; untouched, it bursts on its own.
U.crystalShell=(H,f,o,S,t,d)=>{
  if(t===1){ f.armor=160; f.shellT=150; H.addFx({kind:'shell',idx:H.p.indexOf(f),life:150,max:150}); burst(H,f.x,f.y-60,['#bff0ff','#5ad1ff','#ffffff'],18); }
  if(t>24) end(H,f);
};
POSE.crystalShell=(f,t)=>['charge',(t/3)|0];
FX.shell=(ctx,e,H)=>{ const f=H.p[e.idx]; if(!f||f.armor<=0) return; const x=f.x, y=f.y-58*f.size, fl=H.frame;
  ctx.save(); ctx.globalAlpha=0.55*Math.min(1,e.life/10)*(0.85+0.15*Math.sin(fl*0.3));
  const pts=[]; for(let i=0;i<6;i++){ const a=i/6*6.283+fl*0.01; pts.push([x+Math.cos(a)*26,y+Math.sin(a)*48]); }
  ctx.fillStyle='rgba(120,220,255,0.35)'; ctx.beginPath(); pts.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1])); ctx.closePath(); ctx.fill();
  ctx.strokeStyle='#bff0ff'; ctx.lineWidth=1.2; ctx.stroke(); ctx.strokeStyle='rgba(255,255,255,0.6)'; ctx.lineWidth=0.8; pts.forEach(p=>{ ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(p[0],p[1]); ctx.stroke(); });
  ctx.fillStyle='#fff'; for(let i=0;i<3;i++){ const a=fl*0.07+i*2.1; ctx.fillRect(x+Math.cos(a)*20,y+Math.sin(a*1.3)*40,2,2); } ctx.restore(); };
const shellTick=(H,f)=>{ if(!(f.shellT>0)) return; f.shellT--;
  if(f.armor<=0 && f.shellT>0){ f.shellT=0; return; } // already shattered by a hit (hit() handles that counter)
  if(f.shellT===0 && f.armor>0){ f.armor=0; const o=H.other(f); H.addFx({kind:'crystalBurst',x:f.x,y:f.y-60,life:20,max:20}); H.snd('shatter'); H.shake=8;
    for(let i=0;i<14;i++) H.addFx({kind:'shard',x:f.x,y:f.y-60,vx:R(-4,4),vy:R(-5,1),g:0.18,life:30,s:R(4,8),rot:R(0,6),vr:R(-0.3,0.3)});
    if(near(f,o,70) && Math.abs(o.y-f.y)<90) H.hit(f,o,{dmg:70,h:'mid',kb:5,hs:20,kd:1,heavy:1}); } };
FX.crystalBurst=(ctx,e)=>{ const p=1-e.life/e.max; ctx.save(); ctx.globalAlpha=1-p; ctx.strokeStyle='#bff0ff'; ctx.lineWidth=3*(1-p)+0.5; ctx.beginPath(); ctx.arc(e.x,e.y,10+p*70,0,7); ctx.stroke(); ctx.restore(); };

// 2 PAPER HANDS — Panic Sell: blinks backwards, leaves a SELL-order bomb, throws three paper planes.
U.panicSell=(H,f,o,S,t,d)=>{
  if(t===1){ S.bx=f.x; H.addFx({kind:'sellBomb',x:f.x,life:40,max:40}); f.invuln=14; burst(H,f.x,f.y-50,['#fff','#e8e0c8','#ff2e2e'],14);
    f.x=K().clamp(f.x-d*150,K().WALL_L+12,K().WALL_R-12); f.face=o.x>=f.x?1:-1; H.snd('whoosh'); }
  if(t===10||t===16||t===22) H.shoot(f,{w:16,h:12,vx:f.face*6,y:-42+(t-16)*0.8,dmg:28,kind:'plane',h2:'mid',kb:1.5,hs:12,home:0.08,noMeter:1});
  if(t===40){ H.shake=10; H.snd('heavy'); burst(H,S.bx,K().FLOOR-30,['#ff2e2e','#ffd23f','#fff','#e8e0c8'],26,4.5); H.ring(S.bx,K().FLOOR-30,'#ff2e2e');
    if(Math.abs(o.x-S.bx)<46 && o.y>K().FLOOR-120) H.hit(f,o,{dmg:75,h:'mid',kb:4,hs:22,kd:1,heavy:1,dirX:o.x>=S.bx?1:-1}); }
  if(t>46) end(H,f);
};
POSE.panicSell=(f,t)=>t<10?['crouch',0]:['special',0];
UNDER.sellBomb=(ctx,e,H)=>{ const x=e.x, y=K().FLOOR, k=e.max-e.life, fl=k%8<4||e.life>16;
  ctx.fillStyle='#2b1405'; ctx.fillRect(x-11,y-27,22,27); ctx.fillStyle='#f4ecd8'; ctx.fillRect(x-10,y-26,20,25);
  ctx.fillStyle=fl?'#ff2e2e':'#a01818'; ctx.fillRect(x-8,y-23,16,7); K().txt(ctx,'SELL',x,y-17.5,'#fff',6,'center');
  ctx.fillStyle='#8a7a60'; for(let i=0;i<4;i++) ctx.fillRect(x-8,y-13+i*3,8+((i*5)%8),1); K().txt(ctx,String(Math.ceil(e.life/14)),x+6,y-6,'#ff2e2e',6,'center'); };
PROJ.plane=(ctx,p,H)=>{ const dir=Math.sign(p.vx)||1; ctx.scale(dir,1); ctx.fillStyle='#2b1405'; ctx.beginPath(); ctx.moveTo(9,0); ctx.lineTo(-8,-6); ctx.lineTo(-4,0); ctx.lineTo(-8,6); ctx.closePath(); ctx.fill();
  ctx.fillStyle='#ffffff'; ctx.beginPath(); ctx.moveTo(8,0); ctx.lineTo(-7,-5); ctx.lineTo(-3,0); ctx.closePath(); ctx.fill(); ctx.fillStyle='#d8d0c0'; ctx.beginPath(); ctx.moveTo(8,0); ctx.lineTo(-3,0); ctx.lineTo(-7,5); ctx.closePath(); ctx.fill();
  ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.fillRect(-14,-1,5,1); ctx.fillRect(-18,1,4,1); };

// 3 MOON BOY — To The Moon: three-hit rocket launch with an exhaust trail, crash-landing shockwave.
U.moonShot=(H,f,o,S,t,d)=>{
  if(t<8){ if(t%2===0) H.addFx({kind:'px',x:f.x+R(-8,8),y:f.y,vx:R(-1.5,1.5),vy:R(-1,0),col:t%4?'#ff6a00':'#ffd23f',life:12,s:3}); }
  if(t===8){ f.vy=-14; f.vx=d*2.6; f.invuln=26; H.snd('jump'); H.ring(f.x,f.y,'#ffd23f'); }
  if(t>8 && !f.grounded){ for(let i=0;i<2;i++) H.addFx({kind:'px',x:f.x-d*4+R(-4,4),y:f.y+R(0,6),vx:R(-0.6,0.6),vy:R(2,4),col:['#ff6a00','#ffd23f','#ffffff'][i+(t%2)],life:14,s:3});
    if(t%3===0) H.addFx({kind:'puff',x:f.x-d*4,y:f.y+6,vx:R(-0.4,0.4),vy:0.6,r:5,col:'rgba(200,200,220,0.6)',life:30}); }
  if(t>8 && t<40 && (S.n|0)<3 && t-(S.lt|0)>=6 && H.overlap(H.box(f,-8,28,-70,-4),o.hurt())){ S.n=(S.n|0)+1; S.lt=t; const last=S.n===3;
    H.hit(f,o,{dmg:last?70:38,h:'mid',kb:last?2:0.6,hs:last?30:12,kd:last?1:0,launch:last?1:0,heavy:last?1:0}); if(last) H.pop(f.x,f.y-120,'1000X','#ffd23f'); }
  if(t>14 && f.grounded && !S.land){ S.land=1; H.shake=10; H.snd('heavy'); burst(H,f.x,f.y-4,['#d8d8e8','#ff6a00','#ffd23f'],18,3.5); H.addFx({kind:'crater',x:f.x,life:40,max:40});
    if(near(f,o,64) && o.grounded) H.hit(f,o,{dmg:30,h:'low',kb:3,hs:14}); }
  if(S.land && ++S.w>10) end(H,f); if(t>100) end(H,f);
};
POSE.moonShot=(f,t)=>t<8?['crouch',0]:f.grounded?['crouch',0]:['upper',1];
UNDER.crater=(ctx,e)=>{ const a=Math.min(1,e.life/15); ctx.globalAlpha=a; ctx.fillStyle='#2b1405'; ctx.beginPath(); ctx.ellipse(e.x,K().FLOOR+1,26,3,0,0,7); ctx.fill(); ctx.fillStyle='#ff6a00'; ctx.fillRect(e.x-18,K().FLOOR-1,6,1); ctx.fillRect(e.x+10,K().FLOOR-1,8,1); ctx.globalAlpha=1; };

// 4 RUG PULLER — Rug Pull: rolls out a rug across the floor, then yanks it. Grounded enemies on it get swept and dragged in.
U.rugPull=(H,f,o,S,t,d)=>{
  if(t===4) H.addFx({kind:'carpet',x:f.x,dir:d,life:44,max:44});
  if(t===30){ H.shake=12; H.snd('heavy'); const on = o.grounded && (o.x-f.x)*d>0 && Math.abs(o.x-f.x)<330;
    for(let i=0;i<12;i++) H.addFx({kind:'px',x:f.x+d*R(10,300),y:K().FLOOR-2,vx:-d*R(2,6),vy:R(-3,-0.5),g:0.15,col:i%2?'#c0262d':'#ffd23f',life:22,s:3});
    if(on){ if(H.hit(f,o,{dmg:110,h:'low',kb:0,hs:22,kd:1,heavy:1,dirX:-d})){ o.vx=-d*9; o.vy=-6; } } }
  if(t>44) end(H,f);
};
POSE.rugPull=(f,t)=>t<28?['charge',(t/4)|0]:['grab',0];
UNDER.carpet=(ctx,e)=>{ const k=e.max-e.life, x0=e.x, dir=e.dir, y=K().FLOOR;
  const len = k<26 ? Math.min(330,k*14) : 330, yank=k>=26?Math.min(1,(k-26)/10):0;
  const w=len*(1-yank), x1=x0+dir*w, lo=Math.min(x0,x1), lift=yank*16;
  ctx.fillStyle='#2b1405'; ctx.fillRect(lo-1,y-8-lift,w+2,9);
  ctx.fillStyle='#a01818'; ctx.fillRect(lo,y-7-lift,w,7); ctx.fillStyle='#d8343c'; ctx.fillRect(lo,y-7-lift,w,2);
  ctx.fillStyle='#ffd23f'; for(let x=4;x<w-4;x+=12){ ctx.fillRect(lo+x,y-4-lift,6,1); ctx.fillRect(lo+x+2,y-5-lift,2,3); }
  ctx.fillStyle='#ffd23f'; ctx.fillRect(lo,y-1-lift,w,1);
  if(k<26){ ctx.fillStyle='#2b1405'; ctx.beginPath(); ctx.arc(x1,y-9,10,0,7); ctx.fill(); ctx.fillStyle='#a01818'; ctx.beginPath(); ctx.arc(x1,y-9,9,0,7); ctx.fill();
    ctx.strokeStyle='#ffd23f'; ctx.lineWidth=1; ctx.beginPath(); ctx.arc(x1,y-9,5,0,7); ctx.stroke(); ctx.beginPath(); ctx.arc(x1,y-9,2,0,7); ctx.stroke(); }
  else { ctx.globalAlpha=1-yank; ctx.fillStyle='#d8343c'; for(let i=0;i<6;i++) ctx.fillRect(x0+dir*(w+i*14),y-18-i*6-lift,12,4); ctx.globalAlpha=1; } };

// 5 LINE GO UP — Green Candle: three candles erupt in a rising staircase, the chart line draws across them, last one launches.
U.candles=(H,f,o,S,t,d)=>{
  for(let k=0;k<3;k++){ const at=10+k*11; if(t===at){ const cx=K().clamp(f.x+d*(46+k*52),K().WALL_L+10,K().WALL_R-10); (S.cx=S.cx||[])[k]=cx;
      H.addFx({kind:'candle',x:cx,h:70+k*28,life:36-k*4,max:36-k*4}); H.shake=Math.max(H.shake,5); H.snd('heavy'); H.dust(cx,K().FLOOR); }
    const cx=S.cx&&S.cx[k]; if(cx!==undefined && t>=at+3 && t<=at+14 && !((S.hk|0)&(1<<k)) && H.overlap({x0:cx-13,x1:cx+13,y0:K().FLOOR-(70+k*28),y1:K().FLOOR},o.hurt())){
      S.hk=(S.hk|0)|(1<<k); H.hit(f,o,{dmg:k===2?70:42,h:'mid',kb:k===2?2:1.2,hs:16,launch:k===2?1:0,kd:k===2?1:0,heavy:k===2?1:0}); } }
  if(t===38 && S.cx) H.addFx({kind:'chartLine',pts:S.cx.map((x,k)=>[x,K().FLOOR-(70+k*28)]),dir:d,life:24,max:24});
  if(t>54) end(H,f);
};
POSE.candles=(f,t)=>t<10?['charge',0]:['special',0];
FX.candle=(ctx,e)=>{ const p=1-e.life/e.max, full=e.h||110, h=Math.min(1,p*5)*full*(e.life<6?e.life/6:1), x=e.x, y=K().FLOOR;
  ctx.fillStyle='#0d3a14'; ctx.fillRect(x-1,y-h-18,2,18); ctx.fillRect(x-13,y-h-1,26,h+1);
  ctx.fillStyle='#1f8a2e'; ctx.fillRect(x-12,y-h,24,h); ctx.fillStyle='#3bff6a'; ctx.fillRect(x-10,y-h+2,15,Math.max(0,h-4)); ctx.fillStyle='#b6ffc4'; ctx.fillRect(x-9,y-h+3,3,Math.max(0,h-8));
  if(h>10){ ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.fillStyle='rgba(59,255,106,0.18)'; ctx.fillRect(x-18,y-h-6,36,h+6); ctx.restore(); } };
FX.chartLine=(ctx,e)=>{ const p=Math.min(1,(e.max-e.life)/10), pts=e.pts; ctx.save(); ctx.globalAlpha=Math.min(1,e.life/8); ctx.strokeStyle='#eaffea'; ctx.lineWidth=2; ctx.beginPath();
  const n=(pts.length-1)*p; ctx.moveTo(pts[0][0],pts[0][1]-20); for(let i=1;i<=Math.ceil(n);i++){ const a=pts[i-1], b=pts[i], k=Math.min(1,n-(i-1)); ctx.lineTo(a[0]+(b[0]-a[0])*k,a[1]-20+(b[1]-a[1])*k); } ctx.stroke();
  if(p>=1){ const b=pts[pts.length-1]; ctx.fillStyle='#eaffea'; ctx.beginPath(); ctx.moveTo(b[0]+e.dir*10,b[1]-30); ctx.lineTo(b[0]-e.dir*2,b[1]-26); ctx.lineTo(b[0]+e.dir*4,b[1]-16); ctx.fill(); } ctx.restore(); };

// 6 BEAR MARKET — Capitulation: roars (red screen), leaps, slams. Red shockwaves both ways + falling debris over the enemy.
U.capitulation=(H,f,o,S,t,d)=>{
  if(t===1){ H.addFx({kind:'tint',col:'rgba(180,10,20,0.22)',life:40,max:40}); H.pop(f.x,f.y-130,"IT'S OVER",'#ffd0d0'); }
  if(t===12){ f.vy=-10.5; f.vx=K().clamp((o.x-f.x)/34,-4.5,4.5); H.snd('jump'); }
  if(t>14 && f.grounded && !S.landed){ S.landed=1; f.vx=0; H.shake=16; H.snd('heavy'); H.addFx({kind:'cracks',x:f.x,life:60,max:60,seed:(f.x|0)});
    for(const dd of [-1,1]) H.shoot(f,{w:24,h:22,vx:dd*5.2,y:-8,dmg:70,kind:'redShock',h2:'low',kb:3,kd:1,ox:dd*18});
    if(near(f,o,70) && o.grounded) H.hit(f,o,{dmg:55,h:'mid',kb:3,hs:18,kd:1,heavy:1});
    for(let i=0;i<4;i++) H.proj.push({owner:f,x:K().clamp(o.x+R(-50,50),30,450),y:-20-i*30,w:14,h:14,vx:0,vy:4+i*0.4,dmg:18,kind:'rock',h2:'overhead',kb:1,hs:10,life:120,noMeter:1,t:0}); }
  if(S.landed && ++S.n>22) end(H,f); if(t>110) end(H,f);
};
POSE.capitulation=(f,t)=>t<12?['heavy',(t>>2)&1]:f.grounded?['crouch',0]:['jump',0];
UNDER.cracks=(ctx,e)=>{ const a=Math.min(1,e.life/20); ctx.globalAlpha=a; ctx.strokeStyle='#2b0a08'; ctx.lineWidth=1.5; let s=e.seed;
  const rnd=()=>{ s=(s*9301+49297)%233280; return s/233280; };
  for(const dir of [-1,1]) for(let b=0;b<2;b++){ let x=e.x, y=K().FLOOR; ctx.beginPath(); ctx.moveTo(x,y); for(let i=0;i<6;i++){ x+=dir*(6+rnd()*10); y=K().FLOOR+(rnd()-0.3)*3; ctx.lineTo(x,y); } ctx.stroke(); }
  ctx.fillStyle='#ff4a2a'; ctx.fillRect(e.x-3,K().FLOOR-1,6,2); ctx.globalAlpha=1; };
PROJ.redShock=(ctx,p,H)=>{ const f=H.frame; ctx.fillStyle='rgba(255,40,40,0.35)'; ctx.beginPath(); ctx.ellipse(0,p.h*0.2,p.w*0.7,p.h*0.6,0,Math.PI,0); ctx.fill();
  for(let i=-2;i<=2;i++){ const hh=p.h*(0.45+((i+f)%3)*0.2); ctx.fillStyle=i%2?'#ff2e2e':'#ff8a6a'; ctx.beginPath(); ctx.moveTo(i*5-3,p.h/2-hh); ctx.lineTo(i*5+3,p.h/2-hh); ctx.lineTo(i*5,p.h/2-hh+5); ctx.fill(); ctx.fillRect(i*5-1,p.h/2-hh+4,2,hh-4); } };
PROJ.rock=(ctx,p,H)=>{ ctx.rotate(p.t*0.2); ctx.fillStyle='#2b1405'; ctx.fillRect(-7,-6,14,12); ctx.fillStyle='#8a5a3a'; ctx.fillRect(-6,-5,12,10); ctx.fillStyle='#b88a5a'; ctx.fillRect(-5,-4,5,4); };

// 7 BULL RUN — Stampede: paws the ground, charges leaving green after-images, tosses the enemy skyward on contact.
U.stampede=(H,f,o,S,t,d)=>{
  if(t<12){ if(t%3===0) H.dust(f.x-d*8,f.y); }
  if(t>=12 && t<60 && !S.hit){ f.vx=d*9.6; if(t%3===0){ ghost(H,f,'#3bff6a',12); H.dust(f.x-d*10,f.y); } streaks(H,f.x,f.y,d,'#3bff6a',2);
    if(H.overlap(H.box(f,-4,24,-56,-4),o.hurt())){ S.hit=1; f.vx=0; if(H.hit(f,o,{dmg:125,h:'mid',kb:1,hs:24,kd:1,heavy:1,launch:1})){ o.vy=-11; o.vx=d*2; H.pop(o.x,o.y-140,'WE\'RE SO BACK','#3bff6a'); } }
    if(f.x<=K().WALL_L+12||f.x>=K().WALL_R-12) S.hit=2; }
  else if(t>=12) f.vx*=0.8;
  if(t>=60 || (S.hit && ++S.n>16)) end(H,f);
};
POSE.stampede=(f,t)=>t<12?['crouch',0]:['dash',0];

// 8 THE WHALE — Market Dump: tail splash, then a tsunami that carries the enemy across the screen (multi-hit).
U.tsunami=(H,f,o,S,t,d)=>{
  if(t===8){ for(let i=0;i<18;i++) H.addFx({kind:'px',x:f.x-d*10+R(-10,10),y:f.y-R(0,30),vx:R(-2,2),vy:R(-5,-2),g:0.2,col:i%2?'#bfefff':'#2a6fd6',life:24,s:3}); H.snd('splash'); }
  if(t===14) H.shoot(f,{w:66,h:96,vx:d*3.4,y:-26,dmg:34,kind:'tsunami',h2:'mid',kb:2.4,hs:14,life:200,multi:4,kd:0});
  if(t>30) end(H,f);
};
POSE.tsunami=(f,t)=>t<14?['charge',(t/3)|0]:['special',0];
PROJ.tsunami=(ctx,p,H)=>{ const dir=Math.sign(p.vx)||1, f=H.frame, w=p.w, h=p.h; ctx.scale(dir,1);
  const g=ctx.createLinearGradient(-w/2,0,w/2,0); g.addColorStop(0,'rgba(20,70,160,0.15)'); g.addColorStop(0.6,'#1f5fc0'); g.addColorStop(1,'#2a8af0');
  ctx.fillStyle=g; ctx.beginPath(); ctx.moveTo(-w/2,h/2); ctx.quadraticCurveTo(-w*0.3,-h*0.2,w*0.2,-h/2+Math.sin(f*0.3)*3); ctx.quadraticCurveTo(w*0.62,-h*0.42,w*0.36,-h*0.18); ctx.quadraticCurveTo(w*0.5,h*0.1,w/2,h/2); ctx.fill();
  ctx.fillStyle='#e8fbff'; for(let i=0;i<9;i++){ const a=i/9; ctx.fillRect(w*0.2-a*w*0.5+Math.sin(f*0.4+i)*2,-h/2+a*h*0.12+Math.cos(f*0.3+i)*2,4,3); }
  ctx.fillStyle='rgba(191,239,255,0.7)'; for(let i=0;i<6;i++) ctx.fillRect(-w/2+i*10+((f+i*5)%8),h/2-4-((i*7+f)%10),3,2);
  ctx.scale(dir,1); K().txt(ctx,'DUMP',0,6,'#ffffff',8,'center',true); };

// 9 GAS FEE GOBLIN — Gas Spike: sprays a toxic cloud that lingers: drains special meter, poisons and slows.
U.gasSpike=(H,f,o,S,t,d)=>{
  if(t>=6 && t<=26){ for(let i=0;i<3;i++) H.addFx({kind:'puff',x:f.x+d*R(20,40),y:f.y-R(40,60),vx:d*R(2,4),vy:R(-0.6,0.6),r:R(4,8),col:i%2?'rgba(155,255,58,0.7)':'rgba(95,174,42,0.7)',life:30}); }
  if(t===10){ H.zones.push({owner:f,kind:'gas',x:K().clamp(f.x+d*96,K().WALL_L+40,K().WALL_R-40),w:140,life:180}); H.pop(f.x+d*70,f.y-120,'+$80 GAS','#9bff3a'); }
  if(t===14 && H.overlap(H.box(f,10,70,-80,-10),o.hurt())) H.hit(f,o,{dmg:25,h:'mid',kb:1,hs:14});
  if(t>32) end(H,f);
};
POSE.gasSpike=(f,t)=>['punch',t>6?1:0];
ZONE.gas=(H,z,tgt)=>{ if(Math.abs(tgt.x-z.x)<z.w/2 && tgt.y>K().FLOOR-130){ tgt.slow=6; tgt.meter=Math.max(0,tgt.meter-0.6); if(H.phase==='fight' && tgt.hp>1) tgt.hp-=0.55;
    if(z.life%20===0) H.pop(tgt.x,tgt.y-130,['-$80','-$120','-$420','GWEI!'][(z.life/20|0)%4],'#9bff3a'); } };
UNDER.zone_gas=(ctx,z,H)=>{ const f=H.frame, a=Math.min(1,z.life/30); ctx.save(); ctx.globalAlpha=a;
  for(let i=0;i<9;i++){ const x=z.x-z.w/2+((i*29+f*0.6)%z.w), y=K().FLOOR-20-((i*37)%80)+Math.sin(f*0.05+i)*6, r=14+((i*7)%10);
    ctx.fillStyle=i%2?'rgba(155,255,58,0.28)':'rgba(95,174,42,0.32)'; ctx.beginPath(); ctx.arc(x,y,r,0,7); ctx.fill(); }
  ctx.fillStyle='rgba(155,255,58,0.5)'; for(let i=0;i<6;i++){ const x=z.x-z.w/2+((i*41+f)%z.w); ctx.fillRect(x,K().FLOOR-30-((f*0.8+i*23)%90),2,2); } ctx.restore(); };

// 10 GALAXY BRAIN — Big Brain Beam: opens a galaxy portal behind, then fires a huge wobbling psychic beam (multi-hit).
U.bigBrainBeam=(H,f,o,S,t,d)=>{
  if(t===1) H.addFx({kind:'portal',idx:H.p.indexOf(f),life:80,max:80});
  if(t<30 && t%2===0){ const a=t*0.7; H.addFx({kind:'px',x:f.x+d*30+Math.cos(a)*30,y:f.y-80+Math.sin(a)*30,vx:-Math.cos(a)*1.5,vy:-Math.sin(a)*1.5,col:t%4?'#c9a0ff':'#7fdcff',life:16,s:2}); }
  if(t>=30 && t<=70){ S.beam={x0:f.x+d*30, x1:d>0?K().AW+20:-20, y0:f.y-118, y1:f.y-28, col:'#c9a0ff', style:'galaxy'};
    if(t%5===0 && H.overlap(H.norm(S.beam),o.hurt())) H.hit(f,o,{dmg:22,h:'mid',kb:1.4,hs:10,noMeter:1}); if(t%4===0) H.shake=Math.max(H.shake,3); }
  else S.beam=null;
  if(t>78) end(H,f);
};
POSE.bigBrainBeam=(f,t)=>t<30?['charge',(t/3)|0]:['special',0];
UNDER.portal=(ctx,e,H)=>{ const f=H.p[e.idx]; if(!f) return; const k=e.max-e.life, s=Math.min(1,k/12)*Math.min(1,e.life/12), x=f.x-f.face*6, y=f.y-70;
  ctx.save(); ctx.globalAlpha=0.85*s; const g=ctx.createRadialGradient(x,y,2,x,y,46); g.addColorStop(0,'#ffffff'); g.addColorStop(0.25,'#c9a0ff'); g.addColorStop(0.7,'rgba(60,20,140,0.7)'); g.addColorStop(1,'rgba(20,0,60,0)');
  ctx.fillStyle=g; ctx.beginPath(); ctx.ellipse(x,y,46*s,56*s,0,0,7); ctx.fill();
  ctx.fillStyle='#fff'; for(let i=0;i<14;i++){ const a=i*0.9+H.frame*0.08, r=8+((i*13)%38); ctx.fillRect(x+Math.cos(a)*r*s,y+Math.sin(a)*r*1.2*s,1.5,1.5); } ctx.restore(); };

// 11 COPIUM HUFFER — Huff: inhales copium, exhales a purple blast that shoves the enemy away, then heals over time.
U.copiumHuff=(H,f,o,S,t,d)=>{
  if(t<28 && t%2===0){ const a=R(0,6.28), r=R(40,70); H.addFx({kind:'puff',x:f.x+Math.cos(a)*r,y:f.y-60+Math.sin(a)*r*0.6,vx:-Math.cos(a)*2.4,vy:-Math.sin(a)*1.5,r:4,col:'rgba(190,120,255,0.6)',life:20}); }
  if(t===28){ H.ring(f.x,f.y-60,'#c98aff'); H.ring(f.x,f.y-60,'#ffffff'); burst(H,f.x,f.y-60,['#c98aff','#ffd6ff','#ffffff'],20,4);
    if(near(f,o,90)) H.hit(f,o,{dmg:35,h:'mid',kb:7,hs:16,kd:1}); f.healT=200; H.snd('heal'); H.pop(f.x,f.y-130,"IT'S FINE.",'#d8b0ff'); H.addFx({kind:'aura',idx:H.p.indexOf(f),col:'#c98aff',life:200,max:200}); }
  if(t>40) end(H,f);
};
POSE.copiumHuff=(f,t)=>t<28?['charge',(t/3)|0]:['special',0];
UNDER.aura=(ctx,e,H)=>{ const f=H.p[e.idx]; if(!f) return; const a=Math.min(1,e.life/20)*0.5; ctx.save(); ctx.globalAlpha=a; ctx.globalCompositeOperation='lighter';
  const g=ctx.createRadialGradient(f.x,f.y-55,4,f.x,f.y-55,44); g.addColorStop(0,e.col); g.addColorStop(1,'rgba(0,0,0,0)'); ctx.fillStyle=g; ctx.fillRect(f.x-44,f.y-110,88,110);
  ctx.fillStyle=e.col; for(let i=0;i<4;i++){ const yy=f.y-((H.frame*0.8+i*28)%110); ctx.fillRect(f.x-16+i*10,yy,2,2); } ctx.restore(); };

// 12 NPC — Scripted: spawns three NPC clones that march in lockstep and all swing at the same time.
U.scripted=(H,f,o,S,t,d)=>{
  if(t===8){ H.addFx({kind:'glitchText',x:f.x,y:f.y-130,text:'SPAWNING NPC.EXE',life:40,max:40});
    for(let i=0;i<3;i++){ const x=K().clamp(f.x-d*(30+i*26),24,456); H.clones.push({owner:f,x,y:K().FLOOR,life:300,face:d,t:i*4,group:H.frame,lead:i===0}); burst(H,x,K().FLOOR-50,['#cccccc','#7fdcff','#ffffff'],10,2.5); } }
  if(t>22) end(H,f);
};
POSE.scripted=(f,t)=>['charge',(t/3)|0];
FX.glitchText=(ctx,e)=>{ const j=(e.life%4<2)?1:-1; K().txt(ctx,e.text,e.x+j,e.y,'#00ffd0',7,'center',true); K().txt(ctx,e.text,e.x-j,e.y,'rgba(255,46,196,0.6)',7,'center'); };

// 13 CLICKBAIT — Thumbnail Face: slaps a SHOCKING thumbnail on the enemy (stuns them), then blinks in for an unblockable hit.
U.thumbnailFace=(H,f,o,S,t,d)=>{
  if(t===4){ H.addFx({kind:'thumb',idx:H.p.indexOf(o),life:40,max:40}); H.snd('superstart');
    if(!o.invuln && !o.hidden && o.state!=='ko' && o.state!=='special'){ S.stun=1; o.set('hit'); o.stun=34; o.vx=0; o.atk=null; o.sp=null; H.pop(o.x,o.y-150,"YOU WON'T BELIEVE #7",'#ffd23f'); } }
  if(t===12){ f.hidden=true; burst(H,f.x,f.y-60,['#ff2e2e','#ffffff'],12); }
  if(t===18){ const side=o.face; let nx=o.x-side*44; if(nx<K().WALL_L+20||nx>K().WALL_R-20) nx=o.x+side*44; f.x=K().clamp(nx,K().WALL_L+12,K().WALL_R-12); f.face=o.x>=f.x?1:-1; f.hidden=false; burst(H,f.x,f.y-60,['#ff2e2e','#ffffff'],12); }
  if(t>20 && t<28 && !S.hit && H.overlap(H.box(f,0,34,-56,-10),o.hurt())){ S.hit=1; H.hit(f,o,{dmg:S.stun?105:80,h:'unblockable',kb:4,hs:26,kd:1,heavy:1}); }
  if(t>38) end(H,f);
};
POSE.thumbnailFace=(f,t)=>t<12?['special',0]:['heavy',t>20&&t<28?1:0];
FX.thumb=(ctx,e,H)=>{ const o=H.p[e.idx]; if(!o) return; const k=e.max-e.life, s=Math.min(1,k/5), x=o.x, y=o.y-80*o.size;
  ctx.save(); ctx.globalAlpha=Math.min(1,e.life/8); ctx.strokeStyle='#ff2e2e'; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(x,y,28*s,0,7); ctx.stroke();
  ctx.fillStyle='#ff2e2e'; const ax=x+40*s, ay=y-34*s; ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(ax-14,ay+16); ctx.lineTo(ax-4,ay+12); ctx.lineTo(ax-6,ay+24); ctx.lineTo(ax+2,ay+10); ctx.lineTo(ax+8,ay+16); ctx.closePath(); ctx.fill();
  K().txt(ctx,'SHOCKING',x,y-36*s,'#ffd23f',8,'center',true); ctx.restore(); };

// 14 KEYBOARD WARRIOR — CAPS LOCK RAGE: 8-hit keyboard smash, keycaps flying everywhere, last key launches.
U.flurry=(H,f,o,S,t,d)=>{
  if(t>=6 && t<=46){ f.vx=d*1.2; if((t-6)%5===0){ S.k=(S.k|0)+1; const L=['A','S','D','F','W','!','?','Q'][S.k%8];
      H.addFx({kind:'key',x:f.x+d*R(16,40),y:f.y-R(50,90),vx:d*R(0.5,2.5),vy:R(-3,-1),g:0.15,ch:L,life:26,max:26,rot:R(-0.4,0.4)});
      if(H.overlap(H.box(f,0,40,-62,-18),o.hurt())) H.hit(f,o,{dmg:14,h:'high',kb:0.4,hs:9,noMeter:1}); } }
  else f.vx=0;
  if(t===50){ H.addFx({kind:'key',x:f.x+d*30,y:f.y-70,vx:d*2,vy:-4,g:0.12,ch:'CAPS',big:1,life:36,max:36,rot:0}); if(H.overlap(H.box(f,0,44,-70,-10),o.hurt())) H.hit(f,o,{dmg:55,h:'mid',kb:2,hs:24,launch:1,kd:1,heavy:1}); }
  if(t>60) end(H,f);
};
POSE.flurry=(f,t)=>t>=6&&t<=52?['punch',(t>>1)&1]:['charge',0];
FX.key=(ctx,e)=>{ const w=e.big?26:10, h=e.big?12:10; ctx.save(); ctx.translate(e.x,e.y); ctx.rotate((e.rot||0)+(e.max-e.life)*0.08*(e.rot>0?1:-1)); ctx.globalAlpha=Math.min(1,e.life/8);
  ctx.fillStyle='#2b1405'; ctx.fillRect(-w/2-1,-h/2-1,w+2,h+3); ctx.fillStyle='#e8e4dc'; ctx.fillRect(-w/2,-h/2,w,h); ctx.fillStyle='#bdb6aa'; ctx.fillRect(-w/2,h/2-2,w,2);
  K().txt(ctx,e.ch,0,e.big?-4:-3.5,'#2b1405',e.big?7:6,'center'); ctx.restore(); };

// 15 TOUCH GRASS — Grass Field: a wave of grass rolls across the floor. Grounded enemies get rooted by vines; flowers heal you.
U.touchGrass=(H,f,o,S,t,d)=>{
  if(t===8){ H.addFx({kind:'grassWave',x:f.x,dir:d,life:40,max:40}); H.snd('heal'); }
  if(t>8 && t<40 && !S.rooted){ const front=f.x+d*(t-8)*12; if(o.grounded && (front-o.x)*d>=0 && (o.x-f.x)*d>0){ S.rooted=1;
      if(!o.invuln){ o.root=80; H.hit(f,o,{dmg:40,h:'low',kb:0,hs:14}); H.addFx({kind:'vines',idx:H.p.indexOf(o),life:80,max:80}); H.pop(o.x,o.y-130,'LOG OFF','#6fe04a'); } } }
  if(t===30){ f.hp=Math.min(K().MAXHP,f.hp+60); for(let i=0;i<8;i++) H.addFx({kind:'plus',x:f.x+R(-20,20),y:f.y-R(20,100),vy:-0.8,col:'#6fe04a',life:30}); }
  if(t>44) end(H,f);
};
POSE.touchGrass=(f,t)=>t<8?['crouch',0]:['charge',(t/4)|0];
UNDER.grassWave=(ctx,e,H)=>{ const k=e.max-e.life, len=Math.min(440,k*12), a=Math.min(1,e.life/10); ctx.save(); ctx.globalAlpha=a;
  for(let i=0;i<len;i+=3){ const x=e.x+e.dir*i, h=4+((i*7+H.frame)%7)+(len-i<20?6:0); ctx.fillStyle=((i/3)|0)%2?'#3fae2a':'#6fe04a'; ctx.fillRect(x,K().FLOOR-h,2,h);
    if((i%27)===0){ ctx.fillStyle=['#ffd23f','#ff9ad5','#ffffff'][(i/27|0)%3]; ctx.fillRect(x-1,K().FLOOR-h-2,3,3); } } ctx.restore(); };
FX.vines=(ctx,e,H)=>{ const o=H.p[e.idx]; if(!o) return; const a=Math.min(1,e.life/12); ctx.save(); ctx.globalAlpha=a; ctx.strokeStyle='#2f8a1f'; ctx.lineWidth=2;
  for(let i=0;i<3;i++){ ctx.beginPath(); for(let y=0;y<46;y+=3){ const x=o.x+Math.sin(y*0.25+i*2+H.frame*0.1)*(9-i*2); y?ctx.lineTo(x,K().FLOOR-y):ctx.moveTo(x,K().FLOOR); } ctx.stroke(); }
  ctx.fillStyle='#6fe04a'; for(let i=0;i<6;i++) ctx.fillRect(o.x-8+((i*7)%16),K().FLOOR-8-i*7,3,2); ctx.restore(); };

// 16 SIGMA GRINDER — 4AM Grind: a giant 4AM clock; the enemy runs at half speed while you speed up.
U.timeStop=(H,f,o,S,t,d)=>{
  if(t===1){ o.timeSlow=150; f.buff.spd=170; H.addFx({kind:'tint',col:'rgba(40,70,200,0.24)',life:150,max:150}); H.addFx({kind:'clock',life:150,max:150}); }
  if(t>16) end(H,f);
};
POSE.timeStop=(f,t)=>['charge',(t/3)|0];
UNDER.clock=(ctx,e,H)=>{ const k=e.max-e.life, a=Math.min(1,k/10,e.life/15)*0.55, x=K().AW/2, y=92, r=54;
  ctx.save(); ctx.globalAlpha=a; ctx.fillStyle='rgba(10,20,60,0.6)'; ctx.beginPath(); ctx.arc(x,y,r,0,7); ctx.fill(); ctx.strokeStyle='#bcd2ff'; ctx.lineWidth=2; ctx.stroke();
  ctx.fillStyle='#bcd2ff'; for(let i=0;i<12;i++){ const q=i/12*6.283; ctx.fillRect(x+Math.cos(q)*(r-6)-1,y+Math.sin(q)*(r-6)-1,2,2); }
  const hr=-Math.PI/2+4/12*6.283+k*0.002, mn=-Math.PI/2+k*0.06; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+Math.cos(hr)*28,y+Math.sin(hr)*28); ctx.stroke();
  ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+Math.cos(mn)*42,y+Math.sin(mn)*42); ctx.stroke(); ctx.globalAlpha=Math.min(1,a*1.8); K().txt(ctx,'4:00 AM',x,y+r+12,'#ffffff',8,'center',true); ctx.restore(); };

// 17 SKILL ISSUE — Reverse Card: a spinning reverse card reflects projectiles and counters punches; if nothing comes, it's thrown as a boomerang.
U.reverseCard=(H,f,o,S,t,d)=>{
  if(t===1){ f.reflect=56; H.addFx({kind:'card',idx:H.p.indexOf(f),life:56,max:56}); }
  if(f.reflect<=0 && t>1 && t<50 && !S.done){ S.done=1; }
  if(t===56 && !S.done){ f.reflect=0; H.shoot(f,{w:18,h:24,vx:d*7,y:-42,dmg:38,kind:'cardProj',h2:'mid',kb:2,hs:14,ret:34,multi:2,life:90}); H.snd('whoosh'); }
  if(t>66 || (S.done && t>8)) end(H,f);
};
POSE.reverseCard=(f,t)=>t<56?['block',0]:['punch',1];
const drawCard=(ctx,w,h,spin)=>{ const sx=Math.cos(spin); ctx.scale(sx||0.05,1); ctx.fillStyle='#2b1405'; ctx.fillRect(-w/2-1,-h/2-1,w+2,h+2); ctx.fillStyle=sx>0?'#1fb04a':'#ff2e2e'; ctx.fillRect(-w/2,-h/2,w,h);
  ctx.fillStyle='#ffffff'; ctx.beginPath(); ctx.ellipse(0,0,w*0.32,h*0.38,0.5,0,7); ctx.fill(); ctx.fillStyle=sx>0?'#1fb04a':'#ff2e2e';
  ctx.beginPath(); ctx.moveTo(-4,-1); ctx.lineTo(2,-6); ctx.lineTo(2,-2); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(4,1); ctx.lineTo(-2,6); ctx.lineTo(-2,2); ctx.closePath(); ctx.fill(); };
FX.card=(ctx,e,H)=>{ const f=H.p[e.idx]; if(!f||f.reflect<=0) return; ctx.save(); ctx.translate(f.x+f.face*26,f.y-66); drawCard(ctx,22,32,H.frame*0.25); ctx.restore(); };
PROJ.cardProj=(ctx,p,H)=>{ drawCard(ctx,p.w,p.h,H.frame*0.5); };

// 18 RATIO — Ratio'd: three giant Ls rain on the enemy's position; each hit steals health.
U.ratioDrop=(H,f,o,S,t,d)=>{
  if(t===4) H.pop(f.x,f.y-130,'+ L + RATIO','#ff2ec4');
  if(t===10||t===26||t===42){ (S.drops=S.drops||[]).push({x:K().clamp(o.x,K().WALL_L+12,K().WALL_R-12),t0:t}); }
  for(const L of (S.drops||[])){ const k=t-L.t0;
    if(k===0) H.addFx({kind:'ratioL',x:L.x,life:26,max:26});
    if(k===18){ H.shake=Math.max(H.shake,6); H.dust(L.x,K().FLOOR); burst(H,L.x,K().FLOOR-6,['#ff2ec4','#ffb8e8'],8,2.5);
      if(H.overlap({x0:L.x-16,x1:L.x+16,y0:K().FLOOR-130,y1:K().FLOOR},o.hurt())){ const hp0=o.hp; H.hit(f,o,{dmg:48,h:'overhead',kb:1,hs:18}); const st=Math.max(0,hp0-o.hp)*0.6; if(st>0){ f.hp=Math.min(K().MAXHP,f.hp+st); for(let i=0;i<5;i++) H.addFx({kind:'plus',x:f.x+R(-14,14),y:f.y-R(40,100),vy:-0.8,col:'#ff2ec4',life:26}); } } } }
  if(t>70) end(H,f);
};
POSE.ratioDrop=(f,t)=>['special',0];
FX.ratioL=(ctx,e)=>{ const k=e.max-e.life, x=e.x, F=K().FLOOR;
  if(k<18){ ctx.globalAlpha=0.35+0.25*Math.sin(k); ctx.fillStyle='#ff2ec4'; ctx.fillRect(x-16,F-2,32,3); ctx.globalAlpha=1; }
  const y = k<18 ? -40+(F-60+40)*(k/18)*(k/18) : F-60; ctx.save(); ctx.globalAlpha=e.life<6?e.life/6:1;
  ctx.fillStyle='#2b1405'; ctx.fillRect(x-15,y-2,14,64); ctx.fillRect(x-15,y+46,34,16);
  ctx.fillStyle='#ff2ec4'; ctx.fillRect(x-13,y,10,60); ctx.fillRect(x-13,y+48,30,12); ctx.fillStyle='#ffb8e8'; ctx.fillRect(x-12,y+1,3,56); ctx.fillStyle='#c0108a'; ctx.fillRect(x-4,y+2,2,46); ctx.restore(); };

// 19 MAIN CHARACTER — Plot Armour: spotlights snap on, a golden blast knocks the enemy back, and you can't drop below 1 HP for 8s.
U.plotArmour=(H,f,o,S,t,d)=>{
  if(t===1){ f.buff.plot=480; H.addFx({kind:'spot',idx:H.p.indexOf(f),life:480,max:480}); H.pop(f.x,f.y-140,'MAIN CHARACTER','#ffb000'); }
  if(t===12){ H.ring(f.x,f.y-60,'#ffb000'); H.ring(f.x,f.y-60,'#ffffff'); burst(H,f.x,f.y-60,['#ffb000','#ffe08a','#ffffff'],22,4.5); if(near(f,o,96)) H.hit(f,o,{dmg:50,h:'mid',kb:6,hs:20,kd:1}); }
  if(t>26) end(H,f);
};
POSE.plotArmour=(f,t)=>t<12?['charge',(t/3)|0]:['special',0];
UNDER.spot=(ctx,e,H)=>{ const f=H.p[e.idx]; if(!f||!(f.buff&&f.buff.plot>0)) return; const a=Math.min(1,e.life/20,(e.max-e.life)/8)*0.35; ctx.save(); ctx.globalAlpha=a; ctx.globalCompositeOperation='lighter';
  for(const sx of [-1,1]){ const g=ctx.createLinearGradient(f.x+sx*120,0,f.x,f.y); g.addColorStop(0,'rgba(255,230,150,0.0)'); g.addColorStop(1,'rgba(255,220,120,0.9)'); ctx.fillStyle=g;
    ctx.beginPath(); ctx.moveTo(f.x+sx*130,-10); ctx.lineTo(f.x+sx*110,-10); ctx.lineTo(f.x-14,f.y); ctx.lineTo(f.x+14,f.y); ctx.closePath(); ctx.fill(); }
  ctx.fillStyle='rgba(255,220,120,0.6)'; ctx.beginPath(); ctx.ellipse(f.x,K().FLOOR,22,4,0,0,7); ctx.fill(); ctx.restore(); };

// 20 LAG SPIKE — Rollback: VHS rewind. Snaps back to where you were 2s ago (with that HP) and desyncs the enemy.
U.rollback=(H,f,o,S,t,d)=>{
  if(t===1){ const h=f.hist[0]; const pts=[]; for(let i=f.hist.length-1;i>=0;i-=10) pts.push([f.hist[i].x,f.hist[i].y]);
    H.addFx({kind:'rewindTrail',pts,idx:H.p.indexOf(f),life:24,max:24}); H.addFx({kind:'vhs',life:30,max:30});
    if(h){ f.x=h.x; f.y=Math.min(K().FLOOR,h.y); f.hp=Math.max(f.hp,h.hp); } f.invuln=20;
    if(o.state!=='kd'&&o.state!=='ko'&&!o.invuln){ o.set('hit'); o.stun=40; o.vx=0; o.sp=null; o.atk=null; H.pop(o.x,o.y-140,'DESYNC','#00ffd0'); } H.glitch=20; }
  if(t>20) end(H,f);
};
POSE.rollback=(f,t)=>['charge',(t/2)|0];
FX.rewindTrail=(ctx,e,H)=>{ const f=H.p[e.idx]; if(!f) return; const a=Math.min(1,e.life/10); ctx.save(); ctx.globalAlpha=0.5*a; ctx.strokeStyle='#00ffd0'; ctx.lineWidth=2; ctx.setLineDash([4,3]); ctx.beginPath();
  e.pts.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]-50):ctx.moveTo(p[0],p[1]-50)); ctx.stroke(); ctx.setLineDash([]);
  e.pts.forEach((p,i)=>{ if(i%2) return; const cv=DD.Sprites.get(f.spec,'idle',0,f.alt,false), k=2/DD.Sprites.RES; ctx.save(); ctx.globalAlpha=0.2*a; ctx.translate(p[0],p[1]); ctx.scale(f.face*k,k); ctx.drawImage(cv,-cv._ox,-cv._oy); ctx.restore(); }); ctx.restore(); };
FX.vhs=(ctx,e,H)=>{ const a=Math.min(1,e.life/8); ctx.save(); ctx.globalAlpha=0.25*a; ctx.fillStyle='#00ffd0'; for(let y=(H.frame*3)%6;y<K().AH;y+=6) ctx.fillRect(0,y,K().AW,1);
  ctx.globalAlpha=a; K().txt(ctx,'<< REWIND',20,40,'#ffffff',10,'left',true); ctx.restore(); };

// 21 ZOOMIE SHIBA — Zoomies: three zig-zag dashes with after-images, then a spinning tackle that launches.
U.zoomies=(H,f,o,S,t,d)=>{
  const k=Math.floor((t-4)/14);
  if(t>4 && k<4){ const ph=(t-4)%14;
    if(ph===0){ f.face=o.x>=f.x?1:-1; S.hit=0; H.snd('whoosh'); }
    f.passThru=true; f.vx = ph<9 ? f.face*(k===3?10:12.5) : 0; if(t%2===0) ghost(H,f,'#ffd23f',10); streaks(H,f.x,f.y,f.face,'#ffd23f',1);
    if(!S.hit && H.overlap(H.box(f,-8,16,-50,-4),o.hurt())){ S.hit=1; const last=k===3; H.hit(f,o,last?{dmg:60,h:'mid',kb:2,hs:24,launch:1,kd:1,heavy:1}:{dmg:30,h:'mid',kb:1,hs:16}); } }
  if(t>4+56+6) end(H,f);
};
POSE.zoomies=(f,t)=>{ const k=Math.floor((t-4)/14); return k===3?['ball',(t/2)|0]:['dash',0]; };

// 22 LOAF CAT — Loaf Mode: turns into a bread loaf, rolls invulnerable (bouncing off one wall), knocks the enemy down, then sits and heals.
U.loafRoll=(H,f,o,S,t,d)=>{
  if(t===1){ S.dir=d; burst(H,f.x,f.y-30,['#e8b060','#ffd890','#ffffff'],12); }
  if(t<56){ f.passThru=true; f.invuln=2; f.vx=S.dir*6.6;
    if((f.x<=K().WALL_L+14 && S.dir<0) || (f.x>=K().WALL_R-14 && S.dir>0)){ if(!S.bounced){ S.bounced=1; S.dir=-S.dir; H.shake=6; H.dust(f.x,f.y); } }
    if(!S.hit && H.overlap(H.box(f,-14,14,-26,0),o.hurt())){ S.hit=1; f.invuln=0; H.hit(f,o,{dmg:85,h:'low',kb:3,hs:22,kd:1}); f.invuln=2; } }
  else { f.vx=0; if(t===56){ f.hp=Math.min(K().MAXHP,f.hp+60); H.snd('heal'); H.pop(f.x,f.y-110,'IF I FITS I SITS','#ffd890'); } }
  if(t>66) end(H,f);
};
POSE.loafRoll=(f,t)=>t<56?['ball',(t/3)|0]:['charge',0];
DRAWF.loafRoll=(ctx,f,H)=>{ const t=f.sp.t; if(t>=56) return false; const x=f.x, y=f.y, a=t*0.35*(f.vx>=0?1:-1);
  ctx.save(); ctx.translate(x,y-14); ctx.rotate(a); ctx.fillStyle='#2b1405'; ctx.beginPath(); ctx.ellipse(0,0,19,14,0,0,7); ctx.fill();
  ctx.fillStyle='#c97a2e'; ctx.beginPath(); ctx.ellipse(0,0,18,13,0,0,7); ctx.fill(); ctx.fillStyle='#e8b060'; ctx.beginPath(); ctx.ellipse(-2,-3,15,9,0,0,7); ctx.fill();
  ctx.fillStyle='#ffd890'; ctx.fillRect(-10,-6,4,2); ctx.fillRect(-2,-8,4,2); ctx.fillRect(6,-6,4,2); ctx.fillStyle='#2b1405'; ctx.fillRect(8,0,2,2); ctx.fillRect(13,0,2,2); ctx.restore(); return true; };

// 23 ABSOLUTE UNIT — Body Slam: command grab, leaps to the top of the screen, piledrives the enemy into a crater.
U.bodySlam=(H,f,o,S,t,d)=>{
  if(t===6 && !S.grab){ if(Math.abs(o.x-f.x)<38*f.size && o.grounded && !o.invuln && o.state!=='kd'){ S.grab=1; o.set('hit'); o.stun=90; o.sp=null; o.atk=null; H.pop(f.x,f.y-150,'IN AWE OF THE SIZE','#ffd23f'); } }
  if(S.grab){ const k=t-6, up=Math.min(1,k/18), down=k>26?Math.min(1,(k-26)/8):0, hgt=Math.sin(up*Math.PI/2)*150*(1-down);
    f.y=K().FLOOR-hgt; f.vy=0; f.vx=0; o.x=K().clamp(f.x+d*10,K().WALL_L+20,K().WALL_R-20); o.y=f.y-40*(1-down); o.vx=0; o.vy=0;
    if(k>2 && k<26 && k%3===0) H.addFx({kind:'streak',x:f.x+R(-20,20),y:f.y+R(0,40),vx:0,col:'#ffffff',life:8,len:2});
    if(k===34){ f.y=K().FLOOR; o.y=K().FLOOR; H.shake=20; H.whiteFlash=6; H.snd('heavy'); H.addFx({kind:'crater',x:f.x,life:70,max:70});
      burst(H,f.x,K().FLOOR-4,['#d8b08a','#8a5a3a','#ffffff'],26,5,0.15);
      for(const dd of [-1,1]) H.shoot(f,{w:22,h:18,vx:dd*5,y:-6,dmg:30,kind:'shock',h2:'low',kb:2,ox:dd*30});
      H.hit(f,o,{dmg:165,h:'unblockable',kb:3,hs:30,kd:1,heavy:1}); } }
  if(t>(S.grab?52:36)){ f.y=K().FLOOR; end(H,f); }
};
POSE.bodySlam=(f,t)=>['grab',0];

// 24 DOOMSCROLLER — Infinite Scroll: an endless column of phones scrolls down onto the enemy, then ONE MORE giant phone.
U.infiniteScroll=(H,f,o,S,t,d)=>{
  if(t===4){ S.x=o.x; H.addFx({kind:'feed',idx:H.p.indexOf(o),life:58,max:58}); }
  if(t>4) S.x+= (o.x-S.x)*0.08;
  if(t>=8 && t<=44 && t%5===3) H.proj.push({owner:f,x:S.x+R(-6,6),y:-16,w:12,h:18,vx:0,vy:7,dmg:12,kind:'phone',h2:'overhead',kb:0.5,hs:10,life:60,noMeter:1,t:0});
  if(t===50){ H.proj.push({owner:f,x:S.x,y:-40,w:30,h:44,vx:0,vy:8,dmg:55,kind:'bigphone',h2:'overhead',kb:3,hs:22,kd:1,heavy:1,life:60,t:0}); H.pop(S.x,60,'ONE MORE SCROLL','#7fdcff'); }
  if(t>66) end(H,f);
};
POSE.infiniteScroll=(f,t)=>['special',0];
UNDER.feed=(ctx,e,H)=>{ const o=H.p[e.idx]; if(!o) return; const a=Math.min(1,e.life/10,(e.max-e.life)/6)*0.25; ctx.save(); ctx.globalAlpha=a; ctx.fillStyle='#7fdcff'; ctx.fillRect(o.x-14,0,28,K().FLOOR); ctx.restore(); };
PROJ.bigphone=(ctx,p,H)=>{ const w=p.w, h=p.h; ctx.fillStyle='#111'; ctx.fillRect(-w/2,-h/2,w,h); ctx.fillStyle=H.frame%4<2?'#7fdcff':'#ff2ec4'; ctx.fillRect(-w/2+2,-h/2+3,w-4,h-9);
  ctx.fillStyle='#fff'; for(let i=0;i<4;i++) ctx.fillRect(-w/2+4,-h/2+6+i*7,w-8-((i*5)%10),2); ctx.fillStyle='#444'; ctx.fillRect(-3,h/2-5,6,2); };

// shared FX
FX.ghost=(ctx,e,H)=>{ const f=H.p[e.idx]; if(!f) return; const cv=DD.Sprites.get(f.spec,e.pose,e.fr,f.alt,false), k=2/DD.Sprites.RES;
  ctx.save(); ctx.globalAlpha=0.45*e.life/e.max; ctx.translate(e.x,e.y); ctx.scale(e.face*k,k); ctx.drawImage(cv,-cv._ox,-cv._oy); ctx.restore(); };
FX.tint=(ctx,e)=>{ ctx.fillStyle=e.col; ctx.globalAlpha=Math.min(1,e.life/20,(e.max-e.life)/8); ctx.fillRect(0,0,K().AW,K().AH); ctx.globalAlpha=1; };

// passive per-fighter ticks (run every frame for both fighters)
function tick(H,f){ shellTick(H,f); if(f.root>0){ f.root--; if(f.grounded) f.vx=0; } }

// beam style: galaxy
function drawBeam(ctx,b,n,H){ if(b.style!=='galaxy') return false; const h=n.y1-n.y0, f=H.frame, cy=(n.y0+n.y1)/2;
  ctx.save(); ctx.globalCompositeOperation='lighter';
  for(let i=0;i<3;i++){ const hh=h*(1-i*0.28)*(0.92+0.08*Math.sin(f*0.5+i)); ctx.fillStyle=['rgba(120,60,220,0.5)','rgba(201,160,255,0.7)','rgba(255,255,255,0.9)'][i]; ctx.fillRect(n.x0,cy-hh/2,n.x1-n.x0,hh); }
  ctx.fillStyle='#fff'; for(let i=0;i<24;i++){ const x=n.x0+((i*37+f*9)%(n.x1-n.x0)), y=cy+Math.sin(i*1.7+f*0.3)*h*0.4; ctx.fillRect(x,y,2,2); } ctx.restore(); return true; }

DD.Specials = { update:U, pose:POSE, fx:FX, under:UNDER, proj:PROJ, zone:ZONE, drawFighter:DRAWF, tick, drawBeam,
  RANGED:['panicSell','candles','tsunami','gasSpike','bigBrainBeam','infiniteScroll','rugPull','touchGrass','scripted','ratioDrop','thumbnailFace'],
  SELF:['crystalShell','copiumHuff','plotArmour','rollback','timeStop','reverseCard'] };
})();
