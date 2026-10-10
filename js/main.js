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
  st.screen=name; $$('.screen').forEach(s=>s.classList.toggle('active', s.id==='screen-'+name));
  window.scrollTo(0,0);
  if(name==='title') Au.playSong(Au.TITLE_SONG);
  $('#keysSolo').hidden = st.mode==='local'; $('#keysLocal').hidden = st.mode!=='local';
}
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.hidden=false; clearTimeout(toast.t); toast.t=setTimeout(()=>t.hidden=true,3800); }

// ---------- audio ----------
let audioOn=false;
function unlock(){ if(audioOn) return; audioOn=true; Au.init(); $('#soundHint').textContent = Au.isMuted()?'SOUND OFF':'8-BIT SOUND ON';
  if(st.screen==='game' && st.fight) Au.playSong(st.fight.arena.music, true); else Au.playSong(Au.TITLE_SONG); }
document.addEventListener('pointerdown',unlock); document.addEventListener('keydown',unlock);
function syncMute(){ $('#muteBtn').classList.toggle('muted',Au.isMuted()); $('#muteBtn').textContent = Au.isMuted()?'×':'♪'; if(audioOn) $('#soundHint').textContent = Au.isMuted()?'SOUND OFF':'8-BIT SOUND ON'; }
$('#muteBtn').onclick=()=>{ Au.setMuted(!Au.isMuted()); syncMute(); };
syncMute();

// ---------- title ----------
const tc=$('#titleCanvas').getContext('2d'); tc.imageSmoothingEnabled=false;
const lineup=['bear','moon','diamond','main','whale','shiba','brain'].map(id=>F.find(f=>f.id===id));
let tf=0, titleStage=null;
function bakeTitleStage(){
  const P=DD.Pix, cv=document.createElement('canvas'); cv.width=480; cv.height=270; const c=cv.getContext('2d',{willReadFrequently:true});
  c.fillStyle=P.vgrad(c,226,270,['#c8823e','#8a4a1e','#4a2008']); c.beginPath(); c.moveTo(20,236); c.lineTo(460,236); c.lineTo(480,270); c.lineTo(0,270); c.fill();
  for(let i=-10;i<=10;i++){ c.strokeStyle='rgba(60,24,6,.5)'; c.lineWidth=1; c.beginPath(); c.moveTo(240+i*22,236); c.lineTo(240+i*26,270); c.stroke(); }
  P.R(c,20,234,440,3,'#ffd8a0'); P.R(c,0,262,480,8,'#2b1405');
  P.texture(c,0,234,480,36,0.3,3,9); P.glow(c,240,236,200,'rgba(255,200,120,0.25)');
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
$('#cpuBtn').onclick=()=>{ Au.sfx('lock'); st.mode='cpu'; openSelect(0); };
$('#localBtn').onclick=()=>{ Au.sfx('lock'); st.mode='local'; openSelect(0); };
$('#rankedBtn').onclick=async()=>{ Au.sfx('lock'); const ok=await ensureProfile(); if(!ok) return; st.mode='ranked'; openSelect(0); };
$('#quickBtn').onclick=()=>{ Au.sfx('lock'); st.mode='cpu'; const r=a=>a[Math.floor(Math.random()*a.length)]; st.p1=r(F); st.p2=r(F); st.randomCpu=false; st.arena=r(AR); startMatch(); };
$('#howBtn').onclick=$('#helpBtn').onclick=()=>{ $('#howOv').hidden=false; if(st.fight&&!st.net) st.fight.paused=true; };
$('#lbBtn').onclick=$('#lbTop').onclick=()=>openLeaderboard();
$('#profileChip').onclick=()=>openLeaderboard();
$('#brandHome').onclick=e=>{ e.preventDefault(); if(st.net) return toast('Finish or forfeit the match first.'); quitToTitle(); };
$('#backTitle').onclick=()=>quitToTitle();

// ---------- select ----------
const port={}; function P(s,pose){ const k=s.id+(pose||''); return port[k]||(port[k]=DD.Sprites.portrait(s,2,pose||'idle')); }
const PORT_SMALL={}; function PS(s){ return PORT_SMALL[s.id]||(PORT_SMALL[s.id]=DD.Sprites.portrait(s,1)); }
function buildGrids(){
  const g=$('#fighterGrid'); g.innerHTML='';
  F.forEach((s,i)=>{ const b=document.createElement('button'); b.className='tile'; b.dataset.i=i; b.innerHTML=`<img src="${PS(s)}" alt=""><span class="nm">${s.name}</span>`;
    b.onclick=()=>{ st.cursor=i; pick(i); }; b.ondblclick=()=>lockIn(); b.onmouseenter=()=>{ if(st.cursor!==i){ st.cursor=i; hover(i); } }; g.appendChild(b); });
  const r=document.createElement('button'); r.className='tile random'; r.dataset.i='rand'; r.innerHTML=`<span class="qm">?</span><span class="nm">RANDOM</span>`; r.onclick=()=>{ st.cursor=F.length; pick('rand'); }; r.ondblclick=()=>lockIn(); g.appendChild(r);
  const a=$('#arenaGrid'); a.innerHTML='';
  AR.forEach((ar,i)=>{ const b=document.createElement('button'); b.className='atile'; b.dataset.i=i; b.innerHTML=`<img src="${DD.Arenas.thumb(ar.id)}" alt=""><span class="nm">${ar.name.toUpperCase()}<small>${ar.sub}</small></span>`;
    b.onclick=()=>{ st.cursor=i; pickArena(i); }; b.ondblclick=()=>lockIn(); b.onmouseenter=()=>{ st.cursor=i; markCursor(); }; a.appendChild(b); });
}
const MODE_TXT={
  cpu:   {steps:['01 YOUR FIGHTER','02 CPU OPPONENT','03 ARENA'], label:['SELECT YOUR FIGHTER','SELECT CPU OPPONENT','SELECT ARENA'], badge:['YOU','CPU'], side:['YOU / 1P','CPU'], hint:['THEN CHOOSE YOUR CPU','THEN CHOOSE YOUR ARENA','THEN FIGHT']},
  local: {steps:['01 PLAYER 1','02 PLAYER 2','03 ARENA'], label:['PLAYER 1: PICK A FIGHTER','PLAYER 2: PICK A FIGHTER','SELECT ARENA'], badge:['P1','P2'], side:['PLAYER 1','PLAYER 2'], hint:['THEN PLAYER 2 PICKS','THEN CHOOSE YOUR ARENA','THEN FIGHT']},
  ranked:{steps:['01 YOUR FIGHTER','02 MATCHMAKING','03 RANKED FIGHT'], label:['SELECT YOUR FIGHTER'], badge:['YOU','OPP'], side:['YOU','OPPONENT'], hint:['RANDOM ARENA · BEST OF 3 · ELO ON THE LINE']},
};
function openSelect(step){
  show('select'); st.step=step;
  if(step===0){ st.p1=st.p1||F[0]; st.cursor=F.indexOf(st.p1); }
  if(step===1){ st.cursor = st.p2 ? F.indexOf(st.p2) : 0; }
  if(step===2){ st.cursor = st.arena ? AR.indexOf(st.arena) : 0; }
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
  $('#p1Side').textContent=M.side[0]; $('#p2Side').textContent=M.side[1];
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
  if(st.mode==='ranked'){ startQueue(); return; }
  if(st.step<2){ openSelect(st.step+1); return; }
  startMatch();
}
$$('.step').forEach(b=>b.onclick=()=>{ if(st.mode==='ranked') return; const n=+b.dataset.step; if(n<=st.step || (n===1&&st.p1) || (n===2&&st.p1&&(st.p2||st.randomCpu))) openSelect(n); });

// ---------- offline match (cpu / local) ----------
const gc=$('#game').getContext('2d'); gc.imageSmoothingEnabled=false;
function startMatch(){
  const p2 = st.randomCpu ? F[Math.floor(Math.random()*F.length)] : st.p2;
  st.curP2=p2; st.net=null; st.online=null; DD.Sprites.prewarm(st.p1); DD.Sprites.prewarm(p2, p2.id===st.p1.id);
  const local=st.mode==='local';
  st.fight = new DD.Game.Fight({ p1:st.p1, p2, arena:st.arena, ai: local?null:new DD.Game.CPU(st.diff), labels: local?['P1','P2']:['YOU','CPU'], onEnd:endMatch });
  $$('.overlay').forEach(o=>o.hidden=true);
  show('game'); Au.playSong(st.arena.music,true); resetInput();
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
  setTimeout(()=>{ $('#resultOv').hidden=false; },500);
}
function fillStats(fight,i){ const s=fight.stats[i];
  $('#resStats').innerHTML=[['HITS',s.hits],['BEST COMBO',s.maxCombo],['DAMAGE',Math.round(s.dmg)],['BLOCKS',s.blocks],['PARRIES',s.parries],['ROUNDS',fight.p[0].wins+'-'+fight.p[1].wins]]
    .map(([k,v])=>`<div><dt>${k}</dt><dd>${v}</dd></div>`).join(''); }
function setResultButtons(kind){
  $$('#resultOv [data-act]').forEach(b=>{ const a=b.dataset.act;
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
  if(act==='closeHow'){ $('#howOv').hidden=true; if(st.fight && !st.net && $('#pauseOv').hidden) st.fight.paused=false; }
  if(act==='closeLb') $('#lbOv').hidden=true;
  if(act==='refreshLb') openLeaderboard();
  if(act==='rename') openNameModal(true);
});
$('#pauseBtn').onclick=()=>pauseGame(true);
$('#howOv').addEventListener('click',e=>{ if(e.target.id==='howOv'){ $('#howOv').hidden=true; if(st.fight && !st.net && $('#pauseOv').hidden) st.fight.paused=false; } });
$('#lbOv').addEventListener('click',e=>{ if(e.target.id==='lbOv') $('#lbOv').hidden=true; });

// ---------- online: profile ----------
function friendlyErr(e){ const m=e&&e.message||''; return m==='NAME_TAKEN'?'That name is taken.':m==='BAD_NAME'?'3–16 characters: letters, numbers, _ . -':m==='OFFLINE'||/fetch|network|Failed/i.test(m)?"Can't reach the dojo servers. Online play needs the live site and an internet connection.":'Something went wrong ('+m+').'; }
function refreshChip(){ const p=ON.profile, c=$('#profileChip');
  if(!p){ c.hidden=true; return; } c.hidden=false; c.innerHTML=`<b>${esc(p.name)}</b><span>${p.elo}</span><i class="tier t-${tierClass(p.tier)}">${p.tier}</i>`; }
function tierClass(t){ return String(t||'').toLowerCase().replace(/\s+/g,'-'); }
let nameResolve=null;
function openNameModal(rename){
  $('#nameOv').hidden=false; $('#nameOv').dataset.rename=rename?'1':''; $('#nameTitle').textContent=rename?'CHANGE NAME':'PICK A FIGHTER NAME';
  $('#nameInput').value=rename&&ON.profile?ON.profile.name:''; $('#nameErr').textContent=''; setTimeout(()=>$('#nameInput').focus(),30);
  return new Promise(r=>nameResolve=r);
}
$('#nameForm').addEventListener('submit',async e=>{
  e.preventDefault(); const v=$('#nameInput').value.trim(), rename=!!$('#nameOv').dataset.rename;
  if(!/^[A-Za-z0-9_.-]{3,16}$/.test(v)){ $('#nameErr').textContent='3–16 characters: letters, numbers, _ . -'; return; }
  $('#nameGo').disabled=true; $('#nameErr').textContent='';
  try{ if(rename) await ON.rename(v); else await ON.register(v); refreshChip(); $('#nameOv').hidden=true; nameResolve&&nameResolve(true); nameResolve=null; if(rename) openLeaderboard(); }
  catch(err){ $('#nameErr').textContent=friendlyErr(err); }
  finally{ $('#nameGo').disabled=false; }
});
$('#nameCancel').onclick=()=>{ $('#nameOv').hidden=true; nameResolve&&nameResolve(false); nameResolve=null; };
async function ensureProfile(){
  if(!ON.available()){ toast("Online play needs the live site. It can't load here."); return false; }
  if(ON.ident){ try{ await ON.me(); refreshChip(); return true; }catch(e){ if(e.message!=='AUTH'){ toast(friendlyErr(e)); return false; } } }
  return openNameModal(false);
}
async function refreshOnlineLine(){
  if(!ON.available()) return;
  try{ const s=await ON.stats(); $('#onlineLine').textContent=`${s.online} ONLINE · ${s.queue} IN QUEUE · ${s.players} RANKED PLAYERS`; }catch(e){ $('#onlineLine').textContent=''; }
}

// ---------- online: leaderboard ----------
async function openLeaderboard(){
  $('#lbOv').hidden=false; $('#lbBody').innerHTML='<tr><td colspan="6" class="lb-empty">Loading the dojo rankings…</td></tr>';
  if(!ON.available()){ $('#lbBody').innerHTML='<tr><td colspan="6" class="lb-empty">The leaderboard needs the live site.</td></tr>'; return; }
  try{
    if(ON.ident) await ON.me().catch(()=>{}); refreshChip();
    const [rows,stats]=await Promise.all([ON.top(100),ON.stats()]);
    const me=ON.profile;
    $('#lbMe').innerHTML = me ? `<b>${esc(me.name)}</b> · <span class="tier t-${tierClass(me.tier)}">${me.tier}</span> · ${me.elo} ELO · ${me.wins}W ${me.losses}L · ${me.rank?'#'+me.rank:'unranked'} <button class="link-btn" data-act="rename">rename</button>` : 'Play a ranked match to get on the board.';
    $('#lbStats').textContent=`${stats.online} online now · ${stats.queue} in queue · ${stats.players} ranked players`;
    $('#lbBody').innerHTML = rows.length ? rows.map(r=>{ const f=F.find(x=>x.id===r.last_fighter);
      return `<tr class="${me&&me.name===r.name?'me':''}"><td class="rk">${r.rank}</td><td><span class="nm">${f?`<img src="${PS(f)}" alt="">`:''}${esc(r.name)}</span></td><td><span class="tier t-${tierClass(r.tier)}">${r.tier}</span></td><td class="num">${r.elo}</td><td class="num">${r.wins}-${r.losses}</td><td class="num">${r.streak>1?'🔥'+r.streak:r.streak<-1?'❄'+(-r.streak):'–'}</td></tr>`; }).join('')
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
  else if(m.t==='ff') finishOnline(true,'FORFEIT');
  else if(m.t==='bye' && !O.done && O.started){ O.byeAt=performance.now(); }
}
function beginOnlineFight(O){
  O.started=true; clearTimeout(O.connectTimeout);
  const me=st.p1, info=O.info, host=O.role==='host', arena=AR.find(a=>a.id===info.arena)||AR[0];
  const oppName=info.opponent.name.toUpperCase();
  const fight=new DD.Game.Fight({ p1:host?me:O.oppSpec, p2:host?O.oppSpec:me, arena, ai:null, record:host, remote:!host,
    labels: host?['YOU',oppName]:[oppName,'YOU'], onEnd: idx=>{ if(host){ for(let i=0;i<3;i++) O.link.send({t:'end',w:idx},true); finishOnline(idx===0,'KO'); } } });
  st.fight=fight; st.net = host ? new ON.NetHost(fight,O.link) : new ON.NetGuest(fight,O.link);
  st.mode='ranked'; O.myIdx=host?0:1;
  O.hb=setInterval(()=>ON.heartbeat(),5000);
  $('#queueOv').hidden=true; show('game'); Au.playSong(arena.music,true); resetInput();
}
async function finishOnline(won, reason){
  const O=st.online; if(!O||O.done) return; O.done=true; clearInterval(O.hb); clearInterval(O.rdyT);
  if(st.fight) st.fight.over=true;
  setTimeout(()=>{ if(O.link) O.link.close(); },4000);
  const fight=st.fight, mySpec=st.p1;
  Au.stop(); Au.sfx(won?'win':'lose'); Au.say(won?'You win':'Rekt');
  $('#resKicker').textContent= reason==='FORFEIT' ? (won?'OPPONENT FORFEITED':'YOU FORFEITED') : reason==='DISCONNECT' ? 'OPPONENT DISCONNECTED' : 'RANKED MATCH';
  $('#resTitle').textContent= won?'YOU WIN':'REKT';
  $('#resImg').src=P(won?mySpec:O.oppSpec,'win');
  $('#resLine').textContent= won?`${O.info.opponent.name} got sent back to the charts.`:`${O.info.opponent.name} takes this one.`;
  if(fight) fillStats(fight,O.myIdx); else $('#resStats').innerHTML='';
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
function forfeit(){ const O=st.online; if(!O||O.done) return; O.link.send({t:'ff'},true); O.link.send({t:'ff'},true); $('#pauseOv').hidden=true; finishOnline(false,'FORFEIT'); }
function closeOnline(){ const O=st.online; if(!O) return; clearInterval(O.hb); clearInterval(O.rdyT); clearTimeout(O.connectTimeout); if(!O.done&&O.started) O.link.send({t:'ff'},true); try{ O.link.close(); }catch(e){} st.online=null; st.net=null; }
window.addEventListener('beforeunload',()=>{ const O=st.online; if(O&&O.started&&!O.done) O.link.send({t:'ff'},true); if(st.q) ON.leave(); });

// ---------- input ----------
const blank=()=>({left:false,right:false,up:false,down:false,p:false,k:false,block:false,sp:false});
const kb=[blank(),blank()], mouse=blank(), touch=blank();
const KEY_SOLO={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',KeyJ:'p',KeyK:'k',Space:'block',ShiftLeft:'block',KeyL:'sp',KeyE:'sp'};
const KEY_P1={KeyA:'left',KeyD:'right',KeyW:'up',KeyS:'down',KeyF:'p',KeyG:'k',KeyH:'sp',KeyT:'block'};
const KEY_P2={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down',Numpad1:'p',Comma:'p',Numpad2:'k',Period:'k',Numpad3:'sp',Slash:'sp',Numpad0:'block',ShiftRight:'block'};
function keyTarget(code){ if(st.mode==='local'){ if(KEY_P1[code]) return [0,KEY_P1[code]]; if(KEY_P2[code]) return [1,KEY_P2[code]]; return null; } return KEY_SOLO[code]?[0,KEY_SOLO[code]]:null; }
function resetInput(){ for(const o of [kb[0],kb[1],mouse,touch]) for(const k in o) o[k]=false; }
document.addEventListener('keydown',e=>{
  if(!$('#nameOv').hidden){ if(e.code==='Escape') $('#nameCancel').click(); return; }
  if(!$('#lbOv').hidden){ if(e.code==='Escape') $('#lbOv').hidden=true; return; }
  if(!$('#howOv').hidden){ if(e.code==='Escape'){ $('#howOv').hidden=true; if(st.fight&&!st.net&&$('#pauseOv').hidden) st.fight.paused=false; } return; }
  if(!$('#queueOv').hidden){ if(e.code==='Escape'&&st.q) cancelQueue(); return; }
  if(st.screen==='game'){
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
window.addEventListener('blur',()=>{ resetInput(); if(st.fight&&!st.net&&st.screen==='game'&&!st.fight.over) pauseGame(true); });
// gamepads (standard mapping): X punch, A kick, Y special, B / bumpers block, d-pad or left stick to move
function padInput(i){
  const pads=(navigator.getGamepads?navigator.getGamepads():[])||[], list=[...pads].filter(Boolean), g=list[i]; const o=blank(); if(!g) return o;
  const B=n=>g.buttons[n]&&g.buttons[n].pressed, ax=g.axes||[];
  o.left=B(14)||ax[0]<-0.5; o.right=B(15)||ax[0]>0.5; o.up=B(12)||ax[1]<-0.6; o.down=B(13)||ax[1]>0.6;
  o.p=B(2); o.k=B(0); o.sp=B(3)||B(7); o.block=B(1)||B(4)||B(5)||B(6);
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
  if(O&&O.started&&!O.done){ const quiet=performance.now()-O.link.lastHeard; if(quiet>7000 || (O.byeAt&&performance.now()-O.byeAt>1500)) finishOnline(true,'DISCONNECT'); }
  if(st.screen==='title') drawTitle();
  if(st.screen==='game' && st.fight) st.fight.draw(gc);
  DD.Sprites.warmTick(st.screen==='game'&&st.fight&&st.fight.phase==='fight'?3:8);
  requestAnimationFrame(loop);
}

// ---------- boot ----------
function boot(){
  if(DD.Scene) DD.Scene.init(); buildGrids(); show('title'); requestAnimationFrame(loop);
  if(ON.available() && ON.ident){ ON.me().then(refreshChip).catch(()=>{}); }
  refreshOnlineLine(); setInterval(()=>{ if(st.screen==='title') refreshOnlineLine(); },30000);
}
const fontsReady = document.fonts ? Promise.race([document.fonts.load('16px "Press Start 2P"'), new Promise(r=>setTimeout(r,1500))]) : Promise.resolve();
fontsReady.then(()=>{ DD.Arenas.clearCache(); titleStage=null; boot(); });
})();
