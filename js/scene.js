/* DEGEN DOJO — full-page pixel-art backdrop (dojo at sunset), baked once per viewport size + animated petals. */
(function(){
const P=DD.Pix, PX=3; // one art pixel = 3 css px
let bg, fx, fctx, W=0, H=0, petals=[], raf=0, still=matchMedia('(prefers-reduced-motion: reduce)').matches;

function pagoda(c,x,base,s){ // tiered dojo temple
  const red='#b0202a', dk='#5a0e14', roof='#2b1405', roofHi='#5a3020', gold='#ffd23f';
  P.R(c,x-30*s,base-10*s,60*s,10*s,'#3a1a10'); P.R(c,x-34*s,base-4*s,68*s,4*s,'#2b1405');
  let peak=0;
  for(let t=0;t<3;t++){
    const w=(46-t*10)*s, h=(18-t*2)*s, y=base-10*s-t*24*s-h;
    P.R(c,x-w/2,y,w,h,red); P.R(c,x-w/2,y,3*s,h,'#d8404a'); P.R(c,x+w/2-3*s,y,3*s,h,dk);
    for(let k=0;k<4;k++) P.R(c,x-w/2+5*s+k*(w-10*s)/3,y+3*s,2*s,h-3*s,dk);
    P.R(c,x-w*0.25,y+h*0.35,w*0.5,h*0.4,'#ffcf6a'); // lit window
    // upturned roof
    const rw=w+18*s, ry=y-6*s;
    P.R(c,x-w/2-1*s,ry+2*s,w+2*s,y-ry,roof); // eave joins the wall (no sky gap)
    P.poly(c,[[x-rw/2-4*s,ry-3*s],[x-rw/2,ry+3*s],[x+rw/2,ry+3*s],[x+rw/2+4*s,ry-3*s],[x+w*0.3,ry-7*s],[x-w*0.3,ry-7*s]],roof);
    peak=ry-7*s;
    P.R(c,x-rw/2,ry-1*s,rw,2*s,roofHi); for(let k=x-rw/2+2*s;k<x+rw/2-2*s;k+=3*s) P.R(c,k,ry-5*s,1*s,4*s,'#140804'); // roof tiles
    P.R(c,x-w/2-2*s,y+h-3*s,w+4*s,1*s,'#ffcf6a'); for(let k=x-w/2;k<x+w/2;k+=4*s) P.R(c,k,y+h-5*s,1*s,3*s,'#ffcf6a'); // balcony rail
    P.circ(c,x-rw/2-2*s,ry+5*s,2*s,'#ff6a00'); P.circ(c,x+rw/2+2*s,ry+5*s,2*s,'#ff6a00'); // lanterns
    P.glow(c,x-rw/2-2*s,ry+5*s,10*s,'rgba(255,140,40,0.5)'); P.glow(c,x+rw/2+2*s,ry+5*s,10*s,'rgba(255,140,40,0.5)');
  }
  const topY=peak+1*s; P.R(c,x-1*s,topY-16*s,2*s,17*s,gold); for(let i=0;i<4;i++) P.R(c,x-3*s,topY-14*s+i*3*s,6*s,1*s,gold); P.circ(c,x,topY-17*s,2*s,gold);
  P.R(c,x-40*s,base-2*s,80*s,6*s,'#1a0a08'); // stone foundation into the shore
}
function torii(c,x,base,s,col){
  P.R(c,x-24*s,base-46*s,4*s,46*s,col); P.R(c,x+20*s,base-46*s,4*s,46*s,col);
  P.R(c,x-30*s,base-50*s,60*s,4*s,col); P.poly(c,[[x-34*s,base-52*s],[x+34*s,base-52*s],[x+30*s,base-56*s],[x-30*s,base-56*s]],'#2b1405'); P.R(c,x-24*s,base-40*s,48*s,3*s,col);
}
function blossomTree(c,x,y,s,flip,seed){
  const r=P.rnd(seed), tips=[];
  c.strokeStyle='#2b1405'; c.lineCap='round';
  const branch=(x0,y0,ang,len,w,depth)=>{ if(depth<=0||len<4){ tips.push([x0,y0]); return; }
    const x1=x0+Math.cos(ang)*len, y1=y0+Math.sin(ang)*len; c.lineWidth=Math.max(w,1.8*s); c.beginPath(); c.moveTo(x0,y0); c.lineTo(x1,y1); c.stroke();
    if(w>3*s){ c.strokeStyle='#5a3020'; c.lineWidth=Math.max(1,w*0.3); c.beginPath(); c.moveTo(x0,y0-w*0.25); c.lineTo(x1,y1-w*0.25); c.stroke(); c.strokeStyle='#2b1405'; }
    if(depth<=2) tips.push([x1,y1]);
    branch(x1,y1,ang-0.4-r()*0.3,len*0.72,w*0.65,depth-1); branch(x1,y1,ang+0.35+r()*0.3,len*0.7,w*0.65,depth-1); };
  branch(x,y,flip?Math.PI*0.86:Math.PI*0.14,60*s,7*s,5);
  const pal=['#4a0e2e','#b8306a','#ff6ab0','#ffaad6','#fff0f8'];
  tips.forEach(([tx,ty],k)=>P.canopy(c,tx,ty,(10+r()*8)*s,(7+r()*5)*s,seed*97+k,pal,4.5*s));
}
function lanterns(c,x0,y0,x1,y1,s){ // string of paper lanterns
  c.strokeStyle='#2b1405'; c.lineWidth=1; c.beginPath(); const sag=24*s; c.moveTo(x0,y0); c.quadraticCurveTo((x0+x1)/2,(y0+y1)/2+sag,x1,y1); c.stroke();
  for(let k=1;k<9;k++){ const t=k/9, x=(1-t)*(1-t)*x0+2*(1-t)*t*(x0+x1)/2+t*t*x1, y=(1-t)*(1-t)*y0+2*(1-t)*t*((y0+y1)/2+sag)+t*t*y1;
    P.glow(c,x,y+5*s,10*s,'rgba(255,140,40,0.35)'); P.R(c,x-2.5*s,y+1*s,5*s,7*s,k%2?'#ff4a2a':'#ffb030'); P.R(c,x-2.5*s,y+1*s,5*s,1*s,'#2b1405'); P.R(c,x-2.5*s,y+7*s,5*s,1*s,'#2b1405'); P.R(c,x-1*s,y+2*s,1*s,4*s,'#ffe0a0'); }
}

function bake(){
  W=Math.max(16,Math.ceil((innerWidth||document.documentElement.clientWidth||1280)/PX)); H=Math.max(16,Math.ceil((innerHeight||document.documentElement.clientHeight||720)/PX));
  bg.width=W; bg.height=H; fx.width=W; fx.height=H;
  const c=bg.getContext('2d',{willReadFrequently:true}); c.imageSmoothingEnabled=false;
  const hz=Math.round(H*0.64), s=Math.max(0.7,Math.min(1.6,H/300));
  // sky
  c.fillStyle=P.vgrad(c,0,hz,['#1e0a2e','#4a1442','#a02c3e','#e8542a','#ff8a2a','#ffc45a']); c.fillRect(0,0,W,hz);
  P.stars(c,3,Math.round(W*H/900),hz*0.35,['#ffe6c0','#ffffff']);
  // sun with synthwave cuts
  const sx=W*0.5, sy=hz-6*s, sr=Math.min(W,H)*0.2;
  P.glow(c,sx,sy,sr*2.4,'rgba(255,200,90,0.45)');
  c.fillStyle=P.vgrad(c,sy-sr,sy+sr,['#fff4b0','#ffd23f','#ff8a2a']); c.beginPath(); c.arc(sx,sy,sr,0,Math.PI*2); c.fill();
  for(let i=0;i<7;i++){ const y=sy+i*sr*0.13, h=1+i*0.8; c.fillStyle=P.vgrad(c,0,hz,['#1e0a2e','#4a1442','#a02c3e','#e8542a','#ff8a2a','#ffc45a']); c.fillRect(sx-sr,y,sr*2,h); }
  // clouds
  const r=P.rnd(11);
  for(let i=0;i<Math.round(W/90);i++){ const cx=r()*W, cy=H*0.08+r()*H*0.32, w=40+r()*90; P.cloud(c,cx,cy,w*s,'#ffd8a8','#e8725a','#7a2e52',20+i); }
  // far mountains + volcano peak with snow
  P.ridge(c,hz-4,H*0.16,7,'#7a2a4a','#5a1e3e',4);
  const fx0=W*0.22, fh=H*0.3; P.poly(c,[[fx0-fh*1.6,hz],[fx0-fh*0.18,hz-fh],[fx0+fh*0.18,hz-fh],[fx0+fh*1.6,hz]],'#4a1838');
  P.poly(c,[[fx0-fh*0.18,hz-fh],[fx0+fh*0.18,hz-fh],[fx0+fh*0.42,hz-fh*0.72],[fx0+fh*0.2,hz-fh*0.78],[fx0,hz-fh*0.7],[fx0-fh*0.25,hz-fh*0.8],[fx0-fh*0.42,hz-fh*0.72]],'#ffe6d0');
  P.poly(c,[[fx0,hz-fh],[fx0+fh*0.18,hz-fh],[fx0+fh*0.42,hz-fh*0.72],[fx0+fh*0.2,hz-fh*0.78]],'#e8b8b0');
  P.ridge(c,hz,H*0.07,9,'#3a1230','#2a0c24',3);
  // city on the right
  const cityX=W*0.62;
  P.skyline(c,21,hz,'#2a0e2a',H*0.08,H*0.42,['#ffcf8a','#ff8a2a','#ffe6b0'],0.38,{x0:cityX,x1:W+6,minW:10*s,varW:24*s,blink:true});
  P.skyline(c,22,hz,'#1a0820',H*0.04,H*0.2,['#ff8a2a'],0.2,{x0:cityX-30,x1:W+6,minW:12*s,varW:18*s});
  // big DOJO tower
  const tx=W*0.86, tw=26*s, th=H*0.5; P.R(c,tx-1*s,hz-th-1*s,tw+2*s,th+1*s,'#14061a'); P.R(c,tx,hz-th,tw,th,'#3a1236'); P.R(c,tx,hz-th,3*s,th,'#6a2654'); P.R(c,tx-2*s,hz-th,tw+4*s,3*s,'#5a1e4a'); for(let y=hz-th+8*s;y<hz-4;y+=5*s) for(let x=tx+4*s;x<tx+tw-4*s;x+=4*s) if(r()<0.5) P.R(c,x,y,2*s,2*s,'#ffcf8a');
  P.glow(c,tx+tw/2,hz-th-12*s,40*s,'rgba(255,106,0,0.4)');
  P.R(c,tx+4*s,hz-th-5*s,2*s,5*s,'#14061a'); P.R(c,tx+tw-6*s,hz-th-5*s,2*s,5*s,'#14061a'); // sign legs
  P.R(c,tx+tw/2-1*s,hz-th-30*s,2*s,14*s,'#14061a'); P.circ(c,tx+tw/2,hz-th-30*s,1.5*s,'#ff2e2e'); // antenna
  P.R(c,tx-7*s,hz-th-18*s,tw+14*s,14*s,'#14061a'); P.R(c,tx-6*s,hz-th-17*s,tw+12*s,12*s,'#ff6a00'); P.txt(c,'DOJO',tx+tw/2,hz-th-14*s,'#2b1405',Math.max(6,Math.round(8*s)),'center');
  // temple on the left
  pagoda(c,W*0.1,hz+2,s*0.95);
  // water
  c.fillStyle=P.vgrad(c,hz,H,['#c85a3a','#7a2a4a','#2a0e2e','#14061a']); c.fillRect(0,hz,W,H-hz);
  for(let y=hz+1;y<H;y+=2){ const k=(y-hz)/(H-hz), w=sr*(1.2-k*0.6); for(let j=0;j<3;j++){ const x=sx+(r()-0.5)*w*2; P.R(c,x-r()*8,y,4+r()*12*(1-k),1,k<0.3?'#fff0a0':'#ff9a4a'); } }
  for(let i=0;i<W*0.25;i++) P.R(c,r()*W,hz+2+r()*(H-hz),3+r()*10,1,'rgba(255,170,120,0.25)');
  { // mirror the horizon (pagoda, tower, city) into the water, rippled
    const refH=Math.min(H-hz, Math.round(H*0.28)), src=c.getImageData(0,hz-refH,W,refH), dst=c.getImageData(0,hz,W,refH);
    for(let yy=0;yy<refH;yy++){ const sy=refH-1-yy, off=Math.round(Math.sin(yy*0.6)*1.5), a=0.32*(1-yy/refH);
      for(let xx=0;xx<W;xx++){ const sx2=Math.min(W-1,Math.max(0,xx+off)), si=(sy*W+sx2)*4, di=(yy*W+xx)*4; for(let ch=0;ch<3;ch++) dst.data[di+ch]=dst.data[di+ch]*(1-a)+src.data[si+ch]*a; } }
    c.putImageData(dst,0,hz); }
  // shore + torii in water
  torii(c,W*0.36,hz+H*0.1,s*0.8,'#c0262d');
  c.fillStyle='#14061a'; c.beginPath(); c.moveTo(0,H); for(let x=0;x<=W;x+=4) c.lineTo(x,H-H*0.06-P.fbm(x/40,0,4,3)*H*0.06); c.lineTo(W,H); c.fill();
  // blossom trees framing
  lanterns(c,W*0.02,H*0.36,W*0.3,H*0.3,s); lanterns(c,W*0.7,H*0.28,W*0.98,H*0.34,s);
  blossomTree(c,-6,H*0.18,s,false,5); blossomTree(c,W+6,H*0.12,s,true,6);
  P.texture(c,0,0,W,H,0.1,6,3,2);
  P.dither(c,W,H,14);
  // petals
  petals=[]; const n=Math.round(W*H/2600); for(let i=0;i<n;i++) petals.push({x:r()*W,y:r()*H,v:0.15+r()*0.35,ph:r()*6,c:['#ff9ad5','#ffd6ee','#ff7ac0'][i%3]});
  fctx=fx.getContext('2d');
}
function tick(t){
  fctx.clearRect(0,0,W,H);
  for(const p of petals){ p.y+=p.v; p.x+=Math.sin(t*0.001+p.ph)*0.25+0.12; if(p.y>H+2){ p.y=-2; p.x=Math.random()*W; } if(p.x>W+2) p.x=-2;
    fctx.fillStyle=p.c; fctx.fillRect(p.x|0,p.y|0,2,1); fctx.fillRect((p.x|0)+((t/300+p.ph)%2|0),(p.y|0)+1,1,1); }
  raf=requestAnimationFrame(tick);
}
let to=0;
function init(){
  bg=document.getElementById('bgScene'); fx=document.getElementById('bgFx'); if(!bg||!fx) return;
  bg.style.display='none'; fx.style.display='none'; return; // street backdrop replaces the drawn scene (never draw the old one)
  try{ bake(); }catch(e){ console.warn('scene',e); fctx=fx.getContext('2d'); } if(!still) raf=requestAnimationFrame(tick); else tick(0), cancelAnimationFrame(raf);
  addEventListener('resize',()=>{ clearTimeout(to); to=setTimeout(()=>{ cancelAnimationFrame(raf); try{ bake(); }catch(e){} if(!still) raf=requestAnimationFrame(tick); },150); });
}
DD.Scene={ init, pause:()=>cancelAnimationFrame(raf), resume:()=>{ if(!still && bg && getComputedStyle(bg).visibility!=='hidden'){ cancelAnimationFrame(raf); raf=requestAnimationFrame(tick);} } };
})();
