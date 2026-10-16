/* DEGEN DOJO — UI, modes (cpu / local / ranked), input (kbm, split keyboard, gamepads, touch), loop */
(function(){
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const F=DD.FIGHTERS, AR=DD.ARENAS, Au=DD.Audio, ON=DD.Online;
const st = { screen:'title', mode:'cpu', step:0, p1:null, p2:null, arena:null, cursor:0, diff:'normal', fight:null, randomCpu:false, net:null, online:null, q:null };
try{ st.diff = localStorage.getItem('dd_diff') || 'normal'; }catch(e){}
window.DD_STATE = st;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// ---------- screens ----------
function show(name){
  st.screen=name; document.body.dataset.screen=name; $$('.screen').forEach(s=>s.classList.toggle('active', s.id==='screen-'+name));
  window.scrollTo(0,0);
  if(name==='title') Au.playSong(Au.TITLE_SONG);
  $('#keysSolo').hidden = st.mode==='local'; $('#keysLocal').hidden = st.mode!=='local';
  if(DD.Scene){ if(name==='game') DD.Scene.pause(); else DD.Scene.resume(); }
  if(name==='game' && typeof Chat!=='undefined') setTimeout(()=>Chat.layout(),0);
  if(name==='select' && st.step===2) loadArenaThumbs();
}
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.hidden=false; clearTimeout(toast.t); toast.t=setTimeout(()=>t.hidden=true,3800); }

// ---------- audio ----------
let audioOn=false;
function unlock(){ if(audioOn) return; audioOn=true; Au.init(); $('#soundHint').textContent = Au.isMuted()?'SOUND OFF':'8-BIT SOUND ON';
  if(st.screen==='game' && st.fight) Au.playSong(st.fight.arena.music, true); else Au.playSong(Au.TITLE_SONG); }
document.addEventListener('pointerdown',unlock); document.addEventListener('keydown',unlock);
function syncMute(){ $('#muteBtn').classList.toggle('muted',Au.isMuted()); $('#muteBtn').textContent = Au.isMuted()?'×':'♪'; if(audioOn) $('#soundHint').textContent = Au.isMuted()?'MUSIC OFF':'8-BIT SOUND ON'; $('#muteBtn').title = Au.isMuted()?'Music off (fight sounds still on)':'Mute music'; }
$('#muteBtn').onclick=()=>{ Au.setMuted(!Au.isMuted()); syncMute(); };
syncMute();

// ---------- title ----------
// full-width wooden stage along the bottom of the title screen, with a big line-up standing on it
const tcv=$('#titleCanvas'), tc=tcv.getContext('2d');
const lineupAll=['bear','moon','diamond','main','whale','shiba','brain','sigma','doom'].map(id=>F.find(f=>f.id===id)).filter(Boolean);
let tf=0, titleStage=null, tW=0, tH=0, tPX=3;
function bakeTitleStage(W,H,px){ // floor drawn on a coarse pixel grid, then blown up crisp
  const P=DD.Pix, w=Math.ceil(W/px), h=Math.ceil(H/px), cv=document.createElement('canvas'); cv.width=w; cv.height=h; const c=cv.getContext('2d',{willReadFrequently:true});
  const top=Math.round(h*0.66), lip=Math.max(3,Math.round(h*0.05)), bot=h;
  c.fillStyle=P.vgrad(c,top,bot,['#d08a44','#9a5424','#5a2a0c']); c.fillRect(0,top,w,bot-top);
  const vx=w/2; // planks converge on the centre
  for(let i=-40;i<=40;i++){ const x0=vx+i*Math.max(10,w/34), x1=vx+i*Math.max(13,w/26); c.strokeStyle='rgba(60,24,6,.45)'; c.lineWidth=1; c.beginPath(); c.moveTo(x0,top); c.lineTo(x1,bot-lip); c.stroke(); }
  for(let r=0;r<5;r++){ const y=Math.round(top+(bot-lip-top)*Math.pow(r/5,1.4)); c.fillStyle='rgba(60,24,6,.22)'; c.fillRect(0,y,w,1); }
  P.R(c,0,top-1,w,2,'#ffd8a0'); P.R(c,0,top+1,w,1,'rgba(255,240,210,.35)');
  P.texture(c,0,top,w,bot-top,0.3,3,9);
  P.R(c,0,bot-lip,w,lip,'#3a1a08'); P.R(c,0,bot-lip,w,1,'#7a3a14');
  c.globalCompositeOperation='lighter'; const g=c.createRadialGradient(vx,top,4,vx,top,w*0.45); g.addColorStop(0,'rgba(255,190,110,.28)'); g.addColorStop(1,'rgba(255,190,110,0)'); c.fillStyle=g; c.fillRect(0,top-h*0.3,w,h); c.globalCompositeOperation='source-over';
  P.dither(c,w,h,10); return {cv,top:top*px};
}
function sizeTitle(){ const r=tcv.getBoundingClientRect(), dpr=Math.min(2,window.devicePixelRatio||1), W=Math.max(320,Math.round(r.width*dpr)), H=Math.max(160,Math.round(r.height*dpr));
  if(W!==tW||H!==tH||!titleStage){ tW=W; tH=H; tcv.width=W; tcv.height=H; tPX=Math.max(2,Math.round(3*dpr)); titleStage=bakeTitleStage(W,H,tPX); } }
function drawTitle(){
  tf++; sizeTitle();
  tc.setTransform(1,0,0,1,0,0); tc.clearRect(0,0,tW,tH); tc.imageSmoothingEnabled=false;
  tc.drawImage(titleStage.cv,0,0,titleStage.cv.width*tPX,titleStage.cv.height*tPX);
  const floorY=titleStage.top+Math.round((tH-titleStage.top)*0.42);
  let want=Math.min(floorY*0.86, tW/5*1.3);              // target sprite height in canvas px
  // keep the line-up clear of the menu card: fighters fill the space either side of it
  const cr=document.querySelector('#screen-title .title-card').getBoundingClientRect(), vr=tcv.getBoundingClientRect(), sx=tW/Math.max(1,vr.width);
  const cardL=(cr.left-vr.left)*sx, cardR=(cr.right-vr.left)*sx, cardB=(cr.bottom-vr.top)*sx;
  // always 2 fighters each side of the menu card, never more, never overlapping
  const gap=want*0.78, pad=want*0.42, slots=[];
  let L0=cardL-pad, R0=cardR+pad;
  if(L0-gap<want*0.3||R0+gap>tW-want*0.3){ want*=0.8; }               // narrow screens: shrink a bit
  const g=want*0.78, p2=want*0.42; L0=cardL-p2; R0=cardR+p2;
  if(L0<want*0.3){ const n=tW<700?3:4; for(let i=0;i<n;i++) slots.push(tW/2+(i-(n-1)/2)*g); }  // phones: card isn't over the floor, line them up
  else for(let i=0;i<2;i++){ slots.push(L0-i*g); slots.push(R0+i*g); }
  slots.sort((a,b)=>a-b);
  const L=lineupAll.slice(0,slots.length), midX=tW/2;
  L.forEach((s,i)=>{
    const cv=DD.Sprites.menu(s,(tf/16)|0,false); // everyone breathes on the same beat if(!cv) return;
    const A=DD.SPRITE_ART&&DD.SPRITE_ART[s.id], hh=(A&&A.h?A.h:112)*DD.Sprites.RES/2;
    const k=want/(124*DD.Sprites.RES/2), x=Math.round(slots[i]), y=floorY, dir=x<midX?1:-1;
    tc.fillStyle='rgba(30,12,4,.4)'; tc.beginPath(); tc.ellipse(x,y+2,want*0.2,want*0.035,0,0,7); tc.fill();
    tc.save(); tc.translate(x,y); tc.scale(dir*k,k); tc.drawImage(cv,-cv._ox,-cv._oy); tc.restore();
  });
}
$$('.diff button').forEach(b=>{ b.classList.toggle('on',b.dataset.diff===st.diff); b.onclick=()=>{ st.diff=b.dataset.diff; try{localStorage.setItem('dd_diff',st.diff);}catch(e){} $$('.diff button').forEach(x=>x.classList.toggle('on',x===b)); Au.sfx('select'); }; });
$('#cpuBtn').onclick=()=>{ Au.sfx('lock'); st.mode='cpu'; openSelect(0); };
$('#localBtn').onclick=()=>{ Au.sfx('lock'); st.mode='local'; openSelect(0); };
$('#rankedBtn').onclick=async()=>{ Au.sfx('lock'); const ok=await ensureProfile(); if(!ok) return; st.mode='ranked'; openSelect(0); };
$('#quickBtn').onclick=()=>{ Au.sfx('lock'); st.mode='cpu'; const r=a=>a[Math.floor(Math.random()*a.length)]; st.p1=r(F); st.p2=r(F); st.randomCpu=false; st.arena=r(AR); startMatch(); };
function openHow(pre,cb){ $('#howOv').hidden=false; $('#howOv .card').classList.toggle('local',st.mode==='local'); $('#howGoLabel').textContent=pre?"LET'S FIGHT":'GOT IT'; st.howCb=cb||null; if(st.fight&&!st.net) st.fight.paused=true; }
function closeHow(){ $('#howOv').hidden=true; if(st.fight && !st.net && $('#pauseOv').hidden) st.fight.paused=false; const cb=st.howCb; st.howCb=null; if(cb) cb(); }
$('#howBtn').onclick=$('#helpBtn').onclick=()=>openHow(false);
$('#lbBtn').onclick=$('#lbTop').onclick=()=>openLeaderboard();
$('#voteBtn').onclick=()=>{ Au.sfx('select'); openVote(); };
$('#profileChip').onclick=()=>openLeaderboard();
$('#brandHome').onclick=e=>{ e.preventDefault(); if(st.net) return toast('Finish or forfeit the match first.'); quitToTitle(); };
$('#backTitle').onclick=()=>quitToTitle();

// ---------- select ----------
const port={}; function P(s,pose){ const k=s.id+(pose||''); return port[k]||(port[k]=DD.Sprites.portrait(s,2,pose||'idle')); }
const PORT_SMALL={}; function PS(s){ return PORT_SMALL[s.id]||(PORT_SMALL[s.id]=DD.Sprites.portrait(s,1)); }
// fighter art sheets stream in: drop cached portraits and redraw the menus when they land
let artRedraw=0; addEventListener('dd:art',()=>{ for(const k in port) delete port[k]; for(const k in PORT_SMALL) delete PORT_SMALL[k];
  clearTimeout(artRedraw); artRedraw=setTimeout(()=>{ $$('#fighterGrid .tile[data-i]').forEach(t=>{ const im=t.querySelector('img'); if(im) im.src=PS(F[+t.dataset.i]); }); if(st.screen==='select') renderSelect(); },120); });
function buildGrids(){
  const g=$('#fighterGrid'); g.innerHTML='';
  F.forEach((s,i)=>{ const b=document.createElement('button'); b.className='tile'; b.dataset.i=i; b.innerHTML=`<img src="${PS(s)}" alt=""><span class="nm">${s.name}</span>`;
    b.onclick=()=>{ st.cursor=i; pick(i); }; b.ondblclick=()=>lockIn(); b.onmouseenter=()=>{ if(st.cursor!==i){ st.cursor=i; hover(i); } }; g.appendChild(b); });
  const r=document.createElement('button'); r.className='tile random'; r.dataset.i='rand'; r.innerHTML=`<span class="qm">?</span><span class="nm">RANDOM</span>`; r.onclick=()=>{ st.cursor=F.length; pick('rand'); }; r.ondblclick=()=>lockIn(); g.appendChild(r);
  const a=$('#arenaGrid'); a.innerHTML='';
  AR.forEach((ar,i)=>{ const b=document.createElement('button'); b.className='atile'; b.dataset.i=i; b.innerHTML=`<img alt=""><span class="nm">${ar.name.toUpperCase()}<small>${ar.sub}</small></span>`;
    b.onclick=()=>{ st.cursor=i; pickArena(i); }; b.ondblclick=()=>lockIn(); b.onmouseenter=()=>{ st.cursor=i; markCursor(); }; a.appendChild(b); });
}
const MODE_TXT={
  cpu:   {steps:['01 YOUR FIGHTER','02 CPU OPPONENT','03 ARENA'], label:['SELECT YOUR FIGHTER','SELECT CPU OPPONENT','SELECT ARENA'], badge:['YOU','CPU'], side:['YOU / 1P','CPU'], hint:['THEN CHOOSE YOUR CPU','THEN CHOOSE YOUR ARENA','THEN FIGHT']},
  local: {steps:['01 PLAYER 1','02 PLAYER 2','03 ARENA'], label:['PLAYER 1: PICK A FIGHTER','PLAYER 2: PICK A FIGHTER','SELECT ARENA'], badge:['P1','P2'], side:['PLAYER 1','PLAYER 2'], hint:['THEN PLAYER 2 PICKS','THEN CHOOSE YOUR ARENA','THEN FIGHT']},
  ranked:{steps:['01 YOUR FIGHTER','02 MATCHMAKING','03 RANKED FIGHT'], label:['SELECT YOUR FIGHTER'], badge:['YOU','OPP'], side:['YOU','OPPONENT'], hint:['RANDOM ARENA · BEST OF 3 · ELO ON THE LINE']},
};
let thumbsQ=null;
function loadArenaThumbs(){ if(thumbsQ) return; thumbsQ=AR.map((a,i)=>i);
  const next=()=>{ if(!thumbsQ.length) return; const i=thumbsQ.shift(), img=$$('#arenaGrid .atile img')[i]; if(img) img.src=DD.Arenas.thumb(AR[i].id); setTimeout(next,16); }; next(); }
function openSelect(step){
  show('select'); st.step=step;
  if(step===0){ st.p1=st.p1||F[0]; st.cursor=F.indexOf(st.p1); }
  if(step===1){ st.cursor = st.p2 ? F.indexOf(st.p2) : 0; }
  if(step===2){ st.cursor = st.arena ? AR.indexOf(st.arena) : 0; loadArenaThumbs(); }
  renderSelect();
}
function renderSelect(){
  const s=st.step, M=MODE_TXT[st.mode], ranked=st.mode==='ranked';
  $$('.step').forEach((b,i)=>{ b.textContent=M.steps[i]; b.classList.toggle('on',i===s); b.classList.toggle('done',i<s); b.disabled = ranked && i>0; });
  $('#stepNum').textContent='0'+(s+1);
  $('#stepLabel').textContent=M.label[s]||''; $('#gridTitle').textContent=M.label[s]||'';
  $('#gridStep').textContent=['STEP 01','STEP 02','STEP 03'][s]+' / '+(st.mode==='ranked'?'RANKED':st.mode==='local'?'LOCAL VERSUS':'VS CPU');
  $('#fighterGrid').hidden = s===2; $('#arenaGrid').hidden = s!==2;
  $('#fighterGrid .random').style.display = s===1?'':'none';
  $('#p1Side').textContent=M.side[0]; $('#p2Side').textContent=M.side[1]; $('#cpuDiff').hidden = st.mode!=='cpu';
  setSide(1, st.p1);
  if(s===0){ $('#p1State').textContent='SELECTING'; setSide(2,null); $('#p2Up').textContent=ranked?'MATCHMAKING':'UP NEXT'; }
  else { $('#p1State').textContent='LOCKED'; $('#p2Up').textContent = s===1?'SELECTING':'LOCKED'; setSide(2, st.p2, st.randomCpu&&s===1); }
  $$('#fighterGrid .tile').forEach(t=>{ t.querySelectorAll('.badge').forEach(x=>x.remove()); t.classList.remove('sel');
    const i=+t.dataset.i;
    if(st.p1&&F[i]===st.p1){ if(s===0) t.classList.add('sel'); t.insertAdjacentHTML('afterbegin',`<span class="badge">${M.badge[0]}</span>`); }
    if(s===1 && ((st.p2&&F[i]===st.p2&&!st.randomCpu) || (t.dataset.i==='rand'&&st.randomCpu))){ t.classList.add('sel'); t.insertAdjacentHTML('afterbegin',`<span class="badge cpu">${M.badge[1]}</span>`); } });
  $$('#arenaGrid .atile').forEach((t,i)=>t.classList.toggle('sel',AR[i]===st.arena));
  markCursor();
  const lockName = s===0 ? st.p1&&st.p1.name : s===1 ? (st.randomCpu?'Random':st.p2&&st.p2.name) : st.arena&&st.arena.name;
  $('#lockName').textContent = lockName || '—';
  $('#lockHint').textContent = M.hint[s]||'';
  $('#lockBtn').querySelector('span').textContent = ranked ? 'FIND MATCH' : s===2?'FIGHT!':'LOCK IN';
  $('#lockBtn').disabled = !(s===0?st.p1 : s===1?(st.p2||st.randomCpu) : st.arena);
}
function setSide(n,s,rand){
  const img=$('#p'+n+'Img');
  if(!s || rand){ img.style.visibility='hidden'; if(n===2){ $('#p2Q').style.display='';
      const ranked=st.mode==='ranked';
      $('#p2Name').textContent=rand?'RANDOM':ranked?'???':st.mode==='local'?'PLAYER 2':'CPU OPPONENT';
      $('#p2Tag').textContent=rand?'ANYONE. GOOD LUCK.':ranked?'MATCHED BY ELO.':'CHOOSE AFTER '+(st.mode==='local'?'PLAYER 1.':'YOUR FIGHTER.'); $('#p2Sp').textContent=''; } return; }
  img.style.visibility=''; img.src=P(s);
  if(n===2) $('#p2Q').style.display='none';
  $('#p'+n+'Name').textContent=s.name.toUpperCase(); $('#p'+n+'Tag').textContent=s.tag; $('#p'+n+'Sp').textContent='SPECIAL: '+s.special.name+' — '+s.special.desc;
}
function hover(i){ Au.sfx('move'); if(st.step===0){ setSide(1,F[i]); $('#lockName').textContent=F[i].name; } else if(st.step===1){ setSide(2,F[i]); $('#lockName').textContent=F[i].name; } markCursor(); }
function pick(i){ Au.sfx('select'); if(i==='rand'){ st.randomCpu=true; st.p2=null; } else if(st.step===0) st.p1=F[i]; else { st.randomCpu=false; st.p2=F[i]; } if(i!=='rand') DD.Sprites.prewarm(F[i]); renderSelect(); }
function pickArena(i){ Au.sfx('select'); st.arena=AR[i]; renderSelect(); Au.playSong(AR[i].music,true); }
function markCursor(){ const sel = st.step===2 ? '#arenaGrid .atile' : '#fighterGrid .tile'; $$('.tile,.atile').forEach(t=>t.classList.remove('cursor')); const el=$$(sel)[st.cursor]; if(el) el.classList.add('cursor'); }
$('#lockBtn').onclick=lockIn;
function lockIn(){
  if($('#lockBtn').disabled) return;
  Au.sfx('lock');
  if(st.mode==='ranked'){ if(!st.bindsShown){ st.bindsShown=true; openHow(true,()=>startQueue()); } else startQueue(); return; }
  if(st.step<2){ openSelect(st.step+1); return; }
  startMatch();
}
$$('.step').forEach(b=>b.onclick=()=>{ if(st.mode==='ranked') return; const n=+b.dataset.step; if(n<=st.step || (n===1&&st.p1) || (n===2&&st.p1&&(st.p2||st.randomCpu))) openSelect(n); });

// ---------- offline match (cpu / local) ----------
const gc=$('#game').getContext('2d'); gc.imageSmoothingEnabled=false;
function startMatch(){ if(typeof Chat!=='undefined') Chat.close();
  const p2 = st.randomCpu ? F[Math.floor(Math.random()*F.length)] : st.p2;
  st.curP2=p2; st.net=null; st.online=null; DD.Sprites.prewarm(st.p1); DD.Sprites.prewarm(p2, p2.id===st.p1.id);
  const local=st.mode==='local';
  st.koShot=null; st.koRound=-1;
  st.fight = new DD.Game.Fight({ p1:st.p1, p2, arena:st.arena, ai: local?null:new DD.Game.CPU(st.diff), labels: local?['P1','P2']:['YOU','CPU'], holder:[isHolder(),false], onEnd:endMatch });
  $$('.overlay').forEach(o=>o.hidden=true);
  show('game'); Au.playSong(st.arena.music,true); resetInput();
  if(!st.bindsShown){ st.bindsShown=true; openHow(true); }
}
function endMatch(winIdx,fight){
  const local=st.mode==='local', won=winIdx===0, w=fight.p[winIdx];
  Au.stop(); Au.sfx(local||won?'win':'lose'); Au.say(local?(won?'Player one wins':'Player two wins'):won?'You win':'Rekt');
  $('#resKicker').textContent = local?'LOCAL VERSUS':won?'FLAWLESS DEGENERACY':'MATCH OVER';
  $('#resTitle').textContent = local?(won?'P1 WINS':'P2 WINS'):won?'YOU WIN':'REKT';
  $('#resImg').src = P(w.spec,'win');
  $('#resLine').textContent = local ? `${w.spec.name} takes the dojo. ${w.spec.tag}.` : won ? `${fight.p[0].spec.name} takes the dojo. ${fight.p[0].spec.tag}.` : `${fight.p[1].spec.name} sent you back to the charts.`;
  $('#resElo').hidden=true;
  fillStats(fight, local?winIdx:0);
  setResultButtons(local?'local':'cpu');
  const me=local?winIdx:0; st.share={won:local||won, fighter:fight.p[me].spec.name, opp:fight.p[1-me].spec.name, grade:grade(fight,me), combo:fight.stats[me].maxCombo, perfect:fight.p[me].wins>0&&fight.p[1-me].wins===0, who:local?(winIdx?'P2':'P1'):(ON.profile&&ON.profile.name)||'', vs:local?'':'CPU'};
  $('#shareRow').hidden=!(st.share.won&&st.koShot);
  setTimeout(()=>{ $('#resultOv').hidden=false; },500);
}
function grade(fight,i){ const s=fight.stats[i], me=fight.p[i], op=fight.p[1-i], won=me.wins>op.wins;
  if(!won) return op.wins>0&&me.wins>0?'C':'D';
  let g=0; if(op.wins===0) g++; if(s.maxCombo>=5) g++; if(s.parries>=2||s.hits>=20) g++; if(s.dmg>=1800) g++;
  return g>=3?'S':g===2?'A':g===1?'B':'C'; }
function fillStats(fight,i){ const s=fight.stats[i];
  const gr=grade(fight,i), w=fight.p[fight.p[0].wins>=fight.p[1].wins?0:1], top=w.spec.top, hero=/^#f[0-9a-f]f[0-9a-f]f[0-9a-f]$/i.test(top)||top==='#ffffff'?'#ff6a00':top;
  $('#resGrade').textContent=gr; $('#resGrade').className='grade g-'+gr; $('#resHero').style.setProperty('--hero',hero);
  $('#resStats').innerHTML=[['HITS',s.hits],['BEST COMBO',s.maxCombo],['DAMAGE',Math.round(s.dmg)],['BLOCKS',s.blocks],['PARRIES',s.parries],['ROUNDS',fight.p[0].wins+'-'+fight.p[1].wins]]
    .map(([k,v])=>`<div><dt>${k}</dt><dd>${v}</dd></div>`).join(''); }
// ---------- share-a-KO card ----------
const SITE='https://degendojo.fun/';
function koCard(){ const S=st.share, src=st.koShot; if(!S||!src) return null;
  const W=1200,H=675, c=document.createElement('canvas'); c.width=W; c.height=H; const x=c.getContext('2d'); x.imageSmoothingEnabled=false;
  x.drawImage(src,0,0,src.width,src.height,0,0,W,H);
  let g=x.createLinearGradient(0,0,0,H); g.addColorStop(0,'rgba(20,6,14,.75)'); g.addColorStop(.3,'rgba(20,6,14,.05)'); g.addColorStop(.55,'rgba(20,6,14,.1)'); g.addColorStop(.8,'rgba(20,6,14,.85)'); g.addColorStop(1,'rgba(20,6,14,.97)'); x.fillStyle=g; x.fillRect(0,0,W,H);
  x.fillStyle='#120610'; x.fillRect(0,0,W,124); x.fillStyle='#ff6a00'; x.fillRect(0,120,W,4); x.fillRect(0,H-8,W,8);
  const P='"Press Start 2P", monospace', T=(t,X,Y,sz,col,al)=>{ x.font=sz+'px '+P; x.textAlign=al||'left'; x.lineJoin='round'; x.lineWidth=Math.max(4,sz/5); x.strokeStyle='#14060e'; x.strokeText(t,X,Y); x.fillStyle=col; x.fillText(t,X,Y); };
  T('DEGEN DOJO',40,74,30,'#ffd23f'); T('$DOJO',W-40,74,24,'#ff8c2e','right');
  T(S.perfect?'PERFECT K.O.':'K.O.',40,H-170,S.perfect?40:52,'#ff6a00');
  const who=S.who?S.who.toUpperCase()+' AS ':''; T(who+S.fighter.toUpperCase(),40,H-118,24,'#ffffff');
  T('DESTROYED '+S.opp.toUpperCase()+(S.vs&&S.vs!=='CPU'?' ('+S.vs.toUpperCase()+')':''),40,H-88,20,'#ffb36b');
  T('GRADE '+S.grade+(S.combo>=2?'   ·   '+S.combo+'-HIT COMBO':''),40,H-44,18,'#ffd23f');
  T('PLAY FREE',W-40,H-88,18,'#ffffff','right'); T(SITE.replace('https://','').replace(/\/$/,''),W-40,H-50,14,'#ffb36b','right');
  return c; }
function cardBlob(c){ const d=atob(c.toDataURL('image/png').split(',')[1]), a=new Uint8Array(d.length); for(let i=0;i<d.length;i++) a[i]=d.charCodeAt(i); return new Blob([a],{type:'image/png'}); }
function shareText(){ const S=st.share; return `Just ${S.perfect?'PERFECT-KO\'d':'KO\'d'} ${S.opp} as ${S.fighter} in DEGEN DOJO 🥊 ${S.grade}-rank${S.combo>=2?`, ${S.combo}-hit combo`:''}.\n\nThink you can beat me? Free to play 👇\n${SITE}\n\n$DOJO`; }
async function shareKO(){ const c=koCard(); if(!c) return toast('No KO to share yet.'); const blob=cardBlob(c), file=new File([blob],'degen-dojo-ko.png',{type:'image/png'}), text=shareText();
  try{ if(navigator.canShare&&navigator.canShare({files:[file]})&&/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)){ await navigator.share({files:[file],text}); return; } }catch(e){ if(e&&e.name==='AbortError') return; }
  const w=window.open('https://x.com/intent/post?text='+encodeURIComponent(text),'_blank','noopener');
  let copied=false; try{ await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]); copied=true; }catch(e){}
  if(!copied) saveKO(c);
  toast(copied?'KO card copied. Paste it into your post (Ctrl+V / ⌘V).':'KO card downloaded. Attach it to your post.');
  if(!w) toast('Pop-up blocked. Allow pop-ups to open X.'); }
function saveKO(c){ c=c||koCard(); if(!c) return; const a=document.createElement('a'); a.download='degen-dojo-ko.png'; a.href=c.toDataURL('image/png'); document.body.appendChild(a); a.click(); a.remove(); }
// ---------- community vote: next fighter ----------
async function openVote(){ const V=DD.VOTE; $('#voteOv').hidden=false; $('#voteRound').textContent=V.round; $('#voteTitle').textContent=V.title; $('#voteSub').textContent=V.ends+'. One vote per fighter profile; you can change it any time.';
  renderVote(null); if(!ON.available()){ $('#voteFoot').textContent='Voting needs the live site.'; return; }
  try{ if(ON.ident) await ON.me().catch(()=>{}); renderVote(await ON.tally(V.round)); }catch(e){ $('#voteFoot').textContent=friendlyErr(e); } }
function renderVote(t){ const V=DD.VOTE, tot=t?t.total:0, cnt=t?t.counts||{}:{};
  $('#voteList').innerHTML=V.candidates.map(c=>{ const n=cnt[c.id]||0, pc=tot?Math.round(n*100/tot):0, mine=t&&t.mine===c.id;
    return `<button class="vote-c${mine?' mine':''}" data-cand="${c.id}">${mine?'<span class="you">YOUR VOTE</span>':''}<h4>${esc(c.name)}</h4><div class="tg">"${esc(c.tag)}"</div><p>${esc(c.desc)}</p><span class="bar" style="width:${pc}%"></span><span class="pct">${pc}% · ${n}</span></button>`; }).join('');
  $('#voteFoot').textContent = t ? `${tot} vote${tot===1?'':'s'} so far${t.mine?'':' · tap a fighter to vote'}` : 'Loading votes…'; }
$('#voteList').addEventListener('click',async e=>{ const b=e.target.closest('[data-cand]'); if(!b) return;
  const ok=await ensureProfile(); if(!ok) return; $('#voteOv').hidden=false;
  try{ Au.sfx('lock'); renderVote(await ON.vote(DD.VOTE.round,b.dataset.cand)); toast('Vote locked in. Share it to rally your side.'); }catch(err){ toast(friendlyErr(err)); } });
$('#voteOv').addEventListener('click',e=>{ if(e.target.id==='voteOv') $('#voteOv').hidden=true; });
function setResultButtons(kind){
  $$('#resultOv [data-act]').forEach(b=>{ const a=b.dataset.act;
    if(a==='shareKO'||a==='saveKO') return;
    b.hidden = kind==='ranked' ? !['requeue','select','title'].includes(a) : kind==='local' ? !['restart','select','title'].includes(a) : !['restart','next','select','title'].includes(a); });
}
function pauseGame(on){
  if(!st.fight||st.fight.over) return;
  if(st.net){ $('#pauseOv').hidden=!on; $('#pauseOv').classList.add('online'); return; } // online: menu only, the fight keeps running
  $('#pauseOv').classList.remove('online');
  st.fight.paused=on; $('#pauseOv').hidden=!on; if(on) Au.stop(); else Au.playSong(st.fight.arena.music,true);
}
function quitToTitle(){ if(st.q) cancelQueue(); closeOnline(); st.fight=null; $$('.overlay').forEach(o=>o.hidden=true); show('title'); refreshOnlineLine(); }
document.addEventListener('click',e=>{
  const a=e.target.closest('[data-act]'); if(!a) return;
  const act=a.dataset.act;
  if(act==='resume') pauseGame(false);
  if(act==='restart') startMatch();
  if(act==='next'){ const pool=F.filter(f=>f!==st.curP2); st.p2=pool[Math.floor(Math.random()*pool.length)]; st.randomCpu=false; startMatch(); }
  if(act==='select'){ closeOnline(); st.fight=null; $$('.overlay').forEach(o=>o.hidden=true); openSelect(0); }
  if(act==='title') quitToTitle();
  if(act==='forfeit') forfeit();
  if(act==='requeue'){ closeOnline(); st.fight=null; $$('.overlay').forEach(o=>o.hidden=true); st.mode='ranked'; openSelect(0); startQueue(); }
  if(act==='closeHow') closeHow();
  if(act==='closeLb') $('#lbOv').hidden=true;
  if(act==='refreshLb') openLeaderboard();
  if(act==='rename'){ $('#lbOv').hidden=true; openNameModal(true); }
  if(act==='shareKO') shareKO();
  if(act==='saveKO') saveKO();
  if(act==='closeVote') $('#voteOv').hidden=true;
});
$('#pauseBtn').onclick=()=>pauseGame(true);
$('#howOv').addEventListener('click',e=>{ if(e.target.id==='howOv') closeHow(); });
$('#lbOv').addEventListener('click',e=>{ if(e.target.id==='lbOv') $('#lbOv').hidden=true; });

// ---------- online: profile ----------
function friendlyErr(e){ const m=e&&e.message||''; return m==='NAME_TAKEN'?'That name is taken.':m==='BAD_WALLET'?"That doesn't look like a Solana wallet address.":m==='BAD_NAME'?'Not allowed. 3–16 letters/numbers/_ . - and keep it clean.':m==='OFFLINE'||/fetch|network|Failed/i.test(m)?"Can't reach the dojo servers. Online play needs the live site and an internet connection.":'Something went wrong ('+m+').'; }
function refreshChip(){ const p=ON.profile, c=$('#profileChip');
  if(!p){ c.hidden=true; return; } c.hidden=false; c.innerHTML=`<b>${esc(p.name)}</b><span>${p.elo}</span><i class="tier t-${tierClass(p.tier)}">${p.tier}</i>${p.holder?'<i class="holder-badge">HOLDER</i>':''}`; }
function tierClass(t){ return String(t||'').toLowerCase().replace(/\s+/g,'-'); }
let nameResolve=null;
// ---------- $DOJO holder check (read-only: just a balance lookup on a public Solana RPC) ----------
const WALLET_RE=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
function isHolder(){ return !!(ON.profile&&ON.profile.holder); }
async function tokenBalance(wallet){
  const T=DD.TOKEN; if(!T||!T.mint) return null;            // coin not live yet
  const body=JSON.stringify({jsonrpc:'2.0',id:1,method:'getTokenAccountsByOwner',params:[wallet,{mint:T.mint},{encoding:'jsonParsed'}]});
  for(const url of T.rpc){ try{ const r=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body}); const j=await r.json(); if(j.error) continue;
      return (j.result.value||[]).reduce((s,a)=>s+(+(a.account.data.parsed.info.tokenAmount.uiAmount)||0),0); }catch(e){} }
  return null; }
async function syncHolder(wallet){ // returns the saved profile
  if(!wallet) return ON.setWallet('',false);
  const bal=await tokenBalance(wallet); const holder=bal!=null&&bal>=(DD.TOKEN.holderMin||1);
  return ON.setWallet(wallet, holder); }
async function recheckHolder(){ const p=ON.profile; if(!p||!p.wallet||!DD.TOKEN.mint) return;
  try{ const bal=await tokenBalance(p.wallet); if(bal==null) return; const h=bal>=(DD.TOKEN.holderMin||1); if(h!==!!p.holder){ await ON.setWallet(p.wallet,h); refreshChip(); } }catch(e){} }
function openNameModal(rename){
  $('#nameOv').hidden=false; $('#nameOv').dataset.rename=rename?'1':''; $('#nameTitle').textContent=rename?'EDIT PROFILE':'PICK A FIGHTER NAME';
  $('#nameInput').value=rename&&ON.profile?ON.profile.name:''; $('#walletInput').value=rename&&ON.profile&&ON.profile.wallet||''; $('#nameErr').textContent=''; setTimeout(()=>$('#nameInput').focus(),30);
  return new Promise(r=>nameResolve=r);
}
$('#nameForm').addEventListener('submit',async e=>{
  e.preventDefault(); const v=$('#nameInput').value.trim(), rename=!!$('#nameOv').dataset.rename;
  if(!/^[A-Za-z0-9_.-]{3,16}$/.test(v)){ $('#nameErr').textContent='3–16 characters: letters, numbers, _ . -'; return; }
  if(ON.nameOk && !ON.nameOk(v)){ $('#nameErr').textContent="Keep it clean. Pick another name."; return; }
  const w=$('#walletInput').value.trim();
  if(w && !WALLET_RE.test(w)){ $('#nameErr').textContent="That doesn't look like a Solana wallet address."; return; }
  $('#nameGo').disabled=true; $('#nameErr').textContent='';
  try{ if(rename){ if(!ON.profile||ON.profile.name!==v) await ON.rename(v); } else await ON.register(v);
    if(w!==((ON.profile&&ON.profile.wallet)||'') || (w&&DD.TOKEN.mint)) { const p=await syncHolder(w); if(w&&!DD.TOKEN.mint) toast('Wallet saved. Holder perks switch on when $DOJO launches.'); else if(w) toast(p.holder?'Holder verified. Welcome to the gold tier.':'Wallet saved. No $DOJO found in it yet.'); }
    refreshChip(); $('#nameOv').hidden=true; nameResolve&&nameResolve(true); nameResolve=null; if(rename) openLeaderboard(); }
  catch(err){ $('#nameErr').textContent=friendlyErr(err); }
  finally{ $('#nameGo').disabled=false; }
});
$('#nameCancel').onclick=()=>{ $('#nameOv').hidden=true; nameResolve&&nameResolve(false); nameResolve=null; };
async function ensureProfile(){
  if(!ON.available()){ toast("Online play needs the live site. It can't load here."); return false; }
  if(ON.ident){ try{ await ON.me(); refreshChip(); recheckHolder(); return true; }catch(e){ if(e.message!=='AUTH'){ toast(friendlyErr(e)); return false; } } }
  return openNameModal(false);
}
async function refreshOnlineLine(){
  if(!ON.available()) return;
  try{ const s=await ON.stats(), parts=[];   // only brag when the numbers are worth showing
    if(s.queue>0) parts.push(`${s.queue} IN QUEUE · JUMP IN`);
    if(s.online>=3) parts.push(`${s.online} ONLINE`);
    if(s.players>=10) parts.push(`${s.players} RANKED PLAYERS`);
    $('#onlineLine').textContent=parts.join(' · '); }catch(e){ $('#onlineLine').textContent=''; }
}

// ---------- online: leaderboard ----------
async function openLeaderboard(){
  $('#lbOv').hidden=false; $('#lbBody').innerHTML='<tr><td colspan="6" class="lb-empty">Loading the dojo rankings…</td></tr>';
  if(!ON.available()){ $('#lbBody').innerHTML='<tr><td colspan="6" class="lb-empty">The leaderboard needs the live site.</td></tr>'; return; }
  try{
    if(ON.ident) await ON.me().catch(()=>{}); refreshChip();
    const [rows,stats]=await Promise.all([ON.top(100),ON.stats()]);
    const me=ON.profile;
    $('#lbMe').innerHTML = me ? `<b>${esc(me.name)}</b> · <span class="tier t-${tierClass(me.tier)}">${me.tier}</span> · ${me.elo} ELO · ${me.wins}W ${me.losses}L · ${me.rank?'#'+me.rank:'unranked'}${me.holder?' <i class="holder-badge">HOLDER</i>':''} <button class="link-btn" data-act="rename">edit profile / wallet</button>` : 'Play a ranked match to get on the board.';
    $('#lbStats').textContent=`${stats.online} online now · ${stats.queue} in queue · ${stats.players} ranked players`;
    $('#lbBody').innerHTML = rows.length ? rows.map(r=>{ const f=F.find(x=>x.id===r.last_fighter);
      return `<tr class="${me&&me.name===r.name?'me':''}"><td class="rk">${r.rank}</td><td><span class="nm${r.holder?' gold':''}">${f?`<img src="${PS(f)}" alt="">`:''}${esc(r.name)}${r.holder?'<i class="holder-badge">HOLDER</i>':''}</span></td><td><span class="tier t-${tierClass(r.tier)}">${r.tier}</span></td><td class="num">${r.elo}</td><td class="num">${r.wins}-${r.losses}</td><td class="num">${r.streak>1?'🔥'+r.streak:r.streak<-1?'❄'+(-r.streak):'–'}</td></tr>`; }).join('')
      : '<tr><td colspan="6" class="lb-empty">No ranked matches yet. Be the first degen on the board.</td></tr>';
  }catch(e){ $('#lbBody').innerHTML=`<tr><td colspan="6" class="lb-empty">${esc(friendlyErr(e))}</td></tr>`; }
}

// ---------- online: matchmaking ----------
function startQueue(){
  if(!ON.ident){ ensureProfile().then(ok=>ok&&startQueue()); return; }
  if(st.q) return;
  st.q={t0:performance.now(), stop:false};
  $('#queueOv').hidden=false; $('#queueOv').classList.remove('found');
  $('#qTitle').textContent='FINDING A MATCH'; $('#qStatus').textContent='Searching for a degen near your ELO…'; $('#qMeta').textContent='';
  $('#qMine').src=P(st.p1); $('#qMineName').textContent=ON.profile?ON.profile.name:'YOU'; $('#qMineElo').textContent=ON.profile?ON.profile.elo+' ELO':'';
  $('#qOpp').style.visibility='hidden'; $('#qOppName').textContent='???'; $('#qOppElo').textContent='';
  $('#qCancel').hidden=false;
  pollQueue();
}
async function pollQueue(){
  const q=st.q; if(!q||q.stop) return;
  try{
    const r=await ON.queue(st.p1.id);
    if(!st.q||q.stop) return;
    if(r.status==='matched'){ q.stop=true; st.q=null; onMatched(r); return; }
    const secs=Math.floor((performance.now()-q.t0)/1000);
    $('#qStatus').textContent=`Searching… ${Math.floor(secs/60)}:${String(secs%60).padStart(2,'0')}`;
    $('#qMeta').textContent=`ELO range ±${r.range} · ${r.queue} in queue`;
  }catch(e){ $('#qStatus').textContent=friendlyErr(e); }
  q.timer=setTimeout(pollQueue, 2000);
}
function cancelQueue(){ const q=st.q; if(!q) return; q.stop=true; clearTimeout(q.timer); st.q=null; ON.leave(); $('#queueOv').hidden=true; }
$('#qCancel').onclick=()=>{ Au.sfx('select'); cancelQueue(); };

function onMatched(info){
  Au.sfx('lock'); Au.say('Match found');
  const opp=info.opponent, oppSpec=F.find(f=>f.id===opp.fighter)||F[0]; DD.Sprites.prewarm(oppSpec, oppSpec.id===st.p1.id);
  $('#queueOv').classList.add('found'); $('#qTitle').textContent='MATCH FOUND';
  $('#qOpp').src=P(oppSpec); $('#qOpp').style.visibility=''; $('#qOppName').textContent=opp.name; $('#qOppElo').textContent=`${opp.elo} ELO · ${opp.tier}`;
  $('#qStatus').textContent='Connecting to opponent…'; $('#qMeta').textContent=''; $('#qCancel').hidden=true;
  const link=new ON.Link(info.match_id, info.role);
  const O=st.online={info, link, role:info.role, oppSpec, done:false, started:false, t0:performance.now()};
  link.onStatus=s=>{ if(!O.started) $('#qStatus').textContent=s; };
  link.onMsg=m=>onNetMsg(O,m);
  link.onReady=mode=>{ $('#qMeta').textContent=mode==='p2p'?'Direct P2P connection':'Relay connection (higher latency)';
    if(O.role==='guest'){ O.rdyT=setInterval(()=>link.send({t:'rdy'},true),300); link.send({t:'rdy'},true); } };
  O.connectTimeout=setTimeout(()=>{ if(!O.started){ $('#qStatus').textContent="Couldn't connect to your opponent. No ELO was changed."; $('#qCancel').hidden=false; $('#qCancel').textContent='BACK'; closeOnline(); } },25000);
}
function onNetMsg(O,m){
  if(O!==st.online) return;
  if(m.t==='rdy' && O.role==='host' && !O.started){ for(let i=0;i<3;i++) O.link.send({t:'go'},true); beginOnlineFight(O); }
  else if(m.t==='go' && O.role==='guest' && !O.started){ clearInterval(O.rdyT); beginOnlineFight(O); }
  else if(m.t==='in' && st.net && O.role==='host') st.net.onInput(m);
  else if(m.t==='s' && st.net && O.role==='guest') st.net.onSnapshot(m.d);
  else if(m.t==='end' && O.role==='guest') finishOnline(m.w===1,'KO');
  else if(m.t==='ff'){ const w=st.fight?st.fight.p.findIndex(f=>f.wins>=2):-1; finishOnline(w>=0?w===O.myIdx:true, w>=0?'KO':'FORFEIT'); }
  else if(m.t==='bye' && !O.done && O.started){ O.byeAt=performance.now(); }
  else if(m.t==='chat' && O.started) Chat.recv(m);
}
function beginOnlineFight(O){
  O.started=true; clearTimeout(O.connectTimeout);
  const me=st.p1, info=O.info, host=O.role==='host', arena=AR.find(a=>a.id===info.arena)||AR[0];
  const oppName=info.opponent.name.toUpperCase();
  st.koShot=null; st.koRound=-1;
  const fight=new DD.Game.Fight({ p1:host?me:O.oppSpec, p2:host?O.oppSpec:me, arena, ai:null, record:host, remote:!host, holder:host?[isHolder(),!!(info.opponent&&info.opponent.holder)]:[!!(info.opponent&&info.opponent.holder),isHolder()],
    labels: host?['YOU',oppName]:[oppName,'YOU'], onEnd: idx=>{ if(host){ for(let i=0;i<3;i++) O.link.send({t:'end',w:idx},true); let n=0; const rs=setInterval(()=>{ try{ O.link.send({t:'end',w:idx},true); }catch(e){} if(++n>=10) clearInterval(rs); },300); finishOnline(idx===0,'KO'); } } });
  st.fight=fight; st.net = host ? new ON.NetHost(fight,O.link) : new ON.NetGuest(fight,O.link);
  st.mode='ranked'; O.myIdx=host?0:1;
  O.hb=setInterval(()=>ON.heartbeat(),5000);
  $('#queueOv').hidden=true; show('game'); Au.playSong(arena.music,true); resetInput(); Chat.open(info.opponent.name);
}
async function finishOnline(won, reason){
  const O=st.online; if(!O||O.done) return; O.done=true; clearInterval(O.hb); clearInterval(O.rdyT);
  if(st.fight) st.fight.over=true;
  setTimeout(()=>{ if(O.link) O.link.close(); },8000);
  const fight=st.fight, mySpec=st.p1;
  Au.stop(); Au.sfx(won?'win':'lose'); Au.say(won?'You win':'Rekt');
  $('#resKicker').textContent= reason==='FORFEIT' ? (won?'OPPONENT FORFEITED':'YOU FORFEITED') : reason==='DISCONNECT' ? 'OPPONENT DISCONNECTED' : 'RANKED MATCH';
  $('#resTitle').textContent= won?'YOU WIN':'REKT';
  $('#resImg').src=P(won?mySpec:O.oppSpec,'win');
  $('#resLine').textContent= won?`${O.info.opponent.name} got sent back to the charts.`:`${O.info.opponent.name} takes this one.`;
  if(fight) fillStats(fight,O.myIdx); else $('#resStats').innerHTML='';
  if(fight){ const me=O.myIdx; st.share={won, fighter:fight.p[me].spec.name, opp:fight.p[1-me].spec.name, grade:grade(fight,me), combo:fight.stats[me].maxCombo, perfect:fight.p[1-me].wins===0, who:(ON.profile&&ON.profile.name)||'', vs:O.info.opponent.name}; }
  $('#shareRow').hidden=!(won&&st.koShot&&fight);
  $('#resElo').hidden=false; $('#resElo').className='res-elo pending'; $('#resElo').textContent='Confirming result with the server…';
  setResultButtons('ranked'); $('#resultOv').hidden=false;
  st.net=null;
  const winner = won ? ON.ident.id : O.info.opponent.id;
  for(let i=0;i<20;i++){
    try{ const r=await ON.report(O.info.match_id, winner);
      if(r.status==='final'){ const d=r.delta, p=r.profile; $('#resElo').className='res-elo '+(d>=0?'up':'down');
        $('#resElo').innerHTML=`<b>${d>=0?'+':''}${d} ELO</b> → ${p.elo} · <span class="tier t-${tierClass(p.tier)}">${p.tier}</span>${p.rank?` · #${p.rank}`:''}`; refreshChip(); return; }
      if(r.status==='void'){ $('#resElo').className='res-elo'; $('#resElo').textContent='Result disputed, so this match was voided. No ELO change.'; return; }
      $('#resElo').textContent= i<3 ? 'Confirming result with the server…' : 'Waiting for your opponent to confirm…';
    }catch(e){ $('#resElo').textContent=friendlyErr(e); }
    await new Promise(r=>setTimeout(r,2500));
  }
  $('#resElo').textContent='Result is still pending. It will settle automatically.';
}
// ---------- match chat (ranked only): link blocker + rate limit ----------
const Chat=(()=>{
  const LINK=/(https?:\/\/|www\.|\b[a-z0-9-]{2,}\s*(\.|\(dot\)|\[dot\]|\sdot\s)\s*(com|net|org|io|xyz|gg|me|app|co|ly|fun|lol|site|link|info|top|vip|pro|tv|to|sh|so|dev|ai|club|biz|live|tech|online|store|finance|money|exchange|trade|cash|claim|airdrop|ru|cn|in|us|uk)\b|t\.me\/|discord\.(gg|com)|\b0x[a-f0-9]{6,})/ig;
  const B58=/\b[1-9A-HJ-NP-Za-km-z]{30,48}\b/g;
  let sent=[], muted=false, lastTxt='';
  const box=()=>$('#chatBox');
  function clean(t){ t=String(t||'').replace(/[\u0000-\u001f\u200b-\u200f\u202a-\u202e]/g,'').replace(/\s+/g,' ').trim().slice(0,80);
    t=t.replace(LINK,'[link removed]').replace(B58,'[link removed]').replace(/(\[link removed\]\s*)+/g,'[link removed] ').trim(); return t; }
  function add(cls,who,text){ const log=$('#chatLog'); if(!log) return; const d=document.createElement('div'); d.className='m '+cls; if(who){ const b=document.createElement('b'); b.textContent=who; d.appendChild(b); } d.appendChild(document.createTextNode(text)); log.appendChild(d);
    while(log.children.length>60) log.firstChild.remove(); log.scrollTop=log.scrollHeight; }
  function canSend(){ const now=performance.now(); sent=sent.filter(x=>now-x<10000); if(sent.length>=5) return 'Slow down. Max 5 messages per 10s.'; if(sent.length && now-sent[sent.length-1]<1200) return 'Slow down.'; return ''; }
  function send(raw){ const O=st.online; if(!O||!O.link||!O.started) return; const t=clean(raw); if(!t) return;
    if(t===lastTxt && performance.now()-(sent[sent.length-1]||0)<5000){ add('sys','','No spam.'); return; }
    const why=canSend(); if(why){ add('sys','',why); return; }
    sent.push(performance.now()); lastTxt=t; O.link.send({t:'chat',m:t},true); add('me','YOU',t); }
  let rx=[];
  function recv(m){ const now=performance.now(); rx=rx.filter(x=>now-x<10000); if(rx.length>=6) return; rx.push(now); // their client may be modified: re-filter and re-limit here
    const t=clean(m&&m.m); if(!t||muted) return; const O=st.online; add('op',(O&&O.info&&O.info.opponent.name||'OPP').toUpperCase(),t); if(document.activeElement!==$('#chatInput')) Au.sfx('select'); }
  function open(oppName){ box().hidden=false; $('#screen-game').classList.add('with-chat'); $('#chatLog').innerHTML=''; sent=[]; rx=[]; lastTxt=''; muted=false; $('#chatMute').classList.remove('on'); $('#chatMute').textContent='MUTE';
    add('sys','',`Chatting with ${oppName}. Links are blocked.`); layout(); }
  function close(){ if(box()) box().hidden=true; $('#screen-game').classList.remove('with-chat'); if(document.activeElement===$('#chatInput')) $('#chatInput').blur(); }
  function layout(){ const b=box(); if(!b||b.hidden) return; const cb=$('#canvasBox').getBoundingClientRect(); b.style.setProperty('--chatH',Math.round(cb.height)+'px'); const below=innerWidth<1180; b.classList.toggle('below', below); $('#screen-game').classList.toggle('with-chat', !below); requestAnimationFrame(()=>{ const c2=$('#canvasBox').getBoundingClientRect(); b.style.setProperty('--chatH',Math.round(c2.height)+'px'); }); }
  $('#chatForm').addEventListener('submit',e=>{ e.preventDefault(); const i=$('#chatInput'); if(i.value.trim()) send(i.value); i.value=''; i.blur(); }); // Enter sends and drops you straight back into the fight
  $$('#chatQuick button').forEach(b=>b.onclick=()=>send(b.textContent));
  $('#chatMute').onclick=()=>{ muted=!muted; $('#chatMute').classList.toggle('on',muted); $('#chatMute').textContent=muted?'MUTED':'MUTE'; add('sys','',muted?'Opponent muted.':'Opponent unmuted.'); };
  $('#chatInput').addEventListener('focus',()=>{ resetInput(); box().classList.add('typing'); });
  $('#chatInput').addEventListener('blur',()=>box().classList.remove('typing'));
  $('#chatInput').addEventListener('keydown',e=>{ e.stopPropagation(); if(e.code==='Escape'){ e.preventDefault(); e.target.blur(); } });
  $('#chatInput').addEventListener('keyup',e=>e.stopPropagation());
  addEventListener('resize',layout);
  return { open, close, recv, clean, layout, isOpen:()=>!box().hidden };
})();
window.DD_CHAT=Chat;
function forfeit(){ const O=st.online; if(!O||O.done) return; O.link.send({t:'ff'},true); O.link.send({t:'ff'},true); $('#pauseOv').hidden=true; finishOnline(false,'FORFEIT'); }
function closeOnline(){ Chat.close(); const O=st.online; if(!O) return; clearInterval(O.hb); clearInterval(O.rdyT); clearTimeout(O.connectTimeout); if(!O.done&&O.started) O.link.send({t:'ff'},true); try{ O.link.close(); }catch(e){} st.online=null; st.net=null; }
window.addEventListener('beforeunload',()=>{ const O=st.online; if(O&&O.started&&!O.done) O.link.send({t:'ff'},true); if(st.q) ON.leave(); });

// ---------- input ----------
const blank=()=>({left:false,right:false,up:false,down:false,p:false,k:false,block:false,sp:false,th:false});
const kb=[blank(),blank()], mouse=blank(), touch=blank();
const KEY_SOLO={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',KeyJ:'p',KeyK:'k',Space:'block',ShiftLeft:'block',KeyL:'sp',KeyE:'sp',KeyQ:'th',KeyI:'th'};
const KEY_P1={KeyA:'left',KeyD:'right',KeyW:'up',KeyS:'down',KeyF:'p',KeyG:'k',KeyH:'sp',KeyT:'block',KeyR:'th'};
const KEY_P2={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down',Numpad1:'p',Comma:'p',Numpad2:'k',Period:'k',Numpad3:'sp',Slash:'sp',Numpad0:'block',ShiftRight:'block',Quote:'th',Numpad4:'th'};
function keyTarget(code){ if(st.mode==='local'){ if(KEY_P1[code]) return [0,KEY_P1[code]]; if(KEY_P2[code]) return [1,KEY_P2[code]]; return null; } return KEY_SOLO[code]?[0,KEY_SOLO[code]]:null; }
function resetInput(){ for(const o of [kb[0],kb[1],mouse,touch]) for(const k in o) o[k]=false; }
document.addEventListener('keydown',e=>{
  if(!$('#nameOv').hidden){ if(e.code==='Escape') $('#nameCancel').click(); return; }
  if(!$('#lbOv').hidden){ if(e.code==='Escape') $('#lbOv').hidden=true; return; }
  if(!$('#howOv').hidden){ if(e.code==='Escape'||e.code==='Enter'){ e.preventDefault(); closeHow(); } return; }
  if(!$('#queueOv').hidden){ if(e.code==='Escape'&&st.q) cancelQueue(); return; }
  if(e.target && e.target.id==='chatInput') return;
  if(st.screen==='game'){
    if((e.code==='Enter'||e.code==='NumpadEnter') && Chat.isOpen()){ e.preventDefault(); resetInput(); $('#chatInput').focus(); return; }
    if(e.code==='Escape'||(e.code==='KeyP'&&st.mode!=='local')){ if(st.fight&&!st.fight.over) pauseGame($('#pauseOv').hidden); e.preventDefault(); return; }
    const t=keyTarget(e.code); if(t){ kb[t[0]][t[1]]=true; e.preventDefault(); }
    return;
  }
  if(st.screen==='select') selectKeys(e);
  if(st.screen==='title' && e.code==='Enter'){ e.preventDefault(); $('#cpuBtn').click(); }
});
document.addEventListener('keyup',e=>{ for(const m of [KEY_SOLO,KEY_P1,KEY_P2]){ const k=m[e.code]; if(k){ const t=keyTarget(e.code); if(t) kb[t[0]][t[1]]=false; else kb[0][k]=false; } } });
const MOUSE=['p','sp','k'];
function mouseOk(e){ return st.screen==='game' && st.mode!=='local' && st.fight && !st.fight.paused && !e.target.closest('button,.overlay,.touch,a'); }
document.addEventListener('mousedown',e=>{ if(!mouseOk(e)) return; const k=MOUSE[e.button]; if(k){ mouse[k]=true; e.preventDefault(); } });
document.addEventListener('mouseup',e=>{ const k=MOUSE[e.button]; if(k) mouse[k]=false; });
document.addEventListener('contextmenu',e=>{ if(st.screen==='game' && !e.target.closest('.overlay')) e.preventDefault(); });
document.addEventListener('auxclick',e=>{ if(st.screen==='game') e.preventDefault(); });
document.addEventListener('visibilitychange',()=>{ if(document.hidden){ resetInput(); if(st.fight&&!st.net&&st.screen==='game'&&!st.fight.over) pauseGame(true); } });
window.addEventListener('blur',()=>{ resetInput(); if(st.fight&&!st.net&&st.screen==='game'&&!st.fight.over) pauseGame(true); });
// gamepads (standard mapping): X punch, A kick, Y special, B / bumpers block, d-pad or left stick to move
function padInput(i){
  const pads=(navigator.getGamepads?navigator.getGamepads():[])||[], list=[...pads].filter(Boolean), g=list[i]; const o=blank(); if(!g) return o;
  const B=n=>g.buttons[n]&&g.buttons[n].pressed, ax=g.axes||[];
  o.left=B(14)||ax[0]<-0.5; o.right=B(15)||ax[0]>0.5; o.up=B(12)||ax[1]<-0.6; o.down=B(13)||ax[1]>0.6;
  o.p=B(2); o.k=B(0); o.sp=B(3)||B(7); o.block=B(1)||B(4)||B(6); o.th=B(5);
  if(B(9)&&!padInput.start){ padInput.start=true; if(st.screen==='game'&&st.fight&&!st.fight.over) pauseGame($('#pauseOv').hidden); } else if(!B(9)) padInput.start=false;
  return o;
}
function playerInput(i){
  const o=blank(), pad=padInput(i);
  for(const k in o) o[k]= kb[i][k] || pad[k] || (i===0 && (touch[k] || (st.mode!=='local' && mouse[k])));
  return o;
}
function selectKeys(e){
  const isA = st.step===2;
  const cols = getComputedStyle(isA?$('#arenaGrid'):$('#fighterGrid')).gridTemplateColumns.split(' ').length;
  const n = isA ? AR.length : (st.step===1 ? F.length+1 : F.length);
  let c=st.cursor;
  if(e.code==='ArrowRight'||e.code==='KeyD') c=(c+1)%n;
  else if(e.code==='ArrowLeft'||e.code==='KeyA') c=(c-1+n)%n;
  else if(e.code==='ArrowDown'||e.code==='KeyS') c=Math.min(n-1,c+cols);
  else if(e.code==='ArrowUp'||e.code==='KeyW') c=Math.max(0,c-cols);
  else if(e.code==='Enter'||e.code==='Space'||e.code==='KeyJ'||e.code==='KeyF'){
    e.preventDefault();
    const pickedNow = isA ? st.arena===AR[c] : st.step===1 ? (c===F.length?st.randomCpu:st.p2===F[c]&&!st.randomCpu) : st.p1===F[c];
    if(pickedNow) lockIn(); else if(isA) pickArena(c); else pick(c===F.length?'rand':c);
    return;
  }
  else if(e.code==='Escape'||e.code==='Backspace'){ if(st.step>0&&st.mode!=='ranked') openSelect(st.step-1); else quitToTitle(); return; }
  else return;
  e.preventDefault(); st.cursor=c;
  if(isA){ markCursor(); Au.sfx('move'); } else if(c<F.length) hover(c); else markCursor();
  const el=$$(isA?'#arenaGrid .atile':'#fighterGrid .tile')[c]; if(el) el.scrollIntoView({block:'nearest'});
}
$$('#touch button').forEach(b=>{
  const k=b.dataset.k;
  const on=e=>{ e.preventDefault(); touch[k]=true; b.classList.add('down'); unlock(); };
  const off=e=>{ e.preventDefault(); touch[k]=false; b.classList.remove('down'); };
  b.addEventListener('pointerdown',on); b.addEventListener('pointerup',off); b.addEventListener('pointerleave',off); b.addEventListener('pointercancel',off);
  b.addEventListener('contextmenu',e=>e.preventDefault());
});

// ---------- loop ----------
let last=performance.now(), acc=0;
function loop(now){
  acc+=Math.min(100,now-last); last=now;
  const STEP=1000/60;
  while(acc>=STEP){
    acc-=STEP;
    if(st.screen==='game' && st.fight){
      if(st.net) st.net.tick(playerInput(0));
      else st.fight.update(playerInput(0), playerInput(1));
    }
  }
  const O=st.online;
  if(O&&O.started&&!O.done&&O.role==='guest'&&st.fight&&st.fight.over){ const w=st.fight.p.findIndex(f=>f.wins>=2); if(w>=0) finishOnline(w===1,'KO'); }
  if(O&&O.started&&!O.done){ const quiet=performance.now()-O.link.lastHeard; if(quiet>7000 || (O.byeAt&&performance.now()-O.byeAt>1500)){
    // if the match was already decided on screen, the link dropping afterwards is not a disconnect win
    const w=st.fight?st.fight.p.findIndex(f=>f.wins>=2):-1;
    if(w>=0) finishOnline(w===O.myIdx,'KO'); else finishOnline(true,'DISCONNECT'); } }
  if(st.screen==='title') drawTitle();
  if(st.screen==='game' && st.fight) st.fight.draw(gc);
  if(st.screen==='game' && st.fight && st.fight.phase==='ko' && st.fight.pt>=10 && st.koRound!==st.fight.round){ st.koRound=st.fight.round; try{ const c=document.createElement('canvas'); c.width=gc.canvas.width; c.height=gc.canvas.height; c.getContext('2d').drawImage(gc.canvas,0,0); st.koShot=c; }catch(e){} }
  DD.Sprites.warmTick(st.screen==='game'&&st.fight&&st.fight.phase==='fight'?4:12);
  requestAnimationFrame(loop);
}

// ---------- boot ----------
function boot(){
  try{ if(DD.Scene) DD.Scene.init(); }catch(e){ console.warn('scene',e); } buildGrids(); show('title'); requestAnimationFrame(loop);
  if(ON.available() && ON.ident){ ON.me().then(refreshChip).catch(()=>{}); }
  refreshOnlineLine(); setInterval(()=>{ if(st.screen==='title') refreshOnlineLine(); },30000);
}
const fontsReady = document.fonts ? Promise.race([document.fonts.load('16px "Press Start 2P"'), new Promise(r=>setTimeout(r,1500))]) : Promise.resolve();
fontsReady.then(()=>{ DD.Arenas.clearCache(); titleStage=null; boot(); });
})();
