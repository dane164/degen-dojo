/* DEGEN DOJO — procedural pixel fighter sprites */
(function(){
const W = 96, H = 104, OX = 48, OY = 98, RES = 2; // logical sprite box + foot origin; RES = backing resolution
const OUT = '#1a0b02';
const cache = new Map();

function shade(hex, f){
  const n = parseInt(hex.slice(1),16);
  let r=(n>>16)&255,g=(n>>8)&255,b=n&255;
  r=Math.max(0,Math.min(255,Math.round(r*f)));g=Math.max(0,Math.min(255,Math.round(g*f)));b=Math.max(0,Math.min(255,Math.round(b*f)));
  return '#'+((1<<24)|(r<<16)|(g<<8)|b).toString(16).slice(1);
}

// ---------- poses ----------
function P(o){ return o; }
function pose(name, f){
  const bob = [0,1,1,0][f%4];
  switch(name){
    case 'walk': {
      const p = (f%4)/4*Math.PI*2, s=Math.sin(p), c=Math.cos(p);
      return P({hip:[0,-24],neck:[2,-44],head:[3,-53],
        fK:[5+3*s,-12],fF:[4+7*s,-Math.max(0,3*c)], bK:[-3-3*s,-12],bF:[-4-7*s,-Math.max(0,-3*c)],
        fS:[4,-42],fE:[10,-35],fH:[13,-42], bS:[0,-42],bE:[3,-34],bH:[9,-38]});
    }
    case 'crouch': return P({hip:[0,-14],neck:[4,-31],head:[6,-39],
        fK:[10,-9],fF:[10,0], bK:[-7,-7],bF:[-10,0],
        fS:[6,-29],fE:[12,-23],fH:[14,-30], bS:[2,-29],bE:[5,-22],bH:[10,-26]});
    case 'jump': return P({hip:[0,-30],neck:[1,-50],head:[2,-59],
        fK:[9,-24],fF:[5,-15], bK:[-1,-21],bF:[-8,-17],
        fS:[4,-48],fE:[10,-43],fH:[12,-50], bS:[0,-48],bE:[-4,-42],bH:[2,-46]});
    case 'punch': {
      const ext = f===1;
      return P({hip:[1,-24],neck:[5,-44],head:[6,-53],
        fK:[8,-12],fF:[11,0], bK:[-5,-12],bF:[-10,0],
        fS:[7,-42],fE:ext?[17,-42]:[11,-38],fH:ext?[27,-42]:[14,-42], bS:[2,-42],bE:[4,-34],bH:[9,-38]});
    }
    case 'kick': {
      const ext = f===1;
      return P({hip:[0,-24],neck:[-4,-44],head:[-5,-53],
        fK:ext?[13,-28]:[9,-24],fF:ext?[30,-31]:[12,-16], bK:[-3,-12],bF:[-5,0],
        fS:[-1,-42],fE:[6,-38],fH:[9,-44], bS:[-5,-42],bE:[-10,-36],bH:[-6,-32]});
    }
    case 'cpunch': {
      const ext = f===1;
      return P({hip:[0,-14],neck:[6,-31],head:[8,-39],
        fK:[10,-9],fF:[10,0], bK:[-7,-7],bF:[-10,0],
        fS:[8,-29],fE:ext?[17,-27]:[12,-24],fH:ext?[26,-26]:[15,-29], bS:[4,-29],bE:[6,-22],bH:[11,-25]});
    }
    case 'ckick': {
      const ext = f===1;
      return P({hip:[-2,-11],neck:[-2,-29],head:[-1,-37],
        fK:ext?[14,-5]:[8,-7],fF:ext?[31,-2]:[14,-1], bK:[-9,-6],bF:[-10,0],
        fS:[0,-27],fE:[6,-22],fH:[10,-28], bS:[-4,-27],bE:[-10,-20],bH:[-12,-12]});
    }
    case 'jkick': return P({hip:[0,-30],neck:[-2,-50],head:[-2,-59],
        fK:[12,-30],fF:[24,-20], bK:[-2,-22],bF:[-8,-17],
        fS:[2,-48],fE:[8,-44],fH:[12,-50], bS:[-2,-48],bE:[-8,-44],bH:[-6,-40]});
    case 'jpunch': return P({hip:[0,-30],neck:[3,-50],head:[4,-59],
        fK:[9,-24],fF:[5,-15], bK:[-1,-21],bF:[-8,-17],
        fS:[5,-48],fE:[14,-44],fH:[22,-38], bS:[1,-48],bE:[-3,-42],bH:[2,-46]});
    case 'block': return P({hip:[-1,-24],neck:[0,-44],head:[1,-53],
        fK:[6,-12],fF:[8,0], bK:[-6,-12],bF:[-10,0],
        fS:[2,-42],fE:[9,-40],fH:[9,-50], bS:[-1,-42],bE:[6,-36],bH:[10,-44]});
    case 'cblock': return P({hip:[-1,-14],neck:[2,-31],head:[3,-39],
        fK:[9,-9],fF:[10,0], bK:[-7,-7],bF:[-10,0],
        fS:[4,-29],fE:[10,-28],fH:[10,-37], bS:[1,-29],bE:[7,-24],bH:[11,-31]});
    case 'hit': return P({hip:[-2,-24],neck:[-7,-43],head:[-10,-51],
        fK:[5,-12],fF:[8,0], bK:[-7,-12],bF:[-11,0],
        fS:[-5,-41],fE:[2,-46],fH:[6,-52], bS:[-8,-41],bE:[-15,-38],bH:[-20,-43]});
    case 'kd': return P({hip:[-6,-4],neck:[-25,-5],head:[-34,-6],
        fK:[3,-7],fF:[13,-2], bK:[2,-3],bF:[12,-1],
        fS:[-23,-6],fE:[-17,-11],fH:[-12,-6], bS:[-23,-4],bE:[-30,-2],bH:[-36,-1]});
    case 'special': return P({hip:[0,-24],neck:[3,-44],head:[4,-53],
        fK:[9,-12],fF:[12,0], bK:[-6,-12],bF:[-11,0],
        fS:[6,-42],fE:[15,-41],fH:[24,-41], bS:[2,-42],bE:[12,-45],bH:[21,-46]});
    case 'charge': return P({hip:[0,-21+bob],neck:[0,-41+bob],head:[0,-50+bob],
        fK:[8,-11],fF:[11,0], bK:[-8,-11],bF:[-11,0],
        fS:[4,-39+bob],fE:[9,-31],fH:[7,-24+bob*2], bS:[-3,-39+bob],bE:[-8,-31],bH:[-6,-24+bob*2]});
    case 'win': return P({hip:[0,-24+bob],neck:[1,-44+bob],head:[2,-53+bob],
        fK:[6,-12],fF:[8,0], bK:[-5,-12],bF:[-8,0],
        fS:[3,-42+bob],fE:[6,-52+bob],fH:[6,-63+bob], bS:[-1,-42+bob],bE:[-6,-34],bH:[-2,-28]});
    case 'dash': return P({hip:[0,-23],neck:[7,-41],head:[10,-49],
        fK:[9,-12],fF:[13,-1], bK:[-6,-13],bF:[-14,-3],
        fS:[8,-39],fE:[3,-32],fH:[-3,-28], bS:[5,-39],bE:[0,-33],bH:[-6,-30]});
    case 'grab': return P({hip:[1,-24],neck:[5,-44],head:[6,-53],
        fK:[8,-12],fF:[11,0], bK:[-5,-12],bF:[-10,0],
        fS:[7,-42],fE:[15,-38],fH:[21,-34], bS:[3,-42],bE:[13,-44],bH:[20,-40]});
    case 'upper': { const ext=f===1;
      return P({hip:[1,-24],neck:[4,-46],head:[5,-55],
        fK:[8,-13],fF:[11,0], bK:[-5,-12],bF:[-10,0],
        fS:[6,-44],fE:ext?[11,-52]:[12,-36],fH:ext?[13,-66]:[14,-30], bS:[2,-44],bE:[0,-36],bH:[5,-40]}); }
    case 'heavy': { const ext=f===1;
      return P({hip:[2,-24],neck:ext?[8,-42]:[-1,-45],head:ext?[10,-50]:[-2,-54],
        fK:[10,-12],fF:[14,0], bK:[-5,-11],bF:[-11,0],
        fS:ext?[9,-40]:[1,-43],fE:ext?[18,-46]:[-2,-55],fH:ext?[28,-36]:[4,-62], bS:ext?[5,-40]:[-3,-43],bE:[-4,-34],bH:[0,-30]}); }
    case 'round': { const ext=f===1;
      return P({hip:[0,-25],neck:[-6,-43],head:[-8,-51],
        fK:ext?[14,-38]:[8,-28],fF:ext?[31,-47]:[16,-24], bK:[-3,-12],bF:[-4,0],
        fS:[-4,-41],fE:[-12,-44],fH:[-18,-40], bS:[-7,-41],bE:[2,-46],bH:[8,-44]}); }
    case 'lunge': { const ext=f===1;
      return P({hip:[3,-22],neck:[9,-40],head:[12,-48],
        fK:ext?[16,-20]:[10,-18],fF:ext?[31,-18]:[14,-10], bK:[-6,-11],bF:[-15,0],
        fS:[10,-38],fE:[5,-31],fH:[0,-28], bS:[7,-38],bE:[12,-32],bH:[16,-36]}); }
    case 'dive': return P({hip:[0,-30],neck:[-5,-49],head:[-6,-58],
        fK:[9,-22],fF:[20,-8], bK:[3,-24],bF:[11,-11],
        fS:[-2,-47],fE:[-9,-50],fH:[-14,-56], bS:[-5,-47],bE:[2,-52],bH:[7,-56]});
    case 'dizzy': { const sw=[-2,0,2,0][f%4];
      return P({hip:[sw,-23],neck:[sw*2,-43],head:[sw*3,-51],
        fK:[6,-12],fF:[8,0], bK:[-6,-12],bF:[-9,0],
        fS:[sw*2+2,-41],fE:[8,-31],fH:[6,-24], bS:[sw*2-2,-41],bE:[-6,-31],bH:[-5,-24]}); }
    case 'throw': { const ext=f===1;
      return P({hip:[0,-24],neck:ext?[-6,-43]:[5,-44],head:ext?[-8,-52]:[6,-53],
        fK:[7,-12],fF:[10,0], bK:[-6,-12],bF:[-11,0],
        fS:ext?[-3,-42]:[7,-42],fE:ext?[-12,-50]:[15,-38],fH:ext?[-18,-60]:[21,-36], bS:ext?[-6,-42]:[3,-42],bE:ext?[-14,-46]:[13,-44],bH:ext?[-20,-54]:[20,-40]}); }
    default: // idle
      return P({hip:[0,-24+bob],neck:[1,-44+bob],head:[2,-53+bob],
        fK:[6,-12],fF:[9,0], bK:[-5,-12],bF:[-9,0],
        fS:[3,-42+bob],fE:[10,-35+bob],fH:[13,-43+bob], bS:[-1,-42+bob],bE:[2,-34+bob],bH:[8,-39+bob]});
  }
}

// ---------- primitives ----------
const hp=v=>Math.round(v*2)/2;
function px(c,x,y,w,h,col){ c.fillStyle=col; c.fillRect(hp(OX+x),hp(OY+y),w,h); }
function line(c,a,b,w,col){
  c.fillStyle=col;
  const dx=b[0]-a[0], dy=b[1]-a[1], n=Math.max(1,Math.ceil(Math.hypot(dx,dy)));
  const m=n*2;
  for(let i=0;i<=m;i++){
    const x=a[0]+dx*i/m, y=a[1]+dy*i/m;
    c.fillRect(hp(OX+x-w/2),hp(OY+y-w/2),w,w);
  }
}
function lerp(a,b,t){ return [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t]; }
function capsule(c,a,b,w0,w1,col,ox,oy){ // tapered round-ended stroke
  c.fillStyle=col; const dx=b[0]-a[0], dy=b[1]-a[1], n=Math.max(2,Math.ceil(Math.hypot(dx,dy)*2));
  for(let i=0;i<=n;i++){ const t=i/n, w=w0+(w1-w0)*t, x=OX+a[0]+dx*t+(ox||0), y=OY+a[1]+dy*t+(oy||0); c.beginPath(); c.arc(x,y,w/2,0,Math.PI*2); c.fill(); }
}
function limb(c,a,b,w0,w1,col){ // shadow side, base, rim light
  capsule(c,a,b,w0,w1,shade(col,0.7),0.7,0.8);
  capsule(c,a,b,w0,w1,col,0,0);
  capsule(c,a,b,w0*0.32,w1*0.32,shade(col,1.28),-w0*0.22,-w0*0.22);
}
function fist(c,x,y,col,r){ r=r||2.7; c.fillStyle=shade(col,0.72); c.beginPath(); c.arc(OX+x+0.5,OY+y+0.6,r,0,7); c.fill();
  c.fillStyle=col; c.beginPath(); c.arc(OX+x,OY+y,r,0,7); c.fill(); c.fillStyle=shade(col,1.25); c.beginPath(); c.arc(OX+x-0.8,OY+y-0.9,r*0.42,0,7); c.fill();
  c.fillStyle=shade(col,0.8); c.fillRect(OX+x+r*0.2,OY+y-r*0.7,0.5,r*1.3); }
function shoe(c,ft,col,back){ const x=OX+ft[0], y=OY+ft[1], cc=back?shade(col,0.72):col;
  c.fillStyle=cc; c.beginPath(); c.moveTo(x-3.5,y+1); c.lineTo(x-3.5,y-2.6); c.quadraticCurveTo(x+1,y-3.4,x+3.5,y-1.6); c.quadraticCurveTo(x+6,y-1,x+5.8,y+1); c.closePath(); c.fill();
  c.fillStyle=shade(cc,1.35); c.fillRect(x-1,y-2.6,3,0.8);
  c.fillStyle=back?'#bbb':'#f4f0e8'; c.fillRect(x-3.5,y+0.2,9.3,1.1); }
function torso(c,J,s,top){
  const sx=J.neck[0]-J.hip[0], sy=J.neck[1]-J.hip[1], L=Math.hypot(sx,sy)||1, nx=-sy/L, ny=sx/L;
  const big=s.size>1, sw=(big?17:15)/2, ww=(big?14:11.5)/2;
  const N=[OX+J.neck[0],OY+J.neck[1]+1.5], H=[OX+J.hip[0],OY+J.hip[1]];
  const pts=[[N[0]+nx*sw,N[1]+ny*sw],[H[0]+nx*ww,H[1]+ny*ww],[H[0]-nx*ww,H[1]-ny*ww],[N[0]-nx*sw,N[1]-ny*sw]];
  c.save(); c.beginPath(); pts.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1])); c.closePath();
  c.fillStyle=top; c.fill(); c.clip();
  const g=c.createLinearGradient(N[0]-nx*sw,N[1]-ny*sw,N[0]+nx*sw,N[1]+ny*sw); g.addColorStop(0,shade(top,0.68)); g.addColorStop(0.45,top); g.addColorStop(1,shade(top,1.18));
  c.fillStyle=g; c.fillRect(Math.min(H[0],N[0])-14,Math.min(H[1],N[1])-8,34,Math.abs(sy)+18);
  c.fillStyle=shade(top,1.3); c.fillRect(N[0]-sw,N[1]-1,sw*2,1.4);
  c.fillStyle=shade(top,0.6); c.fillRect(H[0]-ww-1,H[1]-1.6,ww*2+2,1.6);
  c.restore();
}

// ---------- heads ----------
function drawHead(c,s,h,f){
  const [x,y]=h, k=s.skin;
  switch(s.head){
    case 'bag':
      px(c,x-7,y-8,14,16,'#c9a66b'); px(c,x-7,y-9,3,2,'#c9a66b'); px(c,x-1,y-10,4,2,'#c9a66b'); px(c,x+4,y-9,3,2,'#c9a66b');
      px(c,x-7,y+4,14,1,'#a8854a'); px(c,x+1,y-3,2,3,'#2b1405'); px(c,x+5,y-3,2,3,'#2b1405'); px(c,x+2,y+2,4,1,'#2b1405'); break;
    case 'helmet':
      px(c,x-8,y-9,16,17,'#f4f4f4'); px(c,x-1,y-5,9,9,'#ff6a00'); px(c,x+1,y-4,3,2,'#ffd8b0'); px(c,x-8,y+6,16,2,'#bdbdbd'); px(c,x-7,y-10,14,1,'#f4f4f4'); break;
    case 'mask':
      px(c,x-6,y-8,12,15,'#1d1d1d'); px(c,x-1,y-3,8,3,k); px(c,x+3,y-3,2,2,'#fff'); px(c,x+4,y-2,1,1,'#000'); px(c,x-6,y-9,12,1,'#1d1d1d'); break;
    case 'bear':
      px(c,x-7,y-7,14,14,k); px(c,x-7,y-10,4,4,k); px(c,x+3,y-10,4,4,k); px(c,x-6,y-9,2,2,'#c98d63'); px(c,x+4,y-9,2,2,'#c98d63');
      px(c,x+2,y,7,5,'#c98d63'); px(c,x+7,y,2,2,'#111'); px(c,x+2,y-4,2,2,'#111'); px(c,x+1,y-6,4,1,'#3a1f10'); break;
    case 'bull':
      px(c,x-6,y-7,13,14,k); px(c,x+3,y,7,6,'#8a5a3a'); px(c,x+7,y+1,1,2,'#111'); px(c,x+5,y+5,4,2,'#ffcc00');
      px(c,x+2,y-4,2,2,'#ff2e2e'); px(c,x-10,y-9,5,2,'#f4ecd8'); px(c,x-11,y-12,2,4,'#f4ecd8'); px(c,x+4,y-9,5,2,'#f4ecd8'); px(c,x+8,y-12,2,4,'#f4ecd8'); break;
    case 'whale':
      px(c,x-9,y-8,19,15,k); px(c,x-8,y-9,16,1,k); px(c,x-1,y+2,11,5,'#dfe8f5'); px(c,x+4,y-3,2,2,'#111'); px(c,x+5,y-3,1,1,'#fff');
      px(c,x-3,y-12,2,3,'#9fd3ff'); px(c,x-5,y-14,2,2,'#9fd3ff'); px(c,x-1,y-14,2,2,'#9fd3ff'); break;
    case 'goblin':
      px(c,x-6,y-7,12,14,k); px(c,x-12,y-5,7,2,k); px(c,x-14,y-7,3,2,k); px(c,x+5,y-1,4,4,shade(k,0.8)); px(c,x+2,y-4,3,2,'#ffe600'); px(c,x+3,y-4,1,2,'#111');
      px(c,x,y+4,6,1,'#2b1405'); px(c,x+1,y+5,1,1,'#fff'); px(c,x+4,y+5,1,1,'#fff'); px(c,x-6,y-8,12,2,'#4a2c12'); break;
    case 'brain': {
      const g = (f%2)?'#e7c8ff':'#d9b0ff';
      px(c,x-9,y-11,18,15,g); px(c,x-8,y-12,16,1,g);
      px(c,x-6,y-9,5,1,'#9b5fd6'); px(c,x-1,y-7,1,5,'#9b5fd6'); px(c,x+2,y-10,5,1,'#9b5fd6'); px(c,x-7,y-4,4,1,'#9b5fd6'); px(c,x+3,y-5,4,1,'#9b5fd6'); px(c,x-3,y-1,6,1,'#9b5fd6');
      px(c,x-4,y+4,10,6,'#f0c6a0'); px(c,x+3,y+5,2,2,'#111'); px(c,x+2,y+8,3,1,'#7a3b2a'); break;
    }
    case 'npc':
      px(c,x-7,y-8,14,15,k); px(c,x+1,y-3,2,2,'#333'); px(c,x+5,y-3,2,2,'#333'); px(c,x+2,y+2,5,1,'#333'); px(c,x-7,y-8,14,2,'#9a9a9a'); break;
    case 'glitch': {
      const cols=['#00ffd0','#ff00aa','#2200ff','#ffffff','#ffe600'];
      for(let i=0;i<22;i++){ const r=((i*37+f*13)%97)/97, r2=((i*53+f*29)%89)/89; px(c,x-8+Math.floor(r*15),y-9+Math.floor(r2*16),2,2,cols[(i+f)%5]); }
      px(c,x-6,y-7,12,13,'#111'); px(c,x+1,y-3,6,2,'#00ffd0'); px(c,x-2+(f%3),y+2,8,1,'#ff00aa'); break;
    }
    case 'shiba':
      px(c,x-7,y-7,14,13,k); px(c,x-6,y-11,4,4,k); px(c,x+2,y-11,4,4,k); px(c,x-5,y-10,2,2,'#f6e2c6'); px(c,x+3,y-10,2,2,'#f6e2c6');
      px(c,x+1,y,9,5,'#f6e2c6'); px(c,x+8,y,2,2,'#111'); px(c,x+3,y-4,2,2,'#111'); px(c,x+4,y+3,4,1,'#c0662d'); px(c,x-7,y+1,4,3,'#f6e2c6'); break;
    case 'cat':
      px(c,x-7,y-6,14,12,k); px(c,x-7,y-10,4,4,k); px(c,x+3,y-10,4,4,k); px(c,x-6,y-9,2,2,'#ffb3c1'); px(c,x+4,y-9,2,2,'#ffb3c1');
      px(c,x+2,y-3,3,2,'#8bff6a'); px(c,x+3,y-3,1,2,'#111'); px(c,x+5,y+1,2,1,'#ffb3c1'); px(c,x+3,y+1,7,1,'#eee'); px(c,x+3,y+3,7,1,'#eee'); px(c,x-7,y-6,4,2,shade(k,0.75)); px(c,x-5,y-2,3,1,shade(k,0.75)); break;
    case 'sheep':
      for(const [a,b] of [[-10,-9],[-5,-12],[1,-12],[6,-9],[-11,-3],[-10,3],[-4,6]]) px(c,x+a,y+b,7,7,'#f2ece0');
      px(c,x-1,y-6,9,13,k); px(c,x+3,y-3,2,2,'#fff'); px(c,x+4,y-2,1,1,'#000'); px(c,x+5,y+4,2,1,'#888'); px(c,x-4,y-4,4,2,k); break;
    default: { // human
      px(c,x-6,y-7,12,14,k); px(c,x+5,y-2,2,4,k); // face + nose
      px(c,x-6,y-7,12,1.5,shade(k,1.1)); px(c,x-6,y+5.5,12,1.5,shade(k,0.82)); px(c,x+5,y+1.5,2,0.5,shade(k,0.7));
      px(c,x-6,y-1,2,3,shade(k,0.85)); px(c,x-5.5,y-0.5,1,1.5,shade(k,0.7));
      px(c,x+3.5,y+1,2,1,'rgba(255,110,110,0.35)');
      const hc = s.hairC||'#2b1405';
      switch(s.hair){
        case 'short': px(c,x-7,y-9,13,4,hc); px(c,x-7,y-6,3,4,hc); break;
        case 'messy': px(c,x-7,y-10,14,4,hc); px(c,x-8,y-8,3,6,hc); px(c,x-3,y-11,2,2,hc); px(c,x+3,y-11,2,2,hc); break;
        case 'spiky': for(let i=0;i<5;i++) px(c,x-8+i*3,y-12+(i%2)*2,3,5,hc); px(c,x-7,y-8,14,2,hc); break;
        case 'long': px(c,x-8,y-9,14,4,hc); px(c,x-9,y-6,4,14,hc); break;
        case 'strawhat': px(c,x-11,y-8,22,2,hc); px(c,x-6,y-12,12,4,hc); px(c,x-6,y-9,12,1,'#c0262d'); break;
        case 'slick': px(c,x-7,y-9,13,3,hc); px(c,x-8,y-7,4,5,hc); px(c,x+3,y-10,3,2,hc); break;
        case 'cap': px(c,x-7,y-10,13,4,hc); px(c,x-11,y-8,5,2,hc); px(c,x-7,y-7,3,3,'#2b1405'); break;
        case 'mohawk': px(c,x-3,y-14,5,7,hc); px(c,x-7,y-8,13,1,shade(k,0.8)); break;
        case 'anime': for(let i=0;i<6;i++) px(c,x-10+i*3,y-13+(i%2)*3,4,6,hc); px(c,x-8,y-8,15,3,hc); px(c,x+3,y-7,3,4,hc); px(c,x-9,y-6,3,6,hc); break;
        case 'hood': px(c,x-8,y-10,15,4,hc); px(c,x-9,y-7,4,15,hc); px(c,x+5,y-7,2,3,hc); break;
        case 'bald': px(c,x-5,y-8,10,1,shade(k,1.08)); px(c,x-7,y-4,2,3,'#6b4a2b'); px(c,x-3,y-7.5,3,1,'rgba(255,255,255,0.45)'); break;
      }
      if(s.hair && !['bald','strawhat','cap','hood'].includes(s.hair)){ px(c,x-4,y-9,4,0.5,shade(hc,1.6)); px(c,x+1,y-9.5,2.5,0.5,shade(hc,1.45)); }
      const e = s.eyes||'normal';
      if(e==='shades'){ px(c,x,y-4,8,3,'#111'); px(c,x-4,y-4,4,1,'#111'); px(c,x+1,y-4,2,1,'#5ad1ff'); px(c,x+2,y+3,4,1,'#7a3b2a'); }
      else if(e==='shock'){ px(c,x+1,y-5,3,3,'#fff'); px(c,x+2,y-4,1,1,'#000'); px(c,x+2,y+1,4,4,'#3a0a0a'); px(c,x+1,y-7,4,1,'#2b1405'); }
      else if(e==='angry'){ px(c,x+1.5,y-3.5,3,2.5,'#ffffff'); px(c,x+2.5,y-3,1.5,2,'#1a0b02'); px(c,x+1,y-5,4,1,'#2b1405'); px(c,x+2,y+3,4,1,'#7a3b2a'); px(c,x+4,y+2,1,1,'#7a3b2a'); }
      else if(e==='tired'){ px(c,x+1.5,y-3,3,2,'#f0e8e0'); px(c,x+2.5,y-2.5,1.5,1.5,'#1a0b02'); px(c,x+1,y-1,4,1,'#8a5a8a'); px(c,x+2,y+3,4,1,'#7a3b2a'); }
      else if(e==='smug'){ px(c,x+2,y-3,3,1,'#111'); px(c,x+1,y-4,4,1,'#2b1405'); px(c,x+1,y+3,5,1,'#7a3b2a'); px(c,x+5,y+2,1,1,'#7a3b2a'); }
      else { px(c,x+1.5,y-3.5,3,2.5,'#ffffff'); px(c,x+2.5,y-3,1.5,2,'#1a0b02'); px(c,x+2.5,y-3,0.5,0.5,'#ffffff'); px(c,x+1,y-5,3.5,1,'#2b1405'); px(c,x+2,y+3,4,1,'#7a3b2a'); px(c,x+2.5,y+3.5,3,0.5,shade(k,0.75)); }
    }
  }
}

// ---------- body ----------
function drawFighterRaw(c, s, poseName, f){
  if(poseName==='ball') return drawBall(c,s,f);
  const J = pose(poseName, f);
  const top=s.top, pants=s.pants, skin=s.skin, shoe_=s.shoes;
  const dk = v=>shade(v,0.72);
  const hasHumanArms = !['bear','bull','whale','shiba','cat','sheep','goblin'].includes(s.head);
  const handC = s.acc==='paperHands' ? '#ffffff' : (['bear','bull','shiba','cat','sheep','whale','goblin'].includes(s.head)? skin : skin);

  // accessories behind
  if(s.acc==='jetpack'){ px(c,J.neck[0]-11,J.neck[1]+2,6,14,'#9a9a9a'); px(c,J.neck[0]-10,J.neck[1]+16,4,3,'#ff6a00'); px(c,J.neck[0]-10,J.neck[1]+19,4,2,'#ffd23f'); }
  if(s.acc==='rug'){ line(c,[J.neck[0]-10,J.neck[1]-2],[J.hip[0]-4,J.hip[1]+6],6,'#c0262d'); line(c,[J.neck[0]-10,J.neck[1]-2],[J.hip[0]-4,J.hip[1]+6],2,'#ffd23f'); }
  if(s.acc==='scarf'){ const n=J.neck; line(c,[n[0]-2,n[1]+2],[n[0]-14,n[1]+4+(f%2)*2],3,'#e0262d'); line(c,[n[0]-12,n[1]+4],[n[0]-20,n[1]+1+(f%2)*3],3,'#e0262d'); }

  // back leg + back arm
  limb(c,J.hip,J.bK,6.5,5.5,dk(pants)); limb(c,J.bK,J.bF,5.5,4.2,dk(pants)); shoe(c,J.bF,shoe_,true);
  limb(c,J.bS,J.bE,5.2,4.4,dk(top)); limb(c,J.bE,J.bH,4.2,3.6,dk(skin));
  drawHand(c,s,J.bH,true,handC,f);

  // torso
  const tw = s.size>1 ? 15 : 13;
  torso(c,J,s,top);
  if(s.acc==='belt'){ const p=lerp(J.hip,J.neck,0.12); px(c,p[0]-tw/2,p[1]-1,tw,2,'#111'); px(c,p[0]+3,p[1]-1,2,5,'#111'); }
  if(s.acc==='tie'){ const a=lerp(J.hip,J.neck,0.95), b=lerp(J.hip,J.neck,0.35); line(c,a,b,2,'#e0262d'); const w=lerp(J.hip,J.neck,0.98); px(c,w[0]-2,w[1]-1,4,2,'#fff'); }
  if(s.head==='whale'){ const p=lerp(J.hip,J.neck,0.5); px(c,p[0]+2,p[1]-6,2,10,'#fff'); }
  if(s.id==='diamond'){ const p=lerp(J.hip,J.neck,0.6); px(c,p[0]-1,p[1]-2,4,4,'#5ad1ff'); }
  if(s.id==='bull'||s.id==='bear'){ const p=lerp(J.hip,J.neck,0.6); px(c,p[0]-2,p[1]-2,5,4,s.id==='bull'?'#c6ffb0':'#ffb0b0'); }
  if(s.id==='doom'||s.id==='keyboard'){ const p=lerp(J.hip,J.neck,0.55); px(c,p[0]-3,p[1]-1,7,1,shade(top,1.6)); }
  if(s.id==='ratio'){ const p=lerp(J.hip,J.neck,0.55); px(c,p[0]-2,p[1]-3,1,1,'#ff2ec4'); px(c,p[0]+2,p[1]+1,1,1,'#ff2ec4'); line(c,[p[0]+2,p[1]-3],[p[0]-2,p[1]+1],1,'#ff2ec4'); }
  if(s.id==='lag'){ for(let i=0;i<4;i++){ const p=lerp(J.hip,J.neck,(i*0.23+f*0.07)%1); px(c,p[0]-6+((i*5+f*3)%9),p[1],4,1,'#00ffd0'); } }
  if(s.id==='main'){ const p=lerp(J.hip,J.neck,0.55); px(c,p[0]-1,p[1]-3,3,6,'#ffb000'); }

  // front leg
  limb(c,J.hip,J.fK,7,5.8,pants); limb(c,J.fK,J.fF,5.8,4.4,pants); shoe(c,J.fF,shoe_,false);

  // head (neck first)
  capsule(c,J.neck,lerp(J.neck,J.head,0.5),4.2,4,shade(skin,0.8),0,0);
  c.save(); const hx=OX+J.head[0], hy=OY+J.head[1]; c.translate(hx,hy); c.scale(1.12,1.12); c.translate(-hx,-hy);
  drawHead(c,s,J.head,f);
  c.restore();
  if(s.acc==='monocle'){ px(c,J.head[0]+2,J.head[1]-5,5,1,'#ffd23f'); px(c,J.head[0]+2,J.head[1]-1,5,1,'#ffd23f'); px(c,J.head[0]+2,J.head[1]-4,1,3,'#ffd23f'); px(c,J.head[0]+6,J.head[1]-4,1,3,'#ffd23f'); }
  if(s.acc==='gasmask'){ px(c,J.head[0]+1,J.head[1]+1,8,5,'#444'); px(c,J.head[0]+6,J.head[1]+2,3,3,'#2f7d6d'); line(c,[J.head[0]+2,J.head[1]+6],[J.neck[0]-6,J.neck[1]+8],2,'#555'); }
  if(s.acc==='bang'){ px(c,J.head[0]-1,J.head[1]-20,3,7,'#ffd23f'); px(c,J.head[0]-1,J.head[1]-11,3,2,'#ffd23f'); }
  if(s.acc==='arrow'){ const yy=J.head[1]-17+(f%2); px(c,J.head[0]+6,yy,8,3,'#ff2e2e'); px(c,J.head[0]+2,yy-2,4,7,'#ff2e2e'); px(c,J.head[0]+1,yy-1,1,5,'#ff2e2e'); }
  if(s.acc==='sprout'){ px(c,J.head[0]-1,J.head[1]-15,2,4,'#3fae2a'); px(c,J.head[0]-4,J.head[1]-16,3,2,'#5fd13a'); px(c,J.head[0]+1,J.head[1]-17,3,2,'#5fd13a'); }

  // front arm
  limb(c,J.fS,J.fE,5.6,4.6,top); limb(c,J.fE,J.fH,4.4,3.8,skin);
  drawHand(c,s,J.fH,false,handC,f);
}

function drawHand(c,s,h,back,handC,f){
  const [x,y]=h;
  if(s.acc==='diamondFists'){ const cx=OX+x, cy=OY+y; c.fillStyle=back?'#2a87b6':'#3aa7d6'; c.beginPath(); c.moveTo(cx,cy-4.5); c.lineTo(cx+4,cy); c.lineTo(cx,cy+4.5); c.lineTo(cx-4,cy); c.closePath(); c.fill();
    c.fillStyle=back?'#5ad1ff':'#9be8ff'; c.beginPath(); c.moveTo(cx,cy-4.5); c.lineTo(cx+4,cy); c.lineTo(cx,cy); c.closePath(); c.fill(); px(c,x-1.5,y-2,1.5,1.5,'#ffffff'); return; }
  fist(c,x,y,back?shade(handC,0.75):handC);
  if(back) return;
  if(s.acc==='nozzle'){ px(c,x+1,y-1,7,3,'#111'); px(c,x+7,y-1,2,2,'#ffd23f'); }
  if(s.acc==='phone'){ px(c,x+1,y-6,4,8,'#111'); px(c,x+2,y-5,2,5,(f%2)?'#7fdcff':'#bff0ff'); }
  if(s.acc==='keyboard'){ px(c,x-2,y+2,12,4,'#ddd'); for(let i=0;i<5;i++) px(c,x-1+i*2,y+3,1,1,'#555'); }
  if(s.acc==='controller'){ px(c,x-3,y+1,8,4,'#222'); px(c,x+3,y+2,1,1,'#ff2e2e'); }
}

function drawBall(c,s,f){ // Loaf Mode
  const cx=0, cy=-12;
  px(c,cx-13,cy-9,26,19,s.skin); px(c,cx-11,cy-11,22,2,s.skin);
  const r=(f%4); const ears=[[6,-12],[10,-6],[6,0],[-2,-10]][r];
  px(c,cx+ears[0],cy+ears[1],4,4,s.skin); px(c,cx+ears[0]-6,cy+ears[1],4,4,s.skin);
  px(c,cx-8,cy-4,12,2,shade(s.skin,0.75)); px(c,cx-6,cy+2,10,2,shade(s.skin,0.75));
  px(c,cx+5,cy-3,2,2,'#8bff6a');
}

function outline(c, alt){
  const BW=W*RES, BH=H*RES;
  const img=c.getImageData(0,0,BW,BH), d=img.data, o=new Uint8ClampedArray(d);
  const oc=[0x1a,0x0b,0x02];
  const A=(x,y)=> x>=0&&y>=0&&x<BW&&y<BH ? d[(y*BW+x)*4+3] : 0;
  for(let y=0;y<BH;y++) for(let x=0;x<BW;x++){
    const i=(y*BW+x)*4;
    if(d[i+3]){
      // soft volume: light from top-left, shade bottom-right edges
      const top=!A(x,y-2)||!A(x-2,y), bot=!A(x,y+3)||!A(x+3,y);
      const k = top? 1.18 : bot? 0.74 : 1;
      if(k!==1){ o[i]=Math.min(255,d[i]*k); o[i+1]=Math.min(255,d[i+1]*k); o[i+2]=Math.min(255,d[i+2]*k); }
      continue;
    }
    // 2px outline at backing res (= 1 logical px), rounded corners
    let n=0; for(let dy=-2;dy<=2;dy++) for(let dx=-2;dx<=2;dx++){ if(Math.abs(dx)+Math.abs(dy)>3) continue; if(A(x+dx,y+dy)){ n=1; dy=3; break; } }
    if(n){ o[i]=oc[0];o[i+1]=oc[1];o[i+2]=oc[2];o[i+3]=255; }
  }
  if(alt){ // mirror palette: rotate channels on non-outline pixels
    for(let i=0;i<o.length;i+=4){ if(!o[i+3]) continue; if(o[i]===oc[0]&&o[i+1]===oc[1]&&o[i+2]===oc[2]) continue; const r=o[i],g=o[i+1],b=o[i+2]; o[i]=b;o[i+1]=r;o[i+2]=g; }
  }
  img.data.set(o); c.putImageData(img,0,0);
}

function flash(cv){
  const c2=document.createElement('canvas'); c2.width=cv.width; c2.height=cv.height;
  const c=c2.getContext('2d'); c.drawImage(cv,0,0); c.globalCompositeOperation='source-atop'; c.fillStyle='#fff'; c.fillRect(0,0,cv.width,cv.height);
  return c2;
}

function get(spec, poseName, frame, alt, white){
  frame=((frame%4)+4)%4;
  const key=spec.id+'|'+poseName+'|'+frame+'|'+(alt?1:0)+'|'+(white?1:0);
  let cv=cache.get(key);
  if(cv) return cv;
  if(white){ cv=flash(get(spec,poseName,frame,alt,false)); cache.set(key,cv); return cv; }
  const base=document.createElement('canvas'); base.width=W*RES; base.height=H*RES;
  const c=base.getContext('2d'); c.scale(RES,RES);
  drawFighterRaw(c,spec,poseName,frame);
  c.setTransform(1,0,0,1,0,0);
  outline(c,alt);
  cv=base;
  if(spec.size && spec.size!==1){
    const s=spec.size, sc=document.createElement('canvas'); sc.width=Math.round(W*RES*s); sc.height=Math.round(H*RES*s);
    const x=sc.getContext('2d'); x.imageSmoothingEnabled=false; x.drawImage(base,0,0,sc.width,sc.height); cv=sc;
  }
  cv._ox = Math.round(OX*RES*(spec.size||1)); cv._oy = Math.round(OY*RES*(spec.size||1));
  cache.set(key,cv);
  return cv;
}

// Portrait for menus (data URL, scaled crisp)
function portrait(spec, scale, poseName, alt){ // tight-cropped, crisp upscale
  const cv=get(spec,poseName||'idle',0,alt,false), c0=cv.getContext('2d'), d=c0.getImageData(0,0,cv.width,cv.height).data;
  let x0=cv.width,y0=cv.height,x1=0,y1=0;
  for(let y=0;y<cv.height;y++) for(let x=0;x<cv.width;x++) if(d[(y*cv.width+x)*4+3]){ if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; }
  const pad=4; x0=Math.max(0,x0-pad); y0=Math.max(0,y0-pad); x1=Math.min(cv.width-1,x1+pad); y1=Math.min(cv.height-1,y1);
  const w=x1-x0+1, h=y1-y0+1, out=document.createElement('canvas'); out.width=w*scale; out.height=h*scale;
  const c=out.getContext('2d'); c.imageSmoothingEnabled=false; c.drawImage(cv,x0,y0,w,h,0,0,out.width,out.height);
  return out.toDataURL();
}

// background pre-warm: render a fighter's poses in spare frame time so first use never hitches
const ANIM_POSES=['idle','walk','charge','win','dizzy','ball'], TWO=['punch','kick','cpunch','ckick','upper','heavy','round','lunge','throw'], ONE=['crouch','jump','jkick','jpunch','block','cblock','hit','kd','special','dash','grab','dive'];
const warmQ=[], warmed=new Set();
function prewarm(spec,alt){ const k=spec.id+(alt?'a':''); if(warmed.has(k)) return; warmed.add(k);
  ANIM_POSES.forEach(p=>{ for(let f=0;f<4;f++) warmQ.push([spec,p,f,alt]); }); TWO.forEach(p=>{ warmQ.push([spec,p,0,alt],[spec,p,1,alt]); }); ONE.forEach(p=>warmQ.push([spec,p,0,alt])); }
function warmTick(budgetMs){ const t=performance.now(); while(warmQ.length && performance.now()-t<budgetMs){ const [s,p,f,a]=warmQ.shift(); get(s,p,f,a,false); } }
DD.Sprites = { get, portrait, shade, W, H, RES, prewarm, warmTick };
})();
