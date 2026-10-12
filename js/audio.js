/* DEGEN DOJO — WebAudio chiptune + SFX + robo-announcer */
(function(){
let ac=null, master=null, musicGain=null, sfxGain=null, muted=false, timer=null, cur=null, step=0, nextT=0;
const SCALES={ minor:[0,2,3,5,7,8,10], major:[0,2,4,5,7,9,11], dorian:[0,2,3,5,7,9,10], phrygian:[0,1,3,5,7,8,10] };
try{ muted = localStorage.getItem('dd_muted')==='1'; }catch(e){}

let comp=null, delay=null, delayFb=null, delaySend=null, pulse25=null, pulse12=null, shaper=null;
function init(){
  if(ac) { if(ac.state==='suspended') ac.resume(); return; }
  const AC=window.AudioContext||window.webkitAudioContext; if(!AC) return;
  ac=new AC();
  comp=ac.createDynamicsCompressor(); comp.threshold.value=-14; comp.knee.value=10; comp.ratio.value=4; comp.attack.value=0.004; comp.release.value=0.18; comp.connect(ac.destination);
  master=ac.createGain(); master.gain.value=0.6; master.connect(comp);
  musicGain=ac.createGain(); musicGain.gain.value=muted?0:0.32; musicGain.connect(master);
  sfxGain=ac.createGain(); sfxGain.gain.value=0.75; sfxGain.connect(master);
  // echo bus for the lead
  delay=ac.createDelay(1); delayFb=ac.createGain(); delaySend=ac.createGain(); const dl=ac.createBiquadFilter(); dl.type='lowpass'; dl.frequency.value=2600;
  delayFb.gain.value=0.32; delaySend.gain.value=0.22; delaySend.connect(delay); delay.connect(dl); dl.connect(delayFb); delayFb.connect(delay); dl.connect(musicGain);
  const pw=d=>{ const n=40, re=new Float32Array(n), im=new Float32Array(n); for(let i=1;i<n;i++) re[i]=2/(i*Math.PI)*Math.sin(i*Math.PI*d); return ac.createPeriodicWave(re,im); };
  pulse25=pw(0.25); pulse12=pw(0.125);
  shaper=ac.createWaveShaper(); const cv=new Float32Array(1024); for(let i=0;i<1024;i++){ const x=i/512-1; cv[i]=Math.tanh(x*3.2); } shaper.curve=cv; shaper.connect(sfxGain);
}
const mtof=m=>440*Math.pow(2,(m-69)/12);
let noiseBuf=null;
function noise(){ if(noiseBuf) return noiseBuf; noiseBuf=ac.createBuffer(1,ac.sampleRate*0.5,ac.sampleRate); const d=noiseBuf.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1; return noiseBuf; }

function tone(type,freq,t,dur,vol,dest,slideTo,opt){
  const o=ac.createOscillator(), g=ac.createGain();
  if(type==='p25'&&pulse25) o.setPeriodicWave(pulse25); else if(type==='p12'&&pulse12) o.setPeriodicWave(pulse12); else o.type=type==='p25'||type==='p12'?'square':type;
  o.frequency.setValueAtTime(freq,t);
  if(slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20,slideTo),t+dur);
  if(opt&&opt.vib&&dur>0.18){ const l=ac.createOscillator(), lg=ac.createGain(); l.frequency.value=5.5; lg.gain.setValueAtTime(0,t); lg.gain.linearRampToValueAtTime(freq*0.012,t+dur*0.6); l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t+dur+0.02); }
  const at=opt&&opt.att||0.004;
  g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(vol,t+at);
  if(opt&&opt.sus){ g.gain.setValueAtTime(vol,t+dur*0.7); g.gain.exponentialRampToValueAtTime(0.001,t+dur); } else g.gain.exponentialRampToValueAtTime(0.001,t+dur);
  o.connect(g); g.connect(dest||musicGain); if(opt&&opt.echo&&delaySend) g.connect(delaySend);
  o.start(t); o.stop(t+dur+0.02);
}
function nz(t,dur,vol,hp,dest,bp){
  const s=ac.createBufferSource(); s.buffer=noise(); const f=ac.createBiquadFilter(); f.type=bp?'bandpass':'highpass'; f.frequency.value=hp||1000; if(bp) f.Q.value=bp;
  const g=ac.createGain(); g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.001,t+dur);
  s.connect(f); f.connect(g); g.connect(dest||musicGain); s.start(t,Math.random()*0.3); s.stop(t+dur+0.02);
}

// ---- song generation: sectioned chiptune (A / B / A' / breakdown), ~28 bars per loop ----
function rng(seed){ let s=seed>>>0; return ()=>{ s=(s*1664525+1013904223)>>>0; return s/4294967296; }; }
function makeSong(cfg){
  const r=rng(cfg.seed), sc=SCALES[cfg.mode]||SCALES.minor, root=cfg.root;
  const progs=[[0,5,2,6],[0,3,4,4],[0,6,5,4],[0,2,5,4],[0,4,5,3],[0,5,3,4],[5,3,0,4],[0,6,3,4]];
  const pA=progs[Math.floor(r()*progs.length)]; let pB=progs[Math.floor(r()*progs.length)]; if(pB===pA) pB=progs[(progs.indexOf(pA)+3)%progs.length];
  const deg=(d,oct)=> root + 12*(oct||0) + sc[((d%7)+7)%7] + 12*Math.floor(d/7);
  const fast=cfg.bpm>=150;
  // rhythmic motif: 32 steps (2 bars), onsets weighted to strong beats
  const motif=lvl=>{ const m=[]; for(let i=0;i<32;i++){ const strong=i%4===0, off=i%2===0; const p=strong?0.85:off?(fast?0.4:0.5):(fast?0.12:0.22)*lvl; m.push(r()<p); } m[0]=true; return m; };
  const mA=motif(1), mB=motif(1.4);
  const song={steps:[],bpm:cfg.bpm};
  const sections=[['A',pA,mA,1],['B',pB,mB,1],['A2',pA,mA,1],['BRK',pA,null,1]];
  for(const [name,prog,mot,oct] of sections){
    const bars = name==='BRK'?4:8;
    let lastDeg=prog[0]+4;
    for(let bar=0;bar<bars;bar++){
      const ch=prog[bar%4], answer=bar%4===3;
      for(let s=0;s<16;s++){
        const i=(bar%2)*16+s, e={};
        // melody
        if(mot && mot[i] && !(answer&&s>=12)){
          const lo=name==='B'?2:0, hi=name==='B'?11:9; let d;
          if(s%4===0){ // nearest chord tone to the last note (smooth voice leading), sometimes a skip
            const cands=[]; for(let k=-7;k<=14;k++){ const x=ch+k; if([0,2,4].includes(((k%7)+7)%7) && x>=lo && x<=hi) cands.push(x); }
            cands.sort((u,v)=>Math.abs(u-lastDeg)-Math.abs(v-lastDeg)); d=cands[r()<0.7?0:Math.min(1,cands.length-1)]; }
          else d=lastDeg+(r()<0.5?1:-1)*(r()<0.75?1:2);
          if(answer&&s===8){ d=ch; while(d<lo) d+=7; }
          d=Math.max(lo,Math.min(hi,d)); lastDeg=d;
          let len=1; while(len<6 && !mot[(i+len)%32] && s+len<16) len++;
          e.lead=[deg(d,oct),len];
          if(name==='A2' && s%4===0) e.harm=[deg(d-2,oct),len];
        }
        // bass
        if(name==='BRK'){ if(s===0) e.bass=[deg(ch,0)-12,16]; }
        else if(name==='B'){ if([0,3,6,8,11,14].includes(s)) e.bass=[deg(ch+(s===6||s===14?4:0),0)-12,2]; }
        else if(s%2===0) e.bass=[deg(ch,0)-12+(s%8===6?12:0),2];
        // arp
        if(name==='B'||cfg.arp) e.arp=deg(ch+[0,2,4,7][s%4],1);
        // drums
        if(name!=='BRK' || bar>=2){
          if(s===0||s===8||(s===10&&r()<0.4)||(fast&&s===4&&name==='B')) e.kick=1;
          if(s===4||s===12) e.snare=1;
          e.hat = fast ? 1 : s%2===0;
          if(s===14&&r()<0.3) e.ohat=1;
          if(bar%4===3 && s>=12) e.snare=1; // fill
        } else if(s%4===0) e.hat=1;
        if(bar===0 && s===0) e.crash=1;
        song.steps.push(e);
      }
    }
  }
  return song;
}

function schedule(){
  if(!cur||!ac) return;
  const spb=60/cur.bpm/4, N=cur.steps.length;
  if(nextT < ac.currentTime-0.02){ const missed=Math.ceil((ac.currentTime-nextT)/spb); step+=missed; nextT+=missed*spb; }
  while(nextT < ac.currentTime+0.15){
    const e=cur.steps[step%N], t=nextT;
    if(e.lead) tone('p25',mtof(e.lead[0]),t,spb*e.lead[1]*0.95+0.04,0.085,musicGain,null,{vib:1,echo:1,sus:1});
    if(e.harm) tone('p12',mtof(e.harm[0]),t,spb*e.harm[1]*0.9,0.04,musicGain,null,{sus:1});
    if(e.bass) tone('triangle',mtof(e.bass[0]),t,spb*e.bass[1]*0.95,0.3,musicGain,null,{sus:1});
    if(e.arp && cur.arpOn!==false) tone('p12',mtof(e.arp),t,spb*0.55,0.022);
    if(e.kick){ tone('sine',160,t,0.14,0.55,musicGain,42); }
    if(e.snare){ nz(t,0.13,0.22,1800); tone('triangle',190,t,0.07,0.16,musicGain,120); }
    if(e.hat) nz(t,0.028,0.05,8000);
    if(e.ohat) nz(t,0.16,0.05,7000);
    if(e.crash) nz(t,0.9,0.09,5000);
    nextT+=spb; step++;
  }
}
function playSong(cfg, arpOn){
  init(); if(!ac) return;
  cur=makeSong(Object.assign({},cfg,{arp:!!arpOn&&cfg.bpm>=140})); cur.arpOn=true; step=0; nextT=ac.currentTime+0.05;
  if(timer) clearInterval(timer); timer=setInterval(schedule,25);
}
function stop(){ if(timer) clearInterval(timer); timer=null; cur=null; }
document.addEventListener('visibilitychange',()=>{ if(!ac) return;
  if(document.hidden){ ac.suspend().catch(()=>{}); try{ speechSynthesis.cancel(); }catch(e){} }
  else { ac.resume().then(()=>{ nextT=ac.currentTime+0.05; }).catch(()=>{}); } });

const TITLE_SONG={bpm:138, root:45, mode:'dorian', seed:420};

const SFX_ALIAS={ sp_crystalShell:'sp_armorCounter', sp_panicSell:'sp_teleportShuriken', sp_moonShot:'sp_rocketUppercut', sp_capitulation:'sp_groundSlam', sp_stampede:'sp_charge',
  sp_tsunami:'sp_wave', sp_gasSpike:'sp_drainMeter', sp_bigBrainBeam:'sp_bigBeam', sp_copiumHuff:'sp_heal', sp_scripted:'sp_clones', sp_thumbnailFace:'sp_feint', sp_touchGrass:'sp_zone',
  sp_reverseCard:'sp_reflect', sp_plotArmour:'sp_plotArmor', sp_rollback:'sp_rewind', sp_zoomies:'sp_multiDash', sp_loafRoll:'sp_invulnRoll', sp_bodySlam:'sp_commandGrab', sp_infiniteScroll:'sp_barrage', splash:'sp_wave' };
function sfx(name){
  name = SFX_ALIAS[name]||name;
  if(!ac) return; const t=ac.currentTime, d=sfxGain;
  switch(name){
    case 'select': tone('square',880,t,0.06,0.2,d); tone('square',1320,t+0.05,0.08,0.2,d); break;
    case 'move': tone('square',660,t,0.04,0.12,d); break;
    case 'lock': tone('square',523,t,0.08,0.25,d); tone('square',784,t+0.07,0.08,0.25,d); tone('square',1046,t+0.14,0.16,0.25,d); break;
    case 'whoosh': nz(t,0.08,0.18,3000,d); break;
    case 'hit': tone('sine',150,t,0.12,0.7,d,45); nz(t,0.09,0.55,900,shaper,1.2); nz(t,0.02,0.35,6000,d); tone('square',220,t,0.06,0.18,d,70); break;
    case 'heavy': tone('sine',110,t,0.24,0.9,d,32); nz(t,0.2,0.7,500,shaper,0.9); nz(t,0.03,0.45,5000,d); tone('sawtooth',160,t,0.14,0.25,shaper,40); break;
    case 'counter': tone('square',1760,t,0.05,0.2,d); tone('square',2349,t+0.05,0.12,0.2,d); tone('sine',90,t,0.3,0.8,d,30); break;
    case 'fomo': nz(t,0.18,0.3,2500,d); tone('p25',400,t,0.16,0.18,d,1600); break;
    case 'crowd': { const s2=ac.createBufferSource(); s2.buffer=noise(); s2.loop=true; const f=ac.createBiquadFilter(); f.type='bandpass'; f.frequency.value=1100; f.Q.value=0.7; const g=ac.createGain(); g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(0.22,t+0.5); g.gain.exponentialRampToValueAtTime(0.001,t+2.6); s2.connect(f); f.connect(g); g.connect(d); s2.start(t); s2.stop(t+2.7); break; }
    case 'block': tone('triangle',900,t,0.06,0.3,d,600); nz(t,0.05,0.25,5000,d); break;
    case 'shatter': nz(t,0.35,0.5,2500,d); tone('square',1800,t,0.3,0.2,d,200); tone('triangle',900,t+0.02,0.25,0.25,d,120); break;
    case 'parry': tone('square',1568,t,0.08,0.25,d); tone('square',2093,t+0.06,0.18,0.25,d); nz(t,0.06,0.2,6000,d); break;
    case 'jump': tone('square',300,t,0.12,0.15,d,700); break;
    case 'land': nz(t,0.05,0.15,300,d); break;
    case 'special': tone('sawtooth',200,t,0.4,0.25,d,1400); tone('square',400,t+0.05,0.35,0.15,d,2000); break;
    case 'charge': tone('triangle',220+Math.random()*80,t,0.06,0.08,d); break;
    case 'ko': tone('sine',90,t,1.2,1,d,25); tone('sawtooth',400,t,0.9,0.3,shaper,50); nz(t,0.8,0.5,200,d); nz(t+0.05,0.5,0.25,3000,d); setTimeout(()=>sfx('crowd'),350); break;
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
    case 'sp_candles': for(let i=0;i<3;i++){ tone('square',330*(1+i*0.5),t+i*0.2,0.15,0.3,d,660*(1+i*0.5)); nz(t+i*0.2,0.12,0.3,500,d); } break;
    case 'sp_flurry': for(let i=0;i<9;i++){ nz(t+i*0.075,0.03,0.35,3500,d); tone('square',900+(i%3)*240,t+i*0.075,0.03,0.15,d); } break;
    case 'sp_timeStop': tone('sine',880,t,1.0,0.3,d,110); tone('triangle',440,t+0.05,1.0,0.2,d,55); [0,0.25,0.5].forEach(o=>tone('square',1760,t+o,0.04,0.2,d)); break;
    case 'sp_ratioDrop': for(let i=0;i<3;i++){ tone('sawtooth',1200,t+i*0.27,0.25,0.18,d,150); } nz(t,0.5,0.2,1200,d); break;
    case 'jab': nz(t,0.05,0.22,2400,d); tone('sine',240,t,0.05,0.25,d,90); break;
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
const SPOKEN={ 'Counter':'Counter!', 'Degenerate':'Degenerate!', 'Combo':'Combo!', 'Round 1':'Round one!', 'Round 2':'Round two!', 'Round 3':'Final round!', 'Round 4':'Round four!', 'Fight':'Fight!', 'K O':'K. O.!', 'Perfect':'Perfect!', 'Time':'Time!' };
function say(text){
  if(!('speechSynthesis' in window)||document.hidden) return;
  try{
    speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(SPOKEN[text]||text);
    u.pitch=0.55; u.rate=/^Round|Final/.test(SPOKEN[text]||'')?0.82:1.0; u.volume=1;
    if(!voice) voice=pickVoice(); if(voice) u.voice=voice;
    speechSynthesis.speak(u);
    if(SPOKEN[text]) sfx('announce');
  }catch(e){}
}

function setMuted(m){ muted=m; try{ localStorage.setItem('dd_muted',m?'1':'0'); }catch(e){} if(musicGain){ musicGain.gain.cancelScheduledValues(ac.currentTime); musicGain.gain.setTargetAtTime(m?0:0.32, ac.currentTime, 0.05); } } // mutes music only; fight SFX + announcer keep playing

DD.Audio = { init, playSong, stop, sfx, say, setMuted, isMuted:()=>muted, TITLE_SONG, _makeSong:makeSong };
})();
