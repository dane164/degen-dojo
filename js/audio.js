/* DEGEN DOJO — WebAudio chiptune + SFX + robo-announcer */
(function(){
let ac=null, master=null, musicGain=null, sfxGain=null, muted=false, timer=null, cur=null, step=0, nextT=0;
const SCALES={ minor:[0,2,3,5,7,8,10], major:[0,2,4,5,7,9,11], dorian:[0,2,3,5,7,9,10], phrygian:[0,1,3,5,7,8,10] };
try{ muted = localStorage.getItem('dd_muted')==='1'; }catch(e){}

function init(){
  if(ac) { if(ac.state==='suspended') ac.resume(); return; }
  const AC=window.AudioContext||window.webkitAudioContext; if(!AC) return;
  ac=new AC(); master=ac.createGain(); master.gain.value=muted?0:0.55; master.connect(ac.destination);
  musicGain=ac.createGain(); musicGain.gain.value=0.32; musicGain.connect(master);
  sfxGain=ac.createGain(); sfxGain.gain.value=0.7; sfxGain.connect(master);
}
const mtof=m=>440*Math.pow(2,(m-69)/12);
let noiseBuf=null;
function noise(){ if(noiseBuf) return noiseBuf; noiseBuf=ac.createBuffer(1,ac.sampleRate*0.5,ac.sampleRate); const d=noiseBuf.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1; return noiseBuf; }

function tone(type,freq,t,dur,vol,dest,slideTo){
  const o=ac.createOscillator(), g=ac.createGain(); o.type=type; o.frequency.setValueAtTime(freq,t);
  if(slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20,slideTo),t+dur);
  g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.001,t+dur);
  o.connect(g); g.connect(dest||musicGain); o.start(t); o.stop(t+dur+0.02);
}
function nz(t,dur,vol,hp,dest){
  const s=ac.createBufferSource(); s.buffer=noise(); const f=ac.createBiquadFilter(); f.type='highpass'; f.frequency.value=hp||1000;
  const g=ac.createGain(); g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.001,t+dur);
  s.connect(f); f.connect(g); g.connect(dest||musicGain); s.start(t); s.stop(t+dur+0.02);
}

// ---- song generation ----
function rng(seed){ let s=seed>>>0; return ()=>{ s=(s*1664525+1013904223)>>>0; return s/4294967296; }; }
function makeSong(cfg){
  const r=rng(cfg.seed), sc=SCALES[cfg.mode]||SCALES.minor, root=cfg.root;
  const progs=[[0,5,2,6],[0,3,4,4],[0,6,5,4],[0,2,5,4],[0,4,5,3]];
  const prog=progs[Math.floor(r()*progs.length)];
  const deg=(d,oct)=> root + 12*(oct||0) + sc[((d%7)+7)%7] + 12*Math.floor(d/7);
  // 4 bars x 16 steps
  const lead=[], bass=[], arp=[];
  let last=4;
  const motif=[]; for(let i=0;i<16;i++) motif.push(r()<0.55 ? Math.floor(r()*6)-2 : null);
  for(let bar=0;bar<4;bar++){
    const ch=prog[bar];
    for(let s=0;s<16;s++){
      bass.push(s%4===0||(s%4===3&&r()<0.3) ? deg(ch,0)-12+(s%8===4?12:0) : null);
      arp.push(deg(ch+[0,2,4,7][s%4],1));
      const m=motif[s];
      if(m===null || (bar===3 && s>11)) lead.push(null);
      else { last=Math.max(0,Math.min(11,ch+m+ (bar%2?2:0))); lead.push(deg(last,2)); }
    }
  }
  return {lead,bass,arp,bpm:cfg.bpm};
}

function schedule(){
  if(!cur||!ac) return;
  const spb=60/cur.bpm/4;
  if(nextT < ac.currentTime-0.02){ // timer was throttled (background tab): skip ahead instead of cramming missed notes
    const missed=Math.ceil((ac.currentTime-nextT)/spb); step+=missed; nextT+=missed*spb; }
  while(nextT < ac.currentTime+0.15){
    const i=step%64;
    const L=cur.lead[i], B=cur.bass[i];
    if(L) tone('square',mtof(L),nextT,spb*1.8,0.09);
    if(B) tone('triangle',mtof(B),nextT,spb*2.2,0.28);
    if(cur.arpOn) tone('square',mtof(cur.arp[i]),nextT,spb*0.6,0.025);
    if(i%4===0) tone('sine',150,nextT,0.12,0.45,musicGain,40);
    if(i%8===4) nz(nextT,0.12,0.22,1500);
    if(i%2===1) nz(nextT,0.03,0.06,7000);
    nextT+=spb; step++;
  }
}
function playSong(cfg, arpOn){
  init(); if(!ac) return;
  cur=makeSong(cfg); cur.arpOn=!!arpOn; step=0; nextT=ac.currentTime+0.05;
  if(timer) clearInterval(timer); timer=setInterval(schedule,25);
}
function stop(){ if(timer) clearInterval(timer); timer=null; cur=null; }
document.addEventListener('visibilitychange',()=>{ if(!ac) return;
  if(document.hidden){ ac.suspend().catch(()=>{}); try{ speechSynthesis.cancel(); }catch(e){} }
  else { ac.resume().then(()=>{ nextT=ac.currentTime+0.05; }).catch(()=>{}); } });

const TITLE_SONG={bpm:138, root:45, mode:'dorian', seed:420};

function sfx(name){
  if(!ac||muted) return; const t=ac.currentTime, d=sfxGain;
  switch(name){
    case 'select': tone('square',880,t,0.06,0.2,d); tone('square',1320,t+0.05,0.08,0.2,d); break;
    case 'move': tone('square',660,t,0.04,0.12,d); break;
    case 'lock': tone('square',523,t,0.08,0.25,d); tone('square',784,t+0.07,0.08,0.25,d); tone('square',1046,t+0.14,0.16,0.25,d); break;
    case 'whoosh': nz(t,0.08,0.18,3000,d); break;
    case 'hit': nz(t,0.09,0.5,400,d); tone('square',180,t,0.08,0.3,d,60); break;
    case 'heavy': nz(t,0.16,0.6,200,d); tone('square',120,t,0.16,0.4,d,40); break;
    case 'block': tone('triangle',900,t,0.06,0.3,d,600); nz(t,0.05,0.25,5000,d); break;
    case 'shatter': nz(t,0.35,0.5,2500,d); tone('square',1800,t,0.3,0.2,d,200); tone('triangle',900,t+0.02,0.25,0.25,d,120); break;
    case 'parry': tone('square',1568,t,0.08,0.25,d); tone('square',2093,t+0.06,0.18,0.25,d); nz(t,0.06,0.2,6000,d); break;
    case 'jump': tone('square',300,t,0.12,0.15,d,700); break;
    case 'land': nz(t,0.05,0.15,300,d); break;
    case 'special': tone('sawtooth',200,t,0.4,0.25,d,1400); tone('square',400,t+0.05,0.35,0.15,d,2000); break;
    case 'charge': tone('triangle',220+Math.random()*80,t,0.06,0.08,d); break;
    case 'ko': tone('sawtooth',400,t,0.9,0.35,d,50); nz(t,0.6,0.4,200,d); break;
    case 'heal': tone('triangle',660,t,0.1,0.2,d); tone('triangle',990,t+0.08,0.14,0.2,d); break;
    case 'meter': tone('square',1046,t,0.06,0.15,d); tone('square',1568,t+0.06,0.1,0.15,d); break;
    case 'superstart': tone('sawtooth',110,t,0.5,0.35,d,880); tone('square',220,t+0.02,0.45,0.18,d,1760); nz(t,0.12,0.35,1200,d); [784,988,1175,1568].forEach((f,i)=>tone('square',f,t+0.18+i*0.05,0.12,0.16,d)); break;
    case 'sp_beam': case 'sp_bigBeam': tone('sawtooth',1600,t,0.6,0.22,d,180); tone('square',90,t,0.7,0.3,d,60); nz(t,0.6,0.18,4000,d); break;
    case 'sp_rocketUppercut': nz(t,0.7,0.45,300,d); tone('sawtooth',120,t,0.7,0.3,d,900); break;
    case 'sp_groundSlam': case 'sp_commandGrab': tone('sine',140,t,0.5,0.7,d,30); nz(t,0.4,0.5,150,d); break;
    case 'sp_charge': for(let i=0;i<6;i++){ tone('sine',90,t+i*0.08,0.08,0.5,d,50); nz(t+i*0.08,0.06,0.25,400,d); } break;
    case 'sp_wave': nz(t,1.0,0.4,600,d); tone('sine',200,t,0.9,0.25,d,60); break;
    case 'sp_heal': case 'sp_lifesteal': [523,659,784,1046,1318].forEach((f,i)=>tone('triangle',f,t+i*0.06,0.3,0.18,d)); break;
    case 'sp_rageBuff': tone('sawtooth',80,t,0.6,0.4,d,40); tone('square',82,t,0.6,0.25,d,41); nz(t,0.5,0.3,800,d); break;
    case 'sp_speedBuff': case 'sp_multiDash': case 'sp_invulnRoll': for(let i=0;i<4;i++) tone('square',600+i*300,t+i*0.04,0.08,0.15,d,1200+i*300); nz(t,0.3,0.25,5000,d); break;
    case 'sp_reflect': case 'sp_armorCounter': tone('triangle',1318,t,0.5,0.25,d); tone('triangle',1975,t+0.05,0.5,0.2,d); tone('square',2637,t+0.1,0.2,0.08,d); break;
    case 'sp_plotArmor': [392,523,659,784].forEach((f,i)=>tone('square',f,t+i*0.07,0.4,0.14,d)); break;
    case 'sp_rewind': tone('sawtooth',1200,t,0.6,0.2,d,100); tone('square',600,t+0.1,0.5,0.12,d,2400); break;
    case 'sp_clones': for(let i=0;i<5;i++) tone('square',440*(1+(i%2)),t+i*0.05,0.05,0.15,d); break;
    case 'sp_zone': nz(t,0.6,0.2,2000,d); tone('triangle',330,t,0.6,0.2,d,660); break;
    case 'sp_teleportShuriken': case 'sp_feint': tone('sine',1800,t,0.2,0.25,d,200); nz(t,0.15,0.2,6000,d); break;
    case 'sp_drainMeter': nz(t,0.8,0.35,3000,d); tone('sawtooth',200,t,0.5,0.12,d,80); break;
    case 'sp_barrage': for(let i=0;i<8;i++){ tone('square',1200+(i%3)*200,t+i*0.04,0.03,0.12,d); } break;
    case 'sp_rugPull': tone('sawtooth',600,t,0.5,0.3,d,40); nz(t,0.4,0.4,300,d); break;
    case 'announce': tone('square',196,t,0.18,0.18,d); tone('square',294,t+0.02,0.18,0.12,d); nz(t,0.05,0.15,3000,d); break;
    case 'win': [523,659,784,1046].forEach((f,i)=>tone('square',f,t+i*0.12,0.2,0.25,d)); break;
    case 'lose': [392,330,262,196].forEach((f,i)=>tone('square',f,t+i*0.16,0.25,0.25,d)); break;
  }
}

let voice=null;
const PREF=[/Google UK English Male/i,/Daniel/i,/Microsoft (Guy|Ryan|Christopher|Eric|Davis|David)/i,/Arthur/i,/Fred/i,/Alex/i,/English.*Male/i];
function pickVoice(){ if(!('speechSynthesis' in window)) return null; const vs=speechSynthesis.getVoices(); if(!vs.length) return null;
  for(const re of PREF){ const v=vs.find(x=>re.test(x.name)&&/^en/i.test(x.lang)); if(v) return v; }
  return vs.find(v=>/^en-(GB|AU)/i.test(v.lang)) || vs.find(v=>/^en/i.test(v.lang)) || vs[0]; }
if('speechSynthesis' in window){ voice=pickVoice(); speechSynthesis.onvoiceschanged=()=>{ voice=pickVoice(); }; }
const SPOKEN={ 'Round 1':'Round one!', 'Round 2':'Round two!', 'Round 3':'Final round!', 'Round 4':'Round four!', 'Fight':'Fight!', 'K O':'K. O.!', 'Perfect':'Perfect!', 'Time':'Time!' };
function say(text){
  if(muted||!('speechSynthesis' in window)||document.hidden) return;
  try{
    speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(SPOKEN[text]||text);
    u.pitch=0.55; u.rate=/^Round|Final/.test(SPOKEN[text]||'')?0.82:1.0; u.volume=1;
    if(!voice) voice=pickVoice(); if(voice) u.voice=voice;
    speechSynthesis.speak(u);
    if(SPOKEN[text]) sfx('announce');
  }catch(e){}
}

function setMuted(m){ muted=m; try{ localStorage.setItem('dd_muted',m?'1':'0'); }catch(e){} if(master) master.gain.value=m?0:0.55; if(m&&'speechSynthesis' in window) speechSynthesis.cancel(); }

DD.Audio = { init, playSong, stop, sfx, say, setMuted, isMuted:()=>muted, TITLE_SONG };
})();
