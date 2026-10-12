/* DEGEN DOJO — arena art v2: painterly 16-bit stages (KOF / SF3 style).
   Each scene is drawn at 480x270 then run through the shared retro palette pass in arenas.js.
   Overrides DRAW/FG/ANIM per arena via DD.ARENA_DRAW / DD.ARENA_FG / DD.ARENA_ANIM. */
(function(){
const P=DD.Pix, {R,circ,poly,glow,vgrad,rnd,fbm,texture,canopy,rock,trunk,palace,contact,vignette,reflect,person,txt,shade,stars,ridge,skyline}=P;
const AW=480, AH=270, FLOOR=232;

// ---------- extra painterly helpers ----------
// stone / brick blocks: each block gets its own tone, a lit top-left edge and a dark bottom-right edge
function blocks(c,x,y,w,h,bw,bh,pal,seed,stagger){
  const r=rnd(seed); R(c,x,y,w,h,pal[0]);
  for(let yy=y,row=0;yy<y+h;yy+=bh,row++){ const off=(stagger!==false && row%2)?-bw/2:0;
    for(let xx=x+off;xx<x+w;xx+=bw){ const x0=Math.max(x,xx), x1=Math.min(x+w,xx+bw-1), y1=Math.min(y+h,yy+bh-1); if(x1<=x0) continue;
      const k=r(); R(c,x0,yy,x1-x0,y1-yy, k<0.33?pal[1]:k<0.8?pal[2]:pal[3]);
      R(c,x0,yy,x1-x0,1,pal[4]); R(c,x0,yy,1,y1-yy,pal[3]); R(c,x0,y1-1,x1-x0,1,pal[1]);
      if(r()<0.18) R(c,x0+2+r()*(x1-x0-6),yy+2+r()*(bh-5),2,1,pal[1]); } }
}
// horizontal wooden planks seen from slightly above
function planks(c,y0,y1,pal,seed,pw){
  const r=rnd(seed); for(let y=y0,row=0;y<y1;row++){ const h=Math.round(4+row*0.9); let x=-r()*60;
    while(x<AW){ const w=(pw||46)+r()*40, col=pal[1+((r()*3)|0)]; R(c,x,y,w-1,h,col); R(c,x,y,w-1,1,pal[4]); R(c,x,y+h-1,w-1,1,pal[0]); R(c,x+w-1,y,1,h,pal[0]);
      if(r()<0.4){ R(c,x+3,y+(h>>1),1,1,pal[0]); R(c,x+w-5,y+(h>>1),1,1,pal[0]); } if(r()<0.25) R(c,x+8+r()*(w-20),y+1+r()*(h-2),10,1,pal[1]); x+=w; }
    y+=h; }
}
// glossy checker / tile floor with a soft reflection band
function tiles(c,y0,a,b,line){
  for(let row=0,y=y0;y<AH;row++){ const h=Math.round(3+row*1.6), n=10+row*2, w=AW/n*1.25, off=(AW-(w*n))/2;
    for(let i=0;i<n;i++){ R(c,off+i*w,y,w+1,h,(i+row)%2?a:b); } R(c,0,y,AW,1,line); y+=h; }
}
// a crowd: rows of heads + shoulders in varied shirt colours, lit from the top-left
function crowd(c,x0,x1,y,rows,seed,shirts,skin,scale){
  const r=rnd(seed), s=scale||1;
  for(let row=0;row<rows;row++){ const yy=y+row*7*s, sp=7*s;
    for(let x=x0+(row%2)*sp/2;x<x1;x+=sp+r()*2){ if(r()<0.08) continue; const sh=shirts[(r()*shirts.length)|0], sk=skin[(r()*skin.length)|0], bob=r()*2;
      R(c,x-3*s,yy+3*s-bob,6*s,6*s,sh); R(c,x-3*s,yy+3*s-bob,2*s,6*s,shade(sh,1.25)); circ(c,x,yy-bob,2.4*s,sk); R(c,x-2*s,yy-2.4*s-bob,4*s,1.5*s,shade(sk,0.5));
      if(r()<0.18){ R(c,x+2*s,yy-7*s-bob,1*s,6*s,sk); } } }
}
// shaded cylinder column with fluting
function column(c,x,y,w,h,pal){ R(c,x,y,w,h,pal[1]); R(c,x+w*0.15,y,w*0.35,h,pal[2]); R(c,x+w*0.25,y,w*0.12,h,pal[3]); R(c,x+w*0.75,y,w*0.25,h,pal[0]);
  for(let k=1;k<5;k++) R(c,x+k*w/5,y,1,h,shade(pal[1],0.8)); }
// lamp / light source with a halo
function lamp(c,x,y,r,core,halo){ glow(c,x,y,r*4,halo); circ(c,x,y,r,core); circ(c,x-r*0.3,y-r*0.3,r*0.4,'#ffffff'); }
// building facade with lit windows
function facade(c,x,base,w,h,col,lit,dark,win,seed,winOn){
  const r=rnd(seed); R(c,x,base-h,w,h,col); R(c,x,base-h,2,h,lit); R(c,x+w-3,base-h,3,h,dark); R(c,x-1,base-h-2,w+2,2,dark);
  for(let yy=base-h+5;yy<base-5;yy+=7) for(let xx=x+4;xx<x+w-5;xx+=6){ const on=r()<(winOn==null?0.45:winOn); R(c,xx,yy,3,4,on?win[(r()*win.length)|0]:dark); if(on) R(c,xx,yy,3,1,'#ffffff'); }
}
// neon sign: bright core, wide coloured bloom
function neon(c,x,y,text,col,size,align){ glow(c,x+(align==='center'?0:text.length*size*0.45),y+size*0.5,size*text.length*0.55+10,col.replace('rgb','rgba').replace(')',',0.35)'));
  txt(c,text,x+1,y+1,'rgba(0,0,0,0.6)',size,align); txt(c,text,x,y,col,size,align); txt(c,text,x,y-1,'rgba(255,255,255,0.55)',size,align); }
const hex2rgb=h=>{ const n=parseInt(h.slice(1),16); return 'rgb('+[(n>>16)&255,(n>>8)&255,n&255].join(',')+')'; };
// wet ground: streaky reflections of what's above
function wet(c,h,a){ reflect(c,FLOOR,h,a); for(let i=0;i<80;i++){ const r=Math.random; } }

const D={}, FG={}, AN={};

// ===================== TRADING FLOOR (NYSE after hours) =====================
D.floor=c=>{
  // back wall: warm marble with tall arched windows onto the night city
  c.fillStyle=vgrad(c,0,FLOOR,['#2a1408','#4a2410','#5a2e14']); c.fillRect(0,0,AW,FLOOR);
  for(let i=0;i<5;i++){ const x=18+i*94, w=62;
    c.fillStyle=vgrad(c,30,138,['#0a0a2a','#1a1a4a','#3a2a5a']); c.beginPath(); c.moveTo(x,138); c.lineTo(x,62); c.arc(x+w/2,62,w/2,Math.PI,0); c.lineTo(x+w,138); c.fill();
    c.save(); c.beginPath(); c.moveTo(x,138); c.lineTo(x,62); c.arc(x+w/2,62,w/2,Math.PI,0); c.lineTo(x+w,138); c.clip();
    stars(c,40+i,18,90,['#ffffff','#ffd9b3']); skyline(c,30+i,138,'#14143a',20,70,['#ffd27a','#7fdcff','#ffffff'],0.35,{x0:x-4,x1:x+w+4,minW:7,varW:10});
    glow(c,x+w/2,138,40,'rgba(255,170,80,0.25)'); c.restore();
    R(c,x+w/2-1,32,2,106,'#6a3a1a'); for(let yy=60;yy<138;yy+=26) R(c,x,yy,w,2,'#6a3a1a');
    c.strokeStyle='#8a5a2a'; c.lineWidth=3; c.beginPath(); c.moveTo(x,138); c.lineTo(x,62); c.arc(x+w/2,62,w/2,Math.PI,0); c.lineTo(x+w,138); c.stroke();
    c.strokeStyle='#d8a050'; c.lineWidth=1; c.stroke(); }
  // marble columns with gilded capitals
  const cp=['#3a2010','#8a6040','#c89a6a','#f0d0a0'];
  for(const x of [-6,94,188,282,376,470]){ column(c,x,28,16,128,cp); R(c,x-4,22,24,7,'#c8901a'); R(c,x-4,22,24,2,'#ffd86a'); R(c,x-3,154,22,6,'#5a3418'); R(c,x-3,154,22,1,'#c89a6a'); }
  // giant LED ticker board across the top
  R(c,0,0,AW,22,'#0a0402'); R(c,0,21,AW,2,'#c8901a'); const r=rnd(5);
  for(let i=0;i<6;i++){ const bx=4+i*80; R(c,bx,2,74,17,'#140806'); let py=10; const up=i%2===0;
    for(let k=0;k<14;k++){ const ny=Math.max(4,Math.min(17,py+(r()-(up?0.65:0.35))*5)); R(c,bx+3+k*5,Math.min(py,ny),3,Math.abs(ny-py)+1,ny<py?'#3bff8a':'#ff4b4b'); py=ny; }
    txt(c,['$DOJO','BTC','ETH','SOL','GAS','COPE'][i],bx+3,3,'#ffb36b',4); glow(c,bx+37,10,30,up?'rgba(59,255,138,0.12)':'rgba(255,75,75,0.12)'); }
  // orange ticker band (animated text drawn in ANIM)
  R(c,0,146,AW,12,'#ff6a00'); R(c,0,146,AW,1,'#ffd23f'); R(c,0,157,AW,1,'#8a3200');
  // rows of traders + desks with glowing monitors
  crowd(c,0,AW,164,2,7,['#1a1a2a','#2a2a3a','#3a2418','#14141e'],['#e8b48a','#c08a5a','#8a5a3a'],1.1);
  for(let row=0;row<2;row++){ const y=178+row*26, sc=row?1.2:1, col=row?'#4a2410':'#3a1c0a';
    for(let i=-1;i<10;i++){ const x=i*54+(row?4:30);
      R(c,x,y,48*sc,14*sc,col); R(c,x,y,48*sc,2,'#8a4a1a'); R(c,x,y+14*sc-2,48*sc,2,'#1a0a04');
      for(let m=0;m<3;m++){ const mx=x+3+m*15*sc, my=y-12*sc; R(c,mx,my,13*sc,10*sc,'#0a0604'); R(c,mx+1,my+1,11*sc,7*sc,['#0e3a20','#3a0e0e','#0e2a3a'][(i+m+row)%3]);
        let yy=my+5*sc; for(let q=0;q<5;q++){ const ny=yy+(r()-0.5)*4; R(c,mx+1.5+q*2*sc,Math.min(yy,ny),1.2,Math.abs(ny-yy)+1,(i+m)%2?'#3bff8a':'#ff6b6b'); yy=ny; }
        glow(c,mx+6*sc,my+5*sc,10,'rgba(90,220,255,0.12)'); } } }
  glow(c,240,140,260,'rgba(255,150,60,0.12)');
  // polished marble floor: checker with reflections
  // brass rail between the pit and the floor
  R(c,0,216,AW,16,'#2a1408'); for(let x=4;x<AW;x+=12){ R(c,x,218,2,13,'#c8901a'); R(c,x,218,1,13,'#ffd86a'); } R(c,0,215,AW,3,'#c8901a'); R(c,0,215,AW,1,'#ffe8a0');
  tiles(c,FLOOR,'#d8c0a0','#5a3a28','#3a2014'); texture(c,0,FLOOR,AW,AH-FLOOR,0.3,3,9,2); reflect(c,FLOOR,40,0.28); R(c,0,FLOOR,AW,1,'#c89a6a'); contact(c); vignette(c,0.4);
};
AN.floor=(c,t)=>{ c.save(); c.beginPath(); c.rect(0,146,AW,12); c.clip(); const items=['$DOJO +420%','BTC -2.1%','ETH +1.3%','SOL +6.9%','GAS +99%','COPE +12%','HOPIUM -8%','FUD -40%'];
  const span=items.length*90, off=-(t*0.6)%span; for(let k=0;k<2;k++) items.forEach((s,i)=>txt(c,s,off+k*span+i*90,149,s.includes('-')?'#5a0000':'#2b1405',6)); c.restore();
  for(let i=0;i<6;i++){ const x=4+i*80; if(((t>>3)+i)%7===0){ c.globalAlpha=0.25; R(c,x,2,74,17,'#ffffff'); c.globalAlpha=1; } } };
FG.floor=c=>{ for(const x of [-14,452]){ column(c,x,0,42,AH,['#1a0c04','#3a2010','#5a3a20','#8a6040']); } R(c,0,0,AW,6,'#1a0a04'); };

// ===================== COMMENT SECTION (coliseum) =====================
D.coliseum=c=>{
  c.fillStyle=vgrad(c,0,80,['#ff8a3a','#ffb060','#ffd89a']); c.fillRect(0,0,AW,80);
  glow(c,420,10,110,'rgba(255,255,220,0.6)'); circ(c,420,14,14,'#fffbe0');
  P.cloud2(c,40,22,80,'#fff4e0','#ffd0a0','#e8a070',61); P.cloud2(c,250,12,110,'#fff4e0','#ffd0a0','#e8a070',62);
  // far tiers: arches in warm stone, receding
  const sp=['#4a2410','#9a6438','#b8804a','#d8a066','#f4cc8a'];
  for(let tier=0;tier<4;tier++){ const y=40+tier*36, h=34, aw=26-tier*0, n=Math.ceil(AW/aw)+1;
    blocks(c,0,y,AW,h,13,6,sp,70+tier);
    for(let i=0;i<n;i++){ const x=i*aw+(tier%2)*13-6, ax=x+5, aw2=aw-10, ah=h-12;
      c.fillStyle='#2a1208'; c.beginPath(); c.moveTo(ax,y+h-2); c.lineTo(ax,y+10); c.arc(ax+aw2/2,y+10,aw2/2,Math.PI,0); c.lineTo(ax+aw2,y+h-2); c.fill(); }
    crowd(c,0,AW,y+16,1,80+tier,['#a8202a','#d8a020','#2a5ab0','#188a40','#d85a10','#e8e0d0','#6a28c8'],['#f0c8a0','#c08a5a','#8a5a3a','#5a3a22'],1.25);
    for(let i=0;i<n;i++){ const x=i*aw+(tier%2)*13-6; R(c,x,y+4,5,h-6,sp[2]); R(c,x,y+4,1,h-6,sp[4]); R(c,x+4,y+4,1,h-6,sp[1]); }
    R(c,0,y+h-2,AW,2,sp[0]); R(c,0,y,AW,2,sp[4]); }
  // comment-banner frieze along the top
  const cm=['+1','L + RATIO','W','FIRST','SOURCE?','BASED','NGMI','COPE'];
  for(let i=0;i<8;i++){ const x=6+i*60; R(c,x,26,54,12,'#fff8ee'); R(c,x,26,54,1,'#ffffff'); R(c,x,37,54,1,'#c8a080'); circ(c,x+6,32,3.5,['#ff6a00','#2a6fd6','#18a34a','#c0262d'][i%4]); txt(c,cm[i],x+12,29,'#2b1405',4); }
  // podium wall with $DOJO banners
  blocks(c,0,186,AW,46,16,7,['#3a1a08','#7a4a24','#9a6438','#b8804a','#e0b07a'],77);
  for(let i=0;i<6;i++){ const x=18+i*80; R(c,x,190,40,34,'#a8202a'); R(c,x,190,40,3,'#ffd23f'); R(c,x+38,190,2,34,'#6a1018'); poly(c,[[x,224],[x+20,232],[x+40,224]],'#a8202a'); txt(c,'$DOJO',x+20,203,'#ffd23f',5,'center'); }
  // sand floor
  c.fillStyle=vgrad(c,FLOOR,AH,['#e8c080','#c89a5a','#9a6a38']); c.fillRect(0,FLOOR,AW,AH-FLOOR); R(c,0,FLOOR,AW,1,'#fff0c8');
  const r=rnd(9); for(let i=0;i<220;i++){ R(c,r()*AW,FLOOR+2+r()*36,1+r()*3,1,r()<0.5?'#b8884a':'#fff0c8'); }
  for(let i=0;i<5;i++) rock(c,20+r()*440,FLOOR+20+r()*12,8+r()*8,4,500+i,['#4a2a10','#9a6a38','#c89a5a','#e8c080','#fff0c8']);
  contact(c); vignette(c,0.25);
};
AN.coliseum=(c,t)=>{ const r=rnd((t>>4)+1); for(let i=0;i<30;i++){ const tier=(r()*4)|0; R(c,r()*AW,40+tier*36+12-((t>>2)%2)*2,1,5,'#f0c8a0'); } };
FG.coliseum=c=>{ for(const x of [0,452]) { blocks(c,x,90,28,AH-90,14,8,['#2a1206','#5a3014','#7a4a24','#9a6438','#c08a5a'],90+x); R(c,x-4,84,36,8,'#c08a5a'); R(c,x-4,84,36,2,'#f0c890'); } };

// ===================== LIQUIDATION VOLCANO =====================
D.volcano=c=>{
  c.fillStyle=vgrad(c,0,FLOOR,['#0a0204','#2a0608','#5a1008','#a02a08']); c.fillRect(0,0,AW,FLOOR);
  for(let i=0;i<7;i++) P.cloud2(c,-30+i*80,20+(i%3)*16,110,'#a8401a','#4a1208','#1a0404',40+i);
  glow(c,240,60,200,'rgba(255,100,20,0.35)');
  // the volcano: lit right flank, shadowed left flank, glowing crater
  c.fillStyle='#1a0604'; c.beginPath(); c.moveTo(40,FLOOR); c.lineTo(196,64); c.lineTo(284,64); c.lineTo(440,FLOOR); c.fill();
  c.fillStyle='#3a0e06'; c.beginPath(); c.moveTo(240,64); c.lineTo(284,64); c.lineTo(440,FLOOR); c.lineTo(300,FLOOR); c.fill();
  texture(c,40,60,400,172,0.7,5,22);
  for(let i=0;i<10;i++){ const x=196+i*9; R(c,x,62,9,3,i%2?'#ff8a1a':'#ffd23f'); } glow(c,240,62,60,'rgba(255,210,80,0.9)');
  const lava=(pts,w)=>{ c.lineJoin='round'; for(const [lw,col] of [[w+4,'rgba(255,60,0,0.35)'],[w+2,'#ff3a00'],[w,'#ffa000'],[Math.max(1,w-2),'#fff2a0']]){ c.strokeStyle=col; c.lineWidth=lw; c.beginPath(); pts.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1])); c.stroke(); } };
  lava([[232,66],[224,100],[240,134],[228,166],[246,200],[236,226]],4); lava([[258,66],[276,108],[296,150],[310,190],[338,224]],3); lava([[214,68],[194,118],[172,168],[142,224]],3);
  // liquidation hologram + price
  c.globalAlpha=0.9; R(c,14,64,128,84,'rgba(255,40,40,0.1)'); c.strokeStyle='#ff3b3b'; c.lineWidth=1; c.strokeRect(14.5,64.5,127,83);
  for(let i=0;i<11;i++){ const x=20+i*11, h=6+i*5; R(c,x,72+i*5.5,7,h,'#ff2e2e'); R(c,x+3,68+i*5.5,1,h+8,'#ff2e2e'); } c.globalAlpha=1;
  txt(c,'LIQUIDATED',392,74,'#ffd23f',6,'center'); txt(c,'-99.9%',392,86,'#ff3b3b',10,'center');
  // basalt cliffs framing the stage
  const bp=['#0a0202','#2a0a06','#4a1a0c','#7a3018','#ff7a2a'];
  for(const [x,y,w,h] of [[30,150,90,120],[0,120,60,150],[450,140,80,130],[410,170,70,100]]) rock(c,x,y,w,h,(x*13+y)|0,bp);
  // lava river behind a stone ledge
  c.fillStyle=vgrad(c,206,222,['#ffd23f','#ff6a00','#c02a00']); c.fillRect(0,206,AW,16);
  for(let i=0;i<40;i++){ const r2=Math.sin(i*12.9898)*43758.5453, f=r2-Math.floor(r2); R(c,f*AW,208+(i%4)*3,6+(i%5)*4,1,'#fff2a0'); }
  glow(c,240,214,260,'rgba(255,120,20,0.25)');
  blocks(c,0,220,AW,12,22,6,['#0a0202','#2a0c06','#3a140a','#5a2412','#ff8a3a'],41,true);
  // obsidian floor with glowing cracks
  c.fillStyle=vgrad(c,FLOOR,AH,['#2a0c06','#140402','#080100']); c.fillRect(0,FLOOR,AW,AH-FLOOR);
  const r=rnd(12); for(let i=0;i<12;i++) rock(c,r()*AW,FLOOR+8+r()*28,18+r()*26,6+r()*5,300+i,['#050100','#1a0604','#2a0c06','#4a1a0c','#ff6a2a']);
  for(let i=0;i<8;i++){ let x=r()*AW, y=FLOOR+3; c.strokeStyle='#ff5a00'; c.lineWidth=1; c.beginPath(); c.moveTo(x,y); for(let k=0;k<5;k++){ x+=(r()-0.5)*18; y+=5+r()*3; c.lineTo(x,y); } c.stroke(); }
  R(c,0,FLOOR,AW,1,'#ff8a3a'); contact(c); vignette(c,0.5);
};
AN.volcano=(c,t)=>{ for(let i=0;i<18;i++){ const p=((t*0.7+i*37)%160); const x=226+((i*13)%28)+Math.sin(t*0.04+i)*8; c.globalAlpha=1-p/160; R(c,x,66-p*0.4,1.5,1.5,i%2?'#ffd23f':'#ff6a00'); } c.globalAlpha=1;
  for(let i=0;i<16;i++){ const p=(t*0.3+i*29)%AW; c.globalAlpha=0.7; R(c,p,FLOOR-30-((i*31)%150)+Math.sin(t*0.02+i)*4,1,1,'#ff8a3a'); } c.globalAlpha=1;
  for(let i=0;i<6;i++){ const x=(t*0.5+i*80)%AW; R(c,x,210+(i%3)*3,8,1,'#fff6c0'); } };
FG.volcano=c=>{ rock(c,8,262,70,40,901,['#000000','#0a0202','#1a0604','#2a0c06','#7a2a10']); rock(c,474,258,80,50,902,['#000000','#0a0202','#1a0604','#2a0c06','#7a2a10']); };


// ===================== MOON BASE =====================
D.moon=c=>{
  c.fillStyle=vgrad(c,0,FLOOR,['#010008','#05031a','#0d0828','#1a1038']); c.fillRect(0,0,AW,FLOOR);
  const img=c.getImageData(0,0,AW,170), d=img.data;
  for(let y=0;y<170;y++) for(let x=0;x<AW;x++){ const n=fbm(x/70,y/46,4,5), m=Math.max(0,n-0.46)*2.6; const k=(y*AW+x)*4; d[k]+=m*130; d[k+1]+=m*40; d[k+2]+=m*170; }
  c.putImageData(img,0,0); stars(c,7,340,190,['#ffffff','#ffd9b3','#b3c7ff','#ffffff']);
  // Earth with atmosphere rim and terminator
  glow(c,392,56,64,'rgba(90,170,255,0.4)'); c.save(); c.beginPath(); c.arc(392,56,34,0,7); c.clip();
  for(let y=22;y<91;y++) for(let x=358;x<427;x++){ const n=fbm(x/12,y/12,21,4); R(c,x,y,1,1, n>0.55?(n>0.68?'#e7d9a8':'#3f9a4a'):'#2a6fd6'); }
  for(let y=22;y<91;y++) for(let x=358;x<427;x++){ if(fbm(x/9+3,y/5,33,3)>0.6){ c.globalAlpha=0.8; R(c,x,y,1,1,'#ffffff'); c.globalAlpha=1; } }
  const sh=c.createLinearGradient(366,0,426,0); sh.addColorStop(0,'rgba(0,0,20,0)'); sh.addColorStop(0.55,'rgba(0,0,20,0.1)'); sh.addColorStop(1,'rgba(0,0,20,0.88)'); c.fillStyle=sh; c.fillRect(358,22,69,69); c.restore();
  c.strokeStyle='rgba(160,210,255,0.8)'; c.lineWidth=1; c.beginPath(); c.arc(392,56,34,Math.PI*0.6,Math.PI*1.45); c.stroke();
  // layered highlands with lit ridges
  ridge(c,186,46,11,'#6a6a7c','#46465a',5); ridge(c,200,30,12,'#8a8a9c','#5c5c70',4); ridge(c,214,18,13,'#a8a8b8','#76768a',3);
  // base modules: shaded cylinders, dome with panel grid, lit windows, solar arrays
  const mp=['#4a4c58','#8a8e9c','#c8ccd8','#eef0f8'];
  for(const [x,w] of [[18,70],[96,54]]){ R(c,x,196,w,30,mp[1]); R(c,x,196,w,6,mp[2]); R(c,x,197,w,2,mp[3]); R(c,x,222,w,4,mp[0]); for(let i=0;i<Math.floor(w/14);i++){ R(c,x+5+i*14,206,8,6,'#ffb36b'); R(c,x+5+i*14,206,8,1,'#fff0c0'); glow(c,x+9+i*14,209,9,'rgba(255,180,100,0.35)'); } }
  circ(c,64,196,30,mp[1]); c.save(); c.beginPath(); c.arc(64,196,30,Math.PI,0); c.clip(); c.fillStyle=vgrad(c,166,196,[mp[3],mp[2],mp[1]]); c.fillRect(34,166,60,30);
  for(let i=0;i<7;i++) R(c,34+i*9,166,1,30,mp[0]); for(let i=0;i<3;i++) R(c,34,172+i*8,60,1,mp[0]); c.restore(); circ(c,54,180,6,'rgba(255,255,255,0.55)');
  for(let i=0;i<3;i++){ const x=160+i*22; R(c,x,212,1,14,mp[0]); poly(c,[[x-9,206],[x+9,202],[x+9,212],[x-9,216]],'#1a2a6a'); for(let k=0;k<4;k++) R(c,x-8+k*4.5,205-k,1,10,'#3a5ab0'); }
  R(c,210,150,3,76,'#9aa0ad'); c.fillStyle='#c9ccd6'; c.beginPath(); c.ellipse(218,150,15,6,-0.6,0,Math.PI); c.fill(); R(c,216,148,2,4,'#ff6a00');
  // rocket on a launch tower
  R(c,322,120,4,106,'#5a5a66'); R(c,348,120,4,106,'#5a5a66'); for(let y=124;y<226;y+=8){ R(c,322,y,30,1,'#5a5a66'); c.strokeStyle='#5a5a66'; c.beginPath(); c.moveTo(322,y); c.lineTo(352,y+8); c.stroke(); }
  R(c,330,104,14,114,'#f4f4f4'); R(c,330,104,4,114,'#ffffff'); R(c,340,104,4,114,'#c4c4cc'); poly(c,[[330,104],[337,84],[344,104]],'#ff6a00'); poly(c,[[337,84],[344,104],[340,104]],'#c84a00');
  poly(c,[[330,196],[322,218],[330,218]],'#ff6a00'); poly(c,[[344,196],[352,218],[344,218]],'#c84a00'); R(c,332,132,10,10,'#2a6fd6'); R(c,333,133,3,3,'#9ad0ff'); txt(c,'DOJO',331,152,'#2b1405',4);
  // regolith floor: lit crater rims, boulders
  c.fillStyle=vgrad(c,FLOOR,AH,['#b8b8c6','#8a8a98','#5a5a68']); c.fillRect(0,FLOOR,AW,AH-FLOOR); R(c,0,FLOOR,AW,1,'#eeeef8');
  const rr=rnd(9); for(let i=0;i<14;i++){ const x=rr()*AW, y=FLOOR+6+rr()*28, w=8+rr()*18; c.fillStyle='#6a6a78'; c.beginPath(); c.ellipse(x,y,w,w*0.25,0,0,7); c.fill(); c.fillStyle='#4a4a58'; c.beginPath(); c.ellipse(x+1,y+0.5,w*0.8,w*0.17,0,0,7); c.fill(); c.fillStyle='#e0e0ec'; c.beginPath(); c.ellipse(x,y+w*0.18,w*0.85,w*0.1,0,0,Math.PI); c.fill(); }
  const mp2=['#1a1a24','#5a5a6a','#9a9aaa','#c8c8d6','#f0f0ff'];
  for(const [x,y,w,h] of [[26,FLOOR-4,40,20],[448,FLOOR-6,52,24],[402,FLOOR-1,22,9]]) rock(c,x,y,w,h,(x*7)|0,mp2);
  texture(c,0,FLOOR,AW,AH-FLOOR,0.3,4,5); contact(c); vignette(c,0.35);
};
AN.moon=(c,t)=>{ const x=(t*0.5)%620-60; R(c,x,26,6,1.2,'#fff'); c.globalAlpha=0.5; R(c,x-14,26.2,14,0.8,'#ff6a00'); c.globalAlpha=1; if((t>>5)%2) circ(c,217,151,2,'#ff3b3b'); if((t>>4)%2) R(c,336,82,2,2,'#ff3b3b'); };
FG.moon=c=>{ rock(c,10,262,70,30,801,['#0a0a12','#2a2a36','#4a4a5a','#6a6a7c','#9a9aac']); rock(c,474,264,64,26,802,['#0a0a12','#2a2a36','#4a4a5a','#6a6a7c','#9a9aac']); };

// ===================== RUG BAZAAR =====================
D.bazaar=c=>{
  c.fillStyle=vgrad(c,0,FLOOR,['#2a1040','#7a2a50','#d8502a','#ff9a3a','#ffd27a']); c.fillRect(0,0,AW,FLOOR);
  glow(c,240,112,150,'rgba(255,230,150,0.55)'); circ(c,240,114,24,'#fff1b8'); for(let i=0;i<5;i++) R(c,212,108+i*5,56,1,'rgba(255,150,60,0.7)');
  P.cloud2(c,30,36,90,'#ffcf8a','#e87a4a','#a84a4a',3); P.cloud2(c,330,26,110,'#ffcf8a','#e87a4a','#a84a4a',5);
  ridge(c,146,26,3,'#b8541a','#8a3a10',3);
  // domes + minarets with lit facets
  const r=rnd(3);
  for(let i=0;i<10;i++){ const x=4+i*50+r()*10, h=24+r()*30, w=22+r()*12, base=170;
    R(c,x,base-h,w,h+10,'#6a2206'); R(c,x,base-h,4,h+10,'#a8441a'); R(c,x+w-4,base-h,4,h+10,'#3a1204');
    circ(c,x+w/2,base-h,w/2,'#6a2206'); circ(c,x+w/2-w*0.15,base-h-w*0.12,w*0.3,'#a8441a'); circ(c,x+w/2-w*0.2,base-h-w*0.2,w*0.12,'#ff9a4a');
    R(c,x+w/2-0.5,base-h-w/2-7,1,7,'#3a1204'); circ(c,x+w/2,base-h-w/2-8,1.5,'#ffd23f');
    for(let k=0;k<3;k++){ R(c,x+4+k*(w-8)/2,base-h+8,3,5,'#ffcf6a'); glow(c,x+5+k*(w-8)/2,base-h+10,6,'rgba(255,200,100,0.3)'); } }
  for(let i=0;i<3;i++){ const x=60+i*170; R(c,x,84,9,92,'#4a1604'); R(c,x,84,3,92,'#8a3a10'); poly(c,[[x-2,84],[x+4.5,68],[x+11,84]],'#4a1604'); R(c,x-3,108,15,3,'#2a0a02'); R(c,x-3,108,15,1,'#ff9a4a'); }
  // sandstone gateway arches framing the market
  const sp=['#4a2010','#9a5a2a','#c07a3a','#e0a05a','#ffd090'];
  blocks(c,0,124,AW,10,12,5,sp,31); R(c,0,123,AW,2,sp[4]);
  // string lights
  c.strokeStyle='#2b1405'; c.lineWidth=1; for(let s2=0;s2<2;s2++){ c.beginPath(); c.moveTo(0,130+s2*8); c.quadraticCurveTo(240,154+s2*8,480,130+s2*8); c.stroke();
    for(let i=1;i<20;i++){ const t=i/20, y=(1-t)*(1-t)*(130+s2*8)+2*t*(1-t)*(154+s2*8)+t*t*(130+s2*8); circ(c,t*480,y+2,1.6,['#ffd23f','#ff6a00','#ff3b3b','#3bff8a'][i%4]); glow(c,t*480,y+2,6,'rgba(255,200,100,0.35)'); } }
  // stalls: striped awnings with fabric folds, hanging rugs with tassels, pots
  for(let i=0;i<5;i++){ const x=4+i*96;
    R(c,x+4,150,78,82,'#2a0e02'); texture(c,x+4,150,78,82,0.3,3,i);
    for(let s2=0;s2<9;s2++){ const ax=x+s2*9.5; poly(c,[[ax,140],[ax+9.5,140],[ax+9.5,152],[ax+4.75,158],[ax,152]], s2%2?'#c0262d':'#ffd23f'); R(c,ax,140,9.5,2,s2%2?'#e8505a':'#fff1a0'); R(c,ax+8,142,1.5,10,'rgba(0,0,0,0.2)'); }
    for(let k=0;k<3;k++){ const cx=x+9+k*24, col=['#c0262d','#2a4fbf','#18a34a','#7b2cff'][(i+k)%4];
      R(c,cx,160,20,56,col); R(c,cx,160,20,2,'#fff1c2'); R(c,cx,160,3,56,shade(col,1.3)); R(c,cx+17,160,3,56,shade(col,0.6));
      for(let tt=0;tt<4;tt++){ const cy=168+tt*12; poly(c,[[cx+10,cy-4],[cx+16,cy],[cx+10,cy+4],[cx+4,cy]],'#ffd23f'); R(c,cx+9,cy-1,2,2,col); }
      for(let f=0;f<7;f++) R(c,cx+1+f*3,216,1,3,'#ffd23f'); }
    for(let pp=0;pp<2;pp++){ const px=x+14+pp*46; c.fillStyle='#8a3a10'; c.beginPath(); c.ellipse(px,224,8,8,0,0,7); c.fill(); c.fillStyle='#c8641a'; c.beginPath(); c.ellipse(px-2,222,5,5,0,0,7); c.fill(); R(c,px-3,214,6,3,'#8a3a10'); R(c,px-6,224,3,1,'#ffd23f'); } }
  // patterned tile + rug floor
  c.fillStyle=vgrad(c,FLOOR,AH,['#e0a868','#a86a34','#6a3a18']); c.fillRect(0,FLOOR,AW,AH-FLOOR); R(c,0,FLOOR,AW,1,'#ffe0a8');
  for(let x=-10;x<AW;x+=64){ R(c,x,FLOOR+9,50,24,'#6a1018'); R(c,x+2,FLOOR+11,46,20,'#c0262d'); R(c,x+5,FLOOR+14,40,14,'#8a1820'); for(let q=0;q<3;q++) poly(c,[[x+25,FLOOR+15+q*5],[x+31,FLOOR+18+q*5],[x+25,FLOOR+21+q*5],[x+19,FLOOR+18+q*5]],'#ffd23f'); for(let f=0;f<8;f++) R(c,x+3+f*6,FLOOR+33,1,2,'#ffd23f'); }
  texture(c,0,FLOOR,AW,AH-FLOOR,0.3,3,2); contact(c); vignette(c,0.3);
};
AN.bazaar=(c,t)=>{ for(let i=0;i<20;i++){ const x=(i*29+t*0.2)%AW, y=60+((i*41+t*0.15)%110); c.globalAlpha=0.5; R(c,x,y,1,1,'#ffe0a0'); } c.globalAlpha=1; };
FG.bazaar=c=>{ const sp=['#2a0e04','#6a3414','#8a4a20','#b06a30','#e09a50'];
  for(const x of [0,450]){ blocks(c,x,0,30,AH,10,6,sp,700+x); } R(c,0,0,AW,10,sp[1]); R(c,0,9,AW,2,sp[4]);
  for(const x of [30,450]){ R(c,x,10,1,20,'#2b1405'); R(c,x-6,30,13,18,'#ff6a00'); R(c,x-6,30,13,2,'#ffd23f'); R(c,x-6,46,13,2,'#ffd23f'); glow(c,x,39,20,'rgba(255,150,40,0.4)'); } };

// ===================== WHALE DOCK =====================
D.dock=c=>{
  c.fillStyle=vgrad(c,0,150,['#1a2a5a','#4a4a8a','#c86a7a','#ffaa5a','#ffd890']); c.fillRect(0,0,AW,150);
  P.cloud2(c,20,40,110,'#ffd0a0','#c87a8a','#7a5a8a',51); P.cloud2(c,250,26,140,'#ffd0a0','#c87a8a','#7a5a8a',52); P.cloud2(c,150,80,70,'#ffe0b0','#e08a7a','#9a6a7a',53);
  glow(c,320,146,100,'rgba(255,200,120,0.7)'); circ(c,320,148,18,'#fff0c0');
  skyline(c,61,150,'#4a3a5a',4,24,['#ffd27a'],0.18,{x0:0,x1:180,minW:8,varW:12});
  for(const x of [40,112]){ R(c,x,90,4,60,'#3a2a4a'); R(c,x-26,90,60,3,'#3a2a4a'); R(c,x+30,93,1,20,'#3a2a4a'); R(c,x+26,113,8,4,'#3a2a4a'); for(let y=94;y<150;y+=6){ R(c,x,y,4,1,'#5a4a6a'); } }
  c.fillStyle=vgrad(c,150,FLOOR,['#6a7ab0','#3a4a80','#1a2850','#0f1838']); c.fillRect(0,150,AW,FLOOR-150);
  const r=rnd(8); for(let y=152;y<FLOOR;y+=2){ const w=Math.max(4,48-(y-150)*0.25); for(let k=0;k<3;k++){ const x=320+(r()-0.5)*w*1.6; R(c,x-r()*8,y,4+r()*10,1,y<180?'#ffe0a0':'#ffb070'); } }
  for(let i=0;i<80;i++) R(c,r()*AW,152+r()*78,3+r()*8,1,'rgba(170,200,255,0.35)');
  poly(c,[[150,176],[140,160],[132,154],[146,158],[152,166],[158,158],[172,154],[164,160],[156,176]],'#0a1430'); R(c,138,176,34,2,'#bfe3ff'); R(c,134,178,42,1,'rgba(191,227,255,0.5)');
  // container ship
  R(c,356,168,120,16,'#1a2232'); poly(c,[[352,168],[478,168],[470,186],[362,186]],'#1a2232'); R(c,358,184,116,2,'#c0262d'); R(c,356,168,120,1,'#5a6a8a');
  const cc=['#c0262d','#ff6a00','#2a4fbf','#18a34a','#ffd23f'];
  for(let row=0;row<3;row++) for(let i=0;i<8;i++){ if(row===2&&i>4) continue; const x=378+i*11, y=158-row*8; R(c,x,y,10,7,cc[(i+row*3)%5]); R(c,x,y,10,1,'rgba(255,255,255,0.35)'); for(let l=2;l<10;l+=2) R(c,x+l,y+1,1,6,'rgba(0,0,0,0.22)'); }
  R(c,462,136,12,22,'#e8eef8'); R(c,464,140,8,2,'#2a4fbf'); R(c,467,126,2,10,'#333');
  // pier posts + rope rail
  for(let i=0;i<6;i++){ const x=10+i*92; R(c,x,138,10,94,'#4a2c12'); R(c,x,138,3,94,'#7a5028'); R(c,x+8,138,2,94,'#2a1608'); R(c,x-1,136,12,3,'#8a6030'); R(c,x-1,136,12,1,'#c89050'); }
  c.strokeStyle='#e0b880'; c.lineWidth=1.5; for(let i=0;i<5;i++){ c.beginPath(); c.moveTo(20+i*92,150); c.quadraticCurveTo(65+i*92,168,102+i*92,150); c.stroke(); }
  // crates, barrel, net
  for(const [x,y,col] of [[296,FLOOR-17,'#8a5a2b'],[314,FLOOR-17,'#a06a35'],[305,FLOOR-34,'#7a4a20']]){ R(c,x,y,17,17,col); R(c,x,y,17,2,'#d09a5a'); R(c,x,y,2,17,'#c08a4a'); R(c,x+15,y,2,17,'#4a2a10'); c.strokeStyle='#4a2a10'; c.lineWidth=1; c.strokeRect(x+0.5,y+0.5,16,16); c.beginPath(); c.moveTo(x,y); c.lineTo(x+17,y+17); c.stroke(); }
  c.fillStyle='#5a3a1a'; c.beginPath(); c.ellipse(150,FLOOR-10,8,10,0,0,7); c.fill(); c.fillStyle='#8a5a2a'; c.beginPath(); c.ellipse(148,FLOOR-11,5,8,0,0,7); c.fill(); R(c,142,FLOOR-15,16,2,'#2a1808'); R(c,142,FLOOR-6,16,2,'#2a1808');
  // weathered plank deck
  planks(c,FLOOR,AH,['#2a1608','#7a4a22','#8a5a2a','#9a6834','#c89058'],3); R(c,0,FLOOR,AW,1,'#e0b070'); contact(c); vignette(c,0.3);
};
AN.dock=(c,t)=>{ for(let i=0;i<9;i++){ const x=((t*0.25+i*60)%(AW+40))-20, y=158+(i%4)*16; R(c,x,y,22,0.8,'rgba(200,220,255,0.5)'); }
  for(let i=0;i<3;i++){ const x=(t*0.4+i*160)%560-40, y=60+i*12+Math.sin(t*0.06+i)*3, w=((t>>3)+i)%2; c.fillStyle='#2a2040'; c.fillRect(x,y,2,1); c.fillRect(x-3,y-1-w,3,1); c.fillRect(x+2,y-1-w,3,1); } };
FG.dock=c=>{ R(c,452,206,18,64,'#2a1608'); R(c,452,206,5,64,'#6a4420'); R(c,448,202,26,6,'#5a3a18'); R(c,448,202,26,2,'#a07040'); c.strokeStyle='#d8b07a'; c.lineWidth=2; c.beginPath(); c.moveTo(452,214); c.quadraticCurveTo(420,250,380,270); c.stroke(); };

// ===================== GAS STATION 3AM =====================
D.gas=c=>{
  c.fillStyle=vgrad(c,0,FLOOR,['#05030f','#0e0a24','#1e1238','#2a1640']); c.fillRect(0,0,AW,FLOOR); stars(c,12,140,110,['#ffffff','#c8d0ff']);
  skyline(c,14,178,'#120a22',20,70,['#ffd27a','#7fdcff'],0.12,{x0:0,x1:AW,minW:10,varW:20});
  // convenience store: lit interior with shelves
  R(c,300,120,180,92,'#2a1a2a'); R(c,300,120,180,4,'#4a3a4a'); R(c,306,134,120,70,'#fff4d8'); glow(c,366,170,90,'rgba(255,240,200,0.35)');
  for(let sh=0;sh<4;sh++){ R(c,310,142+sh*15,112,2,'#a08060'); for(let k=0;k<18;k++) R(c,312+k*6,134+sh*15+((k*7)%4),4,8-((k*7)%4),['#c0262d','#2a6fd6','#18a34a','#ffd23f','#ff6a00','#7b2cff'][(k+sh)%6]); }
  R(c,306,134,120,70,'rgba(120,180,255,0.08)'); R(c,365,134,2,70,'#4a3a4a'); R(c,436,140,34,64,'#1a1222'); R(c,438,142,30,58,'#3a2a4a'); R(c,463,170,3,6,'#c8c8d0');
  R(c,320,108,120,14,'#c0262d'); R(c,320,108,120,2,'#ff6a6a'); txt(c,'24/7 MART',380,111,'#fff4e6',6,'center'); glow(c,380,115,70,'rgba(255,60,60,0.25)');
  // canopy with tube lights
  R(c,4,90,286,18,'#e8e0d8'); R(c,4,90,286,3,'#ffffff'); R(c,4,104,286,4,'#ff6a00'); R(c,4,108,286,2,'#a84300'); txt(c,'GWEI GAS',147,96,'#ff6a00',7,'center');
  for(let i=0;i<5;i++){ R(c,20+i*56,110,40,2,'#ffffff'); glow(c,40+i*56,112,40,'rgba(230,240,255,0.25)'); }
  c.fillStyle='rgba(230,240,255,0.10)'; c.beginPath(); c.moveTo(4,112); c.lineTo(290,112); c.lineTo(320,FLOOR); c.lineTo(-20,FLOOR); c.fill();
  for(const x of [16,272]){ R(c,x,110,8,122,'#c8c0b8'); R(c,x,110,2,122,'#ffffff'); R(c,x+6,110,2,122,'#7a7470'); }
  // price sign on a pole
  R(c,242,30,4,60,'#3a3a4a'); R(c,222,8,44,40,'#1a1a24'); R(c,222,8,44,2,'#ff6a00'); txt(c,'GAS',244,12,'#ff6a00',5,'center'); txt(c,'420',244,22,'#3bff8a',9,'center'); txt(c,'GWEI',244,36,'#ffd23f',4,'center'); glow(c,244,28,30,'rgba(59,255,138,0.2)');
  // pumps
  for(const x of [80,190]){ R(c,x-2,214,32,8,'#4a4a52'); R(c,x,150,28,66,'#c0262d'); R(c,x,150,6,66,'#e8505a'); R(c,x+24,150,4,66,'#7a1018'); R(c,x+4,158,20,14,'#0a0a10'); txt(c,'$80',x+14,162,'#3bff8a',5,'center'); R(c,x+4,178,20,3,'#ffd23f'); R(c,x+28,170,4,26,'#2a2a30'); c.strokeStyle='#1a1a20'; c.lineWidth=2; c.beginPath(); c.moveTo(x+30,196); c.quadraticCurveTo(x+40,208,x+34,214); c.stroke(); }
  // parked car silhouette
  c.fillStyle='#0a0810'; c.beginPath(); c.moveTo(380,214); c.lineTo(392,198); c.lineTo(440,196); c.lineTo(462,210); c.lineTo(478,212); c.lineTo(478,224); c.lineTo(380,224); c.fill(); R(c,398,201,18,8,'#2a3050'); circ(c,396,224,7,'#000'); circ(c,460,224,7,'#000'); R(c,474,214,4,3,'#ff3b3b');
  // wet asphalt with lane markings and neon reflections
  c.fillStyle=vgrad(c,FLOOR,AH,['#2a2a36','#18181e','#0a0a10']); c.fillRect(0,FLOOR,AW,AH-FLOOR); reflect(c,FLOOR,60,0.32);
  for(let x=10;x<AW;x+=48) R(c,x,FLOOR+18,24,2,'#d8c040'); R(c,0,FLOOR,AW,1,'#4a4a5a');
  texture(c,0,FLOOR,AW,AH-FLOOR,0.25,2,7); contact(c); vignette(c,0.45);
};
AN.gas=(c,t)=>{ c.globalAlpha=0.07+0.05*Math.sin(t*0.3); R(c,4,110,286,4,'#ffffff'); c.globalAlpha=1;
  for(let i=0;i<10;i++){ const a=t*0.08+i; R(c,147+Math.cos(a)*30*((i%3)+1),118+Math.sin(a*1.3)*8,1,1,'#ffe6c0'); } if((t>>4)%9===0){ c.globalAlpha=0.5; R(c,380,111,0,0,'#000'); } c.globalAlpha=1; };
FG.gas=c=>{ R(c,0,232,20,38,'#d8c040'); for(let i=0;i<4;i++) R(c,0,236+i*9,20,4,'#1a1a20'); };

// ===================== SERVER FARM ROOF =====================
D.server=c=>{
  c.fillStyle=vgrad(c,0,FLOOR,['#02040e','#06102a','#0e1e44','#1a2a58']); c.fillRect(0,0,AW,FLOOR); stars(c,21,160,110,['#ffffff','#9ad0ff']);
  circ(c,90,40,10,'#e8ecff'); circ(c,94,37,9,'#06102a'); glow(c,90,40,30,'rgba(200,220,255,0.25)');
  // three layers of city with lit windows
  skyline(c,31,170,'#0a1430',30,100,['#ffd27a','#7fdcff','#ffffff'],0.25,{x0:-10,x1:AW+10,minW:14,varW:24,blink:true});
  skyline(c,32,180,'#071026',20,70,['#ffd27a','#7fdcff'],0.3,{x0:-10,x1:AW+10,minW:12,varW:20});
  glow(c,240,180,240,'rgba(80,140,255,0.15)');
  // rooftop parapet
  blocks(c,0,180,AW,10,20,5,['#0a0e1a','#1e2638','#2a3448','#3a4660','#5a6a8a'],5,false);
  // server racks with blinking LEDs, cable trays, AC units
  for(let i=0;i<5;i++){ const x=110+i*56; R(c,x,140,46,78,'#0e1220'); R(c,x,140,46,3,'#3a4a6a'); R(c,x,140,2,78,'#2a3450'); R(c,x+44,140,2,78,'#05070e');
    for(let k=0;k<9;k++){ R(c,x+4,146+k*8,38,6,'#1a2034'); R(c,x+4,146+k*8,38,1,'#2a3450'); for(let l=0;l<4;l++) R(c,x+8+l*5,148+k*8,2,2,['#3bff8a','#3bff8a','#ffd23f','#ff3b3b'][(i+k+l)%4]); R(c,x+30,148+k*8,10,2,'#0a0e18'); }
    glow(c,x+23,180,30,'rgba(60,255,140,0.10)'); }
  for(const x of [14,422]){ R(c,x,182,46,36,'#5a6274'); R(c,x,182,46,3,'#8a92a4'); R(c,x+42,182,4,36,'#2a3040'); circ(c,x+23,198,12,'#2a3040'); circ(c,x+23,198,10,'#1a1e2a'); for(let k=0;k<4;k++){ const a=k*Math.PI/2+0.3; R(c,x+23+Math.cos(a)*6-1,198+Math.sin(a)*6-1,2,2,'#5a6274'); } }
  R(c,100,134,300,4,'#2a3450'); for(let x=104;x<400;x+=10) R(c,x,128,1,6,'#3a4a6a');
  R(c,60,150,3,32,'#7a8296'); c.fillStyle='#c8ccd8'; c.beginPath(); c.ellipse(70,150,14,6,-0.6,0,Math.PI); c.fill();
  // steel grate floor with helipad ring
  c.fillStyle=vgrad(c,FLOOR,AH,['#3a4458','#262e3e','#141a26']); c.fillRect(0,FLOOR,AW,AH-FLOOR); R(c,0,FLOOR,AW,1,'#7a8aa8');
  for(let y=FLOOR+3;y<AH;y+=4) R(c,0,y,AW,1,'#1a2030'); for(let x=0;x<AW;x+=8) R(c,x,FLOOR,1,AH-FLOOR,'#1e2636');
  c.strokeStyle='#ffd23f'; c.lineWidth=2; c.beginPath(); c.ellipse(240,FLOOR+18,90,11,0,0,7); c.stroke(); txt(c,'H',240,FLOOR+14,'#ffd23f',8,'center');
  contact(c); vignette(c,0.45);
};
AN.server=(c,t)=>{ for(let i=0;i<5;i++) for(let k=0;k<9;k++) if(((t>>2)+i*7+k*3)%11===0) R(c,118+i*56,148+k*8,2,2,'#ffffff'); if((t>>4)%2) R(c,66,147,2,2,'#ff3b3b'); };
FG.server=c=>{ R(c,0,212,AW,2,'#3a4660'); for(let x=0;x<AW;x+=40){ R(c,x,196,3,36,'#3a4660'); R(c,x,196,1,36,'#7a8aa8'); } R(c,0,196,AW,2,'#5a6a8a'); };

// ===================== DISCORD BASEMENT =====================
D.discord=c=>{
  // brick walls lit by purple LEDs and monitor glow
  blocks(c,0,0,AW,FLOOR,16,7,['#120a1a','#2a1a30','#34203a','#3e2846','#5a3a66'],13);
  c.fillStyle=vgrad(c,0,FLOOR,['rgba(10,4,20,0.55)','rgba(20,8,40,0.1)','rgba(0,0,0,0.3)']); c.fillRect(0,0,AW,FLOOR);
  R(c,0,24,AW,3,'#b04aff'); glow(c,240,26,300,'rgba(176,74,255,0.18)'); R(c,0,24,AW,1,'#f0c8ff');
  // ceiling pipes
  R(c,0,6,AW,6,'#3a3a46'); R(c,0,6,AW,2,'#6a6a7a'); for(let x=30;x<AW;x+=90){ R(c,x,4,6,10,'#2a2a34'); }
  // big chat wall monitor
  R(c,24,58,176,104,'#06060c'); R(c,28,62,168,96,'#36393f'); R(c,28,62,36,96,'#2f3136'); R(c,28,62,168,8,'#202225'); txt(c,'# general',68,64,'#dcddde',4);
  for(let k=0;k<6;k++){ circ(c,46,80+k*13,4,['#ff6a00','#7289da','#43b581','#faa61a','#f04747','#b04aff'][k]); }
  for(let k=0;k<7;k++){ const y=76+k*11; circ(c,74,y+3,3.5,['#ff6a00','#43b581','#7289da','#faa61a'][k%4]); R(c,80,y,24+((k*13)%20),2,['#ff9a5a','#43b581','#9aaaff','#ffc85a'][k%4]); R(c,80,y+4,60+((k*29)%50),2,'#b9bbbe'); }
  glow(c,112,110,120,'rgba(114,137,218,0.18)');
  // posters + frames
  for(const [x,col,t] of [[226,'#ff6a00','GM'],[254,'#c0262d','NGMI'],[282,'#43b581','HODL']]){ R(c,x,60,24,30,'#0a0a10'); R(c,x+2,62,20,26,col); txt(c,t,x+12,70,'#ffffff',4,'center'); }
  // MODS ASLEEP neon sign
  R(c,330,82,110,36,'#1a0a20'); R(c,330,82,110,1,'#ff6a00'); txt(c,'MODS',385,88,'#ff9a3a',8,'center'); txt(c,'ASLEEP',385,102,'#ff9a3a',8,'center'); glow(c,385,100,80,'rgba(255,120,40,0.3)');
  // gaming desk with RGB + monitors, chair, mini fridge, beanbag
  R(c,230,170,220,8,'#1a1a22'); R(c,230,170,220,2,'#3a3a46'); R(c,232,178,4,40,'#1a1a22'); R(c,444,178,4,40,'#1a1a22'); R(c,230,177,220,1,'#b04aff');
  for(const [x,w] of [[252,58],[320,74],[402,40]]){ R(c,x,128,w,40,'#06060c'); R(c,x+2,130,w-4,34,['#1a2a5a','#2a1a4a','#0e3a2a'][x%3]); R(c,x+w/2-3,168,6,4,'#2a2a34'); glow(c,x+w/2,148,40,'rgba(120,140,255,0.15)'); }
  R(c,300,164,46,4,'#2a2a34'); for(let k=0;k<10;k++) R(c,302+k*4,165,3,1,['#ff3b3b','#ffd23f','#3bff8a','#3b8aff','#b04aff'][k%5]);
  R(c,150,182,30,50,'#d8d8e0'); R(c,150,182,30,3,'#ffffff'); R(c,176,182,4,50,'#9a9aa8'); R(c,174,196,3,10,'#8a8a96');
  c.fillStyle='#6a2aaa'; c.beginPath(); c.ellipse(96,222,32,12,0,0,7); c.fill(); c.fillStyle='#8a4ad8'; c.beginPath(); c.ellipse(90,216,24,8,0,0,7); c.fill();
  // carpet floor with cable runs
  c.fillStyle=vgrad(c,FLOOR,AH,['#2a1a3a','#1a1028','#0e0818']); c.fillRect(0,FLOOR,AW,AH-FLOOR); R(c,0,FLOOR,AW,1,'#b04aff');
  const r=rnd(5); for(let i=0;i<300;i++) R(c,r()*AW,FLOOR+2+r()*36,1,1,r()<0.5?'#3a2a4a':'#140a20');
  c.strokeStyle='#0a0610'; c.lineWidth=2; c.beginPath(); c.moveTo(250,FLOOR); c.bezierCurveTo(200,FLOOR+20,120,FLOOR+10,60,FLOOR+30); c.stroke();
  contact(c); vignette(c,0.45);
};
AN.discord=(c,t)=>{ if((t>>5)%2){ circ(c,46,80,5,'#f04747'); txt(c,'@',46,78,'#fff',4,'center'); } const y=76+((t>>4)%7)*11; c.globalAlpha=0.1; R(c,68,y-2,126,10,'#ffffff'); c.globalAlpha=1;
  c.globalAlpha=0.06+0.04*Math.sin(t*0.1); R(c,0,24,AW,3,'#ffffff'); c.globalAlpha=1; };
FG.discord=c=>{ R(c,0,0,AW,4,'#0a0610'); };

// ===================== PUMP & DUMP ARCADE =====================
D.arcade=c=>{
  c.fillStyle=vgrad(c,0,FLOOR,['#0a0418','#16082a','#200c38']); c.fillRect(0,0,AW,FLOOR);
  // neon ceiling grid
  for(let x=0;x<AW;x+=40){ R(c,x,0,1,26,'#ff2ec4'); } R(c,0,26,AW,2,'#ff2ec4'); glow(c,240,26,280,'rgba(255,46,196,0.18)');
  // marquee
  R(c,104,32,272,50,'#1a0a2a'); R(c,104,32,272,2,'#ff2ec4'); R(c,104,80,272,2,'#ff2ec4'); R(c,104,32,2,50,'#ff2ec4'); R(c,374,32,2,50,'#ff2ec4');
  txt(c,'PUMP & DUMP',240,42,'#ff6a00',12,'center'); txt(c,'ARCADE · INSERT $DOJO',240,64,'#ff9ad5',5,'center'); glow(c,240,52,140,'rgba(255,106,0,0.25)');
  // cabinet row: shaded bodies, lit marquees, glowing screens, control panels
  const cabs=[['PUMP','#c0262d'],['RUG','#2a4fbf'],['HODL','#ff6a00'],['MOON','#18a34a'],['APE','#7b2cff']];
  cabs.forEach(([nm,col],i)=>{ const x=78+i*67;
    R(c,x,100,56,124,col); R(c,x,100,8,124,shade(col,1.35)); R(c,x+48,100,8,124,shade(col,0.55)); R(c,x+4,100,48,14,shade(col,0.4)); txt(c,nm,x+28,104,'#ffffff',5,'center'); glow(c,x+28,107,24,'rgba(255,255,255,0.15)');
    R(c,x+6,118,44,34,'#05050a'); R(c,x+8,120,40,30,['#0e3a2a','#1a1a5a','#3a1a0a','#0e3a2a','#2a0e4a'][i]);
    for(let k=0;k<6;k++) R(c,x+12+((k*13)%30),124+((k*7)%20),3,3,['#3bff8a','#ffd23f','#ff3b3b','#7fdcff'][k%4]); glow(c,x+28,135,30,'rgba(140,255,200,0.15)');
    poly(c,[[x+2,160],[x+54,160],[x+56,172],[x],172],shade(col,0.7)); circ(c,x+16,165,3,'#ffd23f'); circ(c,x+30,166,2.5,'#ff3b3b'); circ(c,x+38,166,2.5,'#3bff8a'); R(c,x+14,162,2,4,'#1a1a1a');
    R(c,x+20,186,16,10,'#1a1a1a'); R(c,x+24,189,8,2,'#ffd23f'); });
  // claw machine + prize counter
  R(c,8,92,62,132,'#2a6fd6'); R(c,12,96,54,92,'#9ad0ff'); R(c,12,96,54,92,'rgba(255,255,255,0.15)'); R(c,38,96,2,30,'#555'); poly(c,[[32,126],[46,126],[42,134],[36,134]],'#888');
  for(let k=0;k<12;k++) circ(c,18+(k%6)*8,182-((k/6)|0)*7,4,['#ff9ad5','#ffd23f','#7fdcff','#3bff8a'][k%4]);
  R(c,414,112,62,112,'#ff6a00'); R(c,414,112,62,4,'#ffd23f'); txt(c,'PRIZES',445,118,'#2b1405',5,'center'); for(let r2=0;r2<4;r2++) for(let k=0;k<6;k++) circ(c,422+k*9,134+r2*12,3,['#ff2ec4','#7fdcff','#ffd23f','#3bff8a','#ffffff'][(k+r2)%5]);
  // classic arcade carpet
  c.fillStyle='#0a0618'; c.fillRect(0,FLOOR,AW,AH-FLOOR); R(c,0,FLOOR,AW,1,'#ff2ec4');
  const r=rnd(7); for(let i=0;i<70;i++){ const x=r()*AW, y=FLOOR+3+r()*34, k=(r()*4)|0, col=['#ff2ec4','#3bff8a','#ffd23f','#7fdcff'][k];
    if(k===0) poly(c,[[x,y-3],[x+3,y+2],[x-3,y+2]],col); else if(k===1) R(c,x-2,y-2,4,4,col); else if(k===2){ c.strokeStyle=col; c.lineWidth=1; c.beginPath(); c.moveTo(x-4,y); c.lineTo(x-1,y-3); c.lineTo(x+2,y); c.lineTo(x+5,y-3); c.stroke(); } else circ(c,x,y,1.8,col); }
  reflect(c,FLOOR,30,0.12); contact(c); vignette(c,0.4);
};
AN.arcade=(c,t)=>{ for(let i=0;i<5;i++){ const x=78+i*67; if(((t>>4)+i)%3===0){ c.globalAlpha=0.2; R(c,x+8,120,40,30,'#ffffff'); c.globalAlpha=1; } } if((t>>3)%10===0){ c.globalAlpha=0.3; R(c,106,34,268,46,'#ff2ec4'); c.globalAlpha=1; } };
FG.arcade=c=>{ };

// ===================== MELBOURNE LANEWAY =====================
D.laneway=c=>{
  // sky slot between buildings with the CBD beyond
  c.fillStyle=vgrad(c,0,180,['#0a0a24','#1a1a40','#3a2a5a']); c.fillRect(0,0,AW,180); stars(c,33,40,60,['#ffffff']);
  skyline(c,41,190,'#14143a',40,150,['#ffd27a','#ffffff','#7fdcff'],0.3,{x0:110,x1:370,minW:12,varW:20,blink:true});
  // brick walls in perspective on both sides
  const bp=['#1a0a08','#4a2018','#5a2a1e','#6a3424','#8a4a32'];
  blocks(c,0,0,124,FLOOR,14,6,bp,51); blocks(c,356,0,124,FLOOR,14,6,bp,52);
  c.fillStyle='rgba(0,0,0,0.35)'; c.fillRect(100,0,24,FLOOR); c.fillRect(356,0,24,FLOOR);
  // street art on the walls
  txt(c,'DOJO',20,84,'#ff6a00',14); txt(c,'DOJO',19,83,'#ffd23f',14); txt(c,'NGMI',18,112,'#3bff8a',6); txt(c,'BASED',14,60,'#ff9ad5',6); txt(c,'WAGMI',372,104,'#7fdcff',8); txt(c,'1000X',368,140,'#ff3b3b',6);
  c.strokeStyle='#ff2ec4'; c.lineWidth=2; c.beginPath(); c.moveTo(370,60); c.lineTo(384,50); c.lineTo(396,62); c.lineTo(410,48); c.stroke();
  // fire escapes + AC + BAR sign
  for(const y of [40,90]){ R(c,390,y,60,2,'#1a1a20'); for(let x=392;x<450;x+=4) R(c,x,y-12,1,12,'#1a1a20'); R(c,390,y-12,60,1,'#1a1a20'); }
  R(c,20,140,26,16,'#6a6a72'); R(c,20,140,26,2,'#9a9aa4'); R(c,430,10,40,24,'#c0262d'); txt(c,'BAR',450,16,'#fff4e6',7,'center'); glow(c,450,22,40,'rgba(255,60,60,0.3)');
  // fairy lights across the lane
  c.strokeStyle='#1a1a20'; c.lineWidth=1; for(let s2=0;s2<3;s2++){ const y0=24+s2*18; c.beginPath(); c.moveTo(124,y0); c.quadraticCurveTo(240,y0+40,356,y0); c.stroke();
    for(let i=1;i<14;i++){ const tt=i/14, y=(1-tt)*(1-tt)*y0+2*tt*(1-tt)*(y0+40)+tt*tt*y0; circ(c,124+232*tt,y+2,1.6,'#ffe6a8'); glow(c,124+232*tt,y+2,8,'rgba(255,230,168,0.4)'); } }
  // coffee kiosk with warm light
  R(c,180,150,120,70,'#2a1408'); R(c,186,160,108,44,'#ffcf8a'); glow(c,240,182,90,'rgba(255,200,120,0.35)');
  for(let k=0;k<5;k++) R(c,192+k*20,164,14,14,['#8a5a2a','#c0262d','#2b1405','#ffd23f','#8a5a2a'][k]); R(c,186,190,108,14,'#5a3014');
  R(c,176,138,128,14,'#ff6a00'); for(let s2=0;s2<16;s2++) R(c,176+s2*8,138,4,14,'#ffd23f'); txt(c,'FLAT WHITE',240,142,'#2b1405',5,'center');
  // bins + crates + puddles
  R(c,330,196,22,30,'#1a5a2a'); R(c,330,196,22,3,'#2a8a3a'); R(c,348,196,4,30,'#0e3a1a'); R(c,124,204,20,22,'#5a3a1a'); R(c,124,204,20,2,'#8a5a2a');
  // wet bluestone cobbles with reflections
  c.fillStyle=vgrad(c,FLOOR,AH,['#2a2a36','#1a1a24','#0a0a12']); c.fillRect(0,FLOOR,AW,AH-FLOOR);
  for(let row=0,y=FLOOR;y<AH;row++){ const h=4+row; for(let x=-(row%2)*8;x<AW;x+=16+row){ R(c,x,y,15+row,h-1,['#2e2e3a','#26262f','#34343f'][(x+row)%3|0]); R(c,x,y,15+row,1,'#4a4a5a'); } y+=h; }
  reflect(c,FLOOR,50,0.3); contact(c); vignette(c,0.45);
};
AN.laneway=(c,t)=>{ for(let i=0;i<60;i++){ const x=(i*53+t*0.8)%AW, y=(i*97+t*3.4)%AH; c.globalAlpha=0.3; R(c,x,y,0.6,6,'#cfd6ff'); } c.globalAlpha=1;
  for(let i=1;i<14;i+=2){ if(((t>>4)+i)%5===0){ const tt=i/14; glow(c,124+232*tt,(1-tt)*(1-tt)*24+2*tt*(1-tt)*64+tt*tt*24+2,12,'rgba(255,230,168,0.7)'); } } };
FG.laneway=c=>{ R(c,446,10,4,40,'#222'); };

DD.ARENA_DRAW=Object.assign(DD.ARENA_DRAW||{},D); DD.ARENA_FG=Object.assign(DD.ARENA_FG||{},FG); DD.ARENA_ANIM=Object.assign(DD.ARENA_ANIM||{},AN);
DD.Pix2={blocks,planks,tiles,crowd,column,lamp,facade,neon,hex2rgb};
})();
