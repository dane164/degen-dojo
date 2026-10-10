/* DEGEN DOJO — UI, input, loop */
(function(){
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const F=DD.FIGHTERS, AR=DD.ARENAS, Au=DD.Audio;
window.DD_STATE = null;
const st = { screen:'title', step:0, p1:null, p2:null, arena:null, cursor:0, diff:'normal', fight:null, randomCpu:false, randomArena:false };
try{ st.diff = localStorage.getItem('dd_diff') || 'normal'; }catch(e){}
window.DD_STATE = st;

// ---------- screens ----------
function show(name){
  st.screen=name; $$('.screen').forEach(s=>s.classList.toggle('active', s.id==='screen-'+name));
  window.scrollTo(0,0);
  if(name==='title') Au.playSong(Au.TITLE_SONG);
}

// ---------- audio unlock ----------
let audioOn=false;
function unlock(){ if(audioOn) return; audioOn=true; Au.init(); $('#soundHint').textContent = Au.isMuted()?'SOUND OFF':'8-BIT SOUND ON';
  if(st.screen==='game' && st.fight) Au.playSong(st.fight.arena.music, true); else Au.playSong(Au.TITLE_SONG); }
document.addEventListener('pointerdown',unlock,{once:false}); document.addEventListener('keydown',unlock);
function syncMute(){ $('#muteBtn').classList.toggle('muted',Au.isMuted()); $('#muteBtn').textContent = Au.isMuted()?'×':'♪'; if(audioOn) $('#soundHint').textContent = Au.isMuted()?'SOUND OFF':'8-BIT SOUND ON'; }
$('#muteBtn').onclick=()=>{ Au.setMuted(!Au.isMuted()); syncMute(); };
syncMute();

// ---------- title ----------
const tc=$('#titleCanvas').getContext('2d'); tc.imageSmoothingEnabled=false;
const lineup=['bear','moon','diamond','main','whale','shiba','brain'].map(id=>F.find(f=>f.id===id));
let tf=0;
let titleStage=null;
function bakeTitleStage(){ // dithered wooden dojo stage the lineup stands on (transparent above)
  const P=DD.Pix, cv=document.createElement('canvas'); cv.width=480; cv.height=270; const c=cv.getContext('2d',{willReadFrequently:true});
  c.fillStyle=P.vgrad(c,226,270,['#c8823e','#8a4a1e','#4a2008']); c.beginPath(); c.moveTo(20,236); c.lineTo(460,236); c.lineTo(480,270); c.lineTo(0,270); c.fill();
  for(let i=-10;i<=10;i++){ c.strokeStyle='rgba(60,24,6,.5)'; c.lineWidth=1; c.beginPath(); c.moveTo(240+i*22,236); c.lineTo(240+i*26,270); c.stroke(); }
  P.R(c,20,234,440,3,'#ffd8a0'); P.R(c,0,262,480,8,'#2b1405');
  P.texture(c,0,234,480,36,0.3,3,9);
  P.glow(c,240,236,200,'rgba(255,200,120,0.25)');
  P.dither(c,480,270,10); return cv;
}
function drawTitle(){
  tf++;
  tc.setTransform(1,0,0,1,0,0); tc.clearRect(0,0,960,540);
  tc.setTransform(2,0,0,2,0,0); tc.imageSmoothingEnabled=false;
  if(!titleStage) titleStage=bakeTitleStage();
  tc.drawImage(titleStage,0,0);
  lineup.forEach((s,i)=>{
    const x=60+i*60, y=238+(i===3?2:0), cv=DD.Sprites.get(s,'idle',((tf/10)|0)+i,false,false);
    const sc=(i===3?1.6:1.3)/DD.Sprites.RES, dir=i<=3?1:-1;
    tc.fillStyle='rgba(43,20,5,.35)'; tc.beginPath(); tc.ellipse(x,y+1,14*sc*DD.Sprites.RES,3,0,0,7); tc.fill();
    tc.save(); tc.translate(x,y); tc.scale(dir*sc,sc); tc.drawImage(cv,-cv._ox,-cv._oy); tc.restore();
  });
}
$$('.diff button').forEach(b=>{ b.classList.toggle('on',b.dataset.diff===st.diff); b.onclick=()=>{ st.diff=b.dataset.diff; try{localStorage.setItem('dd_diff',st.diff);}catch(e){} $$('.diff button').forEach(x=>x.classList.toggle('on',x===b)); Au.sfx('select'); }; });
$('#startBtn').onclick=()=>{ Au.sfx('lock'); openSelect(0); };
$('#quickBtn').onclick=()=>{ Au.sfx('lock'); const r=a=>a[Math.floor(Math.random()*a.length)]; st.p1=r(F); st.p2=r(F); st.randomCpu=false; st.arena=r(AR); startMatch(); };
$('#howBtn').onclick=$('#helpBtn').onclick=()=>{ $('#howOv').hidden=false; if(st.fight) st.fight.paused=true; };
$('#brandHome').onclick=e=>{ e.preventDefault(); quitToTitle(); };
$('#backTitle').onclick=()=>quitToTitle();

// ---------- select ----------
const port = {}; // cached portrait urls
function P(s,pose){ const k=s.id+(pose||''); return port[k]||(port[k]=DD.Sprites.portrait(s,2,pose||'idle')); }
const PORT_SMALL = {}; function PS(s){ return PORT_SMALL[s.id]||(PORT_SMALL[s.id]=DD.Sprites.portrait(s,1)); }

function buildGrids(){
  const g=$('#fighterGrid'); g.innerHTML='';
  F.forEach((s,i)=>{ const b=document.createElement('button'); b.className='tile'; b.dataset.i=i; b.innerHTML=`<img src="${PS(s)}" alt=""><span class="nm">${s.name}</span>`;
    b.onclick=()=>{ st.cursor=i; pick(i); }; b.ondblclick=()=>lockIn(); b.onmouseenter=()=>{ if(st.cursor!==i){ st.cursor=i; hover(i); } }; g.appendChild(b); });
  const r=document.createElement('button'); r.className='tile random'; r.dataset.i='rand'; r.innerHTML=`<span class="qm">?</span><span class="nm">RANDOM CPU</span>`; r.onclick=()=>{ st.cursor=F.length; pick('rand'); }; r.ondblclick=()=>lockIn(); g.appendChild(r);
  const a=$('#arenaGrid'); a.innerHTML='';
  AR.forEach((ar,i)=>{ const b=document.createElement('button'); b.className='atile'; b.dataset.i=i; b.innerHTML=`<img src="${DD.Arenas.thumb(ar.id)}" alt=""><span class="nm">${ar.name.toUpperCase()}<small>${ar.sub}</small></span>`;
    b.onclick=()=>{ st.cursor=i; pickArena(i); }; b.ondblclick=()=>lockIn(); b.onmouseenter=()=>{ st.cursor=i; markCursor(); }; a.appendChild(b); });
}

function openSelect(step){
  show('select'); st.step=step;
  if(step===0){ st.p1=st.p1||F[0]; st.cursor=F.indexOf(st.p1); }
  if(step===1){ st.cursor = st.p2 ? F.indexOf(st.p2) : 0; }
  if(step===2){ st.cursor = st.arena ? AR.indexOf(st.arena) : 0; }
  renderSelect();
}
function renderSelect(){
  const s=st.step;
  $$('.step').forEach((b,i)=>{ b.classList.toggle('on',i===s); b.classList.toggle('done',i<s); });
  $('#stepNum').textContent='0'+(s+1);
  $('#stepLabel').textContent=['SELECT YOUR FIGHTER','SELECT CPU OPPONENT','SELECT ARENA'][s];
  $('#gridTitle').textContent=['SELECT YOUR FIGHTER','SELECT CPU OPPONENT','SELECT ARENA'][s];
  $('#gridStep').textContent=['STEP 01 / YOUR SIDE','STEP 02 / CPU SIDE','STEP 03 / ARENA'][s];
  $('#fighterGrid').hidden = s===2; $('#arenaGrid').hidden = s!==2;
  $('#fighterGrid .random').style.display = s===1?'':'none';
  // panel
  setSide(1, st.p1);
  if(s===0){ $('#p1State').textContent='SELECTING'; setSide(2,null); $('#p2Up').textContent='UP NEXT'; }
  else { $('#p1State').textContent='LOCKED'; $('#p2Up').textContent = s===1?'SELECTING':'LOCKED'; setSide(2, st.p2, st.randomCpu&&s===1); }
  // badges
  $$('#fighterGrid .tile').forEach(t=>{ t.querySelectorAll('.badge').forEach(x=>x.remove()); t.classList.remove('sel');
    const i=+t.dataset.i; if(st.p1&&F[i]===st.p1 && s>0){ t.insertAdjacentHTML('afterbegin','<span class="badge">YOU</span>'); }
    if(s===0 && F[i]===st.p1){ t.classList.add('sel'); t.insertAdjacentHTML('afterbegin','<span class="badge">YOU</span>'); }
    if(s===1 && ((st.p2&&F[i]===st.p2&&!st.randomCpu) || (t.dataset.i==='rand'&&st.randomCpu))){ t.classList.add('sel'); t.insertAdjacentHTML('afterbegin','<span class="badge cpu">CPU</span>'); } });
  $$('#arenaGrid .atile').forEach((t,i)=>t.classList.toggle('sel',AR[i]===st.arena));
  markCursor();
  const lockName = s===0 ? st.p1&&st.p1.name : s===1 ? (st.randomCpu?'Random CPU':st.p2&&st.p2.name) : st.arena&&st.arena.name;
  $('#lockName').textContent = lockName || '—';
  $('#lockHint').textContent = ['THEN CHOOSE YOUR CPU','THEN CHOOSE YOUR ARENA','THEN FIGHT'][s];
  $('#lockBtn').querySelector('span').textContent = s===2?'FIGHT!':'LOCK IN';
  $('#lockBtn').disabled = !(s===0?st.p1 : s===1?(st.p2||st.randomCpu) : st.arena);
}
function setSide(n,s,rand){
  const img=$('#p'+n+'Img');
  if(!s || rand){ img.style.visibility='hidden'; if(n===2){ $('#p2Q').style.display=''; $('#p2Name').textContent=rand?'RANDOM CPU':'CPU OPPONENT'; $('#p2Tag').textContent=rand?'ANYONE. GOOD LUCK.':'CHOOSE AFTER YOUR FIGHTER.'; $('#p2Sp').textContent=''; } return; }
  img.style.visibility=''; img.src=P(s);
  if(n===2) $('#p2Q').style.display='none';
  $('#p'+n+'Name').textContent=s.name.toUpperCase(); $('#p'+n+'Tag').textContent=s.tag; $('#p'+n+'Sp').textContent='SPECIAL: '+s.special.name+' — '+s.special.desc;
}
function hover(i){ Au.sfx('move'); if(st.step===0){ setSide(1,F[i]); $('#lockName').textContent=F[i].name; } else if(st.step===1){ setSide(2,F[i]); $('#lockName').textContent=F[i].name; } markCursor(); }
function pick(i){
  Au.sfx('select');
  if(i==='rand'){ st.randomCpu=true; st.p2=null; }
  else if(st.step===0){ st.p1=F[i]; }
  else { st.randomCpu=false; st.p2=F[i]; }
  renderSelect();
}
function pickArena(i){ Au.sfx('select'); st.arena=AR[i]; renderSelect(); Au.playSong(AR[i].music,true); }
function markCursor(){
  const sel = st.step===2 ? '#arenaGrid .atile' : '#fighterGrid .tile';
  $$('.tile,.atile').forEach(t=>t.classList.remove('cursor'));
  const el=$$(sel)[st.cursor]; if(el) el.classList.add('cursor');
}
$('#lockBtn').onclick=lockIn;
function lockIn(){
  if($('#lockBtn').disabled) return;
  Au.sfx('lock');
  if(st.step<2){ openSelect(st.step+1); return; }
  startMatch();
}
$$('.step').forEach(b=>b.onclick=()=>{ const n=+b.dataset.step; if(n<=st.step || (n===1&&st.p1) || (n===2&&st.p1&&(st.p2||st.randomCpu))) openSelect(n); });

// ---------- match ----------
const gc=$('#game').getContext('2d'); gc.imageSmoothingEnabled=false;
function startMatch(){
  let p2 = st.randomCpu ? F[Math.floor(Math.random()*F.length)] : st.p2;
  st.curP2=p2;
  st.fight = new DD.Game.Fight({ p1:st.p1, p2, arena:st.arena, ai:new DD.Game.CPU(st.diff), onEnd:endMatch });
  $('#resultOv').hidden=true; $('#pauseOv').hidden=true;
  show('game'); Au.playSong(st.arena.music,true);
  resetInput();
}
function endMatch(won,fight){
  Au.stop(); Au.sfx(won?'win':'lose'); Au.say(won?'You win':'Rekt');
  const w = won?fight.p[0]:fight.p[1];
  $('#resKicker').textContent = won?'FLAWLESS DEGENERACY':'MATCH OVER';
  $('#resTitle').textContent = won?'YOU WIN':'REKT';
  $('#resImg').src = P(w.spec,'win');
  $('#resLine').textContent = won ? `${fight.p[0].spec.name} takes the dojo. ${fight.p[0].spec.tag}.` : `${fight.p[1].spec.name} sent you back to the charts.`;
  const s0=fight.stats[0];
  $('#resStats').innerHTML=[['HITS',s0.hits],['BEST COMBO',s0.maxCombo],['DAMAGE',Math.round(s0.dmg)],['BLOCKS',s0.blocks],['PARRIES',s0.parries],['ROUNDS',fight.p[0].wins+'-'+fight.p[1].wins]]
    .map(([k,v])=>`<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  setTimeout(()=>{ $('#resultOv').hidden=false; },500);
}
function pauseGame(on){ if(!st.fight||st.fight.over) return; st.fight.paused=on; $('#pauseOv').hidden=!on; if(on) Au.stop(); else Au.playSong(st.fight.arena.music,true); }
function quitToTitle(){ st.fight=null; $$('.overlay').forEach(o=>o.hidden=true); show('title'); }
document.addEventListener('click',e=>{
  const a=e.target.closest('[data-act]'); if(!a) return;
  const act=a.dataset.act;
  if(act==='resume') pauseGame(false);
  if(act==='restart'){ startMatch(); }
  if(act==='next'){ const pool=F.filter(f=>f!==st.curP2); st.p2=pool[Math.floor(Math.random()*pool.length)]; st.randomCpu=false; startMatch(); }
  if(act==='select'){ st.fight=null; $$('.overlay').forEach(o=>o.hidden=true); openSelect(0); }
  if(act==='title') quitToTitle();
  if(act==='closeHow'){ $('#howOv').hidden=true; if(st.fight && $('#pauseOv').hidden) st.fight.paused=false; }
});
$('#pauseBtn').onclick=()=>pauseGame(true);
$('#howOv').addEventListener('click',e=>{ if(e.target.id==='howOv'){ $('#howOv').hidden=true; if(st.fight && $('#pauseOv').hidden) st.fight.paused=false; } });

// ---------- input ----------
const input={left:false,right:false,up:false,down:false,p:false,k:false,block:false,sp:false};
function resetInput(){ for(const k in input) input[k]=false; }
const KEYMAP={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',KeyJ:'p',KeyK:'k',Space:'block',ShiftLeft:'block',KeyL:'sp',KeyE:'sp'};
document.addEventListener('keydown',e=>{
  if(!$('#howOv').hidden){ if(e.code==='Escape'){ $('#howOv').hidden=true; if(st.fight&&$('#pauseOv').hidden) st.fight.paused=false; } return; }
  if(st.screen==='game'){
    if(e.code==='Escape'||e.code==='KeyP'){ if(st.fight&&!st.fight.over) pauseGame(!st.fight.paused); e.preventDefault(); return; }
    const k=KEYMAP[e.code]; if(k){ input[k]=true; e.preventDefault(); }
    return;
  }
  if(st.screen==='select') selectKeys(e);
  if(st.screen==='title' && (e.code==='Enter'||e.code==='Space')){ e.preventDefault(); $('#startBtn').click(); }
});
document.addEventListener('keyup',e=>{ const k=KEYMAP[e.code]; if(k) input[k]=false; });
// mouse: left = punch, right = kick, middle = special (only while fighting, not on overlays/buttons)
const MOUSE=['p','sp','k'];
function mouseOk(e){ return st.screen==='game' && st.fight && !st.fight.paused && !e.target.closest('button,.overlay,.touch,a'); }
document.addEventListener('mousedown',e=>{ if(!mouseOk(e)) return; const k=MOUSE[e.button]; if(k){ input[k]=true; e.preventDefault(); } });
document.addEventListener('mouseup',e=>{ const k=MOUSE[e.button]; if(k) input[k]=false; });
document.addEventListener('contextmenu',e=>{ if(st.screen==='game' && !e.target.closest('.overlay')) e.preventDefault(); });
document.addEventListener('auxclick',e=>{ if(st.screen==='game') e.preventDefault(); });
window.addEventListener('blur',()=>{ resetInput(); if(st.fight&&st.screen==='game'&&!st.fight.over) pauseGame(true); });

function selectKeys(e){
  const isA = st.step===2;
  const cols = getComputedStyle(isA?$('#arenaGrid'):$('#fighterGrid')).gridTemplateColumns.split(' ').length;
  const n = isA ? AR.length : (st.step===1 ? F.length+1 : F.length);
  let c=st.cursor;
  if(e.code==='ArrowRight'||e.code==='KeyD') c=(c+1)%n;
  else if(e.code==='ArrowLeft'||e.code==='KeyA') c=(c-1+n)%n;
  else if(e.code==='ArrowDown'||e.code==='KeyS') c=Math.min(n-1,c+cols);
  else if(e.code==='ArrowUp'||e.code==='KeyW') c=Math.max(0,c-cols);
  else if(e.code==='Enter'||e.code==='Space'||e.code==='KeyJ'){
    e.preventDefault();
    const pickedNow = isA ? st.arena===AR[c] : st.step===1 ? (c===F.length?st.randomCpu:st.p2===F[c]&&!st.randomCpu) : st.p1===F[c];
    if(pickedNow) lockIn(); else if(isA) pickArena(c); else pick(c===F.length?'rand':c);
    return;
  }
  else if(e.code==='Escape'||e.code==='Backspace'){ if(st.step>0) openSelect(st.step-1); else quitToTitle(); return; }
  else return;
  e.preventDefault(); st.cursor=c;
  if(isA){ markCursor(); Au.sfx('move'); } else if(c<F.length) hover(c); else markCursor();
  const el=$$(isA?'#arenaGrid .atile':'#fighterGrid .tile')[c]; if(el) el.scrollIntoView({block:'nearest'});
}

// touch buttons
$$('#touch button').forEach(b=>{
  const k=b.dataset.k;
  const on=e=>{ e.preventDefault(); input[k]=true; b.classList.add('down'); unlock(); };
  const off=e=>{ e.preventDefault(); input[k]=false; b.classList.remove('down'); };
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
    if(st.screen==='game' && st.fight) st.fight.update({...input});
  }
  if(st.screen==='title') drawTitle();
  if(st.screen==='game' && st.fight) st.fight.draw(gc);
  requestAnimationFrame(loop);
}

// ---------- boot ----------
function boot(){ if(DD.Scene) DD.Scene.init(); buildGrids(); show('title'); requestAnimationFrame(loop); }
const fontsReady = document.fonts ? Promise.race([document.fonts.load('16px "Press Start 2P"'), new Promise(r=>setTimeout(r,1500))]) : Promise.resolve();
fontsReady.then(()=>{ DD.Arenas.clearCache(); titleStage=null; boot(); });
})();
