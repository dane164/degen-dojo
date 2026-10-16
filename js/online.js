/* DEGEN DOJO — online: identity, matchmaking RPCs, P2P link (WebRTC w/ Supabase relay fallback), host/guest netcode. */
(function(){
const SB_URL='https://aayybofjiverrpbpeexw.supabase.co';
const SB_KEY='sb_publishable_HCPrX5BAu32Tv5WOWG8r0w_-ETy7dYy'; // publishable (safe in client); all writes go through checked RPCs
const ICE=[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'},{urls:'stun:stun.cloudflare.com:3478'}];
const KEYS=['left','right','up','down','p','k','block','sp','th'];
let sb=null;

function available(){ return !!(window.supabase && window.supabase.createClient); }
function client(){
  if(!sb){ if(!available()) throw new Error('OFFLINE'); sb=window.supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},realtime:{params:{eventsPerSecond:30}}}); }
  return sb;
}
async function rpc(name,args){
  const {data,error}=await client().rpc(name,args||{});
  if(error){ const m=(error.message||'').match(/AUTH|NAME_TAKEN|BAD_NAME|NO_MATCH|BAD_WINNER/); throw new Error(m?m[0]:(error.message||'NETWORK')); }
  return data;
}

// ---------- identity (anonymous: id + secret kept in this browser) ----------
const ID_KEY='dd_identity_v1';

// Name filter (mirrors dd_private.dd_name_ok on the server, which is the real gate)
const NAME_STRONG=/n+i+g+g+|^n+i+g+a+s*$|n+i+g+a+h|f+a+g+g+|f+a+g+o+t|k+i+k+e+|c+h+i+n+k|t+r+a+n+n+y|r+e+t+a+r+d|w+e+t+b+a+c+k|b+e+a+n+e+r|c+u+n+t|f+u+c+k|f+u+k+|f+c+k|f+v+c+k|s+h+i+t|b+i+t+c+h|w+h+o+r+e|s+l+u+t|p+u+s+s+y|p+e+n+i+s|v+a+g+i+n+a|r+a+p+i+s+t|n+a+z+i|h+i+t+l+e+r|k+k+k|p+o+r+n|j+i+z+z|t+w+a+t|w+a+n+k|a+s+s+h+o+l+e|d+i+l+d+o|p+e+d+o+p+h|p+e+d+o+f+i+l|m+o+l+e+s+t|c+o+c+k+s+u+c+k|d+i+c+k+h+e+a+d|n+o+n+c+e|s+p+i+c+k/;
const NAME_WORDS=new Set('fag fags spic spics coon coons paki dyke cock dick cum ass rape raped raper tit tits homo jap gook gooks nig nigs fck fk fuk sex anal anus semen boob boobs piss crap bastard prick kys'.split(' '));
const leet=t=>t.toLowerCase().replace(/[0134578@$!|]/g,c=>({'0':'o','1':'i','3':'e','4':'a','5':'s','7':'t','8':'b','@':'a','$':'s','!':'i','|':'i'})[c]).replace(/[^a-z]/g,'');
function nameOk(n){
  const norm=leet(n).replace('therapist','').replace('shiitake','').replace('scunthorpe','');
  if(NAME_STRONG.test(norm)) return false;
  for(const tok of n.replace(/([a-z])([A-Z])/g,'$1 $2').split(/[^A-Za-z0-9]+/)){ if(!tok) continue;
    if(NAME_WORDS.has(leet(tok)) || NAME_WORDS.has(tok.toLowerCase().replace(/[^a-z]/g,''))) return false; }
  return true;
}
function loadId(){ try{ const v=JSON.parse(localStorage.getItem(ID_KEY)||'null'); return v&&v.id&&v.secret?v:null; }catch(e){ return null; } }
function saveId(v){ try{ localStorage.setItem(ID_KEY,JSON.stringify(v)); }catch(e){} }
let ident=loadId(), profile=null;
const api={
  available, get ident(){ return ident; }, get profile(){ return profile; },
  async register(name){ const r=await rpc('dd_register',{p_name:name}); ident={id:r.id,secret:r.secret}; saveId(ident); profile=r.profile; return profile; },
  async me(){ if(!ident) return null; try{ profile=await rpc('dd_me',{pid:ident.id,secret:ident.secret}); return profile; }catch(e){ if(e.message==='AUTH'){ ident=null; saveId(null); } throw e; } },
  async rename(name){ profile=await rpc('dd_rename',{pid:ident.id,secret:ident.secret,p_name:name}); return profile; },
  queue(fighter){ return rpc('dd_queue_join',{pid:ident.id,secret:ident.secret,p_fighter:fighter}); },
  leave(){ return rpc('dd_queue_leave',{pid:ident.id,secret:ident.secret}).catch(()=>{}); },
  heartbeat(){ return rpc('dd_heartbeat',{pid:ident.id,secret:ident.secret}).catch(()=>{}); },
  async report(mid,winner){ const r=await rpc('dd_report',{pid:ident.id,secret:ident.secret,mid,p_winner:winner}); if(r&&r.profile) profile=r.profile; return r; },
  top(n){ return rpc('dd_top',{lim:n||100}); },
  async setWallet(w,holder){ profile=await rpc('dd_set_wallet',{pid:ident.id,secret:ident.secret,p_wallet:w||'',p_holder:!!holder}); return profile; },
  vote(round,cand){ return rpc('dd_vote',{pid:ident.id,secret:ident.secret,p_round:round,p_cand:cand}); },
  tally(round){ return rpc('dd_vote_tally',{p_round:round,pid:ident?ident.id:null}); },
  stats(){ return rpc('dd_stats',{}); },
};

// ---------- Link: Supabase Realtime channel for signalling + relay, WebRTC data channels for gameplay ----------
class Link{
  constructor(matchId, role){
    this.role=role; this.mode=null; this.peer=false; this.closed=false; this.rtt=80; this.lastHeard=performance.now();
    this.onReady=()=>{}; this.onMsg=()=>{}; this.onStatus=()=>{};
    this.ch=client().channel('dd-'+matchId,{config:{broadcast:{self:false,ack:false}}});
    this.ch.on('broadcast',{event:'sig'},({payload})=>this.signal(payload));
    this.ch.on('broadcast',{event:'m'},({payload})=>this.recv(payload));
    this.ch.subscribe(status=>{ if(status==='SUBSCRIBED'){ this.onStatus('Connected to lobby…'); this.helloT=setInterval(()=>this.sig({t:'hello',r:role}),400); this.sig({t:'hello',r:role}); }
      else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT') this.onStatus('Realtime connection problem, retrying…'); });
    this.pingT=setInterval(()=>{ if(this.mode) this.send({t:'ping',ts:performance.now()}); },1000);
  }
  sig(p){ if(!this.closed) this.ch.send({type:'broadcast',event:'sig',payload:p}); }
  async signal(p){
    this.lastHeard=performance.now();
    try{
      if(p.t==='hello'){ if(!this.peer){ this.peer=true; this.onStatus('Opponent found, opening direct link…'); this.fallbackT=setTimeout(()=>this.useRelay(),7000); if(this.role==='host') this.startRTC(); } this.sig({t:'hello2',r:this.role}); }
      else if(p.t==='hello2'){ if(!this.peer){ this.peer=true; this.fallbackT=setTimeout(()=>this.useRelay(),7000); if(this.role==='host') this.startRTC(); } }
      else if(p.t==='offer' && this.role==='guest'){ this.makePC(); await this.pc.setRemoteDescription(p.sdp); const a=await this.pc.createAnswer(); await this.pc.setLocalDescription(a); this.sig({t:'answer',sdp:this.pc.localDescription}); this.flushIce(); }
      else if(p.t==='answer' && this.role==='host' && this.pc){ await this.pc.setRemoteDescription(p.sdp); this.flushIce(); }
      else if(p.t==='ice'){ if(this.pc && this.pc.remoteDescription) await this.pc.addIceCandidate(p.c); else (this.iceQ=this.iceQ||[]).push(p.c); }
    }catch(e){ /* negotiation failure -> relay fallback timer covers it */ }
  }
  flushIce(){ const q=this.iceQ||[]; this.iceQ=[]; q.forEach(c=>this.pc.addIceCandidate(c).catch(()=>{})); }
  makePC(){
    if(this.pc || typeof RTCPeerConnection==='undefined') return;
    const pc=this.pc=new RTCPeerConnection({iceServers:ICE});
    pc.onicecandidate=e=>{ if(e.candidate) this.sig({t:'ice',c:e.candidate.toJSON()}); };
    const wire=dc=>{ dc.onmessage=e=>{ try{ this.recv(JSON.parse(e.data)); }catch(x){} }; dc.onopen=()=>this.checkOpen(); dc.onclose=()=>{ if(this.mode==='p2p'&&!this.closed) this.useRelay(true); }; };
    if(this.role==='host'){ this.dcU=pc.createDataChannel('u',{ordered:false,maxRetransmits:0}); this.dcR=pc.createDataChannel('r',{ordered:true}); wire(this.dcU); wire(this.dcR); }
    else pc.ondatachannel=e=>{ if(e.channel.label==='u') this.dcU=e.channel; else this.dcR=e.channel; wire(e.channel); };
  }
  async startRTC(){ this.makePC(); if(!this.pc){ this.useRelay(); return; } const o=await this.pc.createOffer(); await this.pc.setLocalDescription(o); this.sig({t:'offer',sdp:this.pc.localDescription}); }
  checkOpen(){ if(this.dcU&&this.dcR&&this.dcU.readyState==='open'&&this.dcR.readyState==='open'&&this.mode!=='p2p'){ clearTimeout(this.fallbackT); const was=this.mode; this.mode='p2p'; if(!was) this.ready(); } }
  useRelay(lost){ if(this.closed) return; if(this.mode==='p2p'&&!lost) return; const was=this.mode; this.mode='relay'; if(!was) this.ready(); }
  ready(){ clearInterval(this.helloT); this.onStatus(this.mode==='p2p'?'Direct P2P link':'Relay link'); this.onReady(this.mode); }
  send(msg,reliable){
    if(this.closed) return;
    if(this.mode==='p2p'){ const dc=reliable?this.dcR:this.dcU; if(dc&&dc.readyState==='open'){ try{ dc.send(JSON.stringify(msg)); return; }catch(e){} } }
    this.ch.send({type:'broadcast',event:'m',payload:msg});
  }
  recv(m){
    this.lastHeard=performance.now();
    if(m.t==='ping'){ this.send({t:'pong',ts:m.ts}); return; }
    if(m.t==='pong'){ this.rtt=this.rtt*0.7+(performance.now()-m.ts)*0.3; return; }
    this.onMsg(m);
  }
  close(){ if(this.closed) return; try{ this.send({t:'bye'},true); }catch(e){} this.closed=true; clearInterval(this.helloT); clearInterval(this.pingT); clearTimeout(this.fallbackT);
    try{ this.pc&&this.pc.close(); }catch(e){} try{ client().removeChannel(this.ch); }catch(e){} }
}

// ---------- Netcode: host simulates, guest renders snapshots and streams inputs (with press counters) ----------
class NetHost{
  constructor(fight, link){
    this.f=fight; this.link=link; this.rem={held:{},counts:{},pending:{},forced:{}}; this.myQ=[]; this.n=0; this.lastInputAt=performance.now();
  }
  onInput(m){ // m.h held bitmask, m.c press counts
    this.lastInputAt=performance.now();
    KEYS.forEach((k,i)=>{ this.rem.held[k]=!!(m.h&(1<<i)); const c=m.c[i]|0, prev=this.rem.counts[k]; if(prev===undefined) this.rem.counts[k]=c; else if(c>prev){ this.rem.pending[k]=(this.rem.pending[k]||0)+Math.min(3,c-prev); this.rem.counts[k]=c; } });
  }
  remoteInput(){
    const R=this.rem, inp={};
    for(const k of KEYS){ inp[k]=!!R.held[k];
      if((R.pending[k]||0)>0){ if(!R.forced[k]){ inp[k]=true; R.pending[k]--; R.forced[k]=true; } else { inp[k]=false; R.forced[k]=false; } }
      else R.forced[k]=false; }
    return inp;
  }
  tick(myInput){
    // fairness: delay the host's own input by ~half the round trip so neither side gets a reaction edge
    const delay=Math.max(0,Math.min(5,Math.round(this.link.rtt/2/16.7)));
    this.myQ.push(myInput); while(this.myQ.length>delay+1) this.myQ.shift();
    const mine=this.myQ.length>delay?this.myQ[0]:{};
    this.f.update(mine,this.remoteInput());
    const every=this.link.mode==='p2p'?2:4;
    if(++this.n%every===0 || this.f.over){ this.link.send({t:'s',d:this.f.snapshot()}, false); }
  }
}
class NetGuest{
  constructor(fight, link){ this.f=fight; this.link=link; this.counts=KEYS.map(()=>0); this.prev={}; this.lastSent=''; this.n=0; this.lastFr=-1; }
  onSnapshot(d){ if(d.fr>=this.lastFr || d.ov){ this.lastFr=d.fr; this.f.applySnapshot(d); } }
  tick(myInput){
    KEYS.forEach((k,i)=>{ if(myInput[k]&&!this.prev[k]) this.counts[i]++; }); this.prev={...myInput};
    let h=0; KEYS.forEach((k,i)=>{ if(myInput[k]) h|=1<<i; });
    const msg={t:'in',h,c:this.counts}, key=h+'|'+this.counts.join(',');
    const every=this.link.mode==='p2p'?6:8;
    if(key!==this.lastSent || ++this.n%every===0){ this.link.send(msg,false); this.lastSent=key; }
    this.f.renderTick();
  }
}

DD.Online={ nameOk,...api, Link, NetHost, NetGuest, KEYS};
// expose getters correctly (spread copies values)
Object.defineProperty(DD.Online,'ident',{get:()=>ident}); Object.defineProperty(DD.Online,'profile',{get:()=>profile});
})();
