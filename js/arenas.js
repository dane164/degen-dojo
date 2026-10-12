/* DEGEN DOJO — arenas.
   Authored on a 480x270 pixel grid (floor at y=232), ordered-dithered to a limited palette,
   then upscaled 4x nearest-neighbour. Each arena has a background (behind fighters) and a
   foreground (in front of fighters, for depth). */
(function(){
const AW=480, AH=270, FLOOR=232, UP=4;
const cache={}, fgCache={};

// ---------- noise ----------
function hash(x,y,s){ let h=(x*374761393+y*668265263+s*1442695041)|0; h=(h^(h>>>13))*1274126177|0; return ((h^(h>>>16))>>>0)/4294967296; }
function vnoise(x,y,s){ const xi=Math.floor(x), yi=Math.floor(y), xf=x-xi, yf=y-yi, u=xf*xf*(3-2*xf), v=yf*yf*(3-2*yf);
  const a=hash(xi,yi,s), b=hash(xi+1,yi,s), c=hash(xi,yi+1,s), d=hash(xi+1,yi+1,s); return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v; }
function fbm(x,y,s,o){ let t=0,a=0.5,f=1; for(let i=0;i<(o||4);i++){ t+=a*vnoise(x*f,y*f,s+i*17); f*=2; a*=0.5; } return t; }
function rnd(seed){ let s=seed>>>0; return ()=>{ s=(s*1664525+1013904223)>>>0; return s/4294967296; }; }

// ---------- primitives ----------
function R(c,x,y,w,h,col){ c.fillStyle=col; c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h)); }
function hex(h){ const n=parseInt(h.slice(1),16); return [(n>>16)&255,(n>>8)&255,n&255]; }
function mix(a,b,t){ const A=hex(a),B=hex(b); return 'rgb('+A.map((v,i)=>Math.round(v+(B[i]-v)*t)).join(',')+')'; }
function shade(h,f){ const A=hex(h); return 'rgb('+A.map(v=>Math.max(0,Math.min(255,Math.round(v*f)))).join(',')+')'; }
function vgrad(c,y0,y1,stops){ const g=c.createLinearGradient(0,y0,0,y1); stops.forEach((s,i)=>g.addColorStop(Array.isArray(s)?s[0]:i/(stops.length-1),Array.isArray(s)?s[1]:s)); return g; }
function glow(c,x,y,r,col){ const g=c.createRadialGradient(x,y,0,x,y,r); g.addColorStop(0,col); g.addColorStop(1,'rgba(0,0,0,0)'); c.fillStyle=g; c.fillRect(x-r,y-r,r*2,r*2); }
function circ(c,x,y,r,col){ c.fillStyle=col; c.beginPath(); c.arc(x,y,r,0,Math.PI*2); c.fill(); }
function poly(c,pts,col){ c.fillStyle=col; c.beginPath(); pts.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1])); c.closePath(); c.fill(); }
function txt(c,s,x,y,col,size,align){ c.fillStyle=col; c.font=(size||8)+'px "Press Start 2P", monospace'; c.textBaseline='top'; c.textAlign=align||'left'; c.fillText(s,x,y); c.textAlign='left'; }

// texture: modulate brightness of a region with fbm noise (works on the raw pixel grid)
function texture(c,x,y,w,h,amt,scale,seed,octaves){
  const CW=c.canvas.width, CH=c.canvas.height; x=Math.max(0,x|0); y=Math.max(0,y|0); w=Math.min(CW-x,w|0); h=Math.min(CH-y,h|0); if(w<=0||h<=0) return;
  const img=c.getImageData(x,y,w,h), d=img.data;
  for(let j=0;j<h;j++) for(let i=0;i<w;i++){ const k=(j*w+i)*4; if(!d[k+3]) continue; const n=1+(fbm((x+i)/scale,(y+j)/scale,seed,octaves||3)-0.5)*amt*0.5;
    d[k]=Math.min(255,d[k]*n); d[k+1]=Math.min(255,d[k+1]*n); d[k+2]=Math.min(255,d[k+2]*n); }
  c.putImageData(img,x,y);
}
// puffy pixel cloud lit from one side
function cloud(c,x,y,w,lit,mid,dark,seed){
  const r=rnd(seed), n=Math.max(4,(w/10)|0), puffs=[];
  for(let i=0;i<n;i++){ const px=x+(i/(n-1))*w, rr=6+r()*w*0.16*(1-Math.abs(i/(n-1)-0.5)); puffs.push([px,y-rr*0.4+r()*3,rr]); }
  puffs.forEach(p=>circ(c,p[0],p[1]+2,p[2],dark));
  puffs.forEach(p=>circ(c,p[0],p[1],p[2]*0.92,mid));
  puffs.forEach(p=>circ(c,p[0]-p[2]*0.25,p[1]-p[2]*0.3,p[2]*0.6,lit));
  R(c,x-4,y+2,w+8,4,dark);
}
// mountain ridge with lit/shaded faces
function ridge(c,base,height,seed,lit,dark,rough,snow){
  let prev=null;
  for(let x=0;x<=c.canvas.width;x++){
    const hgt=height*(0.35+fbm(x/90,0,seed,4)*0.9)+fbm(x/14,1,seed+5,2)*(rough||6);
    const top=base-hgt;
    if(prev!==null){ const slope=top-prev; R(c,x,top,1,base-top+1, slope>0?lit:dark); }
    if(snow && hgt>height*0.8) R(c,x,top,1,Math.min(6,(hgt-height*0.8)*0.6+1),snow);
    prev=top;
  }
}
// skyline with shaded buildings, windows, rooftop detail
function skyline(c,seed,base,col,minH,maxH,winCols,winChance,opts){
  opts=opts||{}; const r=rnd(seed); let x=opts.x0||-6; const xe=opts.x1||c.canvas.width+6;
  while(x<xe){ const w=(opts.minW||12)+r()*(opts.varW||22), h=minH+r()*(maxH-minH), top=base-h;
    R(c,x,top,w,h,col); R(c,x+w-2,top,2,h,shade(col,0.75)); R(c,x,top,1,h,shade(col,1.25));
    const roof=r(); if(roof<0.25){ R(c,x+w*0.3,top-4,w*0.3,4,col); } else if(roof<0.45){ R(c,x+w/2,top-10,1,10,col); if(opts.blink) R(c,x+w/2-0.5,top-11,2,1,'#ff3b3b'); } else if(roof<0.6){ poly(c,[[x,top],[x+w/2,top-6],[x+w,top]],col); }
    if(winCols){ for(let wy=top+3;wy<base-2;wy+=4) for(let wx=x+2;wx<x+w-3;wx+=3) if(r()<(winChance||0.35)) R(c,wx,wy,1,2,winCols[(r()*winCols.length)|0]); }
    x+=w+(opts.gap||1); }
}
function stars(c,seed,n,yMax,cols){ const r=rnd(seed); for(let i=0;i<n;i++){ const x=r()*c.canvas.width, y=r()*yMax, col=cols[(r()*cols.length)|0]; R(c,x,y,1,1,col); if(r()<0.06){ R(c,x-1,y,3,1,col); R(c,x,y-1,1,3,col); } } }
function bricks(c,x,y,w,h,col,mortar,bw,bh){ R(c,x,y,w,h,col); for(let yy=y;yy<y+h;yy+=bh){ R(c,x,yy,w,1,mortar); const off=(((yy-y)/bh)|0)%2?bw/2:0; for(let xx=x+off;xx<x+w;xx+=bw) R(c,xx,yy,1,bh,mortar); } }
function floorPersp(c,top,bot,line,alpha){
  c.fillStyle=vgrad(c,FLOOR,AH,[top,bot]); c.fillRect(0,FLOOR,AW,AH-FLOOR);
  c.save(); c.globalAlpha=alpha==null?0.35:alpha; c.strokeStyle=line; c.lineWidth=1;
  for(let i=-14;i<=14;i++){ const xb=240+i*38; c.beginPath(); c.moveTo(240+(xb-240)*0.45,FLOOR); c.lineTo(xb,AH); c.stroke(); }
  for(let k=1;k<7;k++){ const y=FLOOR+Math.round(Math.pow(k/7,1.6)*(AH-FLOOR)); R(c,0,y,AW,1,line); }
  c.restore();
}
function reflect(c,y0,h,alpha){ // mirror the scene just above the floor into the floor
  const img=c.getImageData(0,y0-h,AW,h), tmp=document.createElement('canvas'); tmp.width=AW; tmp.height=h; tmp.getContext('2d').putImageData(img,0,0);
  c.save(); c.globalAlpha=alpha; c.translate(0,y0+h); c.scale(1,-1); c.drawImage(tmp,0,0); c.restore();
}
function vignette(c,a){ const g=c.createRadialGradient(240,130,110,240,130,300); g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(0,0,0,'+a+')'); c.fillStyle=g; c.fillRect(0,0,AW,AH); }
function contact(c){ c.fillStyle=vgrad(c,FLOOR,FLOOR+8,['rgba(0,0,0,0.35)','rgba(0,0,0,0)']); c.fillRect(0,FLOOR,AW,8); }
function person(c,x,y,s,col,head){ R(c,x-2*s,y-9*s,4*s,9*s,col); circ(c,x,y-11*s,2*s,head||col); }

// ---------- arenas ----------
// ---------- painterly 16-bit primitives (KOF / SF3 stage style) ----------
// canopy: leaf clumps packed in an ellipse, rendered in passes (silhouette, shadow, body, lit caps, sparkles)
// so it reads as one mass of foliage lit from the top-left instead of a pile of balls
function canopy(c,cx,cy,rx,ry,seed,pal,clumpR){
  const r=rnd(seed), cr=clumpR||Math.max(6,Math.min(rx,ry)*0.3), n=Math.round(rx*ry/(cr*cr)*2.2)+8, pts=[];
  for(let i=0;i<n;i++){ const a=r()*Math.PI*2, d=Math.pow(r(),0.6); pts.push([cx+Math.cos(a)*d*rx, cy+Math.sin(a)*d*ry, cr*(0.6+r()*0.55), r()]); }
  pts.sort((p,q)=>q[1]-p[1]);
  const lit=(x,y)=>Math.max(0,Math.min(1,0.55-(y-cy)/ry*0.55-(x-cx)/rx*0.3));
  const blob=(x,y,rr,col)=>{ c.fillStyle=col; c.beginPath(); c.ellipse(x,y,rr*1.15,rr*0.85,0,0,7); c.fill(); };
  for(const [x,y,rr] of pts) blob(x,y+1,rr+1.5,pal[0]);          // silhouette rim
  for(const [x,y,rr] of pts) blob(x,y,rr,pal[1]);                 // shadow mass
  for(const [x,y,rr] of pts){ const l=lit(x,y); if(l>0.12) blob(x-rr*0.1,y-rr*0.22,rr*0.78,pal[2]); }
  for(const [x,y,rr] of pts){ const l=lit(x,y); if(l>0.38) blob(x-rr*0.25,y-rr*0.4,rr*0.48,pal[3]); }
  for(const [x,y,rr,k] of pts){ const l=lit(x,y); if(l>0.6 && k<0.6){ R(c,x-rr*0.45,y-rr*0.55,2,1,pal[4]); R(c,x-rr*0.2,y-rr*0.62,1,1,pal[4]); } }
}
function trunk(c,x,y0,y1,w,pal){ poly(c,[[x-w*0.6,y1],[x-w*0.4,y0],[x+w*0.4,y0],[x+w*0.7,y1]],pal[0]); poly(c,[[x-w*0.45,y1],[x-w*0.3,y0],[x,y0],[x-w*0.05,y1]],pal[1]); R(c,x-w*0.3,y0,w*0.15,y1-y0,pal[2]); }
// angular rock slab: lit top facet, shaded front, dark rim
function rock(c,x,y,w,h,seed,pal){
  const r=rnd(seed), j=()=> (r()-0.5)*w*0.18;
  const top=[[x-w/2+j(),y-h*0.35+j()*0.3],[x-w*0.2+j(),y-h/2],[x+w*0.25+j(),y-h/2+j()*0.2],[x+w/2+j(),y-h*0.3]];
  const bot=[[x+w/2,y+h*0.1],[x+w*0.4,y+h/2],[x-w*0.45,y+h/2],[x-w/2,y+h*0.05]];
  poly(c,top.concat(bot).map(([a,b])=>[a+(a<x?-1:1),b+(b<y?-1:1)]),pal[0]);
  poly(c,top.concat(bot),pal[1]);
  poly(c,top.concat([[x+w/2-2,y-h*0.05],[x-w/2+2,y-h*0.1]]),pal[2]);
  poly(c,[top[0],top[1],[x-w*0.05,y-h*0.32],[x-w/2+3,y-h*0.22]],pal[3]);
  R(c,top[1][0],top[1][1],w*0.3,1,pal[4]);
  c.strokeStyle=pal[0]; c.lineWidth=1; c.beginPath(); c.moveTo(x+w*0.1,y-h*0.1); c.lineTo(x+w*0.18,y+h*0.25); c.stroke();
}
// distant palace / mansion in atmospheric haze
function palace(c,x,base,w,h,col,lit,dk,win){
  R(c,x,base-h,w,h,col); R(c,x,base-h,w,3,lit); R(c,x+w-3,base-h,3,h,dk);
  for(let fy=base-h+8;fy<base-6;fy+=12) for(let fx=x+5;fx<x+w-6;fx+=9){ R(c,fx,fy,4,7,dk); R(c,fx,fy,4,2,win); }
  R(c,x-2,base-h-4,w+4,4,dk); for(let fx=x;fx<x+w;fx+=6) R(c,fx,base-h-7,3,3,col);
}

const DRAW = {
  floor(c){ // Trading Floor
    c.fillStyle=vgrad(c,0,FLOOR,['#120801','#2a1203','#3d1b06']); c.fillRect(0,0,AW,FLOOR);
    // coffered ceiling with light rows
    for(let row=0;row<3;row++){ const y=2+row*7; for(let x=0;x<AW;x+=24){ R(c,x+2,y,20,4,'#2a1406'); R(c,x+6,y+1,12,2,'#ffd9a0'); glow(c,x+12,y+2,14,'rgba(255,200,120,0.12)'); } }
    // LED wall
    R(c,6,26,468,74,'#050201'); R(c,6,26,468,1,'#5a2a0a'); R(c,6,99,468,1,'#5a2a0a');
    const r=rnd(5);
    for(let i=0;i<6;i++){ const bx=10+i*77.5; R(c,bx,30,72,64,'#0b0503'); for(let g=0;g<4;g++) R(c,bx,40+g*13,72,1,'#1d0d04');
      let py=62; const up=i%2===0;
      for(let k=0;k<14;k++){ const ny=Math.max(34,Math.min(90,py+(r()-(up?0.62:0.38))*12)); const col=ny<py?'#3bff8a':'#ff4b4b'; R(c,bx+3+k*4.9,Math.min(py,ny),3,Math.abs(ny-py)+2,col); R(c,bx+4,Math.min(py,ny)-2,1,0,col); R(c,bx+4+k*4.9,Math.min(py,ny)-3,1,Math.abs(ny-py)+7,col); py=ny; }
      txt(c,['DOJO/USD','BTC','ETH','SOL','GAS','COPE'][i],bx+3,32,'#ffb36b',5); glow(c,bx+36,60,40,up?'rgba(59,255,138,0.10)':'rgba(255,75,75,0.10)'); }
    // marble columns
    for(const x of [0,152,312,462]){ R(c,x,100,18,132,'#5a3a24'); R(c,x,100,4,132,'#7a5034'); R(c,x+14,100,4,132,'#3a2414'); R(c,x-2,100,22,4,'#8a5a38'); R(c,x-2,226,22,6,'#3a2414'); }
    texture(c,0,100,AW,132,0.25,6,3);
    // ticker band
    R(c,0,104,AW,12,'#ff6a00'); R(c,0,104,AW,1,'#ffd23f'); R(c,0,115,AW,1,'#a84300');
    // back row of traders + desks
    for(let i=0;i<14;i++){ const x=6+i*35; person(c,x+10,170,1,'#1c0d05','#2c160a'); }
    for(let row=0;row<2;row++){ const y=160+row*34, sc=row?1.15:0.9, col=row?'#3a1d0a':'#2a1406';
      for(let i=-1;i<9;i++){ const x=i*58+(row?6:34);
        R(c,x,y,52*sc,18*sc,col); R(c,x,y,52*sc,2,'#6a3812'); R(c,x,y+18*sc-2,52*sc,2,shade('#2a1406',0.6));
        for(let m=0;m<3;m++){ const mx=x+4+m*15*sc, my=y-13*sc; R(c,mx,my,13*sc,11*sc,'#0b0503'); R(c,mx+1,my+1,11*sc,8*sc,['#0e2a18','#2a0e0e','#0e1e2a'][(i+m+row)%3]);
          let yy=my+5*sc; for(let q=0;q<5;q++){ const ny=yy+(r()-0.5)*4; R(c,mx+1.5+q*2*sc,Math.min(yy,ny),1.2,Math.abs(ny-yy)+1,(i+m)%2?'#3bff8a':'#ff6b6b'); yy=ny; }
          glow(c,mx+6*sc,my+5*sc,12,'rgba(90,200,255,0.10)'); R(c,mx+5*sc,my+11*sc,3,2,'#111'); }
        if(row===1 && i%2===0) person(c,x+26,y+2,1.2,'#130802','#24120a'); } }
    glow(c,240,190,260,'rgba(255,140,40,0.16)');
    floorPersp(c,'#5a2a0a','#22100a','#8a4416',0.3);
    reflect(c,FLOOR,40,0.18); contact(c);
    texture(c,0,FLOOR,AW,AH-FLOOR,0.25,3,9,2);
    vignette(c,0.45);
  },
  moon(c){
    c.fillStyle=vgrad(c,0,FLOOR,['#010008','#05031a','#0d0828','#1a1038']); c.fillRect(0,0,AW,FLOOR);
    // nebula (noise-shaped)
    const img=c.getImageData(0,0,AW,180), d=img.data;
    for(let y=0;y<180;y++) for(let x=0;x<AW;x++){ const n=fbm(x/70,y/50,4,5), m=Math.max(0,n-0.48)*2.4; const k=(y*AW+x)*4; d[k]+=m*120; d[k+1]+=m*40; d[k+2]+=m*160; }
    c.putImageData(img,0,0);
    stars(c,7,320,200,['#ffffff','#ffd9b3','#b3c7ff','#ffffff']);
    // Earth
    glow(c,392,58,58,'rgba(90,170,255,0.35)');
    c.save(); c.beginPath(); c.arc(392,58,34,0,7); c.clip();
    for(let y=24;y<92;y++) for(let x=358;x<426;x++){ const n=fbm(x/12,y/12,21,4); R(c,x,y,1,1, n>0.55?(n>0.68?'#e7d9a8':'#3f9a4a'):'#2a6fd6'); }
    for(let y=24;y<92;y++) for(let x=358;x<426;x++){ if(fbm(x/9+3,y/5,33,3)>0.62){ c.globalAlpha=0.75; R(c,x,y,1,1,'#ffffff'); c.globalAlpha=1; } }
    const sh=c.createLinearGradient(368,0,426,0); sh.addColorStop(0,'rgba(0,0,20,0)'); sh.addColorStop(0.55,'rgba(0,0,20,0.1)'); sh.addColorStop(1,'rgba(0,0,20,0.85)'); c.fillStyle=sh; c.fillRect(358,24,68,68); c.restore();
    // distant highlands
    ridge(c,200,40,11,'#5c5c6c','#3e3e4c',4);
    ridge(c,214,22,12,'#787888','#525264',3);
    // base: modules + dome + dish + rocket
    R(c,30,196,120,36,'#b9bcc8'); R(c,30,196,120,2,'#e6e8f0'); R(c,30,228,120,4,'#7a7c88'); for(let i=0;i<7;i++){ R(c,36+i*16,206,8,6,'#ffb36b'); glow(c,40+i*16,209,8,'rgba(255,180,100,0.35)'); }
    circ(c,70,196,30,'#d4d7e2'); R(c,40,196,60,2,'#d4d7e2'); c.save(); c.beginPath(); c.arc(70,196,30,Math.PI,0); c.clip(); for(let i=0;i<6;i++) R(c,40+i*10,166,1,30,'#9a9eac'); for(let i=0;i<3;i++) R(c,40,174+i*8,60,1,'#9a9eac'); c.restore(); circ(c,62,184,7,'rgba(255,255,255,0.5)');
    texture(c,30,166,120,66,0.18,3,8);
    R(c,170,150,3,82,'#9aa0ad'); c.fillStyle='#c9ccd6'; c.beginPath(); c.ellipse(178,150,14,6,-0.6,0,Math.PI); c.fill(); R(c,176,148,2,4,'#ff6a00');
    // rocket
    R(c,330,130,4,102,'#666'); R(c,350,130,4,102,'#666'); for(let y=134;y<230;y+=8) R(c,330,y,24,1,'#666');
    R(c,336,120,12,96,'#eeeeee'); R(c,344,120,4,96,'#c4c4c4'); poly(c,[[336,120],[342,104],[348,120]],'#ff6a00'); poly(c,[[336,200],[330,216],[336,216]],'#ff6a00'); poly(c,[[348,200],[354,216],[348,216]],'#ff6a00'); R(c,338,150,8,8,'#2a6fd6'); txt(c,'DOJO',337,170,'#2b1405',4);
    // ground
    c.fillStyle=vgrad(c,FLOOR,AH,['#9a9aa8','#5a5a66']); c.fillRect(0,FLOOR,AW,AH-FLOOR);
    const rr=rnd(9); for(let i=0;i<16;i++){ const x=rr()*AW, y=FLOOR+4+rr()*32, w=6+rr()*18; c.fillStyle='#6d6d7a'; c.beginPath(); c.ellipse(x,y,w,w*0.25,0,0,7); c.fill(); c.fillStyle='#b8b8c6'; c.beginPath(); c.ellipse(x,y+1,w*0.8,w*0.14,0,0,Math.PI); c.fill(); }
    { const mp=['#1a1a24','#5a5a6a','#9a9aaa','#c8c8d6','#f0f0ff'], r2=rnd(91); // moon boulders, KOF-style facets
      for(const [x,y,w,h] of [[22,FLOOR-6,40,22],[60,FLOOR-2,24,12],[440,FLOOR-8,50,26],[404,FLOOR-2,22,10],[170,FLOOR-1,16,7],[300,FLOOR-1,18,8]]) rock(c,x,y,w,h,(x*7)|0,mp);
      for(let i=0;i<10;i++) rock(c,r2()*AW,FLOOR+10+r2()*26,14+r2()*20,6+r2()*6,200+i,mp); }
    texture(c,0,FLOOR,AW,AH-FLOOR,0.3,4,5); contact(c); vignette(c,0.35);
  },
  bazaar(c){
    c.fillStyle=vgrad(c,0,FLOOR,['#3a1440','#a83a3a','#ff7a2a','#ffb347','#ffd27a']); c.fillRect(0,0,AW,FLOOR);
    glow(c,240,118,140,'rgba(255,230,150,0.55)'); circ(c,240,120,26,'#fff1b8');
    for(let i=0;i<5;i++) R(c,200,112+i*5,80,1,'rgba(255,150,60,0.7)');
    cloud(c,40,40,90,'#ffcf8a','#e87a4a','#a84a4a',3); cloud(c,330,30,110,'#ffcf8a','#e87a4a','#a84a4a',5); cloud(c,180,60,60,'#ffd9a0','#f08a5a','#b85a4a',7);
    ridge(c,150,30,3,'#c8641a','#a04a10',3);
    // domes + minarets skyline
    const r=rnd(3);
    for(let i=0;i<10;i++){ const x=4+i*50+r()*10, h=24+r()*36, w=20+r()*12, col=i%2?'#7a2a08':'#6a2206';
      R(c,x,168-h,w,h+10,col); circ(c,x+w/2,168-h,w/2,col); R(c,x+w/2-0.5,168-h-w/2-6,1,6,col); circ(c,x+w/2,168-h-w/2-7,1.5,'#ffd23f');
      for(let k=0;k<3;k++) R(c,x+4+k*(w-8)/2,168-h+8,2,4,'#ffcf6a'); }
    for(let i=0;i<3;i++){ const x=60+i*170; R(c,x,86,8,90,'#5a1c04'); poly(c,[[x-2,86],[x+4,72],[x+10,86]],'#5a1c04'); R(c,x-2,110,12,3,'#5a1c04'); }
    // string lights
    c.strokeStyle='#2b1405'; c.lineWidth=1; for(let s=0;s<2;s++){ c.beginPath(); c.moveTo(0,128+s*8); c.quadraticCurveTo(240,152+s*8,480,128+s*8); c.stroke(); for(let i=1;i<20;i++){ const t=i/20, y=(1-t)*(1-t)*(128+s*8)+2*t*(1-t)*(152+s*8)+t*t*(128+s*8); circ(c,t*480,y+2,1.5,['#ffd23f','#ff6a00','#ff3b3b','#3bff8a'][i%4]); glow(c,t*480,y+2,6,'rgba(255,210,100,0.4)'); } }
    // stalls
    for(let i=0;i<5;i++){ const x=4+i*96;
      R(c,x+4,150,76,82,'#3a1402'); texture(c,x+4,150,76,82,0.3,3,i);
      for(let s=0;s<9;s++){ poly(c,[[x+s*9,140],[x+s*9+9,140],[x+s*9+9,152],[x+s*9+4.5,157],[x+s*9,152]], s%2?'#c0262d':'#ffd23f'); R(c,x+s*9,140,9,1,'#fff1c2'); }
      for(let k=0;k<3;k++){ const cx=x+9+k*23, col=['#c0262d','#2a4fbf','#18a34a','#7b2cff'][(i+k)%4];
        R(c,cx,160,19,56,col); R(c,cx,160,19,2,'#fff1c2');
        for(let t=0;t<4;t++){ const cy=168+t*12; poly(c,[[cx+9.5,cy-4],[cx+15,cy],[cx+9.5,cy+4],[cx+4,cy]],'#ffd23f'); R(c,cx+8.5,cy-1,2,2,col); }
        for(let f=0;f<6;f++) R(c,cx+1+f*3,216,1,3,'#ffd23f'); R(c,cx+17,160,2,56,'rgba(0,0,0,0.3)'); }
      for(let p=0;p<2;p++){ const px=x+14+p*44; c.fillStyle='#b8521a'; c.beginPath(); c.ellipse(px,224,7,8,0,0,7); c.fill(); R(c,px-3,214,6,3,'#b8521a'); R(c,px-5,222,3,1,'#ffd23f'); } }
    c.fillStyle=vgrad(c,FLOOR,AH,['#d8a060','#8a5428']); c.fillRect(0,FLOOR,AW,AH-FLOOR);
    for(let x=-10;x<AW;x+=60){ R(c,x,FLOOR+10,46,22,'#a8202a'); R(c,x+2,FLOOR+12,42,18,'#c0262d'); for(let q=0;q<3;q++) poly(c,[[x+23,FLOOR+13+q*6],[x+29,FLOOR+16+q*6],[x+23,FLOOR+19+q*6],[x+17,FLOOR+16+q*6]],'#ffd23f'); }
    texture(c,0,FLOOR,AW,AH-FLOOR,0.3,3,2); contact(c); vignette(c,0.3);
  },
  volcano(c){
    c.fillStyle=vgrad(c,0,FLOOR,['#080000','#200300','#4a0800','#8a1a00']); c.fillRect(0,0,AW,FLOOR);
    // ash clouds lit from below
    for(let i=0;i<6;i++) cloud(c,-20+i*90,30+(i%3)*14,100,'#7a2a10','#3a0e06','#1a0402',40+i);
    glow(c,240,70,170,'rgba(255,90,0,0.35)');
    ridge(c,200,90,21,'#3a0c04','#220602',10);
    // main volcano
    c.fillStyle='#1c0502'; c.beginPath(); c.moveTo(60,FLOOR); c.lineTo(200,74); c.lineTo(214,68); c.lineTo(266,68); c.lineTo(280,74); c.lineTo(420,FLOOR); c.fill();
    for(let x=60;x<420;x++){ const top=x<200?FLOOR-(x-60)*(158/140):x>280?74+(x-280)*(158/140):70; if(x<240) R(c,x,top,1,3,'#4a1006'); }
    texture(c,60,66,360,166,0.5,6,22);
    // lava rivers
    const lava=(pts,w)=>{ c.strokeStyle='#ff4a00'; c.lineWidth=w+2; c.beginPath(); pts.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1])); c.stroke(); c.strokeStyle='#ffb000'; c.lineWidth=w; c.stroke(); c.strokeStyle='#fff2a0'; c.lineWidth=Math.max(1,w-2); c.stroke(); };
    lava([[232,70],[226,100],[240,130],[230,160],[244,190],[236,232]],3); lava([[256,70],[270,110],[292,150],[300,190],[330,232]],2); lava([[220,72],[200,120],[180,170],[150,232]],2);
    glow(c,240,68,46,'rgba(255,200,60,0.9)'); R(c,212,64,56,5,'#ffd23f');
    // liquidation chart hologram
    c.globalAlpha=0.85; R(c,14,70,132,90,'rgba(255,40,40,0.08)'); c.strokeStyle='#ff3b3b'; c.strokeRect(14.5,70.5,131,89);
    for(let i=0;i<11;i++){ const x=20+i*11.5, h=6+i*5; R(c,x,78+i*6,7,h,'#ff2e2e'); R(c,x+3,74+i*6,1,h+8,'#ff2e2e'); } c.globalAlpha=1;
    txt(c,'LIQUIDATED',380,84,'#ffd23f',6,'center'); txt(c,'-99.9%',380,96,'#ff3b3b',10,'center');
    // basalt ground with lava cracks
    c.fillStyle=vgrad(c,FLOOR,AH,['#2a0a04','#0a0200']); c.fillRect(0,FLOOR,AW,AH-FLOOR);
    texture(c,0,FLOOR,AW,AH-FLOOR,0.6,4,3);
    const r=rnd(12); for(let i=0;i<9;i++){ let x=r()*AW, y=FLOOR+2; c.strokeStyle='#ff5a00'; c.lineWidth=1; c.beginPath(); c.moveTo(x,y); for(let k=0;k<6;k++){ x+=(r()-0.5)*16; y+=4+r()*3; c.lineTo(x,y); } c.stroke(); }
    { const vp=['#0a0200','#3a1208','#6a2810','#a8441a','#ffb060'], r2=rnd(55); // basalt slabs with lava-lit edges
      for(const [x,y,w,h] of [[24,FLOOR-8,48,26],[456,FLOOR-10,56,30],[90,FLOOR-2,26,12],[392,FLOOR-3,30,14]]) rock(c,x,y,w,h,(x*3)|0,vp);
      for(let i=0;i<12;i++) rock(c,r2()*AW,FLOOR+8+r2()*28,16+r2()*24,7+r2()*6,300+i,vp);
      for(let i=0;i<5;i++){ const x=40+r2()*400, y=FLOOR+14+r2()*20; c.fillStyle='#ff5a00'; c.beginPath(); c.ellipse(x,y,10+r2()*10,2.5,0,0,7); c.fill(); c.fillStyle='#ffd23f'; c.beginPath(); c.ellipse(x,y,5,1,0,0,7); c.fill(); glow(c,x,y,22,'rgba(255,90,0,0.25)'); } }
    R(c,0,FLOOR,AW,1,'#ff6a00'); glow(c,240,FLOOR,200,'rgba(255,70,0,0.15)'); contact(c); vignette(c,0.5);
  },
  dock(c){
    c.fillStyle=vgrad(c,0,150,['#1a2a5a','#4a4a8a','#c86a6a','#ffaa5a','#ffd890']); c.fillRect(0,0,AW,150);
    cloud(c,20,40,110,'#ffd0a0','#c87a8a','#7a5a8a',51); cloud(c,250,26,140,'#ffd0a0','#c87a8a','#7a5a8a',52); cloud(c,150,80,70,'#ffe0b0','#e08a7a','#9a6a7a',53); cloud(c,400,70,70,'#ffe0b0','#e08a7a','#9a6a7a',54);
    glow(c,320,146,90,'rgba(255,200,120,0.7)'); circ(c,320,148,18,'#fff0c0');
    // cranes + city on far shore
    skyline(c,61,150,'#4a3a5a',4,22,['#ffd27a'],0.15,{x0:0,x1:170,minW:8,varW:12});
    for(const x of [40,110]){ R(c,x,92,4,58,'#3a2a4a'); R(c,x-24,92,56,3,'#3a2a4a'); R(c,x+28,95,1,18,'#3a2a4a'); R(c,x+24,113,8,4,'#3a2a4a'); for(let y=96;y<150;y+=6) R(c,x,y,4,1,'#5a4a6a'); }
    // sea with sun column
    c.fillStyle=vgrad(c,150,FLOOR,['#5a6aa0','#2a3a6a','#0f1838']); c.fillRect(0,150,AW,FLOOR-150);
    const r=rnd(8); for(let y=152;y<FLOOR;y+=2){ const w=Math.max(4,46-(y-150)*0.25); for(let k=0;k<3;k++){ const x=320+(r()-0.5)*w*1.6; R(c,x-r()*8,y,4+r()*10,1,y<180?'#ffe0a0':'#ffb070'); } }
    for(let i=0;i<70;i++) R(c,r()*AW,152+r()*78,3+r()*8,1,'rgba(160,190,255,0.35)');
    // whale tail
    poly(c,[[150,176],[140,160],[132,154],[146,158],[152,166],[158,158],[172,154],[164,160],[156,176]],'#0a1430'); R(c,140,176,30,2,'#bfe3ff');
    // container ship
    R(c,360,170,116,14,'#1a2232'); poly(c,[[356,170],[476,170],[470,184],[364,184]],'#1a2232'); R(c,360,182,116,2,'#c0262d');
    const cc=['#c0262d','#ff6a00','#2a4fbf','#18a34a','#ffd23f'];
    for(let row=0;row<3;row++) for(let i=0;i<8;i++){ if(row===2&&i>4) continue; const x=380+i*11, y=160-row*8; R(c,x,y,10,7,cc[(i+row*3)%5]); R(c,x,y,10,1,'rgba(255,255,255,0.3)'); for(let l=2;l<10;l+=2) R(c,x+l,y+1,1,6,'rgba(0,0,0,0.2)'); }
    R(c,464,138,10,22,'#e8eef8'); R(c,466,142,6,2,'#2a4fbf'); R(c,468,128,2,10,'#333');
    // pier
    for(let i=0;i<6;i++){ const x=10+i*92; R(c,x,140,9,92,'#4a2c12'); R(c,x+7,140,2,92,'#2a1608'); R(c,x-1,138,11,3,'#6a4420'); }
    c.strokeStyle='#d8b07a'; c.lineWidth=1; for(let i=0;i<5;i++){ c.beginPath(); c.moveTo(19+i*92,150); c.quadraticCurveTo(64+i*92,166,102+i*92,150); c.stroke(); }
    for(const [x,col] of [[300,'#8a5a2b'],[318,'#a06a35'],[309,'#7a4a20']]){ const y=x===309?FLOOR-34:FLOOR-17; R(c,x,y,17,17,col); R(c,x,y,17,1,'#c08a4a'); c.strokeStyle='#4a2a10'; c.strokeRect(x+0.5,y+0.5,16,16); c.beginPath(); c.moveTo(x,y); c.lineTo(x+17,y+17); c.stroke(); }
    c.fillStyle='#5a3a1a'; c.beginPath(); c.ellipse(150,FLOOR-10,8,10,0,0,7); c.fill(); R(c,142,FLOOR-14,16,2,'#3a2410'); R(c,142,FLOOR-6,16,2,'#3a2410');
    c.fillStyle=vgrad(c,FLOOR,AH,['#a6703a','#5a3818']); c.fillRect(0,FLOOR,AW,AH-FLOOR);
    for(let y=FLOOR;y<AH;y+=6) R(c,0,y,AW,1,'#4a2a10'); const r2=rnd(3); for(let y=FLOOR;y<AH;y+=6) for(let x=r2()*60;x<AW;x+=60+r2()*40) R(c,x,y,1,6,'#4a2a10');
    texture(c,0,FLOOR,AW,AH-FLOOR,0.35,2,4); contact(c); vignette(c,0.3);
  },
  coliseum(c){
    c.fillStyle=vgrad(c,0,90,['#ff9a3c','#ffc070','#ffe0a8']); c.fillRect(0,0,AW,90);
    cloud(c,60,22,80,'#fff4e0','#ffd0a0','#e8a070',61); cloud(c,320,16,100,'#fff4e0','#ffd0a0','#e8a070',62);
    glow(c,400,0,120,'rgba(255,255,220,0.6)');
    // arena tiers with arches
    for(let t=0;t<4;t++){ const y=50+t*38, base=['#d8a070','#c88a5c','#b5764a','#a0643c'][t];
      R(c,0,y,AW,38,base); R(c,0,y,AW,2,'#f6d0a0'); R(c,0,y+36,AW,2,shade(base,0.6));
      for(let x=(t%2)*16;x<AW;x+=32){ R(c,x+6,y+10,20,26,shade(base,0.45)); circ(c,x+16,y+10,10,shade(base,0.45)); R(c,x+4,y+4,2,32,shade(base,1.12)); R(c,x+26,y+4,2,32,shade(base,0.8)); } }
    texture(c,0,50,AW,152,0.25,4,61);
    // crowd (dense, shaded heads + raised arms)
    const r=rnd(4), skins=['#e8b48a','#c98d63','#8a5a3a','#f0c6a0','#6b3f1f'], shirts=['#ff6a00','#fff4e6','#2b1405','#ffd23f','#c0262d','#2a4fbf','#18a34a','#7b2cff'];
    for(let t=0;t<4;t++){ const y=50+t*38+30; for(let i=0;i<110;i++){ const x=r()*AW, sk=skins[(r()*5)|0], sh=shirts[(r()*8)|0]; R(c,x-2,y-3,5,7,sh); R(c,x+2,y-3,1,7,shade(sh,0.7)); circ(c,x+0.5,y-6,2.2,sk); if(r()<0.15) R(c,x+3,y-12,1,7,sk); } }
    // comment banners
    const tags=[['+1','#18a34a'],['L + RATIO','#e0262d'],['W','#18a34a'],['FIRST','#c98a00'],['SOURCE?','#2a4fbf']];
    tags.forEach((tg,i)=>{ const x=14+i*94; R(c,x,6,84,30,'#ffffff'); R(c,x,34,84,2,'#d8c8b0'); R(c,x+16,36,1,14,'#6a4a2a'); R(c,x+68,36,1,14,'#6a4a2a'); circ(c,x+10,21,6,'#ffb36b'); R(c,x+20,12,34,3,'#b0b0b0'); txt(c,tg[0],x+20,20,tg[1],6); });
    // podium wall
    R(c,0,202,AW,30,'#7a4b2a'); R(c,0,202,AW,2,'#f6d0a0'); texture(c,0,202,AW,30,0.3,3,7);
    for(let x=10;x<AW;x+=78){ R(c,x,206,36,22,'#ff6a00'); R(c,x+2,208,32,18,'#ff8a2a'); txt(c,'$DOJO',x+18,213,'#2b1405',5,'center'); }
    c.fillStyle=vgrad(c,FLOOR,AH,['#f0c890','#b88a58']); c.fillRect(0,FLOOR,AW,AH-FLOOR); texture(c,0,FLOOR,AW,AH-FLOOR,0.35,2,8);
    contact(c); vignette(c,0.25);
  },
  gas(c){
    c.fillStyle=vgrad(c,0,FLOOR,['#020108','#080620','#141038','#26184a']); c.fillRect(0,0,AW,FLOOR);
    stars(c,13,140,120,['#cfd6ff','#ffffff']);
    skyline(c,77,196,'#0c0a1c',20,70,['#3a2e6a','#ffcf8a','#5a4a9a'],0.12,{blink:true});
    // store
    R(c,300,120,180,112,'#1c1830'); R(c,300,120,180,3,'#3a3460'); R(c,310,140,110,70,'#ffe6b0'); glow(c,365,175,90,'rgba(255,230,170,0.35)');
    for(let s=0;s<3;s++){ R(c,312,150+s*20,106,2,'#8a6a4a'); for(let k=0;k<17;k++) R(c,314+k*6,141+s*20,4,9,['#ff3b3b','#3bff8a','#2a6fd6','#ffd23f','#ff6a00'][(k+s)%5]); }
    person(c,350,206,1.4,'#2a3a5a','#e8b48a'); R(c,430,150,40,82,'#2a2440'); R(c,432,152,36,60,'#4a6aa0'); R(c,449,152,2,60,'#2a2440');
    R(c,316,124,90,12,'#ff2ec4'); txt(c,'24/7 MART',361,126,'#fff',6,'center'); glow(c,361,130,60,'rgba(255,46,196,0.35)');
    // canopy
    glow(c,170,104,190,'rgba(255,190,110,0.28)');
    R(c,10,88,300,16,'#ff6a00'); R(c,10,88,300,2,'#ffd23f'); R(c,10,102,300,2,'#a84300'); txt(c,'GWEI GAS',160,92,'#2b1405',8,'center');
    R(c,10,104,300,4,'#fff0d8'); for(let x=20;x<300;x+=30) glow(c,x,108,10,'rgba(255,250,230,0.6)');
    poly(c,[[20,108],[300,108],[340,FLOOR],[-20,FLOOR]],'rgba(255,240,210,0.08)');
    R(c,24,108,8,124,'#d0d0dc'); R(c,288,108,8,124,'#d0d0dc'); R(c,24,108,2,124,'#ffffff');
    for(let i=0;i<2;i++){ const x=86+i*110; R(c,x,148,36,84,'#c0262d'); R(c,x,148,36,3,'#ff7a6a'); R(c,x+33,148,3,84,'#8a1a1f'); R(c,x+5,156,26,16,'#0b0b12'); txt(c,'$80',x+18,161,'#3bff8a',6,'center'); R(c,x+5,178,26,4,'#ffd23f'); R(c,x+36,166,4,26,'#222'); R(c,x+38,190,2,16,'#222'); glow(c,x+18,164,26,'rgba(59,255,138,0.22)'); }
    // price sign
    R(c,226,20,56,68,'#1b1206'); R(c,252,88,4,20,'#555'); c.strokeStyle='#ff6a00'; c.strokeRect(226.5,20.5,55,67); txt(c,'GAS',254,26,'#ff6a00',7,'center'); txt(c,'420',254,40,'#3bff8a',10,'center'); txt(c,'GWEI',254,60,'#ffd23f',5,'center'); txt(c,'69.0',254,72,'#ff3b3b',6,'center');
    // car silhouette
    c.fillStyle='#0a0814'; c.beginPath(); c.moveTo(372,232); c.lineTo(376,214); c.lineTo(392,206); c.lineTo(430,206); c.lineTo(446,216); c.lineTo(470,220); c.lineTo(472,232); c.fill(); circ(c,390,232,7,'#050308'); circ(c,452,232,7,'#050308'); R(c,466,220,6,3,'#ff3b3b');
    // wet asphalt
    c.fillStyle=vgrad(c,FLOOR,AH,['#2a2834','#0e0d14']); c.fillRect(0,FLOOR,AW,AH-FLOOR);
    reflect(c,FLOOR,60,0.22); texture(c,0,FLOOR,AW,AH-FLOOR,0.4,2,13);
    for(let x=0;x<AW;x+=48) R(c,x,FLOOR+20,24,2,'#d8b020'); contact(c); vignette(c,0.5);
  },
  server(c){
    c.fillStyle=vgrad(c,0,FLOOR,['#04060e','#0a1428','#14284e','#20406e']); c.fillRect(0,0,AW,FLOOR);
    stars(c,17,110,90,['#9fb4ff','#ffffff']);
    circ(c,80,40,12,'#e8ecff'); circ(c,85,37,11,'#0a1428');
    skyline(c,21,170,'#0f1830',50,140,['#ff8a2a','#ffd27a','#5ad1ff'],0.32,{blink:true});
    skyline(c,29,186,'#0a1020',20,80,['#ff6a00','#ffcf8a'],0.22,{blink:true,minW:16});
    R(c,0,150,AW,40,'rgba(90,140,255,0.06)');
    // rooftop: parapet, AC units, dishes, racks
    R(c,0,186,AW,8,'#2a3248'); R(c,0,186,AW,1,'#5a6688');
    for(const x of [14,410]){ R(c,x,160,52,26,'#3a4258'); R(c,x,160,52,2,'#6a7698'); for(let i=0;i<6;i++) R(c,x+4+i*8,166,5,14,'#2a3046'); circ(c,x+40,172,8,'#2a3046'); circ(c,x+40,172,6,'#4a5270'); }
    R(c,90,120,3,66,'#3a4256'); c.fillStyle='#9aa4bc'; c.beginPath(); c.ellipse(96,118,16,7,-0.5,0,Math.PI); c.fill(); R(c,94,116,2,4,'#ff6a00');
    for(let i=0;i<5;i++){ const x=126+i*56; R(c,x,146,48,86,'#1c2232'); R(c,x,146,48,2,'#3a4256'); R(c,x+46,146,2,86,'#0c1018');
      for(let k=0;k<9;k++){ R(c,x+3,151+k*9,42,7,'#0f1320'); for(let l=0;l<3;l++) R(c,x+6+l*4,153+k*9,2,2,(i+k+l)%4?'#3bff8a':'#ff6a00'); R(c,x+24,154+k*9,18,1,'#2a3248'); } glow(c,x+24,190,40,'rgba(59,255,138,0.06)'); }
    c.strokeStyle='#ff6a00'; c.lineWidth=1; c.beginPath(); c.moveTo(66,170); c.bezierCurveTo(100,200,110,150,126,160); c.stroke(); c.strokeStyle='#2a6fd6'; c.beginPath(); c.moveTo(406,176); c.bezierCurveTo(380,200,420,150,398,160); c.stroke();
    c.fillStyle=vgrad(c,FLOOR,AH,['#3a4256','#141824']); c.fillRect(0,FLOOR,AW,AH-FLOOR);
    c.strokeStyle='#ffd23f'; c.lineWidth=2; c.beginPath(); c.ellipse(240,FLOOR+20,90,14,0,0,7); c.stroke(); txt(c,'H',240,FLOOR+14,'#ffd23f',10,'center');
    texture(c,0,FLOOR,AW,AH-FLOOR,0.35,3,17); contact(c); vignette(c,0.45);
  },
  discord(c){
    bricks(c,0,0,AW,FLOOR,'#2a2434','#1a1622',14,6); texture(c,0,0,AW,FLOOR,0.3,4,23);
    c.fillStyle=vgrad(c,0,FLOOR,['rgba(10,8,20,0.6)','rgba(40,20,60,0.1)']); c.fillRect(0,0,AW,FLOOR);
    // ceiling pipes
    R(c,0,0,AW,18,'#141018'); R(c,0,12,AW,4,'#5a5a66'); R(c,0,12,AW,1,'#8a8a96'); for(let x=20;x<AW;x+=70) R(c,x,10,6,8,'#3a3a46');
    // hanging lamps
    for(let i=0;i<4;i++){ const x=60+i*120; R(c,x,18,1,22,'#444'); poly(c,[[x-9,48],[x+9,48],[x+5,40],[x-5,40]],'#1a1a1a'); glow(c,x,54,56,'rgba(255,214,150,0.25)'); poly(c,[[x-9,48],[x+9,48],[x+52,FLOOR],[x-52,FLOOR]],'rgba(255,214,150,0.06)'); }
    // posters
    const posters=[['GM','#ff6a00'],['NGMI','#ff2e2e'],['HODL','#3bff8a']];
    posters.forEach((p,i)=>{ const x=196+i*36, y=60+(i%2)*6; R(c,x,y,28,38,'#f4ecd8'); R(c,x+2,y+2,24,22,p[1]); txt(c,p[0],x+14,y+28,'#2b1405',5,'center'); });
    // monitor wall (chat app)
    R(c,22,64,160,108,'#0a0a10'); R(c,26,68,152,100,'#313338'); R(c,26,68,22,100,'#1e1f22'); R(c,48,68,34,100,'#2b2d31');
    for(let i=0;i<5;i++) circ(c,37,80+i*16,6,['#ff6a00','#5865f2','#3bff8a','#ff2e2e','#ffd23f'][i]);
    for(let i=0;i<9;i++) R(c,52,74+i*10,24,3,i===2?'#ffffff':'#80848e');
    for(let i=0;i<8;i++){ circ(c,90,80+i*11,3.5,['#ff6a00','#5865f2','#3bff8a','#ff2e2e'][i%4]); R(c,97,77+i*11,20,2,['#ffb36b','#a3b1ff','#8affb2','#ff9a9a'][i%4]); R(c,97,81+i*11,26+((i*29)%50),2,'#b5bac1'); }
    glow(c,100,118,110,'rgba(88,101,242,0.2)');
    // gaming desk setup
    R(c,290,150,170,6,'#3a2a1f'); R(c,290,150,170,1,'#6a4a2f'); R(c,296,156,4,76,'#2a1d14'); R(c,450,156,4,76,'#2a1d14');
    R(c,316,96,104,54,'#0a0a10'); R(c,319,99,98,46,'#ff6a00'); txt(c,'MODS',368,108,'#2b1405',8,'center'); txt(c,'ASLEEP',368,124,'#2b1405',8,'center'); R(c,364,145,8,5,'#222');
    R(c,426,104,30,46,'#0a0a10'); R(c,428,106,26,40,'#5865f2'); R(c,324,140,2,0,'#000');
    for(let i=0;i<7;i++) R(c,300+i*6,143,4,7,['#ff6a00','#ffd23f','#3bff8a'][i%3]);
    R(c,340,146,40,4,'#1a1a1a'); for(let i=0;i<10;i++) R(c,342+i*4,147,2,1,['#ff2ec4','#5ad1ff','#3bff8a'][i%3]);
    glow(c,368,124,80,'rgba(255,106,0,0.3)');
    // gaming chair
    R(c,350,160,30,36,'#c0262d'); R(c,352,162,26,32,'#e0362d'); R(c,346,196,38,6,'#1a1a1a'); R(c,363,202,4,24,'#333'); R(c,350,226,30,3,'#333');
    // mini fridge + beanbag
    R(c,196,180,40,52,'#d8d8e0'); R(c,196,180,40,2,'#ffffff'); R(c,232,184,2,10,'#888'); glow(c,216,206,30,'rgba(90,209,255,0.15)');
    c.fillStyle='#7b2cff'; c.beginPath(); c.ellipse(150,222,30,14,0,0,7); c.fill(); c.fillStyle='#9b5cff'; c.beginPath(); c.ellipse(144,216,18,7,0,0,7); c.fill();
    R(c,0,FLOOR-3,AW,2,'#b04cff'); glow(c,240,FLOOR,250,'rgba(176,76,255,0.18)');
    c.fillStyle=vgrad(c,FLOOR,AH,['#3a2a3a','#140c14']); c.fillRect(0,FLOOR,AW,AH-FLOOR); texture(c,0,FLOOR,AW,AH-FLOOR,0.5,1.5,23,2);
    contact(c); vignette(c,0.5);
  },
  arcade(c){
    c.fillStyle=vgrad(c,0,FLOOR,['#0c0218','#1c0630','#2c0a48']); c.fillRect(0,0,AW,FLOOR);
    for(let x=0;x<AW;x+=40) R(c,x,0,1,90,'rgba(255,46,196,0.08)');
    // neon sign
    glow(c,240,54,170,'rgba(255,46,196,0.35)');
    R(c,104,26,272,52,'#0b0414'); c.strokeStyle='#ff2ec4'; c.lineWidth=2; c.strokeRect(106,28,268,48); c.strokeStyle='#ffd0f4'; c.lineWidth=1; c.strokeRect(106,28,268,48);
    txt(c,'PUMP & DUMP',240,38,'#ff6a00',16,'center'); txt(c,'ARCADE · INSERT $DOJO',240,62,'#ffd23f',6,'center');
    // claw machine left, prize wall right
    R(c,6,96,60,136,'#2a4fbf'); R(c,10,104,52,60,'rgba(200,240,255,0.25)'); for(let i=0;i<10;i++) circ(c,16+(i*13)%46,156-((i*7)%10),5,['#ff6a00','#ffd23f','#ff2ec4','#3bff8a'][i%4]); R(c,34,104,2,22,'#ccc'); R(c,30,126,10,3,'#ccc');
    R(c,414,90,62,142,'#3a1a5a'); for(let r=0;r<5;r++) for(let k=0;k<5;k++){ circ(c,422+k*12,100+r*14,4,['#ff6a00','#ffd23f','#ff2ec4','#3bff8a','#5ad1ff'][(r+k)%5]); }
    R(c,414,170,62,62,'#ff6a00'); txt(c,'PRIZES',445,176,'#2b1405',5,'center');
    // cabinets
    const cols=['#ff2e2e','#2a4fbf','#ff6a00','#18a34a','#7b2cff'];
    for(let i=0;i<5;i++){ const x=78+i*67, col=cols[i];
      R(c,x,104,56,128,col); R(c,x,104,4,128,shade(col,1.3)); R(c,x+52,104,4,128,shade(col,0.6));
      R(c,x,96,56,12,'#111'); txt(c,['PUMP','RUG','HODL','MOON','APE'][i],x+28,99,'#fff',6,'center');
      R(c,x+6,114,44,38,'#05050c'); R(c,x+9,117,38,32,['#103a1c','#1a1040','#3a1a05'][i%3]);
      for(let s=0;s<6;s++) R(c,x+12+((s*13)%30),121+((s*7)%22),3,3,['#3bff8a','#ffd23f','#ff2ec4'][s%3]);
      glow(c,x+28,134,32,['rgba(59,255,138,0.35)','rgba(90,209,255,0.35)','rgba(255,106,0,0.35)'][i%3]);
      R(c,x+2,156,52,12,'#151515'); circ(c,x+15,162,3,'#ff2e2e'); circ(c,x+28,162,2,'#ffd23f'); circ(c,x+36,162,2,'#3bff8a'); circ(c,x+44,162,2,'#5ad1ff'); R(c,x+14,158,2,4,'#ccc');
      R(c,x+20,186,16,12,'#111'); R(c,x+24,190,8,2,'#ff6a00'); R(c,x+6,218,44,8,shade(col,0.5)); }
    // classic arcade carpet
    R(c,0,FLOOR,AW,AH-FLOOR,'#1a0a30');
    const r=rnd(44); for(let i=0;i<120;i++){ const x=r()*AW, y=FLOOR+r()*(AH-FLOOR), k=(r()*4)|0; if(k===0) poly(c,[[x,y-3],[x+3,y+2],[x-3,y+2]],'#ff2ec4'); else if(k===1) circ(c,x,y,1.8,'#3bff8a'); else if(k===2) R(c,x,y,4,1,'#ffd23f'); else R(c,x,y,1,4,'#5ad1ff'); }
    reflect(c,FLOOR,40,0.12); contact(c); vignette(c,0.45);
  },
  park(c){ // Touch Grass Park: SF3/KOF-style pond garden
    c.fillStyle=vgrad(c,0,170,['#2a5cc8','#3f7ee0','#6aa6f0','#a8cff8']); c.fillRect(0,0,AW,170);
    for(const [x,y,w] of [[60,28,70],[250,16,110],[400,40,60]]){ const r=rnd(x); for(let i=0;i<6;i++) circ(c,x+i*w/6,y+r()*6,6+r()*8,'#d8e8ff'); R(c,x-4,y+4,w+8,5,'#d8e8ff'); for(let i=0;i<6;i++) circ(c,x+i*w/6-2,y-3+r()*4,4+r()*5,'#ffffff'); }
    // hazy palace on the hill
    const hz='#8e88c8', hl='#b4b0e4', hd='#6a64a8', hw='#d8d4ff';
    palace(c,150,128,120,34,hz,hl,hd,hw); palace(c,226,122,60,40,hz,hl,hd,hw);
    R(c,312,58,26,70,hz); R(c,312,58,26,3,hl); R(c,334,58,4,70,hd); poly(c,[[308,58],[325,36],[342,58]],hd); R(c,323,26,4,12,hd); circ(c,325,46,6,hl);
    for(let fy=66;fy<124;fy+=10) R(c,317,fy,4,6,hd), R(c,327,fy,4,6,hd);
    palace(c,350,116,40,22,hz,hl,hd,hw);
    c.fillStyle='rgba(170,200,255,0.35)'; c.fillRect(0,96,AW,40);
    // far tree line
    canopy(c,90,128,120,22,11,['#1a3d4a','#2a5a5a','#3e7a62','#5a9a6a','#7ab878'],9);
    canopy(c,420,124,110,24,12,['#1a3d4a','#2a5a5a','#3e7a62','#5a9a6a','#7ab878'],9);
    // stone bridge over the pond
    c.fillStyle='#b8b0a0'; c.beginPath(); c.moveTo(150,170); c.quadraticCurveTo(205,140,260,170); c.lineTo(260,176); c.lineTo(150,176); c.fill();
    c.fillStyle='#4a5a6a'; c.beginPath(); c.ellipse(205,176,26,16,0,Math.PI,0); c.fill();
    R(c,150,152,110,3,'#ece4d4'); for(let x=152;x<258;x+=10) R(c,x,147,3,6,'#d8d0c0');
    // pond
    c.fillStyle=vgrad(c,170,214,['#1e4aa8','#2a66c8','#3a86e0']); c.fillRect(0,170,AW,44);
    for(let y=174;y<212;y+=3){ const r=rnd(y); for(let k=0;k<6;k++) R(c,r()*AW,y,6+r()*30,1,'rgba(200,230,255,0.45)'); }
    c.fillStyle='rgba(20,40,60,0.35)'; c.fillRect(0,170,AW,8); // tree reflections
    for(const [x,y] of [[300,196],[330,200],[120,204]]){ c.fillStyle='#3a8a3a'; c.beginPath(); c.ellipse(x,y,6,2,0,0,7); c.fill(); R(c,x-1,y-1,2,1,'#7ad05a'); }
    // big trees framing the stage
    trunk(c,40,100,214,14,['#2b1a10','#5a3a22','#7a5634']); trunk(c,452,90,214,16,['#2b1a10','#5a3a22','#7a5634']);
    canopy(c,46,86,86,62,21,['#0e2a1a','#1f4a26','#3a7a2e','#6aa838','#a8d850'],13);
    canopy(c,446,78,92,70,22,['#0e2a1a','#1f4a26','#3a7a2e','#6aa838','#a8d850'],14);
    canopy(c,120,168,46,12,23,['#0e2a1a','#1f4a26','#3a7a2e','#6aa838','#a8d850'],7);
    canopy(c,372,166,58,12,24,['#0e2a1a','#1f4a26','#3a7a2e','#6aa838','#a8d850'],7);
    // stone ledge between the pond and the walkway
    c.fillStyle=vgrad(c,210,FLOOR,['#6a5038','#4a3626']); c.fillRect(0,210,AW,FLOOR-210);
    // rocks ringing the pond
    const rp=['#2b1f18','#9a7a5a','#d8b88a','#f4dcae','#fff4dc'];
    let r=rnd(41); for(let i=0;i<14;i++){ const x=8+i*35+r()*14, w=26+r()*22; rock(c,x,212+r()*4,w,14+r()*8,100+i,rp); }
    for(const [x,y,w,h] of [[110,186,22,12],[270,190,26,12],[350,184,18,10]]) rock(c,x,y,w,h,x,rp);
    // walkable stone floor (flat top at FLOOR) with big slabs below
    c.fillStyle=vgrad(c,FLOOR,AH,['#c8a878','#9a7a54','#5a4430']); c.fillRect(0,FLOOR,AW,AH-FLOOR);
    R(c,0,FLOOR,AW,2,'#f4dcae');
    r=rnd(42); for(let row=0;row<3;row++){ let x=-r()*30; const y=FLOOR+3+row*12; while(x<AW){ const w=30+r()*36; rock(c,x+w/2,y+6,w,11,(x|0)+row*99,rp); x+=w+2; } }
    contact(c); vignette(c,0.12);
  },
  laneway(c){
    c.fillStyle=vgrad(c,0,FLOOR,['#140c1a','#24162c','#3a2440']); c.fillRect(0,0,AW,FLOOR);
    skyline(c,44,190,'#120a16',60,160,['#ffcf8a','#ff6a00','#ffe6b0'],0.4,{x0:100,x1:380,blink:true});
    glow(c,240,170,140,'rgba(255,140,60,0.25)');
    // brick walls
    bricks(c,0,0,124,FLOOR,'#5c3b2a','#3a2418',12,5); bricks(c,356,0,124,FLOOR,'#6b4a35','#45291c',12,5);
    texture(c,0,0,124,FLOOR,0.35,5,44); texture(c,356,0,124,FLOOR,0.35,5,45);
    c.fillStyle='rgba(0,0,0,0.45)'; c.fillRect(110,0,14,FLOOR); c.fillRect(356,0,10,FLOOR);
    // graffiti: big pieces + throwups
    const tagCols=['#ff6a00','#ff2ec4','#3bff8a','#5ad1ff','#ffd23f','#7b2cff'];
    const r=rnd(55), words=['LFG','HODL','REKT','WAGMI','NGMI','APE','FUD','BASED','1000X','GG'];
    for(let i=0;i<14;i++){ const left=i%2===0, x=left?8+r()*96:366+r()*100, y=24+r()*190, col=tagCols[(r()*6)|0];
      c.save(); c.translate(x,y); c.rotate((r()-0.5)*0.5);
      if(r()<0.55){ const w=words[(r()*words.length)|0], sz=r()<0.3?8:6; txt(c,w,1,1,'#120a16',sz,'center'); txt(c,w,0,0,col,sz,'center'); }
      else { c.strokeStyle=col; c.lineWidth=1.6; c.beginPath(); let px=0,py=0; c.moveTo(0,0); for(let k=0;k<6;k++){ px+=3+r()*5; py=(k%2?-1:1)*(2+r()*4); c.lineTo(px,py); } c.stroke(); }
      c.restore(); }
    c.save(); c.translate(58,110); c.rotate(-0.12); txt(c,'DOJO',2,2,'#120a16',18,'center'); txt(c,'DOJO',0,0,'#ff6a00',18,'center'); c.restore();
    c.save(); c.translate(418,80); c.rotate(0.08); txt(c,'GM',2,2,'#120a16',16,'center'); txt(c,'GM',0,0,'#3bff8a',16,'center'); c.restore();
    txt(c,'WAGMI',418,150,'#ff2ec4',7,'center');
    // fire escape
    for(let f=0;f<3;f++){ const y=40+f*50; R(c,370,y,60,2,'#1a1a1a'); for(let x=372;x<430;x+=4) R(c,x,y-12,1,12,'#1a1a1a'); R(c,370,y-12,60,1,'#1a1a1a'); }
    // café
    R(c,130,138,90,94,'#2a1a14'); R(c,134,150,82,48,'#ffd59a'); glow(c,175,174,64,'rgba(255,200,120,0.45)');
    person(c,154,196,1.3,'#3a2414','#c98d63'); person(c,184,196,1.3,'#5a2a3a','#e8b48a'); R(c,134,184,82,3,'#6a4a2a');
    R(c,128,128,94,12,'#ff6a00'); txt(c,'FLAT WHITE',175,131,'#2b1405',6,'center'); poly(c,[[128,140],[222,140],[230,148],[120,148]],'#c0262d'); for(let i=0;i<8;i++) R(c,124+i*13,140,6,8,'#fff4e6');
    R(c,236,206,26,4,'#5a3a1a'); R(c,247,210,4,22,'#3a2410'); circ(c,242,204,3,'#ffffff');
    // festoon lights
    c.strokeStyle='#111'; c.lineWidth=1; c.beginPath(); c.moveTo(124,28); c.quadraticCurveTo(240,80,356,28); c.stroke();
    for(let i=1;i<14;i++){ const t=i/14, x=124+232*t, y=(1-t)*(1-t)*28+2*t*(1-t)*80+t*t*28; circ(c,x,y+2,1.8,'#ffe6a8'); glow(c,x,y+2,9,'rgba(255,230,168,0.5)'); }
    R(c,374,196,28,36,'#2a4a2a'); R(c,372,194,32,4,'#1d331d'); R(c,96,0,4,FLOOR,'#2a1a14');
    // wet bluestone
    c.fillStyle=vgrad(c,FLOOR,AH,['#3a3640','#121016']); c.fillRect(0,FLOOR,AW,AH-FLOOR);
    for(let y=FLOOR;y<AH;y+=7) for(let x=((y-FLOOR)/7%2)*10;x<AW;x+=20) R(c,x,y,19,6,'rgba(255,255,255,0.03)');
    reflect(c,FLOOR,70,0.2); texture(c,0,FLOOR,AW,AH-FLOOR,0.35,2,46);
    contact(c); vignette(c,0.45);
  },
};

// ---------- foregrounds (drawn over fighters, transparent canvas) ----------
const FG = {
  floor(c){ for(const x of [-10,430]){ R(c,x,214,60,56,'#0a0402'); R(c,x+6,204,22,14,'#050201'); R(c,x+8,206,18,10,'#2a0e0e'); } },
  moon(c){ c.fillStyle='#2a2a34'; c.beginPath(); c.ellipse(20,270,60,26,0,0,7); c.fill(); c.beginPath(); c.ellipse(468,272,50,22,0,0,7); c.fill(); },
  bazaar(c){ for(const x of [30,450]){ R(c,x,0,1,26,'#2b1405'); R(c,x-6,26,13,18,'#ff6a00'); R(c,x-6,26,13,2,'#ffd23f'); R(c,x-6,42,13,2,'#ffd23f'); } },
  volcano(c){ c.fillStyle='#0a0200'; poly(c,[[0,270],[0,200],[20,214],[36,190],[60,270]],'#0a0200'); poly(c,[[480,270],[480,206],[460,222],[446,198],[420,270]],'#0a0200'); },
  dock(c){ R(c,452,206,16,64,'#2a1608'); R(c,448,204,24,6,'#3a2410'); c.strokeStyle='#c9a06a'; c.lineWidth=2; c.beginPath(); c.moveTo(452,214); c.quadraticCurveTo(420,250,380,270); c.stroke(); },
  coliseum(c){ const r=rnd(99); for(let i=0;i<34;i++){ const x=i*15+r()*6, y=262+r()*6; R(c,x-5,y-2,11,14,'#2a1608'); circ(c,x,y-6,5,'#3a2010'); if(r()<0.3) R(c,x+4,y-20,2,12,'#3a2010'); } },
  gas(c){ R(c,6,236,10,34,'#ffd23f'); for(let y=240;y<270;y+=8) R(c,6,y,10,3,'#111'); },
  server(c){ R(c,0,246,AW,2,'#3a4256'); for(let x=0;x<AW;x+=24) R(c,x,246,2,24,'#3a4256'); },
  discord(c){ c.strokeStyle='#111'; c.lineWidth=2; c.beginPath(); c.moveTo(0,262); c.bezierCurveTo(80,252,140,272,220,264); c.stroke(); },
  arcade(c){ R(c,0,180,12,90,'#2a0a48'); R(c,468,180,12,90,'#2a0a48'); },
  park(c){ const pal=['#0a2012','#163a1c','#2a6a26','#4a9a32','#8ac844']; canopy(c,8,6,60,30,61,pal,10); canopy(c,476,4,64,32,62,pal,10); },
  laneway(c){ R(c,446,10,4,40,'#222'); R(c,430,30,36,22,'#c0262d'); txt(c,'BAR',448,37,'#fff4e6',6,'center'); },
};

// animated overlays (logical units)
const ANIM = {
  floor(c,t){ c.save(); c.beginPath(); c.rect(0,104,AW,12); c.clip(); const items=['DOJO +420%','BTC -2.1%','ETH +1.3%','SOL +6.9%','GAS +99%','COPE +12%','HOPIUM -8%','FUD -40%'];
    const span=items.length*90, off=-(t*0.6)%span; for(let k=0;k<2;k++) items.forEach((s,i)=>txt(c,s,off+k*span+i*90,107,s.includes('-')?'#5a0000':'#2b1405',6)); c.restore();
    for(let i=0;i<12;i++){ const x=(i*47+t*0.3)%AW, y=((t*0.5+i*37)%160)+60; R(c,x,y,2,1.5,i%2?'#ffffff':'#3bff8a'); } },
  moon(c,t){ const x=(t*0.5)%620-60; R(c,x,26,6,1.2,'#fff'); c.globalAlpha=0.5; R(c,x-14,26.2,14,0.8,'#ff6a00'); c.globalAlpha=1; if((t>>5)%2) circ(c,177,151,2,'#ff3b3b'); },
  volcano(c,t){ for(let i=0;i<18;i++){ const p=((t*0.7+i*37)%160); const x=226+((i*13)%28)+Math.sin(t*0.04+i)*8; c.globalAlpha=1-p/160; R(c,x,70-p*0.6,1.5,1.5,i%2?'#ffd23f':'#ff6a00'); } c.globalAlpha=1;
    for(let i=0;i<14;i++){ const p=(t*0.3+i*29)%AW; c.globalAlpha=0.7; R(c,p,FLOOR-30-((i*31)%150)+Math.sin(t*0.02+i)*4,1,1,'#ff8a3a'); } c.globalAlpha=1; },
  dock(c,t){ for(let i=0;i<9;i++){ const x=((t*0.25+i*60)%(AW+40))-20, y=158+(i%4)*16; R(c,x,y,22,0.8,'rgba(200,220,255,0.5)'); }
    for(let i=0;i<3;i++){ const x=(t*0.4+i*160)%560-40, y=60+i*12+Math.sin(t*0.06+i)*3, w=((t>>3)+i)%2; c.fillStyle='#2a2040'; c.fillRect(x,y,2,1); c.fillRect(x-3,y-1-w,3,1); c.fillRect(x+2,y-1-w,3,1); } },
  arcade(c,t){ for(let i=0;i<5;i++){ const x=78+i*67; if(((t>>4)+i)%3===0){ c.globalAlpha=0.25; R(c,x+9,117,38,32,'#ffffff'); c.globalAlpha=1; } }
    if((t>>3)%10===0){ c.globalAlpha=0.35; R(c,106,28,268,48,'#ff2ec4'); c.globalAlpha=1; } },
  server(c,t){ for(let i=0;i<5;i++) for(let k=0;k<9;k++) if(((t>>2)+i*7+k*3)%11===0) R(c,130+i*56,153+k*9,2,2,'#ffffff'); },
  park(c,t){ for(let i=0;i<3;i++){ const x=(t*0.25+i*170)%560-40, y=66+i*14+Math.sin(t*0.05+i)*3, w=((t>>3)+i)%2; c.fillStyle='#2b1405'; c.fillRect(x,y,3,1.5); c.fillRect(x-3,y-1-w,3,1); c.fillRect(x+3,y-1-w,3,1); }
    for(let i=0;i<6;i++){ const x=(t*0.3+i*90)%AW, y=FLOOR-20+Math.sin(t*0.05+i*2)*8; c.globalAlpha=0.8; R(c,x,y,2,1,'#ffd23f'); } c.globalAlpha=1; },
  coliseum(c,t){ const r=rnd((t>>4)+1); for(let i=0;i<40;i++){ const tier=(r()*4)|0; R(c,r()*AW,50+tier*38+18-((t>>2)%2)*2,1,6,'#e8b48a'); } },
  gas(c,t){ c.globalAlpha=0.08+0.05*Math.sin(t*0.3); R(c,10,104,300,4,'#ffffff'); c.globalAlpha=1;
    for(let i=0;i<10;i++){ const a=t*0.08+i; R(c,160+Math.cos(a)*30*((i%3)+1),112+Math.sin(a*1.3)*8,1,1,'#ffe6c0'); } },
  discord(c,t){ if((t>>5)%2){ circ(c,37,160,4,'#ff2e2e'); txt(c,'@',37,158,'#fff',4,'center'); } const y=80+((t>>4)%8)*11; c.globalAlpha=0.12; R(c,84,y-5,96,10,'#ffffff'); c.globalAlpha=1; },
  laneway(c,t){ for(let i=0;i<60;i++){ const x=(i*53+t*0.8)%AW, y=(i*97+t*3.4)%AH; c.globalAlpha=0.3; R(c,x,y,0.6,6,'#cfd6ff'); } c.globalAlpha=1;
    for(let i=1;i<14;i+=2){ if(((t>>4)+i)%5===0){ const tt=i/14; glow(c,124+232*tt,(1-tt)*(1-tt)*28+2*tt*(1-tt)*80+tt*tt*28+2,14,'rgba(255,230,168,0.7)'); } } },
  bazaar(c,t){ for(let i=0;i<20;i++){ const x=(i*29+t*0.2)%AW, y=60+((i*41+t*0.15)%110); c.globalAlpha=0.5; R(c,x,y,1,1,'#ffe0a0'); } c.globalAlpha=1; },
};

// ---------- pixel pipeline ----------
// Endesga 32: a hand-built pixel-art palette with hue-shifted ramps. Snapping every arena to it (with ordered
// dithering) is what makes the scenes read as 16-bit art instead of vector shapes.
const PAL=['#be4a2f','#d77643','#ead4aa','#e4a672','#b86f50','#733e39','#3e2731','#a22633','#e43b44','#f77622','#feae34','#fee761','#63c74d','#3e8948','#265c42','#193c3e',
  '#124e89','#0099db','#2ce8f5','#ffffff','#c0cbdc','#8b9bb4','#5a6988','#3a4466','#262b44','#181425','#ff0044','#68386c','#b55088','#f6757a','#e8b796','#c28569'].map(h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)]);
const BAYER=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5].map(v=>(v+0.5)/16-0.5);
function medianCut(d,n){ // build an n-colour palette from the scene's own pixels
  const px=[]; for(let i=0;i<d.length;i+=8){ if(d[i+3]) px.push([d[i],d[i+1],d[i+2]]); }
  let boxes=[px];
  while(boxes.length<n){
    let bi=-1, br=-1, bc=0;
    boxes.forEach((bx,i)=>{ if(bx.length<2) return; for(let c=0;c<3;c++){ let lo=255,hi=0; for(const p of bx){ if(p[c]<lo)lo=p[c]; if(p[c]>hi)hi=p[c]; } const r=(hi-lo)*Math.sqrt(bx.length); if(r>br){ br=r; bi=i; bc=c; } } });
    if(bi<0) break; const bx=boxes[bi].sort((u,v)=>u[bc]-v[bc]), m=bx.length>>1; boxes.splice(bi,1,bx.slice(0,m),bx.slice(m));
  }
  return boxes.filter(b=>b.length).map(b=>{ const s=[0,0,0]; for(const p of b){ s[0]+=p[0]; s[1]+=p[1]; s[2]+=p[2]; } return s.map(v=>Math.round(v/b.length)); });
}
function makeNearest(pal){ const cache=new Map(); return (r,g,b)=>{ const key=((r>>2)<<12)|((g>>2)<<6)|(b>>2); let v=cache.get(key); if(v!==undefined) return v;
  let best=0,bd=1e9; for(let i=0;i<pal.length;i++){ const p=pal[i], dr=r-p[0], dg=g-p[1], db=b-p[2], dd=dr*dr*0.3+dg*dg*0.59+db*db*0.11; if(dd<bd){ bd=dd; best=i; } } cache.set(key,best); return best; }; }
function dither(c,w,h,levels){ // kept for other callers (title stage etc): per-channel posterise
  const img=c.getImageData(0,0,w,h), d=img.data, step=255/(levels-1);
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){ const i=(y*w+x)*4; if(!d[i+3]) continue; const b=BAYER[(y&3)*4+(x&3)]*step;
    d[i]=Math.round((d[i]+b)/step)*step; d[i+1]=Math.round((d[i+1]+b)/step)*step; d[i+2]=Math.round((d[i+2]+b)/step)*step; if(d[i+3]<255) d[i+3]=d[i+3]>110?255:0; }
  c.putImageData(img,0,0);
}
function retro(c,w,h,spread,ncol){ // drawn edges + limited per-scene palette with ordered dither
  const img=c.getImageData(0,0,w,h), d=img.data, L=new Float32Array(w*h);
  for(let i=0;i<w*h;i++) L[i]=d[i*4]*0.3+d[i*4+1]*0.59+d[i*4+2]*0.11;
  for(let y=0;y<h-1;y++) for(let x=0;x<w-1;x++){ const i=y*w+x; if(!d[i*4+3]) continue;
    const e=Math.max(Math.abs(L[i]-L[i+1]),Math.abs(L[i]-L[i+w])); if(e>46 && L[i]<L[i+1]+8 && L[i]<L[i+w]+8){ const k=i*4; d[k]*=0.62; d[k+1]*=0.6; d[k+2]*=0.66; } }
  const pal=medianCut(d,ncol||24), near=makeNearest(pal);
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){ const i=(y*w+x)*4; if(!d[i+3]) continue; const o=BAYER[(y&3)*4+(x&3)]*spread;
    const p=pal[near(Math.max(0,Math.min(255,d[i]+o)),Math.max(0,Math.min(255,d[i+1]+o)),Math.max(0,Math.min(255,d[i+2]+o)))];
    d[i]=p[0]; d[i+1]=p[1]; d[i+2]=p[2]; if(d[i+3]<255) d[i+3]=d[i+3]>110?255:0; }
  c.putImageData(img,0,0);
}
function bake(fn){
  const art=document.createElement('canvas'); art.width=AW; art.height=AH;
  const a=art.getContext('2d',{willReadFrequently:true});
  fn(a); retro(a,AW,AH,12,40);
  return art; // 480x270; drawn with smoothing off it scales up crisp, and costs ~0.5MB instead of 8MB
}
// optional art override: drop img/arenas/<id>.png (any 16:9 size) next to index.html and it replaces the procedural scene
const override={};
function loadOverride(id){ if(id in override) return; override[id]=null; if(!(DD.ARENA_ART||[]).includes(id)) return; const im=new Image(); im.onload=()=>{ override[id]=im; }; im.onerror=()=>{}; im.src='img/arenas/'+id+'.png'; }
function render(id){ loadOverride(id); const X=DD.ARENA_DRAW||{}; return override[id] || cache[id] || (cache[id]=bake(X[id]||DRAW[id]||DRAW.floor)); }
function renderFG(id){ if(override[id]) return null; const XF=DD.ARENA_FG||{}; const fn = (id in XF) ? XF[id] : FG[id]; if(!(id in fgCache)) fgCache[id]= fn ? bake(fn) : null; return fgCache[id]; }
function draw(ctx,id,t){ const s=ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled=false; ctx.drawImage(render(id),0,0,AW,AH); ctx.imageSmoothingEnabled=s; const XA=DD.ARENA_ANIM||{}, an=(id in XA)?XA[id]:ANIM[id]; if(an&&!override[id]) an(ctx,t); }
function drawFG(ctx,id){ const cv=renderFG(id); if(cv){ const s=ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled=false; ctx.drawImage(cv,0,0,AW,AH); ctx.imageSmoothingEnabled=s; } }
// preview: full scene + foreground, box-filtered down to card size so the dither averages into clean colour (no moiré)
function thumb(id){ const s=document.createElement('canvas'); s.width=AW; s.height=AH; const c=s.getContext('2d'); c.imageSmoothingEnabled=false;
  c.drawImage(render(id),0,0,AW,AH); drawFG(c,id);
  const t=document.createElement('canvas'); t.width=AW/2; t.height=AH/2; const tc=t.getContext('2d'); tc.imageSmoothingEnabled=true; tc.imageSmoothingQuality='high'; tc.drawImage(s,0,0,AW/2,AH/2);
  return t.toDataURL('image/png'); }
function clearCache(){ for(const k in cache) delete cache[k]; for(const k in fgCache) delete fgCache[k]; }

DD.Arenas = { draw, drawFG, thumb, render, clearCache, AW, AH, FLOOR };
DD.Pix = { R, circ, poly, glow, vgrad, cloud, ridge, skyline, stars, texture, dither, retro, rnd, fbm, shade, txt, canopy, rock, trunk, palace, contact, vignette, reflect, floorPersp, person, bricks, cloud2:cloud, mix, hash };
})();
