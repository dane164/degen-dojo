/* DEGEN DOJO — procedural pixel arenas (480x270, floor at y=232) */
(function(){
const AW=480, AH=270, FLOOR=232;
const cache = {};

function rnd(seed){ let s=seed>>>0; return ()=>{ s=(s*1664525+1013904223)>>>0; return s/4294967296; }; }
function R(c,x,y,w,h,col){ c.fillStyle=col; c.fillRect(x|0,y|0,w|0,h|0); }
function sky(c,cols,y0,y1){ // banded + dithered gradient
  const n=cols.length, bh=(y1-y0)/n;
  for(let i=0;i<n;i++){ R(c,0,y0+i*bh,AW,bh+1,cols[i]); if(i<n-1){ c.fillStyle=cols[i+1]; for(let x=0;x<AW;x+=2){ c.fillRect(x+((i%2)),y0+(i+1)*bh-2,1,1); c.fillRect(x+1-((i%2)),y0+(i+1)*bh-1,1,1);} } }
}
function floor(c,a,b,lines){
  R(c,0,FLOOR,AW,AH-FLOOR,a);
  for(let i=0;i<lines;i++){ const y=FLOOR+3+i*i*1.6; R(c,0,y,AW,1,b); }
  R(c,0,FLOOR,AW,2,b);
}
function stars(c,seed,n,col,yMax){ const r=rnd(seed); for(let i=0;i<n;i++) R(c,r()*AW,r()*yMax,1,1,col); }
function skyline(c,seed,y,col,minH,maxH,win){
  const r=rnd(seed); let x=-10;
  while(x<AW){ const w=18+r()*34, h=minH+r()*(maxH-minH); R(c,x,y-h,w,h,col);
    if(win){ for(let wy=y-h+4;wy<y-4;wy+=6) for(let wx=x+3;wx<x+w-3;wx+=5) if(r()<0.45) R(c,wx,wy,2,3,win); }
    x+=w+2; }
}
function txt(c,s,x,y,col,size){ c.fillStyle=col; c.font=(size||8)+'px "Press Start 2P", monospace'; c.textBaseline='top'; c.fillText(s,x,y); }

const DRAW = {
  floor(c){ // Trading Floor
    sky(c,['#2b1405','#3d1d08','#55290b'],0,FLOOR);
    R(c,0,20,AW,70,'#120802');
    for(let i=0;i<6;i++){ R(c,10+i*78,26,70,58,'#0a0501'); }
    const r=rnd(5); for(let i=0;i<6;i++){ let px=14+i*78, py=60; c.fillStyle=i%2?'#ff3b3b':'#3bff6a'; for(let k=0;k<12;k++){ const ny=Math.max(32,Math.min(80,py+(r()-0.5)*16)); c.fillRect(px+k*5,Math.min(py,ny),3,Math.abs(ny-py)+2); py=ny; } }
    R(c,0,92,AW,14,'#ff6a00'); for(let x=0;x<AW;x+=96) txt(c,['DOJO +420%','BTC -2%','ETH +1%','SOL +6%','GAS +99%','COPE +12%','HOPIUM -8%','DOJO +69%'][(x/96)%8],x+4,96,'#2b1405');
    for(let i=0;i<9;i++){ R(c,i*56,170,40,40,'#3a1c07'); R(c,i*56+4,174,32,18,'#0d0602'); R(c,i*56+6,176,28,2,i%2?'#3bff6a':'#ff3b3b'); }
    floor(c,'#6b3410','#4a230a',7);
  },
  moon(c){
    sky(c,['#05030a','#0a0614','#120a22'],0,FLOOR); stars(c,7,160,'#fff',180); stars(c,8,40,'#ffb36b',180);
    c.fillStyle='#3b7bd6'; c.beginPath(); c.arc(390,60,30,0,7); c.fill(); R(c,370,52,18,10,'#3fae2a'); R(c,396,70,14,8,'#3fae2a'); R(c,384,40,10,6,'#3fae2a');
    for(let i=0;i<5;i++){ R(c,30+i*20,175-i*6,12,40+i*6,'#c9c9c9'); } R(c,24,160,120,6,'#9a9a9a'); R(c,60,140,40,22,'#d9d9d9'); R(c,70,146,20,8,'#ff6a00');
    R(c,300,186,8,46,'#bbb'); R(c,308,186,22,14,'#ff6a00'); txt(c,'$',314,189,'#fff');
    R(c,0,FLOOR-14,AW,14,'#7a7a7a'); for(let i=0;i<14;i++) R(c,i*36+8,FLOOR-10,18,4,'#5c5c5c');
    floor(c,'#9a9a9a','#7a7a7a',6); const r=rnd(9); for(let i=0;i<14;i++){ R(c,r()*AW,FLOOR+6+r()*30,8+r()*10,3,'#808080'); }
  },
  bazaar(c){
    sky(c,['#ff9a3c','#ff7a1a','#e85a00','#b84300'],0,FLOOR);
    c.fillStyle='#ffd23f'; c.beginPath(); c.arc(240,120,36,0,7); c.fill();
    skyline(c,3,170,'#7a2e05',40,90,null);
    for(let i=0;i<5;i++){ const x=10+i*96; R(c,x,140,80,70,'#5a2203'); for(let s=0;s<8;s++) R(c,x+s*10,140,10,10,s%2?'#c0262d':'#ffd23f'); for(let k=0;k<3;k++){ R(c,x+6+k*24,160,18,46,['#c0262d','#2a4fbf','#18a34a'][(i+k)%3]); R(c,x+8+k*24,164,14,2,'#ffd23f'); R(c,x+8+k*24,196,14,2,'#ffd23f'); } }
    floor(c,'#c0262d','#8a1a1f',6); for(let x=0;x<AW;x+=16) R(c,x,FLOOR+4,8,2,'#ffd23f');
  },
  volcano(c){
    sky(c,['#1a0300','#3a0800','#6a1200','#a02000'],0,FLOOR);
    c.fillStyle='#250600'; c.beginPath(); c.moveTo(80,FLOOR); c.lineTo(210,70); c.lineTo(270,70); c.lineTo(400,FLOOR); c.fill();
    R(c,214,66,52,8,'#ff6a00'); for(let i=0;i<6;i++) R(c,222+i*6,74,4,40+i*13%50,'#ff3b00');
    txt(c,'LIQUIDATED',176,40,'#ff6a00',8);
    floor(c,'#2a0a02','#ff4a00',5);
  },
  dock(c){
    sky(c,['#1b3a5c','#255079','#3a6f9e','#5a94c2'],0,150);
    R(c,0,150,AW,82,'#123a5c'); for(let i=0;i<40;i++) R(c,(i*53)%AW,156+(i*17)%70,14,1,'#2a6a9a');
    c.fillStyle='#0b2236'; c.beginPath(); c.ellipse(330,170,70,20,0,Math.PI,0); c.fill(); R(c,262,160,4,4,'#fff');
    for(let i=0;i<4;i++){ R(c,30+i*120,120,8,112,'#3a2410'); }
    floor(c,'#8a5a2b','#5a3a18',0); for(let x=0;x<AW;x+=24) R(c,x,FLOOR,1,AH-FLOOR,'#5a3a18');
  },
  coliseum(c){
    sky(c,['#ffcf8a','#ffb36b','#ff9a3c'],0,FLOOR);
    R(c,0,60,AW,150,'#c98d63'); for(let row=0;row<4;row++){ for(let x=0;x<AW;x+=30) R(c,x+6+(row%2)*15,70+row*34,18,26,'#7a4b2a'); }
    const r=rnd(4); for(let i=0;i<120;i++){ const x=r()*AW, y=64+Math.floor(r()*4)*34+20; R(c,x,y,4,4,['#ff6a00','#fff','#2b1405','#ffd23f'][i%4]); }
    for(let i=0;i<4;i++){ R(c,20+i*120,30,90,22,'#fff'); R(c,24+i*120,34,40,3,'#999'); R(c,24+i*120,40,70,3,'#bbb'); txt(c,['+1','L','RATIO','W'][i],70+i*120,40,'#ff6a00'); }
    floor(c,'#e7c08a','#c9a06a',6);
  },
  gas(c){
    sky(c,['#04030a','#0a0820','#141040'],0,FLOOR); stars(c,13,80,'#cfd6ff',140);
    R(c,60,90,360,14,'#ff6a00'); txt(c,'GWEI GAS • OPEN 24/7',150,93,'#2b1405');
    R(c,70,104,8,128,'#ddd'); R(c,402,104,8,128,'#ddd'); R(c,60,104,360,6,'#ffd8b0');
    for(let i=0;i<2;i++){ R(c,160+i*120,160,30,72,'#c0262d'); R(c,164+i*120,166,22,14,'#111'); txt(c,'$80',165+i*120,168,'#3bff6a'); }
    R(c,400,40,60,40,'#2b1405'); txt(c,'GAS',412,46,'#ff6a00'); txt(c,'420',412,60,'#3bff6a');
    floor(c,'#2a2a30','#3a3a44',5); for(let x=0;x<AW;x+=40) R(c,x,FLOOR+18,20,2,'#ffd23f');
  },
  server(c){
    sky(c,['#0b0f1e','#13203a','#1d3157','#2a4677'],0,FLOOR); stars(c,17,60,'#9fb4ff',120);
    skyline(c,21,200,'#0a1020',50,140,'#ff6a00');
    for(let i=0;i<7;i++){ R(c,8+i*68,160,56,72,'#232b3d'); for(let k=0;k<8;k++){ R(c,12+i*68,164+k*8,48,6,'#151b28'); R(c,14+i*68,166+k*8,2,2,(i+k)%3?'#3bff6a':'#ff6a00'); } }
    floor(c,'#3a4256','#2a3040',4);
  },
  discord(c){
    sky(c,['#1e1f2b','#2a2c3d'],0,FLOOR);
    R(c,0,0,AW,30,'#14151e'); for(let x=0;x<AW;x+=64) R(c,x+20,30,4,12,'#333'), R(c,x+14,42,16,4,'#ffd8b0');
    R(c,30,70,130,100,'#111'); R(c,34,74,122,92,'#36393f'); for(let i=0;i<8;i++){ R(c,40,80+i*10,8,8,['#ff6a00','#5865f2','#3bff6a','#ff2e2e'][i%4]); R(c,52,82+i*10,40+((i*29)%60),3,'#bbb'); }
    R(c,320,90,130,80,'#4a2c12'); R(c,326,96,118,4,'#6b4220'); for(let i=0;i<6;i++) R(c,330+i*18,104,10,14,['#ff6a00','#ffd23f','#3bff6a'][i%3]);
    txt(c,'MODS ASLEEP',330,130,'#ff6a00');
    floor(c,'#4a3a2a','#3a2c1f',5);
  },
  arcade(c){
    sky(c,['#1a0630','#2a0a4a','#3d0f66'],0,FLOOR);
    for(let i=0;i<7;i++){ const x=8+i*68; R(c,x,110,56,122,['#ff2e2e','#2a4fbf','#ff6a00','#18a34a','#7b2cff','#ffd23f','#ff2ec4'][i]); R(c,x+6,122,44,34,'#0a0a14'); R(c,x+10,128,36,22,['#3bff6a','#ff6a00','#5ad1ff'][i%3]); R(c,x+6,162,44,8,'#111'); R(c,x+12,164,4,4,'#ff2e2e'); R(c,x+40,164,4,4,'#ffd23f'); }
    R(c,120,40,240,40,'#111'); R(c,124,44,232,32,'#ff6a00'); txt(c,'PUMP & DUMP',150,52,'#2b1405',16);
    floor(c,'#20103a','#ff2ec4',0); for(let y=FLOOR;y<AH;y+=10) for(let x=((y/10)%2)*10;x<AW;x+=20) R(c,x,y,10,10,'#2c1650');
  },
  park(c){
    sky(c,['#7fc8ff','#a4d8ff','#c8e8ff'],0,FLOOR);
    c.fillStyle='#fff7c2'; c.beginPath(); c.arc(70,50,18,0,7); c.fill();
    for(const [x,y] of [[140,40],[300,30],[400,60]]){ R(c,x,y,40,10,'#fff'); R(c,x+8,y-6,24,8,'#fff'); }
    R(c,0,170,AW,62,'#5fae3a'); const r=rnd(31); for(let i=0;i<9;i++){ const x=r()*AW; R(c,x+8,130,8,42,'#6b4220'); c.fillStyle='#2f7d2a'; c.beginPath(); c.arc(x+12,120,22,0,7); c.fill(); R(c,x+2,110,8,6,'#3fae2a'); }
    R(c,330,190,60,6,'#8a5a2b'); R(c,334,196,4,12,'#5a3a18'); R(c,382,196,4,12,'#5a3a18');
    floor(c,'#4c9c2e','#3f8526',5); for(let i=0;i<80;i++) R(c,(i*37)%AW,FLOOR-2+(i%3),1,3,'#3f8526');
  },
  laneway(c){
    sky(c,['#3a2a3a','#4a3448','#5a3e52'],0,FLOOR);
    R(c,0,0,110,FLOOR,'#5c3b2a'); R(c,370,0,110,FLOOR,'#6b4a35');
    for(let y=0;y<FLOOR;y+=8) for(let x=(y/8%2)*8;x<110;x+=16){ R(c,x,y,15,7,'#6e4a36'); R(c,370+x,y,15,7,'#7a5640'); }
    const tags=['#ff6a00','#ff2ec4','#3bff6a','#5ad1ff','#ffd23f'];
    for(let i=0;i<12;i++){ R(c,8+(i*29)%96,60+(i*41)%140,18,10,tags[i%5]); R(c,376+(i*31)%96,50+(i*37)%150,16,12,tags[(i+2)%5]); }
    txt(c,'DOJO',14,120,'#ff6a00',16); txt(c,'GM',390,90,'#3bff6a',16);
    R(c,110,0,260,FLOOR,'#2a1e2c'); skyline(c,44,180,'#1a121c',60,150,'#ffcf8a');
    R(c,120,150,60,40,'#ff6a00'); txt(c,'FLAT',128,160,'#2b1405'); txt(c,'WHITE',126,172,'#2b1405');
    for(let i=0;i<8;i++) R(c,120+i*32,40,4,4,'#ffe6a8'); R(c,110,41,260,1,'#222');
    floor(c,'#3a3a3a','#2a2a2a',4); for(let x=0;x<AW;x+=12) R(c,x,FLOOR+6,6,6,'#444');
  },
};

// animated overlays
const ANIM = {
  volcano(c,t){ for(let i=0;i<10;i++){ const p=((t*0.6+i*31)%200); R(c,220+((i*13)%40),70-p*0.5+Math.sin(t*0.05+i)*4,2,2,i%2?'#ffd23f':'#ff6a00'); } },
  moon(c,t){ const x=(t*0.4)%560-40; R(c,x,30,6,2,'#fff'); R(c,x-8,31,8,1,'#ff6a00'); },
  dock(c,t){ for(let i=0;i<6;i++) R(c,((t*0.3+i*80)%AW),150+(i%3)*20,20,1,'#9fd3ff'); },
  arcade(c,t){ if((t>>4)%2) for(let i=0;i<7;i++) R(c,18+i*68,128,36,22,'rgba(255,255,255,0.15)'); },
  floor(c,t){ const x=-(t*0.5)%60; R(c,0,106,AW,1,'#ff6a00'); },
  server(c,t){ for(let i=0;i<7;i++) for(let k=0;k<8;k++) if(((t>>3)+i*k)%5===0) R(c,14+i*68,166+k*8,2,2,'#ffffff'); },
  park(c,t){ for(let i=0;i<3;i++){ const x=(t*0.2+i*170)%540-30; R(c,x,80+i*12,3,2,'#2b1405'); R(c,x-2,79+i*12+((t>>3)%2),2,1,'#2b1405'); R(c,x+3,79+i*12+((t>>3)%2),2,1,'#2b1405'); } },
  coliseum(c,t){ if((t>>5)%2){ const r=rnd(t>>5); for(let i=0;i<20;i++) R(c,r()*AW,64+Math.floor(r()*4)*34+16,4,4,'#fff'); } },
};

function render(id){
  if(cache[id]) return cache[id];
  const cv=document.createElement('canvas'); cv.width=AW; cv.height=AH;
  const c=cv.getContext('2d'); c.imageSmoothingEnabled=false;
  (DRAW[id]||DRAW.floor)(c);
  cache[id]=cv; return cv;
}
function draw(ctx,id,t){ ctx.drawImage(render(id),0,0); if(ANIM[id]) ANIM[id](ctx,t); }
function thumb(id){ return render(id).toDataURL(); }
function clearCache(){ for(const k in cache) delete cache[k]; }

DD.Arenas = { draw, thumb, render, clearCache, AW, AH, FLOOR };
})();
