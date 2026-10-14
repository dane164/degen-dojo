/* DEGEN DOJO — sprite engine v2
   Hi-res cel-shaded rig (IK limbs, inked parts), keyframed multi-frame animation,
   expressive heads, secondary motion, and an importer for hand-made sprite sheets (DD.SPRITE_ART). */
(function(){
const W=96, H=104, OX=48, OY=98, RES=4;         // logical box (sprite units), foot origin, backing px per unit
const INK='#1a0b02', LW=0.95; let INKL=INK; // INKL = part outline ink (bake mode marks it magenta so the baker can tell lines from features)                    // part outline colour + width (units)
const cache=new Map();
const TAU=Math.PI*2;

// ---------- colour ----------
function shade(hex,f){
  let h=hex.slice(1); if(h.length===3) h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
  const n=parseInt(h,16); let r=(n>>16)&255,g=(n>>8)&255,b=n&255;
  if(f>1){ const k=f-1; r+=(255-r)*k*0.55; g+=(255-g)*k*0.55; b+=(255-b)*k*0.55; } else { r*=f; g*=f; b*=f*1.04; }
  r=Math.max(0,Math.min(255,Math.round(r))); g=Math.max(0,Math.min(255,Math.round(g))); b=Math.max(0,Math.min(255,Math.round(b)));
  return '#'+((1<<24)|(r<<16)|(g<<8)|b).toString(16).slice(1);
}
const SH=0.7, HI=1.32;

// ---------- vector helpers ----------
const add=(a,b)=>[a[0]+b[0],a[1]+b[1]], sub=(a,b)=>[a[0]-b[0],a[1]-b[1]], mul=(a,k)=>[a[0]*k,a[1]*k];
const len=a=>Math.hypot(a[0],a[1]), nrm=a=>{ const l=len(a)||1; return [a[0]/l,a[1]/l]; }, perp=a=>[-a[1],a[0]];
const lerp=(a,b,t)=>[a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t];
const rot=(p,a)=>[p[0]*Math.cos(a)-p[1]*Math.sin(a), p[0]*Math.sin(a)+p[1]*Math.cos(a)];
function ik(a,b,L1,L2,side){
  const d=sub(b,a), D=len(d), u=nrm(d);
  if(D>=L1+L2-0.01) return add(a,mul(u,D*L1/(L1+L2)));
  const x=(D*D+L1*L1-L2*L2)/(2*D), h=Math.sqrt(Math.max(0,L1*L1-x*x));
  return add(add(a,mul(u,x)),mul(perp(u),h*side));
}

// ---------- drawing primitives (sprite units; origin = feet) ----------
let C=null; // current ctx
let SOFT=false; // bake mode: flat fills + ink only, lighting added later by the pixel-art baker
const X=x=>OX+x, Y=y=>OY+y;
function strokeSeg(a,b,w,col){ C.strokeStyle=col; C.lineWidth=w; C.beginPath(); C.moveTo(X(a[0]),Y(a[1])); C.lineTo(X(b[0]),Y(b[1])); C.stroke(); }
// limb: list of segments [{a,b,w}], one colour, inked, cel-shaded, no creases at joints
function limb(segs,col){
  C.lineCap='round'; C.lineJoin='round';
  for(const s of segs) strokeSeg(s.a,s.b,s.w+LW*2,INKL);
  if(SOFT){ for(const s of segs) strokeSeg(s.a,s.b,s.w,col); return; }
  for(const s of segs) strokeSeg(s.a,s.b,s.w,shade(col,SH));
  for(const s of segs){ const o=s.w*0.16; strokeSeg(add(s.a,[o*0.4,-o]),add(s.b,[o*0.4,-o]),s.w*0.66,col); }
  for(const s of segs){ const o=s.w*0.3; strokeSeg(add(s.a,[o*0.5,-o]),add(s.b,[o*0.5,-o]),Math.max(0.6,s.w*0.18),shade(col,HI)); }
}
// cel(path,col): inked, base, shadow crescent (away from light = back/bottom), rim light (front/top)
function cel(path,col,o){
  o=o||{}; const d=o.d==null?1.2:o.d, h=o.h==null?0.55:o.h;
  C.save(); C.beginPath(); path(); C.lineJoin='round'; C.lineWidth=o.lw==null?LW*1.6:o.lw; C.strokeStyle=INKL; C.stroke();
  C.fillStyle=col; C.fill(); C.clip();
  if(SOFT){ C.restore(); return; }
  if(h>0){ C.save(); C.beginPath(); C.rect(-50,-50,W+100,H+100); C.translate(-h,h); path(); C.translate(h,-h); C.fillStyle=shade(col,o.hi||HI); C.fill('evenodd'); C.restore(); }
  if(d>0){ C.save(); C.beginPath(); C.rect(-50,-50,W+100,H+100); C.translate(d,-d*0.9); path(); C.translate(-d,d*0.9); C.fillStyle=shade(col,o.sh||SH); C.fill('evenodd'); C.restore(); }
  C.restore();
}
function fillP(path,col){ C.beginPath(); path(); C.fillStyle=col; C.fill(); }
function strokeP(path,col,w){ C.beginPath(); path(); C.strokeStyle=col; C.lineWidth=w; C.lineCap='round'; C.lineJoin='round'; C.stroke(); }
const E=(x,y,rx,ry,r)=>()=>{ r=r||0; rx=Math.max(0.01,rx); ry=Math.max(0.01,ry); C.moveTo(X(x)+rx*Math.cos(r),Y(y)+rx*Math.sin(r)); C.ellipse(X(x),Y(y),rx,ry,r,0,TAU); };
const Pg=pts=>()=>{ pts.forEach((p,i)=>i?C.lineTo(X(p[0]),Y(p[1])):C.moveTo(X(p[0]),Y(p[1]))); C.closePath(); };
const Pl=pts=>()=>{ pts.forEach((p,i)=>i?C.lineTo(X(p[0]),Y(p[1])):C.moveTo(X(p[0]),Y(p[1]))); };
// smooth closed blob through points (quadratic midpoints)
const Bl=pts=>()=>{ const n=pts.length, m=i=>lerp(pts[i%n],pts[(i+1)%n],0.5); C.moveTo(X(m(0)[0]),Y(m(0)[1]));
  for(let i=1;i<=n;i++){ const p=pts[i%n], q=m(i); C.quadraticCurveTo(X(p[0]),Y(p[1]),X(q[0]),Y(q[1])); } C.closePath(); };

// ---------- builds ----------
function build(s){
  const b=s.build||({bear:'big',bull:'big',whale:'big',unit:'huge',paper:'slim',lag:'slim',doom:'slim',keyboard:'slim',gas:'small'})[s.id]||'normal';
  const B={normal:{t:1.08,sw:10,ww:5.2,ua:9.6,fa:9.4,th:12.8,sh:12.8,fist:4,head:1.0},
           slim:  {t:0.94,sw:8.6,ww:5.2,ua:9.6,fa:9.4,th:12.8,sh:12.8,fist:3.6,head:1.0},
           small: {t:1.0,sw:9,ww:6.4,ua:9,fa:8.8,th:11.8,sh:11.8,fist:3.8,head:1.1},
           big:   {t:1.32,sw:12,ww:7,ua:9.8,fa:9.6,th:12.6,sh:12.8,fist:4.6,head:1.04},
           huge:  {t:1.45,sw:12.5,ww:11.5,ua:9.4,fa:9.2,th:11.6,sh:12.4,fist:4.2,head:1.08}}[b];
  B.kind=b; return B;
}
const ANIMAL=['bear','bull','whale','shiba','cat','sheep','goblin'];

// ---------- poses ----------
// A pose gives hip, neck, feet (fF/bF), hands (fH/bH); knees/elbows are solved by IK.
// Extras: ht head tilt, ex expression, fh/bh hand shape, bFront back arm in front, smear [from,to] for the front/back hand.
const BASE={hip:[0,-25],neck:[1.5,-45],fF:[10,0],bF:[-9,0],fH:[14,-44],bH:[9,-40],ht:0,ex:'n'};
function J(o){ const r=Object.assign({},BASE,o); return r; }
function mixJ(A,B,t){ const r={}; for(const k in A){ const a=A[k], b=B[k];
  if(Array.isArray(a)&&Array.isArray(b)&&typeof a[0]==='number') r[k]=lerp(a,b,t);
  else if(typeof a==='number'&&typeof b==='number') r[k]=a+(b-a)*t;
  else r[k]=t<0.5?a:(b===undefined?a:b); }
  for(const k in B) if(!(k in r)) r[k]=t<0.5?A[k]:B[k];
  return r; }
const off=(P,d)=>{ const r={}; for(const k in P){ const v=P[k]; r[k]=(Array.isArray(v)&&typeof v[0]==='number')?add(v,d):v; } return r; };

// idle styles
function idle(s,f){
  const st=s.idle||'boxer', p=f/8*TAU, b=(1-Math.cos(p))*0.55, sw=Math.sin(p);
  let P;
  switch(st){
    case 'heavy': P=J({hip:[0,-23.5+b*0.8],neck:[2,-43+b],fF:[11,0],bF:[-11,0],fH:[15,-40+b*1.2],bH:[9,-37+b],ht:0.05}); break;
    case 'cool':  P=J({hip:[-0.5,-25.5+b*0.4],neck:[0.5,-45.5+b*0.5],fF:[8,0],bF:[-8,0],fH:[11,-40+b*0.6],bH:[-3,-28+b*0.3],ht:-0.06,bh:'open'}); break;
    case 'nervous': { const j=(f%2?0.45:-0.45); P=J({hip:[j*0.5,-24+b],neck:[3+j,-43+b],fF:[9,0],bF:[-8,0],fH:[11+j,-41+b],bH:[7-j,-39+b],ht:0.18+j*0.05}); break; }
    case 'float': { const fl=-3-1.6*Math.sin(p); P=J({hip:[0,-27+fl],neck:[1,-47+fl],fF:[5,-4+fl*0.6],bF:[-4,-2+fl*0.4],fH:[13,-38+fl+sw],bH:[-8,-36+fl-sw],ht:-0.05,fh:'open',bh:'open'}); break; }
    case 'phone': P=J({hip:[0,-25+b*0.5],neck:[2.5,-44.5+b*0.6],fF:[8,0],bF:[-8,0],fH:[8,-46+b*0.6],bH:[6,-36+b*0.5],ht:0.3,ex:'tired'}); break;
    case 'bouncy': { const hop=Math.abs(Math.sin(p))*2.4; P=J({hip:[0,-25-hop],neck:[2,-45-hop],fF:[10,-hop*0.4],bF:[-9,-hop*0.4],fH:[14,-45-hop],bH:[9,-41-hop]}); break; }
    case 'lazy': P=J({hip:[0,-24+b*0.4],neck:[3,-42.5+b*0.6],fF:[8,0],bF:[-8,0],fH:[12,-38+b],bH:[5,-34+b],ht:0.12,ex:'tired'}); break;
    case 'typing': { const k=(f%2)?1:-1; P=J({hip:[0,-25+b*0.4],neck:[3,-44+b*0.5],fF:[8,0],bF:[-8,0],fH:[13,-34+k*0.8],bH:[9,-34-k*0.8],ht:0.22,ex:'grit'}); break; }
    case 'cocky': P=J({hip:[-0.5,-25.5+b*0.5],neck:[-1.5,-45.5+b*0.6],fF:[9,0],bF:[-8,0],fH:[12,-36+b],bH:[-6,-30+b*0.5],ht:-0.12,ex:'smug'}); break;
    default: P=J({hip:[0,-25+b*0.6],neck:[1.5,-45+b*0.7],fF:[10,0],bF:[-9,0],fH:[14+sw*0.6,-44+b*1.1],bH:[9-sw*0.4,-40+b]});
  }
  return P;
}
// walk: 8-frame cycle, feet planted on contact, hips dip on passing
function walk(s,f){
  const g=idle(s,0), p=f/8*TAU;
  const foot=ph=>{ const x=Math.sin(ph)*8.5, lift=Math.max(0,Math.cos(ph))*4.2; return [x,-lift]; };
  const a=foot(p), b=foot(p+Math.PI), dip=Math.abs(Math.sin(p))*1.1;
  return Object.assign({},g,{hip:[1,g.hip[1]+1.2-dip],neck:[g.neck[0]+1.5,g.neck[1]+1.2-dip],fF:[a[0]+2.5,a[1]],bF:[b[0]-1.5,b[1]],
    fH:[g.fH[0]-Math.sin(p)*1.4,g.fH[1]+1.2-dip],bH:[g.bH[0]+Math.sin(p)*1.4,g.bH[1]+1.2-dip],ex:g.ex==='smug'?'smug':g.ex});
}
// attacks: windup W and extension X; frames 0=W 1=X 2=anticipation 3=smear 4=overshoot 5/6=recover
const ATK={
  jab:   [J({hip:[-0.5,-25],neck:[0,-45],fH:[9,-45],bH:[8,-41],ex:'grit'}),
          J({hip:[1.5,-25],neck:[5.5,-44.5],fF:[11,0],fH:[30,-45.5],bH:[8,-41],ex:'yell',smear:'f'})],
  punch: [J({hip:[-1,-25],neck:[-1,-45],fH:[13,-45],bH:[2,-41],ex:'grit'}),
          J({hip:[3,-24.5],neck:[9.5,-43],fF:[12,0],bF:[-10,0],fH:[7,-46],bH:[31,-44.5],bFront:1,ex:'yell',smear:'b'})],
  upper: [J({hip:[0,-20],neck:[3,-38.5],fF:[11,0],bF:[-10,0],fH:[9,-26],bH:[7,-36],ht:0.15,ex:'grit'}),
          J({hip:[2,-27.5],neck:[4.5,-48],fF:[11,0],bF:[-9,-1.5],fH:[12.5,-67],bH:[3,-40],ht:-0.3,ex:'yell',smear:'f'})],
  heavy: [J({hip:[-1,-25],neck:[-3,-45],fF:[11,0],bF:[-10,0],fH:[-5,-62],bH:[-8,-60],ht:-0.2,ex:'grit',fh:'fist'}),
          J({hip:[3,-23],neck:[10,-40],fF:[13,0],bF:[-10,0],fH:[28,-34],bH:[24,-36],bFront:1,ht:0.25,ex:'yell',smear:'f'})],
  kick:  [J({hip:[-1,-26],neck:[-2.5,-46],fF:[7,-15],bF:[-6,0],fH:[10,-44],bH:[2,-40],ex:'grit'}),
          J({hip:[0,-26.5],neck:[-6,-44.5],fF:[34,-29],bF:[-5,0],fH:[6,-46],bH:[-10,-40],ht:-0.12,ex:'yell',smear:'F'})],
  round: [J({hip:[-1,-26],neck:[-4,-45],fF:[10,-24],bF:[-5,0],fH:[8,-46],bH:[-4,-42],ex:'grit'}),
          J({hip:[0,-27.5],neck:[-9,-42],fF:[34,-48],bF:[-4,0],fH:[2,-48],bH:[-14,-44],ht:-0.25,ex:'yell',smear:'F'})],
  lunge: [J({hip:[-1,-22],neck:[2,-41],fF:[8,-8],bF:[-11,0],fH:[11,-40],bH:[2,-37],ex:'grit'}),
          J({hip:[5,-22],neck:[12,-39],fF:[34,-15],bF:[-14,0],fH:[2,-37],bH:[16,-40],bFront:1,ex:'yell',smear:'F'})],
  cpunch:[J({hip:[0,-15],neck:[4,-33],fF:[11,0],bF:[-10,0],fH:[12,-31],bH:[8,-28],ex:'grit'}),
          J({hip:[2,-15],neck:[9,-32],fF:[12,0],bF:[-10,0],fH:[29,-27],bH:[9,-30],ex:'yell',smear:'f'})],
  ckick: [J({hip:[-1,-13],neck:[0,-31],fF:[9,-4],bF:[-10,0],fH:[11,-28],bH:[-3,-12],ex:'grit',bh:'open'}),
          J({hip:[-3,-10],neck:[-3,-28],fF:[36,-1.5],bF:[-11,0],fH:[7,-26],bH:[-11,-2],ht:-0.1,ex:'yell',bh:'open',smear:'F'})],
  jpunch:[J({hip:[0,-31],neck:[2,-51],fF:[7,-20],bF:[-4,-18],fH:[12,-51],bH:[6,-46]}),
          J({hip:[0,-31],neck:[4,-50],fF:[7,-20],bF:[-4,-18],fH:[24,-39],bH:[2,-47],ex:'yell',smear:'f'})],
  jkick: [J({hip:[0,-31],neck:[-1,-51],fF:[8,-21],bF:[-4,-18],fH:[10,-50],bH:[2,-46]}),
          J({hip:[0,-31],neck:[-4,-50],fF:[26,-19],bF:[-5,-20],fH:[6,-50],bH:[-8,-46],ex:'yell',smear:'F'})],
  dive:  [J({hip:[0,-31],neck:[-4,-50],fF:[20,-10],bF:[6,-14],fH:[-8,-54],bH:[-12,-50],ex:'yell'}),
          J({hip:[0,-31],neck:[-6,-50],fF:[21,-8],bF:[6,-15],fH:[-10,-56],bH:[-14,-51],ex:'yell'})],
  throw: [J({hip:[1,-25],neck:[6,-44],fF:[11,0],bF:[-10,0],fH:[22,-38],bH:[20,-42],bFront:1,fh:'open',bh:'open',ex:'grit'}),
          J({hip:[-1,-25],neck:[-7,-44],fF:[12,0],bF:[-9,0],fH:[-16,-60],bH:[-19,-56],ht:-0.35,ex:'yell'})],
  special:[J({hip:[2,-24],neck:[7,-43],fF:[13,0],bF:[-11,0],fH:[28,-41],bH:[26,-37],bFront:1,fh:'open',bh:'open',ex:'yell'}),
          J({hip:[-2,-23],neck:[-3,-43],fF:[12,0],bF:[-11,0],fH:[-6,-31],bH:[-9,-29],fh:'open',bh:'open',ex:'grit'})],
};
ATK.grab=[ATK.throw[0],ATK.throw[0]];
function attack(name,f,s){
  const [Wp,Xp]=ATK[name], G=idle(s,0);
  switch(f){ case 0: return Wp; case 1: return Xp;
    case 2: return mixJ(G,Wp,0.55); case 3: return Object.assign(mixJ(Wp,Xp,0.62),{smear:Xp.smear,smearFrom:Wp,ex:Xp.ex});
    case 4: return Object.assign(mixJ(Wp,Xp,1.08),{ex:Xp.ex}); case 5: return mixJ(Xp,G,0.42); default: return mixJ(Xp,G,0.78); }
}
function winPose(s,f){
  const st=s.win||'fist', p=f/8*TAU, b=(1-Math.cos(p))*0.6;
  switch(st){
    case 'flex': return J({hip:[0,-25+b*0.3],neck:[0,-45+b*0.3],fF:[9,0],bF:[-9,0],fE:[12,-50],fH:[10,-58+b],bH:[-9,-57+b],bE:[-12,-49],ex:'grin'});
    case 'arms': return J({hip:[0,-26-b],neck:[1,-46-b],fF:[8,-b*0.5],bF:[-8,-b*0.5],fH:[12,-68-b*1.5],bH:[-9,-67-b*1.5],fh:'open',bh:'open',ex:'yell',ht:-0.2});
    case 'cross': return J({hip:[-0.5,-25],neck:[-1,-45.5+b*0.2],fF:[8,0],bF:[-8,0],fH:[3,-37],bH:[6,-38],ex:'smug',ht:-0.1});
    case 'point': return J({hip:[0,-25],neck:[2,-45+b*0.3],fF:[9,0],bF:[-9,0],fH:[22,-46-b*0.6],bH:[-4,-29],fh:'point',ex:'grin',ht:-0.05});
    case 'laugh': return J({hip:[0,-25+b*0.6],neck:[-2+b,-44.5+b],fF:[9,0],bF:[-9,0],fH:[3,-30],bH:[-3,-30],fh:'open',bh:'open',ex:'grin',ht:-0.35+b*0.12});
    case 'bow':  return J({hip:[-1,-25],neck:[6,-42+b*0.3],fF:[8,0],bF:[-8,0],fH:[7,-33],bH:[5,-32],ht:0.45,ex:'n'});
    case 'sit':  return J({hip:[-2,-8],neck:[0,-28+b*0.2],fF:[12,-1],bF:[8,0],fH:[10,-12],bH:[6,-11],ex:'tired',ht:0.05,sit:1});
    case 'float': { const fl=-4-2*Math.sin(p); return J({hip:[0,-28+fl],neck:[0,-48+fl],fF:[4,-5+fl*0.6],bF:[-5,-3+fl*0.4],fH:[13,-60+fl],bH:[-11,-58+fl],fh:'open',bh:'open',ex:'grin'}); }
    case 'phone': return J({hip:[0,-25],neck:[2.5,-44.5],fF:[8,0],bF:[-8,0],fH:[10,-50],bH:[5,-36],ht:0.32,ex:'tired'});
    default: return J({hip:[0,-25-b*0.4],neck:[1,-45-b*0.5],fF:[9,0],bF:[-9,0],fH:[5,-66-b*1.2],bH:[4,-38],ex:'yell',ht:-0.15});
  }
}
function pose(name,f,s){
  switch(name){
    case 'idle': return idle(s,f%8);
    case 'walk': return walk(s,f%8);
    case 'crouch': return J({hip:[0,-15],neck:[4,-33],fF:[11,0],bF:[-10,0],fH:[14,-34],bH:[9,-30]});
    case 'jump': { // 0 rising, 1 apex tuck, 2 falling
      if(f===1) return J({hip:[0,-33],neck:[2,-52],fF:[7,-22],bF:[-3,-20],fH:[13,-49],bH:[7,-45]});
      if(f===2) return J({hip:[0,-31],neck:[1.5,-51],fF:[6,-10],bF:[-5,-8],fH:[13,-52],bH:[-6,-50],fh:'open',bh:'open'});
      return J({hip:[0,-31],neck:[2,-51],fF:[6,-14],bF:[-6,-6],fH:[12,-55],bH:[6,-50],ht:-0.1}); }
    case 'block': return J({hip:[-1.5,-24],neck:[-1,-44],fF:[9,0],bF:[-11,0],fH:[11,-50],bH:[10,-43],bFront:1,ht:0.12,ex:'grit'});
    case 'cblock': return J({hip:[-1.5,-14],neck:[2,-31.5],fF:[10,0],bF:[-11,0],fH:[11,-37],bH:[11,-30],bFront:1,ht:0.12,ex:'grit'});
    case 'hit': return f%2===0
      ? J({hip:[-3,-24.5],neck:[-10,-42.5],fF:[8,0],bF:[-11,0],fH:[2,-52],bH:[-16,-44],fh:'open',bh:'open',ht:-0.45,ex:'ouch'})
      : J({hip:[-2,-24.5],neck:[-6.5,-43.5],fF:[9,0],bF:[-10,0],fH:[5,-47],bH:[-11,-41],ht:-0.25,ex:'ouch'});
    case 'fall': return f%2===0
      ? J({hip:[0,-32],neck:[-14,-41],head:[-22,-44],fF:[12,-42],bF:[8,-34],fH:[-10,-56],bH:[-24,-36],fh:'open',bh:'open',ex:'ouch'})
      : J({hip:[0,-30],neck:[-17,-30],head:[-26,-29],fF:[14,-38],bF:[12,-28],fH:[-16,-44],bH:[-26,-22],fh:'open',bh:'open',ex:'ouch'});
    case 'kd': return f%2===0
      ? J({hip:[-1,-6],neck:[-21,-7],head:[-29.5,-7.5],fF:[14,-7],bF:[12,-2],fH:[-14,-12],bH:[-30,-2],fh:'open',bh:'open',ht:-1.4,ex:'ko'})
      : J({hip:[-1,-4.5],neck:[-21,-4.5],head:[-29.5,-5],fF:[14,-1],bF:[12,0],fH:[-10,-2],bH:[-31,-1],fh:'open',bh:'open',ht:-1.55,ex:'ko'});
    case 'getup': return [J({hip:[-4,-6],neck:[-6,-25],fF:[9,0],bF:[4,-1],fH:[-12,-1],bH:[-14,-2],fh:'open',bh:'open',ex:'grit',ht:0.2}),
                          J({hip:[-2,-13],neck:[1,-31],fF:[10,0],bF:[-9,0],fH:[3,-14],bH:[-6,-2],bh:'open',ex:'grit',ht:0.15}),
                          J({hip:[0,-19],neck:[3,-38],fF:[11,0],bF:[-10,0],fH:[12,-38],bH:[8,-34]})][Math.min(2,f)];
    case 'dash': return f%2===0
      ? J({hip:[2,-22],neck:[11,-39],fF:[13,-2],bF:[-14,-3],fH:[2,-30],bH:[-6,-28],ex:'grit',ht:0.15})
      : J({hip:[2,-23],neck:[10,-40],fF:[9,0],bF:[-12,-4],fH:[4,-31],bH:[-5,-29],ex:'grit',ht:0.12});
    case 'charge': { const j=[0,0.5,0,-0.5][f%4]; return J({hip:[j,-21.5],neck:[j,-41],fF:[11,0],bF:[-11,0],fH:[10+j,-26],bH:[-9+j,-26],ex:'grit',ht:0.05+j*0.04}); }
    case 'dizzy': { const sw=Math.sin(f/8*TAU)*2.2; return J({hip:[sw*0.5,-23.5],neck:[sw*1.8,-42.5],fF:[8,0],bF:[-8,0],fH:[8+sw,-25],bH:[-5+sw,-25],fh:'open',bh:'open',ht:sw*0.08,ex:'dizzy'}); }
    case 'win': return winPose(s,f%8);
    case 'grab': return ATK.throw[0];
    case 'ball': return null;
    case 'intro': return winPose(s,f%8);
    default:
      if(ATK[name]) return attack(name,f,s);
      return idle(s,0);
  }
}
const FRAMES={idle:8,walk:8,win:8,dizzy:8,intro:8,charge:4,ball:4,jump:3,getup:3,hit:2,fall:2,kd:2,dash:2};
function nFrames(name){ return FRAMES[name]||(ATK[name]?7:1); }

// ---------- rig ----------
function rig(P,s,B){
  const R=Object.assign({},P);
  R.head=P.head||add(P.neck,rot([1,-9.2*B.head],P.ht||0));
  const u=nrm(sub(P.neck,P.hip)), n=[-u[1],u[0]]; // n = body "front" (perp toward face direction when upright)
  const nf = n[0]>=0||P.head? n : mul(n,-1);
  R.u=u; R.n=nf;
  R.fS=add(add(P.neck,mul(u,-2.8)),mul(nf,B.sw*0.42));
  R.bS=add(add(P.neck,mul(u,-2.8)),mul(nf,-B.sw*0.5));
  R.fHip=add(P.hip,mul(nf,1.6)); R.bHip=add(P.hip,mul(nf,-1.8));
  const knee=(Hp,F)=>{ const k1=ik(Hp,F,B.th,B.sh,-1), k2=ik(Hp,F,B.th,B.sh,1); return (k1[1]>k2[1]+1.5 && F[0]<Hp[0]-3) ? k2 : k1; };
  R.fK=P.fK||knee(R.fHip,P.fF);
  R.bK=P.bK||knee(R.bHip,P.bF);
  R.fE=P.fE||ik(R.fS,P.fH,B.ua,B.fa,1);
  R.bE=P.bE||ik(R.bS,P.bH,B.ua,B.fa,1);
  return R;
}

// ---------- body parts ----------
function fist(h,r,col,shape,dir){
  const [x,y]=h;
  if(shape==='open'){ cel(E(x+0.4,y,r*0.95,r*1.15,0.3),col,{d:0.8}); fillP(E(x-r*0.55,y-r*0.6,r*0.42,r*0.6,-0.5),shade(col,1.08)); strokeP(Pl([[x+r*0.2,y-r*0.6],[x+r*0.6,y+r*0.1]]),shade(col,0.6),0.35); return; }
  if(shape==='point'){ cel(E(x,y,r*0.9,r*0.9),col,{d:0.8}); cel(()=>{ C.roundRect(X(x+r*0.4),Y(y-r*0.95),r*1.9,r*0.75,r*0.35); },col,{d:0.4}); return; }
  cel(()=>{ C.roundRect(X(x-r),Y(y-r*0.95),r*2,r*1.9,r*0.75); },col,{d:0.9});
  for(let i=0;i<3;i++) strokeP(Pl([[x+r*0.25,y-r*0.55+i*r*0.55],[x+r*0.95,y-r*0.55+i*r*0.55]]),shade(col,0.62),0.32);
  fillP(()=>{ C.roundRect(X(x-r*0.7),Y(y-r*0.85),r*0.9,r*0.35,0.2); },shade(col,1.35));
}
function shoe(F,K,col,back,s){
  const [x,y]=F, a=Math.atan2(F[1]-K[1],F[0]-K[0])-Math.PI/2; // tilt with shin
  const t=Math.max(-0.6,Math.min(0.6,a*0.6)), c=back?shade(col,0.82):col;
  C.save(); C.translate(X(x),Y(y)); C.rotate(-t); C.translate(-X(x),-Y(y));
  if(s.kind==='paw'){ cel(E(x+1.5,y-1.6,4.4,2.4),c,{d:0.6}); C.restore(); return; }
  cel(Pg([[x-3.2,y+0.8],[x-3.6,y-3.2],[x-1,y-4.6],[x+2.2,y-3.6],[x+5.6,y-1.6],[x+6.3,y+0.8]]),c,{d:0.7});
  fillP(Pg([[x-3.6,y-0.2],[x+6.3,y-0.2],[x+6.3,y+1.1],[x-3.6,y+1.1]]),back?'#c9c2b6':'#f4f0e8');
  strokeP(Pl([[x-3.6,y-0.2],[x+6.3,y-0.2]]),INK,0.4);
  if(!back){ strokeP(Pl([[x-0.6,y-4.1],[x+1.4,y-2.4]]),shade(c,1.5),0.45); strokeP(Pl([[x+0.6,y-4.3],[x+2.6,y-2.6]]),shade(c,1.5),0.45); }
  C.restore();
}
function torsoPath(R,B,s){
  const N=R.neck, Hp=R.hip, u=R.u, n=R.n, sw=B.sw, ww=B.ww;
  const ns=add(N,mul(u,-0.6));
  const fsh=add(add(ns,mul(n,sw*0.92)),mul(u,-1.6)), bsh=add(add(ns,mul(n,-sw)),mul(u,-1.6));
  const fw=add(Hp,mul(n,ww)), bw=add(Hp,mul(n,-ww));
  const chest=add(lerp(fsh,fw,0.4),mul(n,B.kind==='huge'?3.5:1.4)), back=add(lerp(bsh,bw,0.45),mul(n,-0.9));
  const belly=B.kind==='huge'||B.kind==='big'?add(lerp(fsh,fw,0.78),mul(n,B.kind==='huge'?3.4:1.2)):lerp(chest,fw,0.6);
  return ()=>{ C.moveTo(X(N[0]),Y(N[1]-0.4));
    C.quadraticCurveTo(X(fsh[0]+n[0]*0.6),Y(fsh[1]-1.2),X(fsh[0]),Y(fsh[1]));
    C.quadraticCurveTo(X(chest[0]),Y(chest[1]),X(belly[0]),Y(belly[1]));
    C.lineTo(X(fw[0]),Y(fw[1])); C.lineTo(X(bw[0]),Y(bw[1]));
    C.quadraticCurveTo(X(back[0]),Y(back[1]),X(bsh[0]),Y(bsh[1]));
    C.quadraticCurveTo(X(bsh[0]-n[0]*0.4),Y(bsh[1]-1.4),X(N[0]),Y(N[1]-0.4)); C.closePath(); };
}

// ---------- heads ----------
// all heads drawn in a local frame: (0,0) = head centre, +x = facing, light from front-top
function eyes(ex,sty,ax,ay,s,k){ // near eye at (ax,ay), far eye offset +3.4
  k=k||1; const far=[ax+3.3*k,ay];
  const white='#fbf6ee', iris=s.iris||'#1a0b02';
  const brow=(x,y,w,ang,col)=>strokeP(Pl([[x-w/2,y-ang],[x+w/2,y+ang]]),col||INK,0.75*k);
  if(ex==='ko'){ for(const [x,y,w] of [[ax,ay,1.3],[far[0],far[1],0.9]]){ strokeP(Pl([[x-w,y-w],[x+w,y+w]]),INK,0.55); strokeP(Pl([[x-w,y+w],[x+w,y-w]]),INK,0.55);} return; }
  if(ex==='dizzy'){ for(const [x,y,r] of [[ax,ay,1.4],[far[0],far[1],1]]){ C.beginPath(); for(let i=0;i<14;i++){ const a=i*0.8, rr=r*i/14; C.lineTo(X(x+Math.cos(a)*rr),Y(y+Math.sin(a)*rr)); } C.strokeStyle=INK; C.lineWidth=0.4; C.stroke(); } return; }
  if(sty==='shades'){ cel(()=>{ C.roundRect(X(ax-2.2),Y(ay-1.5),7.4*k,2.8,0.9); },'#121212',{d:0,h:0,lw:0.6}); fillP(Pg([[ax-1.4,ay-1],[ax+0.4,ay-1],[ax-0.4,ay+0.6],[ax-1.8,ay+0.6]]),'#5ad1ff'); fillP(Pg([[far[0]-0.8,ay-1],[far[0]+0.4,ay-1],[far[0]-0.2,ay+0.4]]),'#9be8ff');
    if(ex==='ouch'||ex==='yell') brow(ax+1,ay-2.6,4,0.6); return; }
  const shut=ex==='ouch';
  if(shut){ for(const [x,y,w] of [[ax,ay,1.4],[far[0],far[1],1]]){ strokeP(Pl([[x-w,y-w*0.8],[x+w*0.6,y],[x-w,y+w*0.8]]),INK,0.55);} brow(ax,ay-2.3,3,0.7); return; }
  const big=sty==='shock'||ex==='yell'&&sty!=='tired';
  const ry=sty==='tired'||sty==='smug'||ex==='tired'||ex==='smug'?0.8:big?1.75:1.45, rx=big?1.35:1.15;
  for(const [x,y,sx] of [[ax,ay,1],[far[0],far[1],0.7]]){
    fillP(E(x,y,rx*sx+0.35,ry+0.35),INK); fillP(E(x,y,rx*sx,ry),white);
    const pr=Math.min(ry,0.95)*(sty==='shock'?0.7:1); fillP(E(x+0.35*sx,y+0.1,pr*0.85*sx,pr),iris); fillP(E(x+0.1,y-0.35,0.32,0.32),'#ffffff');
    if(ry<1) fillP(Pg([[x-rx*sx-0.4,y-ry-0.6],[x+rx*sx+0.4,y-ry-0.6],[x+rx*sx+0.4,y-ry*0.1],[x-rx*sx-0.4,y-ry*0.1]]),s.skin);
  }
  const ang = sty==='angry'||ex==='grit'||ex==='yell' ? 0.85 : sty==='shock' ? -0.7 : ex==='smug'||sty==='smug' ? -0.2 : 0;
  brow(ax+0.2,ay-ry-1.1,3.2,ang,s.hairC&&s.head==='human'?shade(s.hairC,0.7):INK); brow(far[0]+0.2,ay-ry-1.1,2.2,ang*0.8,s.hairC&&s.head==='human'?shade(s.hairC,0.7):INK);
  if(sty==='tired'||ex==='tired') strokeP(Pl([[ax-1.2,ay+1.6],[ax+1.2,ay+1.6]]),'#8a5a8a',0.45);
}
function mouth(ex,x,y,s,w){
  w=w||1;
  switch(ex){
    case 'yell': cel(Bl([[x-1.6*w,y-1.2],[x+1.8*w,y-1.4],[x+1.6*w,y+1.8],[x-1.2*w,y+1.6]]),'#5a0f12',{d:0,h:0,lw:0.6}); fillP(Pg([[x-1.3*w,y-1],[x+1.5*w,y-1.2],[x+1.4*w,y-0.4],[x-1.2*w,y-0.3]]),'#fff'); fillP(E(x+0.1,y+1,0.9*w,0.5),'#e0566a'); break;
    case 'ouch': cel(E(x,y+0.3,1*w,1.4),'#5a0f12',{d:0,h:0,lw:0.6}); break;
    case 'grit': fillP(()=>{ C.roundRect(X(x-1.6*w),Y(y-0.7),3.4*w,1.5,0.4); },INK); fillP(()=>{ C.roundRect(X(x-1.35*w),Y(y-0.45),2.9*w,1.0,0.3); },'#fff'); strokeP(Pl([[x-1.3*w,y+0.05],[x+1.5*w,y+0.05]]),'#9a8a80',0.25); break;
    case 'grin': cel(()=>{ C.moveTo(X(x-1.8*w),Y(y-0.7)); C.quadraticCurveTo(X(x),Y(y+2.6),X(x+2*w),Y(y-1)); C.closePath(); },'#fff',{d:0,h:0,lw:0.6}); break;
    case 'smug': strokeP(()=>{ C.moveTo(X(x-1.4*w),Y(y+0.2)); C.quadraticCurveTo(X(x+0.6),Y(y+0.6),X(x+1.8*w),Y(y-0.8)); },INK,0.55); break;
    case 'ko': cel(E(x,y+0.3,1*w,0.7),'#5a0f12',{d:0,h:0,lw:0.5}); break;
    case 'tired': case 'dizzy': strokeP(()=>{ C.moveTo(X(x-1.2*w),Y(y+0.2)); C.quadraticCurveTo(X(x),Y(y-0.5),X(x+1.4*w),Y(y+0.3)); },INK,0.5); break;
    default: strokeP(()=>{ C.moveTo(X(x-1.2*w),Y(y)); C.quadraticCurveTo(X(x+0.2),Y(y+0.5),X(x+1.4*w),Y(y-0.2)); },INK,0.5);
  }
}
function humanHead(s,ex,f){
  const k=s.skin, hc=s.hairC||'#2b1405';
  // hair behind head
  if(s.hair==='long') cel(Bl([[-7,-5],[-3,-8],[1,-7],[-1,3],[-3,11],[-8,12],[-9.5,4]]),hc,{d:1});
  if(s.hair==='hood') cel(Bl([[-8.5,-6],[-3,-10.5],[4,-9.5],[8.2,-4],[7,6],[-2,9],[-9,6]]),hc,{d:1.4});
  if(s.hair==='anime') { const sw=[0,0.6,1,0.6][f%4]; cel(Pg([[-6,-6],[-12.5-sw,-9],[-8,-3],[-13.5-sw,-2],[-7.5,1],[-11-sw,5],[-5,3]]),hc,{d:1}); }
  // skull + face
  const face=()=>{ C.moveTo(X(-5.6),Y(3.6)); C.arc(X(-0.4),Y(-1.2),6.3,(125/180)*Math.PI,(338/180)*Math.PI,false);
    C.lineTo(X(6.3),Y(-1.4)); C.quadraticCurveTo(X(6.6),Y(0.2),X(7.7),Y(1.1)); C.lineTo(X(6.4),Y(2.3));
    C.quadraticCurveTo(X(6.7),Y(3.4),X(6.2),Y(4.4)); C.quadraticCurveTo(X(5.7),Y(6.6),X(3),Y(7.1)); C.quadraticCurveTo(X(-1.5),Y(7.2),X(-4.2),Y(5.6)); C.closePath(); };
  cel(face,k,{d:1.5,h:0.5});
  // ear
  cel(E(-1.6,0.6,1.5,2.1),k,{d:0.5,h:0,lw:0.7}); strokeP(()=>{ C.arc(X(-1.6),Y(0.6),0.8,-1.2,1.6); },shade(k,0.62),0.35);
  // cheek + jaw shading
  fillP(E(4.6,3.1,1.3,0.75),'rgba(255,90,90,0.28)');
  eyes(ex,s.eyes||'normal',2.6,-1.6,s);
  if(s.acc!=='gasmask') mouth(ex==='n'?(s.eyes==='smug'?'smug':s.eyes==='shock'?'ouch':s.eyes==='tired'?'tired':'n'):ex,4.6,4.0,s,0.85);
  // hair front
  const hl=shade(hc,1.45);
  switch(s.hair){
    case 'short': cel(Bl([[-7,-2],[-6.8,-7],[-2,-9.4],[3.4,-8.6],[6.2,-5.6],[3,-5.8],[-0.5,-5.2],[-3.5,-3]]),hc,{d:1}); strokeP(Pl([[-3,-8],[1,-8.3]]),hl,0.5); break;
    case 'messy': cel(Bl([[-7.4,-1],[-8.2,-6],[-5,-10],[-1,-11],[2,-9.8],[5,-10.6],[6.8,-6],[4,-5.4],[1.6,-6.6],[-1,-4.4],[-4,-4.6],[-5,-1.6]]),hc,{d:1}); strokeP(Pl([[-4,-9],[-1,-9.6]]),hl,0.5); break;
    case 'spiky': cel(Pg([[-7.4,-1],[-10,-6],[-7,-7],[-9,-12],[-4.4,-9.4],[-3,-14.4],[0,-10],[3,-14],[3.6,-9.4],[7.6,-11.4],[6.2,-6.6],[8.8,-5],[4.8,-4.4],[1,-5.6],[-2.6,-4],[-5,-2]]),hc,{d:1.2}); strokeP(Pl([[-3,-11],[-1.4,-8]]),hl,0.5); strokeP(Pl([[2.4,-12],[2.6,-9]]),hl,0.5); break;
    case 'long': cel(Bl([[-8,2],[-7.8,-6.4],[-3,-9.6],[3,-9],[6.6,-5.6],[3.6,-6.2],[0,-5],[-4,-3.6],[-5.4,1]]),hc,{d:1}); strokeP(Pl([[-4,-8.2],[0,-8.6]]),hl,0.5); break;
    case 'strawhat': cel(E(0,-6.2,11.6,2.6),hc,{d:0.9}); cel(Bl([[-6,-6.6],[-5.4,-11],[0,-12.6],[5.4,-11],[6,-6.6]]),hc,{d:1}); fillP(()=>{ C.rect(X(-5.9),Y(-8.4),11.8,1.6); },'#c0262d'); strokeP(Pl([[-8,-5.8],[8,-5.8]]),shade(hc,0.7),0.35); break;
    case 'slick': cel(Bl([[-7,-0.4],[-7.2,-6.4],[-3,-9.6],[3,-9.6],[7,-7],[6.2,-5.6],[2,-6.6],[-2,-5.6],[-4.6,-3]]),hc,{d:1}); strokeP(()=>{ C.moveTo(X(-5),Y(-6.6)); C.quadraticCurveTo(X(0),Y(-9.8),X(5),Y(-7.6)); },hl,0.55); break;
    case 'cap': cel(Bl([[-7,-3],[-6.8,-8.4],[-1,-11],[5,-9.4],[6.8,-5.2],[-2,-5.2]]),hc,{d:1}); cel(Pg([[3,-6],[11.8,-5.4],[11.4,-3.8],[3,-4]]),shade(hc,0.85),{d:0.4,h:0}); fillP(E(-0.4,-8.6,1,0.7),shade(hc,1.4)); break;
    case 'mohawk': cel(Pg([[-6,-5],[-7,-10],[-4,-11],[-4.4,-15.4],[-1,-12.6],[0.4,-16.6],[2.4,-12.4],[5.4,-14],[4.6,-9],[6.2,-7],[3,-6]]),hc,{d:1.1}); fillP(E(-5,-5,1.6,0.6),shade(k,0.86)); break;
    case 'anime': cel(Pg([[-7.4,-1],[-9.4,-7],[-6.4,-7.6],[-8.4,-13.4],[-3.4,-10.4],[-1.4,-16],[1.6,-11],[5.6,-15],[5,-9.4],[9.6,-9],[6.6,-5.6],[8.6,-2],[4.4,-4],[2.4,-2],[1,-5],[-2.4,-3.4],[-4,-0.6]]),hc,{d:1.3,h:0.8}); strokeP(Pl([[-2,-13],[-0.8,-9.4]]),hl,0.55); strokeP(Pl([[4.6,-12.6],[3.8,-9]]),hl,0.55); break;
    case 'hood': cel(Bl([[-8.8,4],[-8.6,-6],[-3,-10.6],[4,-10],[7.8,-5],[7,-2],[4.6,-6.4],[-1,-7],[-5,-3],[-5.6,4]]),hc,{d:1.2}); fillP(E(-0.8,-3.4,1.2,2.8),shade(hc,0.6)); break;
    case 'bald': fillP(E(-1.6,-6.2,2.2,0.9,-0.3),'rgba(255,255,255,0.42)'); fillP(E(-5.6,-1.2,1.1,2,0),'#6b4a2b'); break;
  }
}
// animal / special heads
function snout(x,y,w,h,col,nose){ cel(Bl([[x-w*0.6,y-h*0.6],[x+w*0.5,y-h*0.7],[x+w,y-h*0.1],[x+w*0.8,y+h*0.6],[x-w*0.4,y+h*0.7],[x-w*0.9,y]]),col,{d:0.9}); if(nose) cel(E(x+w*0.82,y-h*0.38,1.2,0.95),nose,{d:0,h:0.3,lw:0.6}); }
function drawHead(s,ex,f){
  const k=s.skin;
  switch(s.head){
    case 'bag': {
      cel(Pg([[-7,7],[-7.6,-6],[-6,-9.4],[-4,-7.6],[-2,-10.4],[0.4,-8],[2.6,-10.8],[4.6,-8],[7,-9.6],[7.6,7]]),'#c9a66b',{d:1.6});
      strokeP(Pl([[-6.6,4.4],[7.2,4.4]]),'#9a7a40',0.5); strokeP(Pl([[-3,-4],[-1,6]]),'#b08a50',0.35); strokeP(Pl([[4,-6],[5,2]]),'#b08a50',0.35);
      const sh=ex==='ouch'||ex==='ko'; for(const x of [1.4,5]){ if(sh) strokeP(Pl([[x-0.9,-3],[x+0.9,-1.2]]),INK,0.55); else fillP(E(x,-2,0.85,1.3),INK); }
      if(ex==='yell'||ex==='ouch') fillP(E(3.4,2.4,1.4,1.2),INK); else strokeP(()=>{ C.moveTo(X(1.6),Y(2.8)); C.quadraticCurveTo(X(3.4),Y(1.8),X(5.2),Y(2.8)); },INK,0.55);
      fillP(E(6.6,-0.4,0.6,0.9),'#7fdcff'); // nervous sweat
      break; }
    case 'helmet': {
      cel(E(0,-0.6,8,8.4),'#f4f4f4',{d:1.8}); cel(Bl([[-0.4,-5.4],[6,-6],[8,-1],[6.8,4.4],[0.4,4.6],[-1.6,-0.6]]),'#ff6a00',{d:1.2,h:0.9});
      fillP(Pg([[1,-4.4],[4.4,-4.8],[2.6,-2.2],[0.6,-1.6]]),'rgba(255,240,200,0.75)');
      // face visible through visor
      fillP(E(4.4,0.4,0.7,0.9),'rgba(30,10,0,0.75)'); if(ex==='yell') fillP(E(4.6,2.8,0.9,0.7),'rgba(60,10,0,0.7)');
      cel(()=>{ C.roundRect(X(-8),Y(5.8),16,2.6,1); },'#bdbdbd',{d:0.4,h:0}); cel(E(-6.6,-2,1.6,2.4),'#d6d6d6',{d:0.5});
      strokeP(Pl([[-6.6,-9],[-7.6,-12.4]]),'#9a9a9a',0.5); fillP(E(-7.6,-12.6,0.8,0.8),'#ff2e2e'); break; }
    case 'mask': {
      cel(Bl([[-6.6,6],[-7.2,-4],[-4,-8.6],[2,-8.8],[6.4,-5.4],[7,0],[6.4,5.4],[2,7.4],[-4,7.4]]),'#1d1d1d',{d:1.2,h:0.4,hi:2.1});
      cel(()=>{ C.roundRect(X(-0.6),Y(-3.6),8,3.6,1.4); },k,{d:0.6,h:0,lw:0.7}); eyes(ex,'angry',2,-1.8,Object.assign({},s,{skin:k}),0.9);
      fillP(E(4.2,3.8,1.6,1),'#2a2a2a'); strokeP(Pl([[-4,-7],[-1,-8.6]]),'#444',0.5); fillP(E(-1,-9.4,1.6,1.1),'#1d1d1d'); break; }
    case 'bear': {
      cel(E(-4.4,-7.6,2.6,2.6),k,{d:0.6}); fillP(E(-4.4,-7.6,1.2,1.2),'#c98d63');
      cel(E(2.6,-8.4,2.4,2.4),k,{d:0.6}); fillP(E(2.6,-8.4,1.1,1.1),'#c98d63');
      cel(Bl([[-7.2,4],[-7.4,-3],[-4,-7.6],[2,-7.8],[6,-4.6],[6.6,1],[5,6.4],[-1,8.2],[-6,7]]),k,{d:1.6});
      const roar=ex==='yell'||ex==='ouch';
      snout(4.8,1.6,5.2,4.4,'#c98d63','#1a1008'); if(roar){ cel(Pg([[3,3.4],[9.4,2.6],[8.2,6.4],[3.6,6]]),'#5a0f12',{d:0,h:0,lw:0.5}); fillP(Pg([[4,3.4],[5,5],[6,3.2]]),'#fff'); fillP(Pg([[7,3],[8,4.6],[8.6,2.9]]),'#fff'); }
      else strokeP(Pl([[4.6,3.6],[7,3.8]]),INK,0.45);
      eyes(ex,'angry',1.6,-2.8,s,0.8); break; }
    case 'bull': {
      cel(Pg([[-3,-6],[-9.6,-7.4],[-11.6,-12],[-9.6,-11.6],[-7.6,-9.4],[-2,-8.6]]),'#f4ecd8',{d:0.8});
      cel(Pg([[2,-6.6],[8.6,-7.6],[10.6,-12.4],[11.4,-8],[8.4,-5],[3,-4.6]]),'#f4ecd8',{d:0.8});
      cel(Bl([[-6.6,4],[-7,-3],[-4,-7.4],[2.4,-7.6],[6,-3.6],[6.4,2],[3,7.4],[-4,7]]),k,{d:1.6});
      cel(Bl([[1.6,-1],[7.4,-1.6],[10.2,1.4],[9.4,5.6],[4,6.6],[1.4,3.6]]),'#8a5a3a',{d:0.9});
      fillP(E(8.2,1.4,0.6,0.9),INK); fillP(E(5.8,1.8,0.6,0.9),INK);
      cel(E(6.2,5.6,1.5,1.4),'#ffcc00',{d:0.3,h:0,lw:0.6}); fillP(E(6.2,5.6,0.7,0.6),'#8a5a3a');
      eyes(ex,'angry',1,-3,Object.assign({},s,{iris:'#c01010'}),0.75);
      if(ex==='yell'||ex==='grit'){ fillP(E(10.6,-0.4,1.6,0.6),'rgba(255,255,255,0.75)'); fillP(E(12.6,0.6,1,0.5),'rgba(255,255,255,0.55)'); } break; }
    case 'whale': {
      cel(Bl([[-9.6,5],[-10,-4],[-5,-8.6],[4,-8.4],[9.4,-3],[10.6,3],[7,7.4],[-4,7.8]]),k,{d:2});
      cel(Bl([[-2,3.4],[6,2.4],[10.4,3.2],[8,7.2],[-1,7.6]]),'#dfe8f5',{d:0.7});
      for(let i=0;i<4;i++) strokeP(Pl([[0+i*2.4,4.2],[0.4+i*2.4,7]]),'#b9c4d4',0.35);
      strokeP(()=>{ C.moveTo(X(1),Y(3.2)); C.quadraticCurveTo(X(6),Y(ex==='yell'?5.6:3.8),X(10.2),Y(3)); },INK,0.6);
      eyes(ex,'normal',4.4,-2.4,s,0.6);
      const sp=f%4; for(const [x,y,r] of [[-2.6,-11-sp*0.4,1.4],[-4.6,-13-sp*0.5,1],[-0.6,-13.4-sp*0.5,1],[-2.6,-15-sp*0.7,0.8]]) cel(E(x,y,r,r),'#9fd3ff',{d:0.3,h:0.3,lw:0.5});
      break; }
    case 'goblin': {
      cel(Pg([[-4,-3.4],[-14,-7.4],[-12.4,-3.4],[-15,-2],[-5.4,1]]),k,{d:0.9}); fillP(Pg([[-6,-2.4],[-12,-5.4],[-11.2,-3],[-6,-0.6]]),shade(k,0.75));
      cel(Bl([[-6.4,5],[-6.8,-3],[-3,-7.6],[3,-7.4],[6.2,-3.6],[6.4,2],[3.6,6.6],[-3,7.2]]),k,{d:1.5});
      cel(Bl([[3,-1.4],[7.6,-0.6],[10.6,2.6],[8,3.6],[4.4,2.6]]),shade(k,0.92),{d:0.6});
      eyes(ex,'angry',1.6,-2.4,Object.assign({},s,{iris:'#d4b000'}),0.85);
      cel(()=>{ C.moveTo(X(-0.4),Y(4.4)); C.quadraticCurveTo(X(3),Y(ex==='yell'?8.4:6.6),X(6.4),Y(4.4)); C.closePath(); },'#3a1206',{d:0,h:0,lw:0.5});
      fillP(Pg([[1,4.6],[1.8,6.2],[2.6,4.8]]),'#fff6c8'); fillP(Pg([[4.2,4.8],[5,6.2],[5.6,4.6]]),'#fff6c8');
      cel(Bl([[-7,-4.6],[-5,-8.6],[0,-9.4],[4.6,-8],[6,-6],[-1,-5.6]]),'#4a2c12',{d:0.8}); break; }
    case 'brain': {
      const g=f%2?'#e7c8ff':'#dab4ff';
      cel(Bl([[-4,7],[-5,2],[-1,1],[5,1.4],[6.6,4],[5,8.4],[0,9]]),'#f0c6a0',{d:1});
      eyes(ex,'normal',2.6,4.4,{skin:'#f0c6a0'},0.7); mouth(ex,3.6,7.4,{},0.6);
      cel(Bl([[-9.4,1.4],[-10.4,-5],[-7,-10.6],[-1,-12.6],[5,-11.4],[9.6,-6.6],[9.6,-0.4],[5,2.4],[-3,2.6]]),g,{d:1.8,h:0.9});
      for(const pts of [[[-7,-7],[-4,-9],[-2,-6]],[[-1,-10.6],[0,-7],[3,-8]],[[4,-9.6],[6,-6],[8,-5.4]],[[-8,-2],[-5,-4],[-3,-1.4]],[[-1,-4],[1.6,-3.4],[3,-0.6]],[[5,-3],[7,-1.6]]])
        strokeP(()=>{ C.moveTo(X(pts[0][0]),Y(pts[0][1])); for(let i=1;i<pts.length;i++) C.lineTo(X(pts[i][0]),Y(pts[i][1])); },'#9b5fd6',0.55);
      strokeP(Pl([[0,-12],[0.4,1.6]]),'#9b5fd6',0.45);
      for(let i=0;i<3;i++){ const a=f/8*TAU+i*2.1; fillP(E(Math.cos(a)*12,-5+Math.sin(a)*3.6,0.7,0.7),i%2?'#7fdcff':'#fff'); }
      break; }
    case 'npc': {
      cel(Bl([[-6.6,6],[-7,-4],[-4.4,-8],[3,-8],[6.4,-4.4],[6.6,2],[5,6.6],[-2,7.6]]),k,{d:1.4,h:0.3});
      cel(Bl([[-7,-2],[-6.8,-7.6],[-2,-9.4],[4,-8.6],[6.6,-5],[2,-6],[-3,-5.4]]),'#9a9a9a',{d:0.6});
      fillP(E(2,-1.6,0.75,0.75),'#333'); fillP(E(5.2,-1.6,0.6,0.6),'#333');
      if(ex==='yell'||ex==='ouch') fillP(E(4,3,1,0.8),'#333'); else strokeP(Pl([[2.4,3.4],[6,3.4]]),'#333',0.5);
      break; }
    case 'glitch': {
      const cols=['#00ffd0','#ff00aa','#2200ff','#ffffff','#ffe600'];
      cel(()=>{ C.roundRect(X(-7.4),Y(-8.4),14.6,15.6,2.6); },'#141414',{d:0.8,h:0.6,hi:3});
      for(let i=0;i<10;i++){ const r=((i*37+f*13)%97)/97, r2=((i*53+f*29)%89)/89; fillP(()=>{ C.rect(X(-9+r*16),Y(-10+r2*17),1.6+((i+f)%3),1.2); },cols[(i+f)%5]); }
      const blink=f%8===5;
      if(!blink){ fillP(()=>{ C.rect(X(0.6),Y(-3.4),2.4,1.8); },'#00ffd0'); fillP(()=>{ C.rect(X(4),Y(-3.4),2,1.8); },'#00ffd0'); }
      fillP(()=>{ C.rect(X(0.6+(f%3)*0.6),Y(2.2),5.4,0.9); },'#ff00aa');
      fillP(()=>{ C.rect(X(-7.4+((f*3)%6)),Y(-6+((f*5)%12)),14.6,0.7); },'rgba(255,255,255,0.4)');
      break; }
    case 'shiba': {
      cel(Pg([[-6,-3],[-6.4,-11.6],[-1.6,-6.4]]),k,{d:0.7}); fillP(Pg([[-5.4,-4.4],[-5.6,-9.6],[-2.6,-6]]),'#f6e2c6');
      cel(Pg([[0.6,-6.4],[3.4,-11.8],[5.4,-4.6]]),k,{d:0.7}); fillP(Pg([[1.8,-6],[3.4,-9.8],[4.4,-5.2]]),'#f6e2c6');
      cel(Bl([[-7,4.4],[-7.2,-3],[-3,-7.4],[3,-7.2],[6.4,-3.6],[7,1],[4.6,6.4],[-2,7.6]]),k,{d:1.5});
      cel(Bl([[-6.6,1],[-4,6.6],[1,7.6],[-1,3.4]]),'#f6e2c6',{d:0.4,h:0,lw:0.5});
      snout(5,2.4,4.8,3.4,'#f6e2c6','#1a1008');
      if(ex==='yell'||ex==='grin'){ cel(Bl([[4.6,3.4],[9.4,3.4],[8.8,6],[5.4,6.2]]),'#5a0f12',{d:0,h:0,lw:0.4}); fillP(E(7.2,5.8,1.1,0.8),'#ff7a8a'); }
      else strokeP(Pl([[4.4,4.4],[7.6,4.4]]),INK,0.4);
      eyes(ex,'normal',1.4,-2.4,Object.assign({},s,{skin:k}),0.8);
      fillP(E(0.6,-5,0.9,0.5),'#f6e2c6'); fillP(E(4,-5,0.8,0.5),'#f6e2c6'); break; }
    case 'cat': {
      cel(Pg([[-6.6,-2.6],[-6.4,-11],[-2,-6.6]]),k,{d:0.7}); fillP(Pg([[-5.8,-4],[-5.8,-9],[-3,-6.2]]),'#ffb3c1');
      cel(Pg([[0.4,-6.8],[4,-11.4],[5.6,-4.4]]),k,{d:0.7}); fillP(Pg([[1.6,-6.4],[3.8,-9.4],[4.6,-5]]),'#ffb3c1');
      cel(Bl([[-7.2,4],[-7.4,-3],[-3,-7.2],[3,-7.2],[6.6,-3.4],[7.4,1.6],[4.4,6],[-2,6.8]]),k,{d:1.4});
      for(const [a,b] of [[[-6,-4],[-3.4,-3.4]],[[-6.4,-1],[-3.6,-0.8]],[[-1,-6.8],[-0.4,-4.4]]]) strokeP(Pl([a,b]),shade(k,0.6),0.6);
      cel(Bl([[2.4,1],[7.6,1],[8,4.2],[3.4,5]]),'#f4f4f4',{d:0.4,h:0,lw:0.5});
      cel(Pg([[6.4,1.2],[8,1.2],[7.2,2.4]]),'#ffb3c1',{d:0,h:0,lw:0.4});
      for(const [y,d] of [[2,-0.6],[3.2,0.3]]){ strokeP(Pl([[7.6,y],[11.6,y+d]]),'#eee',0.3); }
      strokeP(()=>{ C.moveTo(X(5.6),Y(3.2)); C.quadraticCurveTo(X(6.2),Y(4.2),X(7.2),Y(3.4)); },INK,0.4);
      const lazy=ex==='n'||ex==='tired';
      eyes(lazy?'tired':ex,'normal',2,-1.8,Object.assign({},s,{iris:'#3fae2a',skin:k}),0.8); break; }
    case 'sheep': {
      const wool='#f2ece0';
      for(const [x,y,r] of [[-8.6,-6],[-4.6,-9.6],[0.4,-10.4],[4.6,-8.4],[-9.6,-0.6],[-8.6,4.6],[-4.4,7.4],[0.4,-6.6]]) cel(E(x,y,r===undefined?3.2:3.2,3.2),wool,{d:0.9,h:0.6});
      cel(E(-4.6,-2.4,2.6,1.4,-0.4),k,{d:0.5});
      cel(Bl([[-2,-5],[3,-6],[7.4,-2],[8.4,3.4],[6.4,7.6],[1,7.6],[-1.6,3]]),k,{d:1.4,hi:1.9});
      eyes(ex,'normal',2.6,-1.6,Object.assign({},s,{skin:k}),0.8);
      fillP(E(7.4,3.6,0.6,0.5),'#888'); mouth(ex,5,5.4,{},0.6);
      cel(E(-0.4,-8,2.6,2),wool,{d:0.5}); break; }
    default: humanHead(s,ex,f);
  }
}

// ---------- outfits / accessories ----------
function torsoDetail(s,R,B,f){
  const N=R.neck, Hp=R.hip, u=R.u, n=R.n, top=s.top;
  const at=t=>lerp(Hp,N,t), fr=(t,k)=>add(at(t),mul(n,k));
  const o=s.outfit||'tee';
  if(o==='gi'){ strokeP(Pl([fr(0.98,1.2),fr(0.4,-1.6)]),shade(top,0.6),0.6); strokeP(Pl([fr(0.98,-2),fr(0.55,1.6)]),shade(top,0.6),0.6);
    fillP(Pg([fr(0.99,1),fr(0.62,-0.6),fr(0.99,-1.8)]),shade(s.skin,0.9)); }
  if(o==='tee'||o==='tank'){ strokeP(()=>{ const a=fr(0.97,1.6), b=fr(0.88,-0.2), c=fr(0.97,-2.6); C.moveTo(X(a[0]),Y(a[1])); C.quadraticCurveTo(X(b[0]),Y(b[1]),X(c[0]),Y(c[1])); },shade(top,0.55),0.55);
    strokeP(Pl([fr(0.55,2),fr(0.42,0.2)]),shade(top,0.78),0.4); }
  if(o==='hoodie'){ cel(Pg([fr(0.42,B.ww*0.85),fr(0.22,B.ww*0.9),fr(0.22,-B.ww*0.3),fr(0.42,-B.ww*0.1)]),shade(top,0.9),{d:0.4,h:0,lw:0.5});
    strokeP(Pl([fr(0.97,1),fr(0.7,1.4)]),'#ddd',0.35); strokeP(Pl([fr(0.97,-0.6),fr(0.72,-0.2)]),'#ddd',0.35); }
  if(o==='suit'){ fillP(Pg([fr(1,1.6),fr(0.58,0.6),fr(1,-1.6)]),'#f4f4f4');
    const tc=s.tie||'#e0262d'; cel(Pg([fr(0.95,0.6),fr(0.62,1.2),fr(0.55,0.4),fr(0.62,-0.4),fr(0.95,-0.4)]),tc,{d:0.3,h:0,lw:0.45});
    strokeP(Pl([fr(1,2),fr(0.55,0.8)]),shade(top,0.55),0.6); strokeP(Pl([fr(1,-1.8),fr(0.55,0.5)]),shade(top,0.55),0.6);
    fillP(E(...fr(0.35,1.2),0.45,0.45),'#ffd23f'); }
  if(o==='vest'){ cel(Pg([fr(1,-B.sw*0.9),fr(1,0.4),fr(0.25,-0.8),fr(0.05,-B.ww)]),top,{d:0.6,h:0.3}); cel(Pg([fr(1,B.sw*0.9),fr(0.95,2),fr(0.25,1.6),fr(0.05,B.ww)]),top,{d:0.6,h:0.3});
    fillP(E(...fr(0.6,2.6),0.7,0.7),'#ffd23f'); fillP(E(...fr(0.4,2.4),0.6,0.6),'#ffd23f'); }
  if(o==='robe'){ strokeP(Pl([fr(1,1.8),fr(0.1,-1)]),'#ffd23f',0.55); for(let i=0;i<3;i++){ const p=fr(0.2+i*0.27,-2+i*1.4); fillP(E(p[0],p[1],0.5,0.5),'#ffe680'); } }
  if(o==='space'){ cel(()=>{ const p=fr(0.62,0.6); C.roundRect(X(p[0]-2.6),Y(p[1]-2),5.2,4,0.8); },'#bdbdbd',{d:0.4,h:0,lw:0.5});
    fillP(E(...add(fr(0.62,0.6),[-1,-0.6]),0.6,0.6),'#ff2e2e'); fillP(E(...add(fr(0.62,0.6),[1,-0.6]),0.6,0.6),'#3bff6a'); fillP(()=>{ const p=fr(0.62,0.6); C.rect(X(p[0]-1.6),Y(p[1]+0.6),3.2,0.7); },'#2a6fd6');
    strokeP(Pl([fr(0.2,-B.ww),fr(0.2,B.ww)]),shade(top,0.7),0.5); }
  if(o==='wool'){ for(let i=0;i<9;i++){ const t=0.12+(i%3)*0.32, kk=((i*7)%5-2)*2.2; const p=fr(t,kk); cel(E(p[0],p[1],2.6,2.4),i%2?top:shade(top,1.04),{d:0.6,h:0.5,lw:0.6}); } }
  // folds
  if(o!=='wool'&&o!=='space'){ const fc=shade(o==='vest'?s.skin:top,0.74);
    strokeP(Pl([fr(0.86,-B.sw*0.7),fr(0.62,-B.sw*0.25)]),fc,0.45); strokeP(Pl([fr(0.32,B.ww*0.8),fr(0.18,B.ww*0.2)]),fc,0.4); strokeP(Pl([fr(0.5,-B.ww*0.9),fr(0.38,-B.ww*0.3)]),fc,0.35); }
  // logos / chest marks
  const chest=fr(0.62,1.2);
  if(s.id==='diamond') cel(Pg([add(chest,[0,-1.8]),add(chest,[1.6,0]),add(chest,[0,1.8]),add(chest,[-1.6,0])]),'#5ad1ff',{d:0.4,h:0.4,lw:0.45});
  if(s.id==='bull'||s.id==='bear'){ const up=s.id==='bull'; strokeP(Pl(up?[add(chest,[-2,1.4]),add(chest,[-0.4,-0.2]),add(chest,[0.6,0.6]),add(chest,[2.2,-1.6])]:[add(chest,[-2,-1.4]),add(chest,[-0.4,0.2]),add(chest,[0.6,-0.6]),add(chest,[2.2,1.6])]),up?'#c6ffb0':'#ffb0b0',0.7); }
  if(s.id==='main') cel(Pg([add(chest,[-0.6,-2]),add(chest,[1.6,-2]),add(chest,[0.4,-0.2]),add(chest,[1.8,-0.2]),add(chest,[-0.8,2.4]),add(chest,[0,0.4]),add(chest,[-1.2,0.4])]),'#ffb000',{d:0,h:0,lw:0.45});
  if(s.id==='ratio'){ const p=chest; strokeP(Pl([add(p,[-1,-1.8]),add(p,[-1,1.2]),add(p,[1.4,1.2])]),'#ff2ec4',0.7); }
  if(s.id==='lag'){ for(let i=0;i<4;i++){ const p=fr((i*0.23+f*0.07)%1,((i*5+f*3)%9)-4.5); fillP(()=>{ C.rect(X(p[0]),Y(p[1]),3.4,0.7); },'#00ffd0'); } }
  if(s.id==='skill'){ fillP(E(...chest,1.4,1.4),'#fff'); strokeP(Pl([add(chest,[-0.8,0]),add(chest,[0.8,0])]),INK,0.4); strokeP(Pl([add(chest,[0,-0.8]),add(chest,[0,0.8])]),INK,0.4); }
  if(s.id==='clickbait'){ txtIcon('!',chest,'#ffd23f'); }
  if(s.id==='doom') fillP(()=>{ C.rect(X(chest[0]-1.6),Y(chest[1]-0.3),3.2,0.6); },'#7fdcff');
  if(s.id==='grass'){ for(const d of [[-1,0],[0.4,-0.6],[1.4,0.2]]) fillP(E(chest[0]+d[0],chest[1]+d[1],0.7,1.2),'#9bff6a'); }
  if(s.id==='copium'){ fillP(E(...chest,1.3,1.3),'#c98aff'); }
}
function txtIcon(t,p,col){ C.fillStyle=col; C.font='bold 4px monospace'; C.textAlign='center'; C.textBaseline='middle'; C.fillText(t,X(p[0]),Y(p[1])); }

function behind(s,R,B,f,P){ // things behind the body
  const N=R.neck, Hp=R.hip;
  if(s.acc==='jetpack'){ const p=add(N,[-B.sw-1.4,4]); cel(()=>{ C.roundRect(X(p[0]-2.6),Y(p[1]-1),5.2,13,1.6); },'#a8a8a8',{d:0.8}); fillP(()=>{ C.rect(X(p[0]-2.6),Y(p[1]+3),5.2,1); },'#ff6a00');
    const fl=[3,5,4,6][f%4]; cel(Pg([[p[0]-1.8,p[1]+12],[p[0]+1.8,p[1]+12],[p[0],p[1]+12+fl]]),'#ffd23f',{d:0,h:0,lw:0.5}); fillP(Pg([[p[0]-0.9,p[1]+12],[p[0]+0.9,p[1]+12],[p[0],p[1]+12+fl*0.55]]),'#fff6c8'); }
  if(s.acc==='rug'){ const a=add(N,[-B.sw-0.6,-0.4]), b=add(Hp,[-B.ww-3.6,5]); limb([{a,b,w:5.6}],'#c0262d'); strokeP(Pl([lerp(a,b,0.15),lerp(a,b,0.85)]),'#ffd23f',0.7);
    cel(E(b[0],b[1],2.8,2.8),'#a01e26',{d:0.4,h:0}); strokeP(()=>{ C.arc(X(b[0]),Y(b[1]),1.4,0,TAU); },'#ffd23f',0.4); }
  if(s.acc==='scarf'){ // secondary motion: tails stream back, wave by frame and body velocity
    const v=P._vel||[0,0], w=Math.sin(f*1.3)*1.6, a=add(N,[-1,2]);
    const p1=add(a,[-7-v[0]*0.6,2+w*0.4]), p2=add(p1,[-7-v[0]*0.8,-1+w]), p3=add(a,[-6-v[0]*0.5,5+w*0.3]), p4=add(p3,[-6,2-w]);
    limb([{a,b:p1,w:2.6},{a:p1,b:p2,w:2.2}],'#e0262d'); limb([{a,b:p3,w:2.2},{a:p3,b:p4,w:1.8}],'#c41d26'); }
  if(s.id==='shiba'){ const t=add(Hp,[-B.ww-1,-3]), wag=Math.sin(f*1.4)*1.4; cel(()=>{ C.moveTo(X(t[0]),Y(t[1])); C.quadraticCurveTo(X(t[0]-6),Y(t[1]-6+wag),X(t[0]-2),Y(t[1]-9+wag)); C.quadraticCurveTo(X(t[0]+1.6),Y(t[1]-6+wag),X(t[0]-1),Y(t[1]-3)); C.closePath(); },s.skin,{d:0.8}); fillP(E(t[0]-2.4,t[1]-8+wag,1,0.8),'#f6e2c6'); }
  if(s.id==='cat'){ const t=add(Hp,[-B.ww,-1]), sw=Math.sin(f*0.8)*3; limb([{a:t,b:add(t,[-5,-3+sw*0.3]),w:2.2},{a:add(t,[-5,-3+sw*0.3]),b:add(t,[-6+sw*0.4,-10+sw*0.2]),w:2}],s.skin); }
  if(s.id==='bull'){ const t=add(Hp,[-B.ww,-2]); strokeP(Pl([t,add(t,[-3,4]),add(t,[-3.4,7])]),INK,0.9); strokeP(Pl([t,add(t,[-3,4]),add(t,[-3.4,7])]),s.skin,0.5); fillP(E(t[0]-3.4,t[1]+7.6,0.9,1.3),'#2a1608'); }
  if(s.outfit==='hoodie'||s.hair==='hood'){ /* hood bunch behind neck */ cel(E(N[0]-2.4,N[1]+0.6,3.6,2.2,-0.3),shade(s.top,0.88),{d:0.6,h:0}); }
  if(s.id==='lag'&&f%3===0){ fillP(()=>{ C.rect(X(Hp[0]-12),Y(Hp[1]-14),24,1.2); },'rgba(0,255,208,0.9)'); }
}
function handItem(s,h,back,f,P){
  if(back) return;
  const [x,y]=h;
  if(s.acc==='nozzle'){ cel(()=>{ C.roundRect(X(x+1),Y(y-1.6),8,3,0.8); },'#1d1d1d',{d:0.4,h:0.5,hi:2.2,lw:0.6}); fillP(()=>{ C.rect(X(x+8.4),Y(y-1),1.6,1.8); },'#ffd23f'); strokeP(()=>{ C.moveTo(X(x-1),Y(y+2)); C.quadraticCurveTo(X(x-6),Y(y+8),X(x-9),Y(y+16)); },INK,1.2); }
  if(s.acc==='phone'){ cel(()=>{ C.roundRect(X(x+0.4),Y(y-6.6),4.4,8,0.9); },'#111',{d:0,h:0.4,hi:3,lw:0.6}); fillP(()=>{ C.rect(X(x+1),Y(y-5.8),3.2,6); },f%2?'#7fdcff':'#bff0ff');
    fillP(()=>{ C.rect(X(x+1.2),Y(y-5+((f*1.3)%4)),2.8,0.6); },'#ffffff'); }
  if(s.acc==='keyboard'){ cel(()=>{ C.roundRect(X(x-3),Y(y+1.6),14,4,0.8); },'#dcdcdc',{d:0.6,h:0}); for(let i=0;i<6;i++) fillP(()=>{ C.rect(X(x-2+i*2.2),Y(y+2.4+((i+f)%2)*0.3),1.4,1.2); },i===5?'#ff2e2e':'#7a7a7a'); }
  if(s.acc==='controller'){ cel(Bl([[x-3.6,y+1.4],[x+5,y+1],[x+6,y+4.6],[x+3,y+4.2],[x-1,y+4.4],[x-4.6,y+4.8]]),'#222',{d:0.4,h:0.4,hi:2.6,lw:0.6}); fillP(E(x+3.6,y+2.4,0.5,0.5),'#ff2e2e'); fillP(E(x+4.6,y+3.2,0.5,0.5),'#3bff6a'); }
}
function head(s,R,P,f){
  const ex=P.ex||'n';
  C.save(); const h=R.head; C.translate(X(h[0]),Y(h[1])); C.rotate(P.ht||0); const sc=build(s).head; C.scale(sc,sc); C.translate(-X(0),-Y(0));
  drawHead(s,ex,f);
  // head accessories (local frame)
  if(s.acc==='monocle'){ strokeP(()=>{ C.arc(X(4.4),Y(-2.4),2.2,0,TAU); },'#ffd23f',0.6); strokeP(Pl([[4.4,-0.2],[3,6]]),'#ffd23f',0.3); }
  if(s.acc==='gasmask'){ cel(Bl([[1.8,0.4],[7,-0.4],[8.6,3.6],[6.6,6.6],[2.4,6.4]]),'#3c3c3c',{d:0.6,h:0.4,hi:2}); cel(E(7.6,3.2,1.8,1.8),'#2f7d6d',{d:0.4,h:0.4,lw:0.6}); for(let i=0;i<3;i++) fillP(E(7.6,2.2+i*1,0.9,0.18),'#1d4d43');
    if(f%4<2) fillP(E(10+f%3,1-f%4,1.2,1),'rgba(201,138,255,0.6)'); }
  if(s.acc==='bang'){ cel(()=>{ C.roundRect(X(-1.4),Y(-21),2.8,7,1); },'#ffd23f',{d:0.4,h:0.3}); cel(E(0,-11.6,1.4,1.4),'#ffd23f',{d:0.3,h:0}); }
  if(s.acc==='arrow'){ const yy=-17+(f%2)*0.8; cel(Pg([[2,yy],[6,yy-4],[6,yy-1.6],[13,yy-1.6],[13,yy+1.6],[6,yy+1.6],[6,yy+4]]),'#ff2e2e',{d:0.6,h:0.4}); }
  if(s.acc==='sprout'){ strokeP(Pl([[0,-12],[0.4,-16]]),'#3fae2a',0.8); cel(E(-2,-16.4,2,1,-0.4),'#5fd13a',{d:0.3,h:0}); cel(E(2.6,-17,2,1,0.4),'#5fd13a',{d:0.3,h:0}); }
  C.restore();
}

// ---------- full figure ----------
function drawFigure(s,P,f){
  const B=build(s), R=rig(P,s,B), t=B.t;
  const pants=s.pants, top=s.top, skin=s.skin, animal=ANIMAL.includes(s.head);
  const sleeve=({tee:'short',tank:'none',vest:'none',gi:'long',hoodie:'long',suit:'long',robe:'long',space:'long',wool:'short'})[s.outfit||'tee'];
  const dk=c=>shade(c,0.8);
  const arm=(S,E_,Hd,back)=>{
    const ua=5.2*t, fa=4.6*t;
    const sk=back?dk(skin):skin, sl=back?dk(top):top;
    if(sleeve!=='none') cel(E(S[0],S[1]+0.6,ua*0.62,ua*0.58),sl,{d:0.6,h:0.4});
    if(sleeve==='long') limb([{a:S,b:E_,w:ua+0.4},{a:E_,b:lerp(E_,Hd,0.72),w:fa+0.5}],sl);
    else { limb([{a:S,b:E_,w:ua},{a:E_,b:Hd,w:fa}],sk);
      if(sleeve==='short') limb([{a:S,b:lerp(S,E_,0.55),w:ua+1.2}],sl); }
    if(s.outfit==='gi'&&sleeve==='long'){ strokeP(Pl([lerp(E_,Hd,0.7),lerp(E_,Hd,0.74)]),shade(sl,0.6),fa+0.6); }
    if(s.acc==='diamondFists'){ const [x,y]=Hd, r=B.fist*1.2; cel(Pg([[x,y-r],[x+r*0.95,y],[x,y+r],[x-r*0.95,y]]),back?'#2a87b6':'#5ad1ff',{d:0.9,h:0.6,hi:1.7}); strokeP(Pl([[x-r*0.95,y],[x+r*0.95,y]]),'#bff0ff',0.35); strokeP(Pl([[x,y-r],[x,y+r]]),'#2a87b6',0.3); fillP(E(x-r*0.3,y-r*0.4,0.5,0.5),'#fff'); }
    else fist(Hd,B.fist,back?dk(s.acc==='paperHands'?'#ffffff':skin):(s.acc==='paperHands'?'#ffffff':skin),back?P.bh:P.fh);
    handItem(s,Hd,back,f,P);
  };
  const leg=(Hp,K,F,back)=>{
    const th=7.2*t, sh=5.4*t, c=back?dk(pants):pants;
    limb([{a:Hp,b:K,w:th},{a:K,b:F,w:sh}],c);
    if(!animal||s.head==='goblin'){ const fc=shade(c,0.72), kk=sub(K,Hp), kn=nrm(perp(kk));
      strokeP(Pl([lerp(Hp,K,0.45),add(lerp(Hp,K,0.82),mul(kn,th*0.18))]),fc,0.45);
      strokeP(Pl([add(K,mul(kn,-th*0.3)),add(lerp(K,F,0.25),mul(kn,-th*0.1))]),fc,0.4);
      strokeP(Pl([add(lerp(K,F,0.55),mul(kn,sh*0.25)),add(lerp(K,F,0.75),mul(kn,sh*0.05))]),fc,0.35); }
    if(s.outfit==='gi'||s.outfit==='robe'){ const a=lerp(K,F,0.55); cel(Pg([add(a,[-sh*0.55,0]),add(a,[sh*0.55,0]),add(F,[sh*0.85,-1.6]),add(F,[-sh*0.85,-1.6])]),c,{d:0.5,h:0}); }
    shoe(F,K,back?shade(s.shoes,0.85):s.shoes,back,{kind:animal&&!['goblin'].includes(s.head)&&s.id!=='bull'&&s.id!=='bear'&&s.id!=='whale'?'paw':'shoe'});
  };
  // smear (anime motion frame) behind everything
  if(P.smear&&P.smearFrom){
    const key=P.smear==='f'?'fH':P.smear==='b'?'bH':'fF', a=P.smearFrom[key], b=P[key];
    const S=P.smear==='F'?R.fHip:(P.smear==='b'?R.bS:R.fS);
    const col=P.smear==='F'?shade(pants,1.25):shade(skin,1.2);
    C.globalAlpha=1; fillP(Pg([S,add(a,[0,-2]),add(b,[0,-2.6]),add(b,[0,2.6]),add(a,[0,2]),S]),col);
    for(let i=0;i<3;i++){ const p=lerp(a,b,0.25+i*0.2); strokeP(Pl([add(p,[-4,-3+i*3]),add(p,[2,-3+i*3])]),'#ffffff',0.6); }
  }
  behind(s,R,B,f,P);
  if(!P.bFront) arm(R.bS,R.bE,P.bH,true);
  leg(R.bHip,R.bK,P.bF,true);
  // pelvis
  cel(E(P.hip[0],P.hip[1]-0.6,B.ww+0.4,3.6,Math.atan2(R.u[1],R.u[0])+Math.PI/2),pants,{d:0.8});
  leg(R.fHip,R.fK,P.fF,false);
  // torso
  const tcol=s.outfit==='vest'?skin:top;
  cel(torsoPath(R,B,s),tcol,{d:B.kind==='huge'?2.4:1.6,h:0.7});
  C.save(); C.beginPath(); torsoPath(R,B,s)(); C.clip(); torsoDetail(s,R,B,f); C.restore();
  // belt
  if(s.acc==='belt'||s.outfit==='gi'){ const a=add(P.hip,mul(R.n,-B.ww-0.4)), b=add(P.hip,mul(R.n,B.ww+0.4)), up=mul(R.u,1.4);
    cel(Pg([add(a,up),add(b,up),b,a]),'#151515',{d:0,h:0.3,hi:2.4,lw:0.6});
    const k=add(lerp(a,b,0.7),mul(up,0.5)); cel(E(k[0],k[1],1.2,1),'#151515',{d:0,h:0.3,hi:2.4,lw:0.5});
    const sw=Math.sin(f*0.9)*0.8; limb([{a:k,b:add(k,[1.4+sw,4.4]),w:1.2}],'#151515'); limb([{a:k,b:add(k,[-0.6+sw,4.8]),w:1.2}],'#151515'); }
  if(s.outfit==='robe'){ const a=add(P.hip,mul(R.n,-B.ww-1)), b=add(P.hip,mul(R.n,B.ww+1)); const kf=R.fK, kb=R.bK;
    cel(Pg([a,b,add(kf,[3,2]),add(kb,[-3,2])]),top,{d:1,h:0.4}); }
  // neck
  const nb=lerp(P.neck,R.head,0.55);
  limb([{a:add(P.neck,mul(R.u,-1)),b:nb,w:animal?5.4*t:3.9*t}],animal?skin:shade(skin,0.92));
  if(s.outfit==='hoodie'||s.outfit==='gi'||s.outfit==='suit'||s.outfit==='tee') { /* collar */ cel(E(P.neck[0],P.neck[1]+0.4,3.4*t,1.5,Math.atan2(R.u[1],R.u[0])+Math.PI/2),s.outfit==='suit'?'#f4f4f4':shade(top,0.94),{d:0.4,h:0,lw:0.6}); }
  head(s,R,P,f);
  if(P.bFront) arm(R.bS,R.bE,P.bH,true);
  arm(R.fS,R.fE,P.fH,false);
}

// Loaf Mode ball (cat) / generic somersault roll
function drawBall(s,f){
  if(s.id==='cat'){ const k=s.skin; C.save(); const bob=[0,-0.6,0,0.6][f%4];
    cel(Bl([[-13,0],[-13,-14+bob],[-6,-19+bob],[6,-19+bob],[13,-14+bob],[13,0]]),'#e8b060',{d:1.6,h:0.8});
    cel(Bl([[-11.6,-12+bob],[-6,-16.6+bob],[6,-16.6+bob],[11.6,-12+bob],[6,-10.6+bob],[-6,-10.6+bob]]),'#c48a3a',{d:0.6,h:0});
    for(let i=0;i<3;i++) strokeP(Pl([[-6+i*5,-15+bob],[-4+i*5,-12.4+bob]]),'#ffd890',0.7);
    const ears=[[5,-19],[8,-14],[5,-10],[-3,-17]][f%4]; cel(Pg([[ears[0],ears[1]+bob],[ears[0]+2,ears[1]-4+bob],[ears[0]+4,ears[1]+bob]]),k,{d:0.4,h:0});
    fillP(E(9,-7+bob,0.9,0.6),INK); fillP(E(6,-7+bob,0.9,0.6),INK); C.restore(); return; }
  const P=J({hip:[0,-14],neck:[5,-24],head:[7,-26],fF:[8,-12],bF:[2,-10],fH:[10,-16],bH:[6,-14],ht:0.6,ex:'grit'});
  C.save(); C.translate(X(0),Y(-14)); C.rotate(f*Math.PI/2); C.translate(-X(0),-Y(-14));
  drawFigure(s,P,f); C.restore();
}

// ---------- rasterise ----------
function outline(cv,alt){ // in-place (used for imported art); see finish() for the fast cropped path
  const out=finish(cv,alt,0,0,true); const c=cv.getContext('2d'); c.clearRect(0,0,cv.width,cv.height); c.drawImage(out,0,0); }
// threshold alpha, add 2-3px ink contour, optional palette swap, crop to content; returns new canvas with _ox/_oy
function finish(cv,alt,ox,oy,keepSize){
  const w=cv.width, h=cv.height, c=cv.getContext('2d',{willReadFrequently:true});
  const img=c.getImageData(0,0,w,h), d=img.data, m=new Uint8Array(w*h);
  let x0=w,y0=h,x1=-1,y1=-1;
  for(let y=0,i=0;y<h;y++) for(let x=0;x<w;x++,i++){ if(d[i*4+3]>=120){ m[i]=1; if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; } }
  if(x1<0){ cv._ox=ox; cv._oy=oy; return cv; }
  const X0=Math.max(3,x0-3), Y0=Math.max(3,y0-3), X1=Math.min(w-4,x1+3), Y1=Math.min(h-4,y1+3);
  const ow=X1-X0+1, oh=Y1-Y0+1, out=new ImageData(ow,oh), o=out.data;
  const K=[-1,1,-w,w,-w-1,-w+1,w-1,w+1,-2,2,-2*w,2*w,-3,-3*w,-2*w-2];
  for(let y=Y0;y<=Y1;y++){ let i=y*w+X0, j=(y-Y0)*ow*4;
    for(let x=X0;x<=X1;x++,i++,j+=4){
      if(m[i]){ const q=i*4; let r=d[q],g=d[q+1],b=d[q+2];
        if(alt&&!(r<48&&g<32&&b<24)){ const t=r; r=b; b=g; g=t; }
        o[j]=r;o[j+1]=g;o[j+2]=b;o[j+3]=255; continue; }
      for(let k=0;k<15;k++) if(m[i+K[k]]){ o[j]=0x1a;o[j+1]=0x0b;o[j+2]=0x02;o[j+3]=255; break; }
    } }
  if(keepSize){ const full=document.createElement('canvas'); full.width=w; full.height=h; full.getContext('2d').putImageData(out,X0,Y0); return full; }
  const res=document.createElement('canvas'); res.width=ow; res.height=oh; res.getContext('2d').putImageData(out,0,0);
  res._ox=ox-X0; res._oy=oy-Y0; return res;
}
function flash(cv){ const c2=document.createElement('canvas'); c2.width=cv.width; c2.height=cv.height; const c=c2.getContext('2d'); c.drawImage(cv,0,0); c.globalCompositeOperation='source-atop'; c.fillStyle='#fff'; c.fillRect(0,0,cv.width,cv.height); return c2; }
const CACHE_MAX=420;
function remember(key,cv){ cache.set(key,cv); if(cache.size>CACHE_MAX){ const first=cache.keys().next().value; cache.delete(first); } return cv; }
function crop(cv,ox,oy){
  const c=cv.getContext('2d',{willReadFrequently:true}), w=cv.width, h=cv.height; let d;
  try{ d=c.getImageData(0,0,w,h).data; }catch(e){ cv._ox=ox; cv._oy=oy; return cv; } // opened from file:// (tainted canvas): skip the trim
  let x0=w,y0=h,x1=-1,y1=-1;
  for(let y=0;y<h;y++){ const row=y*w*4; for(let x=0;x<w;x++) if(d[row+x*4+3]){ if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; } }
  if(x1<0){ cv._ox=ox; cv._oy=oy; return cv; }
  const out=document.createElement('canvas'); out.width=x1-x0+1; out.height=y1-y0+1;
  out.getContext('2d').drawImage(cv,x0,y0,out.width,out.height,0,0,out.width,out.height);
  out._ox=ox-x0; out._oy=oy-y0; return out;
}

// ---------- hand-made sprite sheets ----------
// DD.SPRITE_ART = { <fighterId>: { src:'img/fighters/<id>.png', cell:[w,h], anchor:[x,y] (foot point inside a cell, px),
//   height: px from feet to top of head in the art (used to match the 56-unit cast height), anims:{ idle:{row:0,n:8}, walk:{row:1,n:8}, ... } } }
// Any pose not listed in anims falls back to the procedural rig.
const ART={}; let SKIPART=false;
function artNotify(id){ for(const k of [...cache.keys()]) if(!id||k.startsWith(id+'|')) cache.delete(k); try{ dispatchEvent(new CustomEvent('dd:art',{detail:id})); }catch(e){} }
function artFor(spec){
  const def=(DD.SPRITE_ART||{})[spec.id]; if(!def) return null;
  let a=ART[spec.id];
  if(!a){ a=ART[spec.id]={def,img:new Image(),ok:false}; a.img.onload=()=>{ a.ok=true; artNotify(spec.id); }; a.img.onerror=()=>{ a.bad=true; }; a.img.src=def.src; }
  return a.ok?a:null;
}
// small atlas of every fighter's idle frame, so menus show the real art before full sheets arrive
let IDLE=null;
function idleAtlas(){ const d=DD.SPRITE_IDLE; if(!d) return null;
  if(!IDLE){ IDLE={img:new Image(),ok:false}; IDLE.img.onload=()=>{ IDLE.ok=true; artNotify(null); }; IDLE.img.src=d.src; }
  return IDLE.ok?IDLE:null; }
function cut(img,sx,sy,d,alt){
  const [cw,ch]=d.cell, scale=d.unit?RES/d.unit:(56*RES)/(d.height||ch);
  const cv=document.createElement('canvas'); cv.width=Math.round(cw*scale); cv.height=Math.round(ch*scale);
  const c=cv.getContext('2d'); c.imageSmoothingEnabled=!!d.smooth; c.drawImage(img,sx,sy,cw,ch,0,0,cv.width,cv.height);
  if(alt){ try{ const o=finish(cv,true,0,0,true); c.clearRect(0,0,cv.width,cv.height); c.drawImage(o,0,0); }catch(e){ c.filter='hue-rotate(150deg)'; c.globalCompositeOperation='copy'; c.drawImage(cv,0,0); c.filter='none'; c.globalCompositeOperation='source-over'; } }
  return crop(cv,Math.round(d.anchor[0]*scale),Math.round(d.anchor[1]*scale));
}
function artFrame(a,poseName,frame,alt){
  const d=a.def, an=d.anims[poseName]; if(!an) return null;
  const n=an.n||1, fi=((frame%n)+n)%n, [cw,ch]=d.cell;
  return cut(a.img,(an.col||0)*cw+fi*cw,an.row*ch,d,alt);
}
function idleFrame(spec,alt){ const d=DD.SPRITE_IDLE, A=idleAtlas(); if(!A) return null; const i=d.order.indexOf(spec.id); if(i<0) return null;
  const c=DD.SPRITE_ART_COMMON; return cut(A.img,0,i*c.cell[1],c,alt); }

// ---------- public ----------
const lastHead={};
function get(spec,poseName,frame,alt,white){
  const n=nFrames(poseName); frame=((frame|0)%Math.max(n,1)+Math.max(n,1))%Math.max(n,1);
  if(ATK[poseName]) frame=Math.min(frame,6);
  const key=spec.id+'|'+poseName+'|'+frame+'|'+(alt?1:0)+'|'+(white?1:0);
  let cv=cache.get(key);
  if(cv){ cache.delete(key); cache.set(key,cv); return cv; }
  if(white){ const src=get(spec,poseName,frame,alt,false); cv=flash(src); cv._ox=src._ox; cv._oy=src._oy; return remember(key,cv); }
  const art=SKIPART?null:artFor(spec); if(art){ const a=artFrame(art,poseName,frame,alt); if(a) return remember(key,a); }
  else if(!SKIPART&&DD.SPRITE_ART&&DD.SPRITE_ART[spec.id]){ const a=idleFrame(spec,alt); if(a) return a; } // not cached: swapped for the real frame once the sheet loads
  const base=document.createElement('canvas'); base.width=W*RES; base.height=H*RES;
  C=base.getContext('2d',{willReadFrequently:true}); C.scale(RES,RES);
  try{
    if(poseName==='ball') drawBall(spec,frame);
    else { const P=pose(poseName,frame,spec);
      if(spec.acc==='scarf'){ const prev=pose(poseName,(frame+n-1)%n,spec); P._vel=sub(P.neck,prev.neck); }
      if(P.sit&&spec.id==='cat'){ drawBall(spec,0); } else drawFigure(spec,P,frame); }
  }catch(e){ console.error('sprite',spec.id,poseName,frame,e); }
  C.setTransform(1,0,0,1,0,0);
  cv=finish(base,alt,OX*RES,OY*RES);
  if(spec.size&&spec.size!==1){ const s=spec.size, sc=document.createElement('canvas'); sc.width=Math.round(cv.width*s); sc.height=Math.round(cv.height*s); const x=sc.getContext('2d'); x.imageSmoothingEnabled=false; x.drawImage(cv,0,0,sc.width,sc.height); sc._ox=cv._ox*s; sc._oy=cv._oy*s; cv=sc; }
  return remember(key,cv);
}
function portrait(spec,scale,poseName,alt){
  const make=()=>{ const cv=get(spec,poseName||'idle',0,alt,false);
    const k=scale*2/RES, out=document.createElement('canvas'); out.width=Math.round(cv.width*k); out.height=Math.round(cv.height*k);
    const c=out.getContext('2d'); c.imageSmoothingEnabled=false; c.drawImage(cv,0,0,out.width,out.height); return out.toDataURL(); };
  try{ return make(); }catch(e){ // file:// pages can't export image-based canvases: fall back to the drawn sprite
    SKIPART=true; try{ const k=spec.id+'|'+(poseName||'idle')+'|0|'+(alt?1:0)+'|0'; cache.delete(k); return make(); } finally{ SKIPART=false; const k=spec.id+'|'+(poseName||'idle')+'|0|'+(alt?1:0)+'|0'; cache.delete(k); } }
}
const warmQ=[], warmed=new Set();
function prewarm(spec,alt){ const k=spec.id+(alt?'a':''); if(warmed.has(k)) return; warmed.add(k);
  const order=['idle','walk','jab','punch','kick','block','hit','crouch','jump','cpunch','ckick','upper','heavy','round','lunge','kd','fall','getup','dash','special','charge','throw','grab','jpunch','jkick','dive','cblock','dizzy','win','ball'];
  for(const p of order){ const n=nFrames(p); for(let f=0;f<n;f++) warmQ.push([spec,p,f,alt]); } }
function warmTick(budgetMs){ const t=performance.now(); while(warmQ.length&&performance.now()-t<budgetMs){ const [s,p,f,a]=warmQ.shift(); get(s,p,f,a,false); } }
function bake(spec,poseName,frame,res,noLines){ // high-res flat render for the offline pixel-art baker
  const n=nFrames(poseName), cv=document.createElement('canvas'); cv.width=W*res; cv.height=H*res;
  C=cv.getContext('2d'); C.imageSmoothingEnabled=false; C.scale(res,res); SOFT=true; INKL=noLines?'rgba(0,0,0,0)':INK;
  try{ if(poseName==='ball') drawBall(spec,frame); else { const P=pose(poseName,frame%Math.max(1,n),spec); if(spec.acc==='scarf'){ const prev=pose(poseName,(frame+n-1)%n,spec); P._vel=sub(P.neck,prev.neck); } if(P.sit&&spec.id==='cat') drawBall(spec,0); else drawFigure(spec,P,frame); } }
  finally{ SOFT=false; INKL=INK; }
  return cv; }
function rigFor(spec,poseName,frame){ const P=pose(poseName,frame,spec); if(!P) return null; const B=build(spec), R=rig(P,spec,B);
  const o={B:{t:B.t,sw:B.sw,ww:B.ww,fist:B.fist,head:B.head,kind:B.kind},ht:P.ht||0,bFront:!!P.bFront,sit:!!P.sit};
  for(const k of ['hip','neck','head','fS','bS','fE','bE','fH','bH','fHip','bHip','fK','bK','fF','bF']) o[k]=R[k]||P[k];
  return o; }
const ANIM_LIST=['idle','walk','jab','punch','upper','heavy','kick','round','lunge','cpunch','ckick','jpunch','jkick','dive','throw','special','crouch','jump','block','cblock','hit','fall','kd','getup','dash','charge','dizzy','win','ball'];
DD.Sprites={ get, portrait, shade, W, H, RES, prewarm, warmTick, nFrames, bake, rigFor, ANIM_LIST, OX, OY };
})();
