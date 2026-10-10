/* DEGEN DOJO — fight engine */
(function(){
const AW=480, AH=270, FLOOR=232, WALL_L=18, WALL_R=462;
const SC=2, GRAV=0.62, MAXHP=1000, ROUND_TIME=60, WINS_NEEDED=2;
const A = ()=>DD.Audio;

// attack table (frames @60fps)
const ATK = {
  // ground punches: jab -> straight -> uppercut chain
  P:  {name:'Jab',      su:4, ac:3, re:8,  dmg:40, x0:6, x1:30, y0:-48, y1:-34, h:'high', kb:2,   hs:14, pose:'punch', chain:{p:'P2',k:'K'}},
  P2: {name:'Straight', su:5, ac:3, re:11, dmg:48, x0:6, x1:34, y0:-48, y1:-34, h:'high', kb:2.6, hs:16, pose:'punch', step:1.6, chain:{p:'P3',k:'K2'}},
  P3: {name:'Uppercut', su:6, ac:4, re:20, dmg:62, x0:2, x1:26, y0:-72, y1:-20, h:'mid',  kb:1.6, hs:24, pose:'upper', launch:1, heavy:1},
  FP: {name:'Overhead', su:13,ac:4, re:16, dmg:80, x0:8, x1:34, y0:-58, y1:-18, h:'overhead', kb:4, hs:20, pose:'heavy', step:2.6, heavy:1},
  BP: {name:'Anti-Air', su:5, ac:6, re:18, dmg:60, x0:0, x1:26, y0:-84, y1:-36, h:'high', kb:2,   hs:20, pose:'upper', aa:1},
  // kicks
  K:  {name:'Kick',     su:7, ac:4, re:13, dmg:62, x0:6, x1:36, y0:-38, y1:-22, h:'mid',  kb:3,   hs:18, pose:'kick',  chain:{k:'K2',p:'P2'}},
  K2: {name:'Roundhouse',su:9,ac:5, re:18, dmg:80, x0:6, x1:38, y0:-54, y1:-30, h:'high', kb:6,   hs:22, pose:'round', heavy:1},
  FK: {name:'Lunge Kick',su:9,ac:5, re:16, dmg:70, x0:6, x1:34, y0:-30, y1:-12, h:'mid',  kb:4,   hs:18, pose:'lunge', step:4.6, heavy:1},
  // lows
  cP: {name:'Low Jab',  su:4, ac:3, re:10, dmg:32, x0:6, x1:30, y0:-30, y1:-18, h:'low',  kb:1.8, hs:13, pose:'cpunch', chain:{p:'cP',k:'cK'}},
  cK: {name:'Sweep',    su:8, ac:4, re:20, dmg:55, x0:6, x1:38, y0:-10, y1:0,   h:'low',  kb:2.5, hs:16, pose:'ckick', kd:1, heavy:1},
  // air
  jP: {name:'Air Punch',su:3, ac:8, re:4,  dmg:50, x0:2, x1:26, y0:-44, y1:-20, h:'air',  kb:2.5, hs:16, pose:'jpunch', air:1},
  jK: {name:'Air Kick', su:4, ac:10,re:4,  dmg:65, x0:2, x1:30, y0:-30, y1:-8,  h:'air',  kb:3,   hs:18, pose:'jkick', air:1, heavy:1},
  jD: {name:'Dive Kick',su:5, ac:40,re:2,  dmg:60, x0:0, x1:24, y0:-20, y1:0,   h:'overhead', kb:3, hs:18, pose:'dive', air:1, dive:1, heavy:1},
};

function rand(a,b){ return a+Math.random()*(b-a); }
function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }

// ---------------- Fighter ----------------
class Fighter {
  constructor(spec, side, alt){
    this.spec=spec; this.side=side; this.alt=alt; this.size=(spec.size||1)*SC;
    this.wins=0; this.reset();
  }
  reset(){
    this.x = this.side===0 ? 130 : 350; this.y=FLOOR; this.vx=0; this.vy=0; this.face=this.side===0?1:-1;
    this.hp=MAXHP; this.meter=0; this.state='idle'; this.t=0; this.atk=null; this.atkHit=false;
    this.stun=0; this.invuln=0; this.flash=0; this.hist=[];
    this.armor=0; this.reflect=0; this.healT=0; this.poison=0; this.slow=0;
    this.buff={dmg:0,spd:0,steal:0,plot:0};
    this.sp=null; this.hidden=false; this.landLag=0; this.tap={l:-99,r:-99}; this.frame=0;
    this.prev={}; this.inp={};
    this.guard=100; this.combo=0; this.buf=null; this.contact=false; this.blockPress=-99; this.shieldFlash=0; this.lastBlock=-99; this.launched=false; this.passThru=false;
  }
  get grounded(){ return this.y>=FLOOR-0.01; }
  get crouching(){ return this.state==='crouch'||this.state==='cblock'||(this.state==='attack'&&this.atk&&(this.atk.key==='cP'||this.atk.key==='cK')); }
  hurt(){ const s=this.size, top = this.state==='kd'||this.state==='ko' ? -12 : (this.crouching? -36 : -54); return {x0:this.x-11*s, x1:this.x+11*s, y0:this.y+top*s, y1:this.y}; }
  pressed(k){ return this.inp[k] && !this.prev[k]; }
  spdMul(){ return this.spec.stats.spd * (this.buff.spd>0?1.45:1) * (this.slow>0?0.55:1); }
  canAct(){ return ['idle','walk','crouch','block','cblock'].includes(this.state) && this.stun<=0; }
  set(st){ if(this.state!==st){ this.state=st; this.t=0; } }
}

// ---------------- Fight ----------------
class Fight {
  constructor(opts){
    this.p=[ new Fighter(opts.p1,0,false), new Fighter(opts.p2,1, opts.p1.id===opts.p2.id) ]; this.p[1].isCPU=true;
    this.arena=opts.arena; this.ai=opts.ai; this.onEnd=opts.onEnd; this.onRound=opts.onRound||(()=>{});
    this.round=1; this.frame=0; this.fx=[]; this.proj=[]; this.zones=[]; this.clones=[]; this.texts=[];
    this.shake=0; this.hitstop=0; this.paused=false; this.over=false;
    this.stats=[0,1].map(()=>({hits:0,blocks:0,parries:0,maxCombo:0,dmg:0}));
    this.comboHud=[{n:0,t:0},{n:0,t:0}]; this.blockPopT=0;
    this.startRound();
  }
  startRound(){
    for(const f of this.p) f.reset();
    this.proj=[]; this.zones=[]; this.clones=[]; this.fx=[]; this.texts=[];
    this.timer=ROUND_TIME; this.tick=0; this.phase='intro'; this.pt=0; this.banner=null; this.koWinner=null;
    A().say('Round '+this.round);
  }
  other(f){ return this.p[0]===f?this.p[1]:this.p[0]; }

  // ---- main update ----
  update(input1){
    if(this.paused||this.over) return;
    this.frame++;
    const [a,b]=this.p;
    a.inp = this.phase==='fight' ? input1 : {};
    b.inp = this.phase==='fight' ? this.ai.think(b,a,this) : {};
    if(this.hitstop>0){ this.hitstop--; a.prev={...a.inp}; b.prev={...b.inp}; return; }
    if(this.phase==='ko' && (this.pt%2)) { this.pt++; return; } // slow-mo

    for(const f of this.p) this.updateFighter(f);
    this.pushApart();
    this.updateProj(); this.updateZones(); this.updateClones();
    for(const f of this.p){ f.prev={...f.inp}; }
    this.fx=this.fx.filter(e=>(e.life--)>0); for(const e of this.fx){ e.x+=e.vx||0; e.y+=e.vy||0; if(e.g) e.vy+=e.g; }
    this.texts=this.texts.filter(e=>(e.life--)>0); for(const e of this.texts) e.y-=0.5;
    if(this.shake>0) this.shake--;

    // phases
    this.pt++;
    if(this.phase==='intro'){
      if(this.pt===55){ this.banner='FIGHT!'; A().say('Fight'); }
      else if(this.pt<55) this.banner='ROUND '+this.round;
      if(this.pt>=85){ this.phase='fight'; this.pt=0; this.banner=null; }
    } else if(this.phase==='fight'){
      if(++this.tick>=60){ this.tick=0; this.timer--; }
      const dead=this.p.filter(f=>f.hp<=0);
      if(dead.length || this.timer<=0) this.endRound(this.timer<=0 && !dead.length);
    } else if(this.phase==='ko'){
      if(this.pt>=110){ this.phase='post'; this.pt=0;
        const w=this.koWinner; if(w){ w.sp=null; w.hidden=false; w.passThru=false; w.reflect=0; w.set('win'); }
        this.banner = w ? (w===this.p[0]?'YOU WIN':'CPU WINS') : 'DRAW';
        if(w && w.hp>=MAXHP){ this.banner='PERFECT'; A().say('Perfect'); }
      }
    } else if(this.phase==='post'){
      if(this.pt>=120){
        const champ=this.p.find(f=>f.wins>=WINS_NEEDED);
        if(champ){ this.over=true; this.onEnd(champ===this.p[0], this); }
        else { this.round++; this.startRound(); this.onRound(this.round); }
      }
    }
  }
  endRound(timeout){
    this.phase='ko'; this.pt=0;
    const [a,b]=this.p;
    let w=null;
    if(timeout){ w = a.hp>b.hp?a : b.hp>a.hp?b : null; this.banner='TIME'; A().say('Time'); }
    else { w = a.hp<=0&&b.hp<=0 ? null : (a.hp<=0?b:a); this.banner='K.O.'; A().sfx('ko'); A().say('K O'); }
    if(w){ w.wins++; const l=this.other(w); if(l.hp<=0){ l.set('ko'); l.vy=-4; l.vx=-l.face*2; } }
    this.koWinner=w; this.shake=20;
  }

  // ---- fighter logic ----
  updateFighter(f){
    const o=this.other(f), I=f.inp, s=f.spec;
    f.frame++; f.t++;
    f.hist.push({x:f.x,y:f.y,hp:f.hp}); if(f.hist.length>120) f.hist.shift();
    for(const k in f.buff) if(f.buff[k]>0) f.buff[k]--;
    if(f.armor>0) f.armor--; if(f.invuln>0) f.invuln--; if(f.flash>0) f.flash--; if(f.slow>0) f.slow--;
    if(f.healT>0){ f.healT--; f.hp=Math.min(MAXHP,f.hp+1.2); if(f.healT%12===0) this.spark(f.x+rand(-10,10),f.y-100,'#3bff6a',2); }
    if(f.poison>0){ f.poison--; if(f.hp>1) f.hp=Math.max(1,f.hp-0.5); if(f.poison%10===0) this.spark(f.x+rand(-8,8),f.y-40,'#9bff3a',1); }
    if(f.reflect>0) f.reflect--;
    if(f.shieldFlash>0) f.shieldFlash--;
    if(f.state!=='block'&&f.state!=='cblock'&&this.frame-f.lastBlock>50) f.guard=Math.min(100,f.guard+0.3);
    
    if(f.state==='ko'){ this.physics(f); f.vx*=0.9; return; }
    if(f.state==='win'){ f.vx=0; this.physics(f); return; }
    if(this.phase!=='fight' && this.phase!=='intro'){ if(f.state==='attack'||f.state==='special'||f.state==='walk'||f.state==='charge'||f.state==='dash'){ if(f.grounded) f.set('idle'); } this.physics(f); f.vx*=0.8; return; }

    // facing
    if(f.canAct() && f.grounded && !f.sp) f.face = o.x>=f.x ? 1 : -1;

    const spd=f.spdMul();
    switch(f.state){
      case 'idle': case 'walk': case 'crouch': case 'block': case 'cblock': {
        if(f.stun>0){ f.stun--; f.vx*=0.85; break; }
        if(f.landLag>0){ f.landLag--; f.vx=0; break; }
        if(f.pressed('sp') && f.meter>=100){ this.startSpecial(f,o); break; }
        if(I.sp && f.meter<100 && !I.left && !I.right){ f.set('charge'); break; }
        if(f.pressed('block')) f.blockPress=this.frame;
        const fwd=(I.right&&f.face>0)||(I.left&&f.face<0), back=(I.left&&f.face>0)||(I.right&&f.face<0);
        if(f.pressed('p')){
          if(I.block && !I.down){ this.tryThrow(f,o); break; }
          this.startAttack(f, I.down?'cP' : fwd?'FP' : back?'BP' : 'P'); break; }
        if(f.pressed('k')){ this.startAttack(f, I.down?'cK' : fwd?'FK' : 'K'); break; }
        if(f.pressed('up')){ f.vy=-11.6; f.vx=(I.right?1:I.left?-1:0)*3.4*spd; f.set('jump'); A().sfx('jump'); break; }
        // double-tap dash
        if(f.pressed('left')){ if(f.frame-f.tap.l<14){ this.dash(f,-1); f.tap.l=-99; break; } f.tap.l=f.frame; }
        if(f.pressed('right')){ if(f.frame-f.tap.r<14){ this.dash(f,1); f.tap.r=-99; break; } f.tap.r=f.frame; }
        if(I.block){ f.set(I.down?'cblock':'block'); f.vx=0; break; }
        if(I.down){ f.set('crouch'); f.vx=0; break; }
        if(I.left||I.right){ const d=I.right?1:-1; f.vx = d*2.5*spd*(d===f.face?1:0.8); f.set('walk'); }
        else { f.vx=0; f.set('idle'); }
        break;
      }
      case 'charge': {
        f.vx=0;
        if(!I.sp || f.meter>=100 || f.pressed('p') || f.pressed('k') || f.pressed('up') || I.block){ f.set('idle'); break; }
        f.meter=Math.min(100,f.meter+0.45);
        if(f.t%6===0){ A().sfx('charge'); this.spark(f.x+rand(-14,14),f.y-rand(10,100),'#ff6a00',1,0,-1); }
        if(f.meter>=100){ A().sfx('meter'); }
        break;
      }
      case 'jump': {
        if((f.pressed('p')||f.pressed('k')) && !f.airUsed){ f.airUsed=true; this.startAttack(f, f.pressed('k') ? (I.down?'jD':'jK') : 'jP'); }
        break;
      }
      case 'dash': { f.vx*=0.88;
        if(f.t>3 && (f.pressed('p')||f.pressed('k'))){ const v=f.vx*0.5; this.startAttack(f, f.pressed('k')?'FK':'FP'); f.vx=v; break; }
        if(f.t>14){ f.set('idle'); } break; }
      case 'dizzy': { f.vx*=0.8; if(f.t%10===0) this.spark(f.x+rand(-10,10),f.y-118*f.size/2,'#ffd23f',1,0,-0.5); if(f.t>85){ f.set('idle'); } break; }
      case 'attack': this.updateAttack(f,o); break;
      case 'hit': { f.vx*=0.88; if(--f.stun<=0 && f.grounded){ f.stun=0; f.combo=0; f.set('idle'); } break; }
      case 'kd': { f.vx*=0.85; f.invuln=2; f.combo=0; if(f.t>48){ f.set('getup'); } break; }
      case 'getup': { f.invuln=2; f.vx=0; if(f.t>14) f.set('idle'); break; }
      case 'special': this.updateSpecial(f,o); break;
    }
    this.physics(f);
  }

  physics(f){
    if(!f.grounded || f.vy<0){ f.vy+=GRAV; }
    f.x+=f.vx; f.y+=f.vy;
    if(f.y>=FLOOR){
      if(f.vy>4 && f.state!=='kd' && f.state!=='ko'){ A().sfx('land'); }
      f.y=FLOOR; f.vy=0;
      if(f.state==='jump' || (f.state==='attack'&&f.atk&&f.atk.air)){ f.atk=null; f.airUsed=false; f.set('idle'); f.landLag=3; f.vx=0; }
      if(f.state==='hit' && f.launched){ f.launched=false; f.set('kd'); }
    }
    const s=f.size; f.x=clamp(f.x, WALL_L+8*s, WALL_R-8*s);
  }

  pushApart(){
    const [a,b]=this.p;
    if(a.hidden||b.hidden||a.state==='ko'||b.state==='ko'||a.passThru||b.passThru) return;
    const dx=b.x-a.x, min=18*((a.size+b.size)/2);
    if(Math.abs(dx)<min && Math.abs(a.y-b.y)<80){
      const push=(min-Math.abs(dx))/2, d=dx>=0?1:-1;
      a.x-=push*d; b.x+=push*d;
      if(a.x<WALL_L+8){ a.x=WALL_L+8; b.x=a.x+min*d; } if(b.x<WALL_L+8){ b.x=WALL_L+8; a.x=b.x-min*d; }
      if(a.x>WALL_R-8){ a.x=WALL_R-8; b.x=a.x+min*d; } if(b.x>WALL_R-8){ b.x=WALL_R-8; a.x=b.x-min*d; }
    }
  }

  dash(f,d){ f.vx=d*7.6*f.spdMul(); f.set('dash'); A().sfx('whoosh'); this.dust(f.x,f.y); }

  // ---- normals ----
  startAttack(f,key){
    const a=ATK[key]; f.atk={...a,key}; f.atkHit=false; f.contact=false; f.buf=null; f.set('attack'); f.t=0;
    if(!a.air) f.vx=0;
    if(a.dive){ f.vy=Math.max(f.vy,5.5); f.vx=f.face*4.2; }
    const m = f.buff.spd>0?0.7:1;
    f.atk.su=Math.max(2,Math.round(a.su*m)); f.atk.re=Math.max(3,Math.round(a.re*m));
    A().sfx('whoosh');
  }
  updateAttack(f,o){
    const a=f.atk; if(!a){ f.set('idle'); return; }
    const t=f.t, I=f.inp;
    if(a.step && t<=a.su+a.ac) f.vx = f.face*a.step*(t>a.su-3?1:0.3); else if(!a.air) f.vx*=0.7;
    if(a.dive && f.grounded===false) { f.vy=Math.max(f.vy,5.5); }
    // input buffer for chains / special cancel
    if(t>2){ if(f.pressed('p')) f.buf='p'; else if(f.pressed('k')) f.buf='k'; else if(f.pressed('sp')) f.buf='sp'; }
    if(t>a.su && t<=a.su+a.ac && !f.atkHit){
      const box=this.box(f,a.x0,a.x1,a.y0,a.y1);
      if(this.overlap(box,o.hurt())){ f.atkHit=true; f.contact=true;
        this.hit(f,o,{dmg:a.dmg,h:a.h,kb:a.kb,hs:a.hs,kd:a.kd,heavy:a.heavy,melee:true,launch:a.launch||(a.aa&&!o.grounded),name:a.name}); }
      for(const c of this.clones) if(c.owner!==f && this.overlap(box,{x0:c.x-20,x1:c.x+20,y0:c.y-100,y1:c.y})){ c.life=0; this.spark(c.x,c.y-60,'#fff',8); }
    }
    // chain / cancel on contact
    if(f.contact && f.buf && t>a.su+a.ac && f.grounded){
      if(f.buf==='sp' && f.meter>=100){ this.startSpecial(f,o); return; }
      const next = a.chain && a.chain[f.buf];
      if(next){ const dn=I.down; this.startAttack(f, (f.buf==='p'&&dn)?'cP':(f.buf==='k'&&dn)?'cK':next); return; }
    }
    if(t>=a.su+a.ac+a.re){
      if(a.air && !f.grounded){ f.state='jump'; f.atk=null; }
      else { f.atk=null; f.set('idle'); }
    }
  }
  box(f,x0,x1,y0,y1){ const s=f.size; const xa=f.x+f.face*x0*s, xb=f.x+f.face*x1*s; return {x0:Math.min(xa,xb), x1:Math.max(xa,xb), y0:f.y+y0*s, y1:f.y+y1*s}; }
  overlap(a,b){ return a.x0<b.x1 && a.x1>b.x0 && a.y0<b.y1 && a.y1>b.y0; }

  tryThrow(f,o){
    const ok = Math.abs(o.x-f.x)<58 && o.grounded && f.grounded && !o.invuln && !o.hidden && !['hit','kd','getup','ko','special'].includes(o.state);
    f.sp={type: ok?'throw':'throwWhiff', t:0}; f.set('special'); f.vx=0; A().sfx('whoosh');
    if(ok){ o.set('hit'); o.stun=60; o.sp=null; o.atk=null; o.vx=0; }
  }

  // ---- hit resolution ----
  // opts: dmg,h(high|mid|low|air|unblockable),kb,hs,kd,heavy,melee,launch,noMeter,dirX
  hit(att,def,opts){
    if(def.invuln>0 || def.hidden || def.state==='ko' || this.phase!=='fight' && this.phase!=='ko') return false;
    const dir = opts.dirX || (def.x>=att.x?1:-1);
    // Reverse Card (reflect) — counter melee
    if(def.reflect>0 && opts.melee){
      this.spark(def.x,def.y-72,'#5ad1ff',14); this.pop(def.x,def.y-140,'REVERSED','#5ad1ff');
      def.reflect=0; def.sp=null; def.set('idle');
      this.hit(def,att,{dmg:110,h:'unblockable',kb:4,hs:20,kd:1,heavy:1,dirX:-dir});
      return false;
    }
    // block?
    const blocking = (def.state==='block' && (opts.h==='high'||opts.h==='mid'||opts.h==='air'||opts.h==='overhead')) ||
                     (def.state==='cblock' && (opts.h==='low'||opts.h==='mid'));
    if(blocking && opts.h!=='unblockable'){
      const di=this.p.indexOf(def), bx=def.x+def.face*22, by=def.y-(def.state==='cblock'?44:76);
      // PARRY: block pressed within 8 frames of the hit
      if(opts.melee && this.frame-def.blockPress<=8 && (!def.isCPU || Math.random()<this.ai.L.parry)){
        this.stats[di].parries++; def.blockPress=-99;
        def.meter=Math.min(100,def.meter+18); def.guard=Math.min(100,def.guard+20); def.shieldFlash=14;
        att.set('hit'); att.stun=26; att.atk=null; att.sp=null; att.vx=-dir*2;
        this.hitstop=12; this.shake=6; this.ring(bx,by,'#ffd23f'); this.spark(bx,by,'#ffd23f',14);
        this.pop(def.x,def.y-140,'PARRY!','#ffd23f'); A().sfx('parry');
        return false;
      }
      const chip=opts.dmg*0.08; def.hp=Math.max(def.buff.plot>0?1:0.5, def.hp-chip);
      def.vx=dir*(opts.kb*1.5); def.stun=Math.round(opts.hs*0.65);
      def.meter=Math.min(100,def.meter+3); att.meter=Math.min(100,att.meter+1);
      def.guard-=opts.dmg*0.32; def.lastBlock=this.frame; def.shieldFlash=8; this.stats[di].blocks++;
      this.spark(bx,by,'#9fd3ff',7); this.ring(bx,by,'#9fd3ff'); A().sfx('block'); this.hitstop=4;
      if(this.frame-this.blockPopT>40){ this.blockPopT=this.frame; this.pop(def.x,def.y-140,'BLOCKED','#9fd3ff'); }
      if(def.guard<=0){ def.guard=100; def.set('dizzy'); def.stun=0; def.vx=dir*2; this.pop(def.x,def.y-150,'GUARD BREAK','#ff6a00'); A().sfx('heavy'); this.shake=10; }
      return false;
    }
    // damage
    let dmg = opts.dmg * att.spec.stats.pow * (att.buff.dmg>0?1.6:1) / def.spec.stats.def;
    if(def.buff.plot>0) dmg*=0.6;
    // Unbreakable armour: absorb + counter
    if(def.armor>0 && opts.melee){
      def.hp-=dmg*0.3; def.flash=6; def.armor=0;
      this.spark(def.x,def.y-72,'#5ad1ff',12); this.pop(def.x,def.y-140,'DIAMOND','#5ad1ff');
      this.hit(def,att,{dmg:140,h:'unblockable',kb:5,hs:24,kd:1,heavy:1,dirX:-dir});
      return false;
    }
    // combo + scaling
    const ai=this.p.indexOf(att), dI=1-ai;
    const inStun = def.state==='hit' || def.state==='dizzy' || def.launched;
    def.combo = inStun ? def.combo+1 : 1;
    if(def.combo>1) dmg *= Math.max(0.45, 1-0.12*(def.combo-1));
    if(def.combo>1){ this.comboHud[ai]={n:def.combo,t:70}; }
    this.stats[ai].hits++; this.stats[ai].dmg+=dmg; this.stats[ai].maxCombo=Math.max(this.stats[ai].maxCombo,def.combo);
    def.hp-=dmg; if(def.buff.plot>0) def.hp=Math.max(1,def.hp);
    if(att.buff.steal>0){ att.hp=Math.min(MAXHP,att.hp+dmg*0.5); this.spark(att.x,att.y-100,'#ff2ec4',3); }
    if(!opts.noMeter){ att.meter=Math.min(100,att.meter+dmg*0.12); def.meter=Math.min(100,def.meter+dmg*0.08); }
    def.flash=5; def.atk=null; def.sp=null; def.hidden=false; def.passThru=false;
    if(def.state==='charge'||def.state==='special'){ /* interrupted */ }
    if(opts.kd || !def.grounded || opts.launch){
      def.set('hit'); def.launched=true; def.stun=99; def.vy=opts.launch? -9 : -5.5; def.vx=dir*(opts.kb+1)*1.4;
    } else { def.set('hit'); def.stun=opts.hs; def.vx=dir*opts.kb*1.5; }
    this.hitstop = opts.heavy? 7 : 5; this.shake = opts.heavy? 8 : 4;
    const hx = def.x - dir*10, hy=def.y-(def.crouching?24:38)*def.size;
    this.spark(hx,hy,'#fff',6); this.spark(hx,hy,'#ff6a00',8);
    this.fx.push({kind:'impact',x:hx,y:hy,life:9,max:9,big:!!opts.heavy});
    A().sfx(opts.heavy||dmg>80?'heavy':'hit');
    if(dmg>=95 || (opts.kd && Math.random()<0.6)) this.pop(def.x, def.y-140, DD.TEXT_POPS[Math.floor(Math.random()*DD.TEXT_POPS.length)]);
    return true;
  }

  // ---- specials ----
  startSpecial(f,o){
    f.meter=0; f.sp={type:f.spec.special.type, t:0, n:0}; f.set('special'); f.vx=0;
    A().sfx('special'); this.pop(f.x, f.y-150, f.spec.special.name.toUpperCase(),'#ffd23f');
    this.flashScreen=12;
  }
  endSpecial(f){ f.sp=null; f.hidden=false; f.passThru=false; if(f.grounded) f.set('idle'); else f.set('jump'); }
  updateSpecial(f,o){
    const S=f.sp; if(!S){ f.set('idle'); return; }
    const t=++S.t, d=f.face;
    switch(S.type){
      case 'armorCounter':
        if(t===1){ f.armor=150; } if(t%4===0) this.spark(f.x+rand(-12,12),f.y-rand(5,110),'#5ad1ff',1);
        if(t>24) this.endSpecial(f); break;
      case 'teleportShuriken':
        if(t===1){ f.invuln=12; this.spark(f.x,f.y-60,'#fff',10); f.x=clamp(f.x-d*150,WALL_L+10,WALL_R-10); f.face = o.x>=f.x?1:-1; }
        if(t===10||t===18||t===26) this.shoot(f,{w:10,h:10,vx:f.face*7,y:-40+(t-18)*0.6,dmg:40,kind:'shuriken',h2:'mid',kb:2,hs:14});
        if(t>36) this.endSpecial(f); break;
      case 'rocketUppercut':
        if(t===8){ f.vy=-13; f.vx=d*3; f.invuln=26; A().sfx('jump'); }
        if(t>8 && t<34 && !S.hit){ if(this.overlap(this.box(f,-4,26,-60,-6),o.hurt())){ S.hit=1; this.hit(f,o,{dmg:150,h:'mid',kb:2,hs:30,kd:1,heavy:1,launch:1}); } }
        if(t>8 && t%3===0) this.spark(f.x-d*4,f.y-12,'#ff6a00',2,0,2);
        if(t>12 && f.grounded) this.endSpecial(f); if(t>90) this.endSpecial(f); break;
      case 'rugPull':
        if(t===12){ this.fx.push({kind:'rug',x:f.x,y:FLOOR,dir:d,life:30}); this.shake=10;
          if(o.grounded && Math.abs(o.x-f.x)<300) this.hit(f,o,{dmg:115,h:'low',kb:2,hs:20,kd:1,heavy:1}); }
        if(t>34) this.endSpecial(f); break;
      case 'beam':
        if(t>=16 && t<=46){ S.beam={x0:f.x+d*36, x1: d>0?AW+20:-20, y0:f.y-88, y1:f.y-58, col:'#3bff6a'};
          if(t%6===0 && this.overlap(this.norm(S.beam),o.hurt())) this.hit(f,o,{dmg:24,h:'mid',kb:1.2,hs:10,noMeter:1}); }
        else S.beam=null;
        if(t>52) this.endSpecial(f); break;
      case 'groundSlam':
        if(t===4){ f.vy=-10.5; f.vx=clamp((o.x-f.x)/34,-4.5,4.5); }
        if(t>6 && f.grounded && !S.landed){ S.landed=1; f.vx=0; this.shake=14; A().sfx('heavy');
          for(const dd of [-1,1]) this.shoot(f,{w:26,h:22,vx:dd*5.5,y:-6,dmg:85,kind:'shock',h2:'low',kb:3,kd:1,ox:dd*18});
          if(Math.abs(o.x-f.x)<70 && o.grounded) this.hit(f,o,{dmg:60,h:'mid',kb:3,hs:18,kd:1,heavy:1}); }
        if(S.landed && ++S.n>18) this.endSpecial(f); if(t>100) this.endSpecial(f); break;
      case 'charge':
        if(t>10 && t<60 && !S.hit){ f.vx=d*9.5; f.passThru=false; if(t%3===0) this.dust(f.x-d*10,f.y);
          if(this.overlap(this.box(f,-4,22,-50,-4),o.hurt())){ S.hit=1; this.hit(f,o,{dmg:130,h:'mid',kb:6,hs:24,kd:1,heavy:1}); f.vx=0; }
          if(f.x<=WALL_L+12||f.x>=WALL_R-12) S.hit=2; }
        else f.vx*=0.8;
        if(t>=60 || (S.hit && t>10 && ++S.n>14)) this.endSpecial(f); break;
      case 'wave':
        if(t===14) this.shoot(f,{w:56,h:90,vx:d*4.2,y:-23,dmg:120,kind:'wave',h2:'mid',kb:4,kd:1,heavy:1,life:200});
        if(t>30) this.endSpecial(f); break;
      case 'drainMeter':
        if(t===10) this.shoot(f,{w:44,h:44,vx:d*3.4,y:-30,dmg:25,kind:'gas',h2:'mid',kb:1,hs:20,life:200,onHit:(def)=>{ def.meter=0; def.poison=200; this.pop(def.x,def.y-140,'GAS SPIKE','#9bff3a'); }});
        if(t>26) this.endSpecial(f); break;
      case 'bigBeam':
        if(t<40){ if(t%3===0) this.spark(f.x+d*40+rand(-8,8),f.y-80+rand(-8,8),'#c9a0ff',1); }
        if(t>=40 && t<=72){ S.beam={x0:f.x+d*32, x1: d>0?AW+20:-20, y0:f.y-120, y1:f.y-24, col:'#c9a0ff'};
          if(t%5===0 && this.overlap(this.norm(S.beam),o.hurt())) this.hit(f,o,{dmg:24,h:'mid',kb:1.4,hs:10,noMeter:1}); }
        else S.beam=null;
        if(t>80) this.endSpecial(f); break;
      case 'heal':
        if(t===10){ f.healT=170; A().sfx('heal'); }
        if(t>34) this.endSpecial(f); break;
      case 'clones':
        if(t===10){ for(const dd of [-1,1]) this.clones.push({owner:f,x:clamp(f.x+dd*44,30,450),y:FLOOR,life:260,face:d,t:0}); }
        if(t>22) this.endSpecial(f); break;
      case 'feint':
        if(t===1){ f.hidden=true; f.invuln=20; this.spark(f.x,f.y-60,'#ff2e2e',10); }
        if(t===12){ const side = o.face; let nx=o.x - side*46; if(nx<WALL_L+20||nx>WALL_R-20) nx=o.x+side*46; f.x=clamp(nx,WALL_L+12,WALL_R-12); f.face=o.x>=f.x?1:-1; f.hidden=false; this.spark(f.x,f.y-60,'#ff2e2e',10); }
        if(t>14 && t<22 && !S.hit && this.overlap(this.box(f,0,32,-50,-14),o.hurt())){ S.hit=1; this.hit(f,o,{dmg:115,h:'unblockable',kb:4,hs:26,heavy:1}); }
        if(t>34) this.endSpecial(f); break;
      case 'rageBuff':
        if(t===1){ f.buff.dmg=360; this.pop(f.x,f.y-160,'ALL CAPS','#ff2e2e'); }
        if(t>24) this.endSpecial(f); break;
      case 'zone':
        if(t===12) this.zones.push({owner:f,x:o.x,w:130,life:380});
        if(t>24) this.endSpecial(f); break;
      case 'speedBuff':
        if(t===1) f.buff.spd=380; if(t>18) this.endSpecial(f); break;
      case 'reflect':
        if(t===1) f.reflect=80; if(t>80 || f.reflect<=0) this.endSpecial(f); break;
      case 'lifesteal':
        if(t===1) f.buff.steal=380; if(t>20) this.endSpecial(f); break;
      case 'plotArmor':
        if(t===1){ f.buff.plot=480; }
        if(t===10 && Math.abs(o.x-f.x)<90) this.hit(f,o,{dmg:50,h:'mid',kb:5,hs:20,kd:1});
        if(t===10) this.ring(f.x,f.y-60,'#ffb000');
        if(t>26) this.endSpecial(f); break;
      case 'rewind':
        if(t===1){ const h=f.hist[0]; if(h){ this.spark(f.x,f.y-60,'#00ffd0',12); f.x=h.x; f.y=Math.min(FLOOR,h.y); f.hp=Math.max(f.hp,h.hp); } f.invuln=20;
          if(o.state!=='kd'&&o.state!=='ko'&&!o.invuln){ o.set('hit'); o.stun=40; o.vx=0; o.sp=null; o.atk=null; this.pop(o.x,o.y-140,'DESYNC','#00ffd0'); } this.glitch=20; }
        if(t>20) this.endSpecial(f); break;
      case 'multiDash': {
        const k=Math.floor((t-4)/16);
        if(t>4 && k<3){ const ph=(t-4)%16;
          if(ph===0){ f.face=o.x>=f.x?1:-1; S.hit=0; A().sfx('whoosh'); }
          f.passThru=true; f.vx = ph<10 ? f.face*12.5 : 0; this.spark(f.x-f.face*8,f.y-60,'#ffd23f',1);
          if(!S.hit && this.overlap(this.box(f,-8,16,-50,-4),o.hurt())){ S.hit=1; this.hit(f,o,{dmg:45,h:'mid',kb:1,hs:18}); } }
        if(t>4+48+6) this.endSpecial(f); break;
      }
      case 'invulnRoll':
        if(t<44){ f.passThru=true; f.invuln=2; f.vx=d*6.4; if(!S.hit && this.overlap(this.box(f,-10,14,-24,0),o.hurt())){ S.hit=1; f.invuln=0; this.hit(f,o,{dmg:80,h:'low',kb:3,hs:22,kd:1}); f.invuln=2; } }
        else { f.vx=0; if(t===44){ f.hp=Math.min(MAXHP,f.hp+50); A().sfx('heal'); } }
        if(t>52) this.endSpecial(f); break;
      case 'commandGrab':
        if(t===6 && !S.grab){ if(Math.abs(o.x-f.x)<34*f.size && o.grounded && !o.invuln && o.state!=='kd'){ S.grab=1; o.set('hit'); o.stun=80; o.sp=null; o.atk=null; } }
        if(S.grab){ o.x=clamp(f.x+d*34,WALL_L+20,WALL_R-20); o.y=FLOOR-Math.sin(Math.min(1,(t-6)/24)*Math.PI)*90; o.vx=0; o.vy=0;
          if(t===34){ o.y=FLOOR; this.shake=16; this.hit(f,o,{dmg:185,h:'unblockable',kb:3,hs:30,kd:1,heavy:1}); } }
        if(t>(S.grab?48:36)) this.endSpecial(f); break;
      case 'barrage':
        if(t>=8 && t<=44 && t%6===2) this.shoot(f,{w:14,h:18,vx:d*8,vy:rand(-0.6,0.4),y:-44+rand(-6,6),dmg:22,kind:'phone',h2:'mid',kb:1,hs:10,noMeter:1});
        if(t>50) this.endSpecial(f); break;
      case 'throw':
        if(t<18){ o.x=clamp(f.x+d*30,WALL_L+20,WALL_R-20); o.y=FLOOR-Math.min(18,t*1.5); o.vx=0; o.vy=0; o.stun=10; }
        if(t===18){ o.x=clamp(f.x-d*34,WALL_L+20,WALL_R-20); o.y=FLOOR-10; o.combo=0; o.state='idle'; this.shake=10; this.hit(f,o,{dmg:100,h:'unblockable',kb:4,hs:24,kd:1,heavy:1,dirX:-d,name:'Throw'}); this.pop(o.x,o.y-130,'THROWN','#ffffff'); }
        if(t>34) { f.face = o.x>=f.x?1:-1; this.endSpecial(f); } break;
      case 'throwWhiff':
        if(t>24) this.endSpecial(f); break;
      default: this.endSpecial(f);
    }
  }
  norm(b){ return {x0:Math.min(b.x0,b.x1), x1:Math.max(b.x0,b.x1), y0:b.y0, y1:b.y1}; }

  // ---- projectiles ----
  shoot(f,o){
    this.proj.push({owner:f, x:f.x+(o.ox!==undefined?o.ox:f.face*36), y:f.y+(o.y||-40)*f.size, w:o.w, h:o.h, vx:o.vx, vy:o.vy||0,
      dmg:o.dmg, kind:o.kind, h2:o.h2||'mid', kb:o.kb||2, hs:o.hs||14, kd:o.kd, heavy:o.heavy, life:o.life||160, onHit:o.onHit, noMeter:o.noMeter, t:0});
  }
  updateProj(){
    for(const p of this.proj){
      p.t++; p.x+=p.vx; p.y+=p.vy; p.life--;
      if(p.x<-40||p.x>AW+40) p.life=0;
      const tgt=this.other(p.owner);
      const box={x0:p.x-p.w/2,x1:p.x+p.w/2,y0:p.y-p.h/2,y1:p.y+p.h/2};
      if(p.life>0 && this.overlap(box,tgt.hurt()) && !tgt.invuln && !tgt.hidden){
        if(tgt.reflect>0){ p.owner=tgt; p.vx=-p.vx*1.2; this.spark(p.x,p.y,'#5ad1ff',8); this.pop(tgt.x,tgt.y-140,'NO U','#5ad1ff'); continue; }
        if(this.hit(p.owner,tgt,{dmg:p.dmg,h:p.h2,kb:p.kb,hs:p.hs,kd:p.kd,heavy:p.heavy,noMeter:p.noMeter,dirX:Math.sign(p.vx)||1}) && p.onHit) p.onHit(tgt);
        p.life=0; this.spark(p.x,p.y,'#ffd23f',6);
      }
    }
    this.proj=this.proj.filter(p=>p.life>0);
  }
  updateZones(){
    for(const z of this.zones){ z.life--; const tgt=this.other(z.owner);
      if(Math.abs(tgt.x-z.x)<z.w/2 && tgt.grounded){ tgt.slow=6; if(this.phase==='fight' && tgt.hp>1) tgt.hp-=0.35; if(z.life%14===0) this.spark(tgt.x+rand(-8,8),FLOOR-4,'#5fd13a',1,0,-1); } }
    this.zones=this.zones.filter(z=>z.life>0);
  }
  updateClones(){
    for(const c of this.clones){ c.life--; c.t++; const tgt=this.other(c.owner); const d=tgt.x>=c.x?1:-1; c.face=d; c.x+=d*2.6;
      if(Math.abs(tgt.x-c.x)<28 && Math.abs(tgt.y-c.y)<80 && c.life>0){ this.hit(c.owner,tgt,{dmg:55,h:'mid',kb:3,hs:18,dirX:d}); c.life=0; this.spark(c.x,c.y-60,'#ccc',10); } }
    this.clones=this.clones.filter(c=>c.life>0);
  }

  // ---- fx helpers ----
  spark(x,y,col,n,vx0,vy0){ for(let i=0;i<n;i++) this.fx.push({kind:'px',x,y,vx:(vx0||0)+rand(-2.5,2.5),vy:(vy0||0)+rand(-2.5,1.5),g:0.08,col,life:14+Math.random()*10|0,s:Math.random()<0.4?3:2}); }
  dust(x,y){ for(let i=0;i<5;i++) this.fx.push({kind:'px',x:x+rand(-6,6),y:y-1,vx:rand(-1,1),vy:rand(-1,-0.2),col:'#d8b08a',life:16,s:2}); }
  ring(x,y,col){ this.fx.push({kind:'ring',x,y,col,life:20,max:20}); }
  pop(x,y,text,col){ this.texts.push({x:clamp(x,60,420),y,text,col:col||'#ffffff',life:50}); }

  // ---------------- render ----------------
  draw(ctx){
    ctx.setTransform(2,0,0,2,0,0); ctx.imageSmoothingEnabled=false;
    ctx.save();
    if(this.shake>0){ const m=Math.min(3,this.shake/3); ctx.translate(rand(-2,2)*m, rand(-2,2)*m); }
    DD.Arenas.draw(ctx,this.arena.id,this.frame);
    if(this.flashScreen>0){ this.flashScreen--; ctx.fillStyle='rgba(255,106,0,'+(this.flashScreen/30)+')'; ctx.fillRect(0,0,AW,AH); }

    // zones
    for(const z of this.zones){ ctx.fillStyle='rgba(95,209,58,0.18)'; ctx.fillRect(z.x-z.w/2,FLOOR-2,z.w,6);
      for(let x=z.x-z.w/2;x<z.x+z.w/2;x+=3){ const h=4+((x*7+this.frame/6|0)%6); ctx.fillStyle=((x/3)|0)%2?'#3fae2a':'#6fe04a'; ctx.fillRect(x,FLOOR-h,1.5,h); } }
    // rug effect
    for(const e of this.fx) if(e.kind==='rug'){ const w=(30-e.life)*14; ctx.fillStyle='#c0262d'; const x0=e.dir>0?e.x:e.x-w; ctx.fillRect(x0,FLOOR-3,w,4); ctx.fillStyle='#ffd23f'; for(let x=0;x<w;x+=8) ctx.fillRect(x0+x,FLOOR-2,4,1); }

    // shadows
    for(const f of this.p){ if(f.hidden) continue; const w=(13-Math.min(8,(FLOOR-f.y)/14))*f.size; ctx.fillStyle='rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(f.x,FLOOR+1,w,3,0,0,7); ctx.fill(); }

    // clones
    for(const c of this.clones){ const cv=DD.Sprites.get(c.owner.spec,'walk',(c.t/6)|0,c.owner.alt,false); const k=SC/DD.Sprites.RES; ctx.save(); ctx.globalAlpha=0.6; ctx.translate(c.x,c.y); ctx.scale(c.face*k,k); ctx.drawImage(cv,-cv._ox,-cv._oy); ctx.restore(); }

    // fighters (attacker on top)
    const busy=f=>f.state==='attack'||f.state==='special';
    const order = busy(this.p[0]) && !busy(this.p[1]) ? [this.p[1],this.p[0]] : [this.p[0],this.p[1]];
    for(const f of order) this.drawFighter(ctx,f);

    // beams
    for(const f of this.p){ const b=f.sp&&f.sp.beam; if(!b) continue; const n=this.norm(b), h=n.y1-n.y0, fl=(this.frame%4<2);
      ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.fillStyle=b.col; ctx.globalAlpha=0.35; ctx.fillRect(n.x0,n.y0-4,n.x1-n.x0,h+8); ctx.restore();
      ctx.fillStyle=b.col; ctx.fillRect(n.x0,n.y0,n.x1-n.x0,h); ctx.fillStyle=fl?'#ffffff':'#fff7c2'; ctx.fillRect(n.x0,n.y0+h*0.3,n.x1-n.x0,h*0.4);
      ctx.fillStyle=b.col; for(let x=n.x0;x<n.x1;x+=12){ ctx.fillRect(x,n.y0-2-((x+this.frame)%3),6,2); ctx.fillRect(x+6,n.y1,6,2+((x+this.frame)%3)); } }

    for(const p of this.proj) this.drawProj(ctx,p);

    // particles + impacts
    for(const e of this.fx){
      if(e.kind==='px'){ ctx.fillStyle=e.col; ctx.fillRect(e.x,e.y,e.s,e.s); }
      else if(e.kind==='ring'){ const r=(e.max-e.life)*2.4+4; ctx.globalAlpha=e.life/e.max; ctx.strokeStyle=e.col; ctx.lineWidth=1.5; ctx.beginPath(); ctx.arc(e.x,e.y,r,0,7); ctx.stroke(); ctx.globalAlpha=1; }
      else if(e.kind==='impact'){ const p=1-e.life/e.max, r=(e.big?22:14)*(0.4+p), n=8;
        ctx.save(); ctx.translate(e.x,e.y); ctx.rotate(e.big?0.3:0); ctx.globalAlpha=1-p*0.7;
        ctx.fillStyle='#fff'; ctx.beginPath(); for(let i=0;i<n*2;i++){ const a=i/(n*2)*Math.PI*2, rr=i%2?r*0.35:r; ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr); } ctx.closePath(); ctx.fill();
        ctx.fillStyle='#ffd23f'; ctx.beginPath(); ctx.arc(0,0,r*0.3,0,7); ctx.fill(); ctx.restore(); }
    }
    for(const t of this.texts){ txt(ctx,t.text,t.x,t.y,t.col,8,'center',true); }
    ctx.restore();

    if(this.glitch>0){ this.glitch--; ctx.save(); ctx.setTransform(1,0,0,1,0,0); for(let i=0;i<6;i++){ const y=(Math.random()*AH*2)|0; ctx.drawImage(ctx.canvas,0,y,AW*2,8,(rand(-20,20))|0,y,AW*2,8); } ctx.restore(); }
    this.drawHUD(ctx);
  }

  drawFighter(ctx,f){
    if(f.hidden) return;
    const [pose,fr]=this.poseFor(f);
    const blinking = f.invuln>0 && f.sp && (this.frame%4<2);
    const cv=DD.Sprites.get(f.spec,pose,fr,f.alt,f.flash>0);
    const k=SC/DD.Sprites.RES;
    // swoosh trail on active attack frames
    const a=f.atk;
    if(f.state==='attack' && a && f.t>a.su-1 && f.t<=a.su+a.ac+2){
      const b=this.box(f,a.x0,a.x1,a.y0,a.y1), cx=(b.x0+b.x1)/2, cy=(b.y0+b.y1)/2, w=(b.x1-b.x0)/2+4, h=Math.max(6,(b.y1-b.y0)/2+4);
      const col = a.pose==='kick'||a.pose==='round'||a.pose==='lunge'||a.pose==='ckick'||a.pose==='jkick'||a.pose==='dive' ? '255,210,63' : '255,255,255';
      ctx.save(); ctx.translate(cx,cy); ctx.scale(f.face,1);
      const g=ctx.createLinearGradient(-w,0,w,0); g.addColorStop(0,'rgba('+col+',0)'); g.addColorStop(1,'rgba('+col+',0.75)');
      ctx.strokeStyle=g; ctx.lineWidth=a.heavy?4:2.5; ctx.beginPath();
      if(a.pose==='upper') ctx.ellipse(-w*0.3,h*0.4,w*0.9,h*1.1,0,Math.PI*0.9,Math.PI*1.9);
      else if(a.pose==='heavy') ctx.ellipse(-w*0.4,0,w*1.1,h*1.2,0,-Math.PI*0.7,Math.PI*0.2);
      else ctx.ellipse(-w*0.4,0,w*1.1,h,0,-Math.PI*0.45,Math.PI*0.45);
      ctx.stroke(); ctx.restore();
    }
    if(blinking) ctx.globalAlpha=0.5;
    ctx.save(); ctx.translate(Math.round(f.x*2)/2,Math.round(f.y*2)/2); ctx.scale(f.face*k,k); ctx.drawImage(cv,-cv._ox,-cv._oy); ctx.restore();
    ctx.globalAlpha=1;
    // guard shield
    if(f.state==='block'||f.state==='cblock'){
      const cr=f.state==='cblock', sx=f.x+f.face*22, sy=f.y-(cr?42:72), rh=cr?34:48, fl=f.shieldFlash/14;
      ctx.save(); ctx.translate(sx,sy); ctx.scale(f.face,1);
      ctx.fillStyle='rgba(90,209,255,'+(0.16+fl*0.4)+')'; ctx.beginPath(); ctx.ellipse(-6,0,14,rh,0,-Math.PI/2,Math.PI/2); ctx.fill();
      ctx.strokeStyle= fl>0 ? '#ffffff' : 'rgba(150,230,255,0.85)'; ctx.lineWidth=1.5+fl*2; ctx.beginPath(); ctx.ellipse(-6,0,14,rh,0,-Math.PI/2,Math.PI/2); ctx.stroke();
      // guard ticks
      ctx.globalAlpha=0.6; ctx.fillStyle='#fff'; for(let i=-2;i<=2;i++) ctx.fillRect(6,i*rh*0.35-0.5,2,1); ctx.restore();
    }
    // dizzy stars
    if(f.state==='dizzy'){ for(let i=0;i<3;i++){ const ang=this.frame*0.12+i*2.1; const x=f.x+Math.cos(ang)*14, y=f.y-112*f.size/2+Math.sin(ang)*4; ctx.fillStyle='#ffd23f'; ctx.fillRect(x-2,y-0.5,4,1); ctx.fillRect(x-0.5,y-2,1,4); } }
    // auras
    if(f.armor>0 && this.frame%3===0) this.spark(f.x+rand(-12,12),f.y-rand(5,110),'#5ad1ff',1);
    if(f.buff.dmg>0 && this.frame%3===0) this.spark(f.x+rand(-12,12),f.y-rand(5,110),'#ff2e2e',1,0,-1);
    if(f.buff.spd>0 && this.frame%3===0) this.spark(f.x-f.face*12,f.y-rand(5,100),'#ffd23f',1,-f.face);
    if(f.buff.steal>0 && this.frame%4===0) this.spark(f.x+rand(-10,10),f.y-rand(5,110),'#ff2ec4',1,0,-1);
    if(f.buff.plot>0 && this.frame%4===0) this.spark(f.x+rand(-12,12),f.y-rand(5,110),'#ffb000',1,0,-1);
    if(f.reflect>0){ ctx.strokeStyle=this.frame%4<2?'#5ad1ff':'#ffffff'; ctx.lineWidth=2; ctx.beginPath(); ctx.ellipse(f.x,f.y-58,34,64,0,0,7); ctx.stroke(); }
    if(f.state==='charge'){ ctx.strokeStyle='#ff6a00'; ctx.lineWidth=1; ctx.beginPath(); ctx.ellipse(f.x,f.y-2,30+(this.frame%14),6,0,0,7); ctx.stroke(); }
  }
  poseFor(f){
    const t=f.t;
    switch(f.state){
      case 'walk': return ['walk',(t/6)|0];
      case 'crouch': case 'getup': return ['crouch',0];
      case 'jump': return ['jump',0];
      case 'block': return ['block',0];
      case 'cblock': return ['cblock',0];
      case 'hit': return ['hit',0];
      case 'dizzy': return ['dizzy',(t/8)|0];
      case 'kd': case 'ko': return [f.grounded?'kd':'hit',0];
      case 'dash': return ['dash',0];
      case 'charge': return ['charge',(t/4)|0];
      case 'win': return ['win',(t/10)|0];
      case 'attack': { const a=f.atk; if(!a) return ['idle',0]; const ph = t<=a.su?0 : t<=a.su+a.ac?1:2; return [a.pose, ph===1||(a.dive&&t>a.su)?1:0]; }
      case 'special': {
        const ty=f.sp&&f.sp.type;
        if(ty==='throw') return ['throw', t>=16?1:0];
        if(ty==='throwWhiff') return ['grab',0];
        if(ty==='invulnRoll' && t<44) return ['ball',(t/3)|0];
        if(ty==='rocketUppercut') return t>8?['upper',1]:['crouch',0];
        if(ty==='charge'||ty==='multiDash') return ['dash',0];
        if(ty==='commandGrab') return ['grab',0];
        if(ty==='groundSlam') return f.grounded?['crouch',0]:['jump',0];
        if(ty==='reflect') return ['block',0];
        if(ty==='feint') return ['heavy',t>14&&t<22?1:0];
        if(['armorCounter','heal','rageBuff','speedBuff','lifesteal','plotArmor','rewind'].includes(ty)) return ['charge',(t/3)|0];
        return ['special',0];
      }
      default: return ['idle',(t/10)|0];
    }
  }
  drawProj(ctx,p){
    const x=p.x, y=p.y, f=this.frame, w=p.w, h=p.h;
    ctx.save(); ctx.translate(x,y);
    switch(p.kind){
      case 'shuriken': ctx.rotate(f*0.5); ctx.fillStyle='#fff'; for(let i=0;i<4;i++){ ctx.rotate(Math.PI/2); ctx.beginPath(); ctx.moveTo(0,-w*0.7); ctx.lineTo(w*0.18,0); ctx.lineTo(-w*0.18,0); ctx.fill(); } ctx.fillStyle='#c9b48a'; ctx.beginPath(); ctx.arc(0,0,w*0.15,0,7); ctx.fill(); break;
      case 'shock': ctx.fillStyle='rgba(255,106,0,0.4)'; ctx.beginPath(); ctx.ellipse(0,h*0.2,w*0.7,h*0.6,0,Math.PI,0); ctx.fill(); ctx.fillStyle='#ffd23f'; for(let i=-2;i<=2;i++){ const hh=h*(0.5+((i+f)%3)*0.2); ctx.fillRect(i*w*0.18-1.5,h/2-hh,3,hh); } break;
      case 'wave': { const dir=Math.sign(p.vx); ctx.scale(dir,1); const g=ctx.createLinearGradient(-w/2,0,w/2,0); g.addColorStop(0,'rgba(42,111,214,0.3)'); g.addColorStop(1,'#2a6fd6');
        ctx.fillStyle=g; ctx.beginPath(); ctx.moveTo(-w/2,h/2); ctx.quadraticCurveTo(-w/2,-h/2,w/2,-h/2+Math.sin(f*0.3)*3); ctx.quadraticCurveTo(w/4,-h/4,w/2,h/2); ctx.fill();
        ctx.fillStyle='#bfefff'; for(let i=0;i<5;i++) ctx.fillRect(w/2-6-i*4,-h/2+2+i*3+Math.sin(f*0.4+i)*2,4,2);
        ctx.scale(dir,1); txt(ctx,'SELL',0,-4,'#ffffff',8,'center',true); break; }
      case 'gas': for(let i=0;i<7;i++){ const a=i/7*6.28+f*0.05; ctx.fillStyle=i%2?'rgba(155,255,58,0.85)':'rgba(95,174,42,0.85)'; ctx.beginPath(); ctx.arc(Math.cos(a)*w*0.25,Math.sin(a)*h*0.25,w*0.22,0,7); ctx.fill(); } txt(ctx,'$80',0,-3,'#2b1405',8,'center'); break;
      case 'phone': ctx.rotate(Math.sin(f*0.4)*0.4); ctx.fillStyle='#111'; ctx.fillRect(-w/2,-h/2,w,h); ctx.fillStyle=f%4<2?'#7fdcff':'#ff2ec4'; ctx.fillRect(-w/2+1.5,-h/2+1.5,w-3,h-5); break;
      default: ctx.fillStyle='#ffd23f'; ctx.fillRect(-w/2,-h/2,w,h);
    }
    ctx.restore();
  }

  drawHUD(ctx){
    const [a,b]=this.p;
    const bw=186, bh=10, y=12;
    a.dispHp=lerpDisp(a.dispHp,a.hp); b.dispHp=lerpDisp(b.dispHp,b.hp);
    bar(ctx,16,y,bw,bh,a.hp/MAXHP,false,a.dispHp/MAXHP);
    bar(ctx,AW-16-bw,y,bw,bh,b.hp/MAXHP,true,b.dispHp/MAXHP);
    guardBar(ctx,16,y+bh+3,bw*0.6,a.guard,false,this.frame-a.lastBlock<50);
    guardBar(ctx,AW-16-bw*0.6,y+bh+3,bw*0.6,b.guard,true,this.frame-b.lastBlock<50);
    // timer
    ctx.fillStyle='#1a0b02'; ctx.fillRect(AW/2-18,6,36,26); ctx.fillStyle=this.timer<=10&&this.frame%30<15?'#ff2e2e':'#ff6a00'; ctx.fillRect(AW/2-16,8,32,22);
    txt(ctx,String(Math.max(0,this.timer)).padStart(2,'0'),AW/2,13,'#1a0b02',16,'center');
    txt(ctx,a.spec.name.toUpperCase(),16,30,'#ffffff',8,'left',true);
    txt(ctx,b.spec.name.toUpperCase(),AW-16,30,'#ffffff',8,'right',true);
    txt(ctx,'1P',16,42,'#ffd23f',6,'left',true); txt(ctx,'CPU',AW-16,42,'#ffd23f',6,'right',true);
    for(let i=0;i<WINS_NEEDED;i++){ pip(ctx,AW/2-34-i*10,36,i<a.wins); pip(ctx,AW/2+28+i*10,36,i<b.wins); }
    // combo counters
    for(let i=0;i<2;i++){ const c=this.comboHud[i]; if(c.t>0){ c.t--; const x=i?AW-20:20, al=i?'right':'left', s=c.t>62?1.25:1;
      ctx.save(); ctx.globalAlpha=Math.min(1,c.t/15); txt(ctx,c.n+' HITS',x,70,'#ffd23f',Math.round(16*s),al,true); txt(ctx,c.n>=5?'DEGENERATE!':c.n>=3?'COMBO!':'',x,90,'#ff6a00',8,al,true); ctx.restore(); } }
    meter(ctx,16,AH-16,120,a.meter,this.frame,a.spec.special.name);
    meter(ctx,AW-16-120,AH-16,120,b.meter,this.frame,b.spec.special.name,true);
    if(this.banner){ const big=this.banner.length<=6; txt(ctx,this.banner,AW/2,AH/2-30,'#ffd23f',big?32:24,'center',true,'#1a0b02'); }
  }
}
function guardBar(ctx,x,y,w,v,rev,active){
  ctx.fillStyle='#1a0b02'; ctx.fillRect(x-1,y-1,w+2,5);
  const vw=Math.max(0,v)/100*w; ctx.fillStyle = v<30 ? '#ff2e2e' : active ? '#bff0ff' : '#5ad1ff';
  ctx.fillRect(rev?x+w-vw:x,y,vw,3);
}
function lerpDisp(d,hp){ if(d===undefined) return hp; return d>hp ? Math.max(hp,d-4) : hp; }

// HUD helpers
function txt(ctx,s,x,y,col,size,align,shadow,shCol){
  ctx.font=(size||8)+'px "Press Start 2P", monospace'; ctx.textBaseline='top'; ctx.textAlign=align||'left';
  if(shadow){ ctx.fillStyle=shCol||'#1a0b02'; ctx.fillText(s,x+1,y+1); if(size>=16){ ctx.fillText(s,x+2,y+2); ctx.fillText(s,x-1,y); ctx.fillText(s,x,y-1);} }
  ctx.fillStyle=col; ctx.fillText(s,x,y); ctx.textAlign='left';
}
function bar(ctx,x,y,w,h,v,rev,dv){
  ctx.fillStyle='#1a0b02'; ctx.fillRect(x-2,y-2,w+4,h+4);
  ctx.fillStyle='#4a1a05'; ctx.fillRect(x,y,w,h);
  const dw=Math.max(0,dv)*w, vw=Math.max(0,v)*w;
  ctx.fillStyle='#ff2e2e'; ctx.fillRect(rev?x+w-dw:x,y,dw,h);
  ctx.fillStyle = v>0.3 ? '#ffd23f' : '#ff6a00'; ctx.fillRect(rev?x+w-vw:x,y,vw,h);
  ctx.fillStyle='rgba(255,255,255,0.35)'; ctx.fillRect(rev?x+w-vw:x,y,vw,3);
}
function pip(ctx,x,y,on){ ctx.fillStyle='#1a0b02'; ctx.fillRect(x-1,y-1,8,8); ctx.fillStyle=on?'#ff6a00':'#4a1a05'; ctx.fillRect(x,y,6,6); }
function meter(ctx,x,y,w,v,fr,name,rev){
  ctx.fillStyle='#1a0b02'; ctx.fillRect(x-2,y-2,w+4,10);
  ctx.fillStyle='#2b1405'; ctx.fillRect(x,y,w,6);
  const full=v>=100, vw=v/100*w;
  ctx.fillStyle = full ? (fr%8<4?'#ffffff':'#ff6a00') : '#ff6a00'; ctx.fillRect(rev?x+w-vw:x,y,vw,6);
  txt(ctx, full ? name.toUpperCase()+' READY' : 'SPECIAL', rev?x+w:x, y-11, full?'#ffd23f':'#ffcf9a', 8, rev?'right':'left', true);
}

// ---------------- CPU ----------------
const LEVELS = {
  easy:  {react:26, block:0.18, aggr:0.35, punish:0.15, parry:0,    combo:0.25, aa:0.15, throw:0.1},
  normal:{react:15, block:0.45, aggr:0.55, punish:0.45, parry:0.06, combo:0.55, aa:0.45, throw:0.3},
  hard:  {react:8,  block:0.72, aggr:0.7,  punish:0.85, parry:0.18, combo:0.85, aa:0.8,  throw:0.55},
};
const RANGED = ['teleportShuriken','beam','wave','drainMeter','bigBeam','barrage','rugPull','zone','clones'];
const SELF = ['armorCounter','heal','rageBuff','speedBuff','lifesteal','plotArmor','rewind'];
class CPU {
  constructor(level){ this.L=LEVELS[level]||LEVELS.normal; this.cd=30; this.hold={}; this.holdT=0; this.q=[]; }
  // queue: [{p:'p'|'k'|'sp'|'up'|'left'|'right', h:{...held}, w:frames to wait before}]
  seq(items){ this.q=items.map(x=>({...x})); }
  think(me,op,fight){
    const L=this.L, dx=op.x-me.x, dist=Math.abs(dx), toward=dx>0?'right':'left', away=dx>0?'left':'right';
    // run queued sequence first
    if(this.q.length){
      const it=this.q[0];
      if(it.w>0){ it.w--; return {...(it.h||{})}; }
      this.q.shift(); const out={...(it.h||{})}; if(it.p) out[it.p]=true; return out;
    }
    const out={...this.hold};
    if(this.holdT>0){ this.holdT--; if(this.holdT===0) this.hold={}; }
    if(--this.cd>0) return out;
    this.cd = L.react + (Math.random()*L.react|0);
    if(!me.canAct() && me.state!=='jump'){ this.cd=3; return out; }
    // air: jump-in attacks / dive kicks
    if(me.state==='jump'){ if(dist<90 && !me.airUsed){ const r=Math.random(); return r<0.3?{k:true,down:true}:{[r<0.65?'k':'p']:true}; } return out; }
    // incoming projectile
    const inc = fight.proj.find(p=>p.owner===op && Math.abs(p.x-me.x)<150 && Math.sign(me.x-p.x)===Math.sign(p.vx));
    if(inc && Math.random()<L.block+0.15){ if(inc.h2==='low') this.set({block:true,down:true},18); else if(Math.random()<0.5){ this.seq([{p:'up',h:{[toward]:true}},{w:18,h:{[toward]:true}}]); } else this.set({block:true},18); return out; }
    // anti-air
    if(!op.grounded && op.state!=='hit' && dist<120 && Math.random()<L.aa){ this.seq([{p:'p',h:{[away]:true}}]); this.cd=14; return {}; }
    // defend
    const opAtk = op.state==='attack' && op.atk && op.t<=op.atk.su+op.atk.ac;
    if((opAtk || op.state==='special') && dist<120 && Math.random()<L.block){
      const h=op.atk&&op.atk.h, low=h==='low';
      this.set(low?{block:true,down:true}:{block:true}, 18); this.cd=8;
      return {...this.hold}; }
    // punish whiffs
    if(op.state==='attack' && op.atk && op.t>op.atk.su+op.atk.ac && dist<80 && Math.random()<L.punish){ this.combo(dist,toward); return {}; }
    // throw a turtle
    if((op.state==='block'||op.state==='cblock') && dist<60 && Math.random()<L.throw){ this.seq([{p:'p',h:{block:true}}]); this.hold={}; return {}; }
    // special
    if(me.meter>=100){
      const ty=me.spec.special.type;
      if(SELF.includes(ty) || (RANGED.includes(ty) && dist>80) || (!RANGED.includes(ty) && dist<(ty==='charge'?400:ty==='commandGrab'?60:150))){ this.seq([{p:'sp'}]); this.hold={}; this.cd=20; return {}; }
    }
    if(me.meter<100 && dist>250 && Math.random()<0.25){ this.set({sp:true},40); return out; }
    const r=Math.random();
    if(dist>130){
      if(r<0.18*L.aggr*2) this.seq([{p:'up',h:{[toward]:true}},{w:20,h:{[toward]:true}}]);
      else if(r<0.28) this.seq([{p:toward},{w:2},{p:toward}]);
      else this.set({[toward]:true}, 14+Math.random()*16|0);
    } else if(dist>64){
      if(r<L.aggr*0.3) this.seq([{p:'k',h:{[toward]:true}}]);              // lunge kick
      else if(r<L.aggr*0.42) this.seq([{p:'k',h:{down:true}}]);              // sweep
      else if(r<0.7) this.set({[toward]:true},10);
      else if(r<0.82) this.seq([{p:'up',h:{[toward]:true}},{w:20,h:{[toward]:true}}]);
      else this.set({[away]:true},12);
    } else {
      if(r<L.aggr*0.55) this.combo(dist,toward);
      else if(r<L.aggr*0.7 && (op.state==='cblock'||op.state==='crouch')) this.seq([{p:'p',h:{[toward]:true}}]); // overhead
      else if(r<L.aggr*0.8) this.seq([{p:'k',h:{down:true}}]);
      else if(r<0.85) this.set({block:true},14);
      else this.set({[away]:true},14);
    }
    return out;
  }
  combo(dist,toward){
    const L=this.L, long=Math.random()<L.combo;
    const pick=Math.random();
    if(pick<0.4) this.seq(long?[{p:'p'},{w:7,p:'p'},{w:8,p:'p'}]:[{p:'p'},{w:7,p:'p'}]);           // jab > straight > uppercut
    else if(pick<0.7) this.seq(long?[{p:'k'},{w:11,p:'k'}]:[{p:'k'}]);                           // kick > roundhouse
    else this.seq(long?[{p:'p',h:{down:true}},{w:6,p:'p',h:{down:true}},{w:6,p:'k',h:{down:true}}]:[{p:'k',h:{down:true}}]); // low jab x2 > sweep
    this.hold={}; this.cd=24;
  }
  set(h,t){ this.hold=h; this.holdT=t; }
}

DD.Game = { Fight, CPU, AW, AH, FLOOR };
})();
