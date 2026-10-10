/* DEGEN DOJO — arenas. Logical 480x270 (floor y=232), rendered at 2x backing resolution. */
(function(){
const AW=480, AH=270, FLOOR=232, RES=2;
const cache = {};

function rnd(seed){ let s=seed>>>0; return ()=>{ s=(s*1664525+1013904223)>>>0; return s/4294967296; }; }
function R(c,x,y,w,h,col){ c.fillStyle=col; c.fillRect(x,y,w,h); }
function grad(c,x0,y0,x1,y1,stops){ const g=c.createLinearGradient(x0,y0,x1,y1); stops.forEach(s=>g.addColorStop(s[0],s[1])); return g; }
function vgrad(c,y0,y1,cols){ return grad(c,0,y0,0,y1,cols.map((col,i)=>[i/(cols.length-1),col])); }
function glow(c,x,y,r,col,a){ const g=c.createRadialGradient(x,y,0,x,y,r); g.addColorStop(0,col); g.addColorStop(1,'rgba(0,0,0,0)'); c.save(); c.globalAlpha=a==null?1:a; c.fillStyle=g; c.fillRect(x-r,y-r,r*2,r*2); c.restore(); }
function circ(c,x,y,r,col){ c.fillStyle=col; c.beginPath(); c.arc(x,y,r,0,Math.PI*2); c.fill(); }
function poly(c,pts,col){ c.fillStyle=col; c.beginPath(); c.moveTo(pts[0][0],pts[0][1]); for(let i=1;i<pts.length;i++) c.lineTo(pts[i][0],pts[i][1]); c.closePath(); c.fill(); }
function txt(c,s,x,y,col,size,align){ c.fillStyle=col; c.font=(size||8)+'px "Press Start 2P", monospace'; c.textBaseline='top'; c.textAlign=align||'left'; c.fillText(s,x,y); c.textAlign='left'; }
function stars(c,seed,n,yMax,cols){ const r=rnd(seed); for(let i=0;i<n;i++){ const s=r()<0.15?1:0.5; c.globalAlpha=0.4+r()*0.6; R(c,r()*AW,r()*yMax,s,s,cols[i%cols.length]); } c.globalAlpha=1; }
function skyline(c,seed,base,col,minH,maxH,winCols,winChance){
  const r=rnd(seed); let x=-8;
  while(x<AW){ const w=16+r()*30, h=minH+r()*(maxH-minH); R(c,x,base-h,w,h,col);
    if(r()<0.3){ R(c,x+w/2-1,base-h-8,1.5,8,col); }
    if(winCols){ for(let wy=base-h+4;wy<base-3;wy+=5) for(let wx=x+2.5;wx<x+w-3;wx+=4) if(r()<(winChance||0.4)){ c.globalAlpha=0.5+r()*0.5; R(c,wx,wy,1.5,2.5,winCols[(r()*winCols.length)|0]); } c.globalAlpha=1; }
    x+=w+1.5; }
}
function floor(c,top,bottom,line,opt){
  opt=opt||{};
  c.fillStyle=vgrad(c,FLOOR,AH,[top,bottom]); c.fillRect(0,FLOOR,AW,AH-FLOOR);
  c.save(); c.beginPath(); c.rect(0,FLOOR,AW,AH-FLOOR); c.clip();
  c.strokeStyle=line; c.lineWidth=0.5; c.globalAlpha=opt.alpha==null?0.5:opt.alpha;
  const vy=opt.vy||150;
  if(!opt.noRadial) for(let i=-12;i<=12;i++){ const xb=240+i*42; c.beginPath(); c.moveTo(240+(xb-240)*((FLOOR-vy)/(AH-vy)),FLOOR); c.lineTo(xb,AH); c.stroke(); }
  for(let k=0;k<8;k++){ const y=FLOOR+Math.pow(k/8,1.7)*(AH-FLOOR); c.beginPath(); c.moveTo(0,y); c.lineTo(AW,y); c.stroke(); }
  c.restore();
  R(c,0,FLOOR,AW,1,opt.edge||line);
  c.fillStyle=vgrad(c,FLOOR,FLOOR+10,['rgba(0,0,0,0.25)','rgba(0,0,0,0)']); c.fillRect(0,FLOOR,AW,10);
}
function vignette(c,a){ const g=c.createRadialGradient(240,140,120,240,140,320); g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(0,0,0,'+(a||0.45)+')'); c.fillStyle=g; c.fillRect(0,0,AW,AH); }

const DRAW = {
  floor(c){ // Trading Floor
    c.fillStyle=vgrad(c,0,FLOOR,['#140902','#2a1305','#4a230b']); c.fillRect(0,0,AW,FLOOR);
    R(c,0,14,AW,96,'#0b0502'); R(c,0,14,AW,1,'#5a2a0a'); R(c,0,109,AW,1,'#5a2a0a');
    const r=rnd(5);
    for(let i=0;i<6;i++){ const bx=8+i*79; R(c,bx,20,72,64,'#050201'); c.strokeStyle='#2a1305'; c.lineWidth=0.5; c.strokeRect(bx+0.5,20.5,71,63);
      c.globalAlpha=0.25; for(let g=0;g<4;g++) R(c,bx,36+g*14,72,0.5,'#ff6a00'); c.globalAlpha=1;
      let py=52; const up=i%2===0;
      for(let k=0;k<13;k++){ const ny=Math.max(26,Math.min(78,py+(r()-(up?0.62:0.38))*14)); const col=ny<py?'#3bff8a':'#ff4b4b'; R(c,bx+3+k*5.3,Math.min(py,ny),3.2,Math.abs(ny-py)+1.5,col); R(c,bx+4.3+k*5.3,Math.min(py,ny)-3,0.6,Math.abs(ny-py)+7,col); py=ny; }
      txt(c,['DOJO/USD','BTC','ETH','SOL','GAS','COPE'][i],bx+3,23,'#ffb36b',4); }
    glow(c,240,60,220,'rgba(255,106,0,0.18)');
    R(c,0,112,AW,13,'#ff6a00'); R(c,0,112,AW,1,'#ffd23f'); R(c,0,124,AW,1,'#a84300');
    for(let row=0;row<2;row++){ const y=148+row*30, sc=row?1:0.8, col=row?'#2e1606':'#1f0e04';
      for(let i=-1;i<10;i++){ const x=i*54+(row?0:27);
        R(c,x,y,48*sc,22*sc,col); R(c,x,y,48*sc,1.5,'#5a2a0a');
        R(c,x+5,y-14*sc,16*sc,12*sc,'#0b0502'); R(c,x+24*sc,y-14*sc,16*sc,12*sc,'#0b0502');
        R(c,x+6,y-13*sc,14*sc,10*sc,(i+row)%2?'#103a1c':'#3a1010'); R(c,x+25*sc,y-13*sc,14*sc,10*sc,'#102a3a');
        glow(c,x+13*sc,y-8*sc,14,(i+row)%2?'rgba(59,255,138,0.18)':'rgba(255,75,75,0.18)'); } }
    floor(c,'#5a2a0d','#2a1005','#8a4416',{edge:'#a84d14'});
    c.fillStyle=grad(c,0,0,AW,0,[[0,'rgba(255,140,46,0)'],[0.5,'rgba(255,140,46,0.18)'],[1,'rgba(255,140,46,0)']]); c.fillRect(0,FLOOR+2,AW,8);
    vignette(c,0.4);
  },
  moon(c){
    c.fillStyle=vgrad(c,0,FLOOR,['#020108','#07051a','#120b2e']); c.fillRect(0,0,AW,FLOOR);
    stars(c,7,260,200,['#ffffff','#ffd9b3','#b3c7ff']);
    glow(c,120,70,140,'rgba(120,80,255,0.12)'); glow(c,360,40,110,'rgba(255,106,0,0.10)');
    glow(c,392,62,52,'rgba(90,170,255,0.35)');
    circ(c,392,62,32,'#2a6fd6'); c.save(); c.beginPath(); c.arc(392,62,32,0,7); c.clip();
    poly(c,[[370,48],[388,44],[392,58],[380,66],[368,60]],'#3fae5a'); poly(c,[[398,70],[414,66],[420,80],[404,86]],'#3fae5a'); poly(c,[[396,36],[408,34],[410,42],[400,44]],'#3fae5a');
    c.fillStyle='rgba(255,255,255,0.35)'; c.fillRect(366,52,30,2); c.fillRect(392,76,26,2);
    c.fillStyle=grad(c,360,0,424,0,[[0,'rgba(0,0,0,0)'],[0.65,'rgba(0,0,0,0)'],[1,'rgba(0,0,20,0.75)']]); c.fillRect(360,30,64,64); c.restore();
    c.fillStyle=vgrad(c,170,FLOOR,['#5a5a66','#3a3a44']); c.beginPath(); c.moveTo(0,FLOOR); for(let x=0;x<=AW;x+=10) c.lineTo(x,184+Math.sin(x*0.03)*8+Math.sin(x*0.11)*3); c.lineTo(AW,FLOOR); c.fill();
    circ(c,96,FLOOR-14,42,'#c9ccd6'); R(c,54,FLOOR-14,84,14,'#c9ccd6'); c.beginPath(); c.arc(84,FLOOR-30,18,Math.PI*1.1,Math.PI*1.6); c.lineWidth=3; c.strokeStyle='rgba(255,255,255,0.45)'; c.stroke();
    for(let i=0;i<5;i++){ R(c,64+i*12,FLOOR-24,6,4,'#ffb36b'); glow(c,67+i*12,FLOOR-22,8,'rgba(255,180,100,0.35)'); }
    R(c,150,120,6,112,'#9aa0ad'); R(c,144,116,18,6,'#c9ccd6'); R(c,152,96,2,20,'#c9ccd6');
    R(c,320,168,1.5,64,'#ddd'); R(c,321.5,168,26,16,'#ff6a00'); txt(c,'DOJO',323,173,'#2b1405',5);
    floor(c,'#8d8d98','#55555f','#6d6d78',{alpha:0.3,edge:'#a6a6b0'});
    const r=rnd(9); for(let i=0;i<10;i++){ const x=r()*AW, y=FLOOR+8+r()*28, w=10+r()*20; c.fillStyle='#6d6d78'; c.beginPath(); c.ellipse(x,y,w,w*0.22,0,0,7); c.fill(); c.fillStyle='#a6a6b0'; c.beginPath(); c.ellipse(x,y-1,w*0.85,w*0.14,0,Math.PI,0); c.fill(); }
    vignette(c,0.35);
  },
  bazaar(c){
    c.fillStyle=vgrad(c,0,FLOOR,['#ffb347','#ff8a2a','#e85a00','#9a3200']); c.fillRect(0,0,AW,FLOOR);
    glow(c,240,128,120,'rgba(255,240,170,0.65)'); circ(c,240,128,30,'#ffe9a0');
    for(let i=0;i<4;i++) R(c,200,120+i*6,80,1.5,'rgba(255,140,40,0.6)');
    c.fillStyle='#a8420a'; c.beginPath(); c.moveTo(0,160); for(let x=0;x<=AW;x+=8) c.lineTo(x,150+Math.sin(x*0.02)*10); c.lineTo(AW,FLOOR); c.lineTo(0,FLOOR); c.fill();
    const r=rnd(3); for(let i=0;i<9;i++){ const x=10+i*55+r()*10, h=40+r()*40; R(c,x,170-h,28,h+10,'#6e2604'); circ(c,x+14,170-h,14,'#6e2604'); R(c,x+13,170-h-22,2,10,'#6e2604'); }
    for(let i=0;i<5;i++){ const x=6+i*96;
      R(c,x+4,150,72,82,'#4a1a02');
      for(let s=0;s<9;s++){ poly(c,[[x+s*9,140],[x+s*9+9,140],[x+s*9+9,152],[x+s*9+4.5,156],[x+s*9,152]], s%2?'#c0262d':'#ffd23f'); }
      for(let k=0;k<3;k++){ const cx=x+10+k*22, col=['#c0262d','#2a4fbf','#18a34a','#7b2cff'][(i+k)%4];
        R(c,cx,160,18,58,col); for(let t=0;t<5;t++) R(c,cx+2,165+t*11,14,1.5,'#ffd23f'); R(c,cx,160,18,2,'#fff1c2'); R(c,cx+16,160,2,58,'rgba(0,0,0,0.25)'); }
      glow(c,x+40,148,28,'rgba(255,220,120,0.25)'); }
    floor(c,'#c0262d','#6e1215','#ffd23f',{alpha:0.25,noRadial:true});
    for(let x=0;x<AW;x+=24){ poly(c,[[x,FLOOR+10],[x+12,FLOOR+6],[x+24,FLOOR+10],[x+12,FLOOR+14]],'rgba(255,210,63,0.35)'); }
    vignette(c,0.3);
  },
  volcano(c){
    c.fillStyle=vgrad(c,0,FLOOR,['#0d0100','#2a0400','#5a0a00','#9a1c00']); c.fillRect(0,0,AW,FLOOR);
    for(let i=0;i<7;i++){ c.fillStyle='rgba(40,8,4,0.7)'; c.beginPath(); c.ellipse(40+i*70,40+(i%3)*12,60,16,0,0,7); c.fill(); }
    glow(c,240,70,160,'rgba(255,80,0,0.35)');
    c.fillStyle=vgrad(c,64,FLOOR,['#3a0a02','#1a0401']); c.beginPath(); c.moveTo(40,FLOOR); c.lineTo(196,72); c.lineTo(214,66); c.lineTo(266,66); c.lineTo(284,72); c.lineTo(440,FLOOR); c.fill();
    c.strokeStyle='#ff5a00'; c.lineWidth=3; c.beginPath(); c.moveTo(232,70); c.bezierCurveTo(226,110,250,140,236,180); c.bezierCurveTo(228,200,244,214,240,FLOOR); c.stroke();
    c.strokeStyle='#ffd23f'; c.lineWidth=1; c.stroke();
    c.strokeStyle='#ff3b00'; c.lineWidth=2; c.beginPath(); c.moveTo(254,70); c.bezierCurveTo(270,120,300,150,320,FLOOR); c.stroke();
    glow(c,240,66,40,'rgba(255,200,60,0.8)'); R(c,212,64,56,4,'#ffd23f');
    for(let i=0;i<10;i++){ const x=14+i*12, h=8+i*5; R(c,x,90+i*8,8,h,'#ff2e2e'); R(c,x+3.5,86+i*8,1,h+8,'#ff2e2e'); }
    txt(c,'LIQUIDATED',360,96,'#ffd23f',6,'center'); txt(c,'-99.9%',360,108,'#ff3b3b',10,'center');
    floor(c,'#3a0c04','#120200','#ff4a00',{alpha:0.35});
    c.fillStyle=grad(c,0,0,AW,0,[[0,'rgba(255,80,0,0)'],[0.5,'rgba(255,80,0,0.25)'],[1,'rgba(255,80,0,0)']]); c.fillRect(0,FLOOR,AW,6);
    vignette(c,0.5);
  },
  dock(c){
    c.fillStyle=vgrad(c,0,150,['#0f2440','#1d4470','#3d78a8','#f2a65a']); c.fillRect(0,0,AW,150);
    glow(c,330,146,90,'rgba(255,190,110,0.6)'); circ(c,330,148,16,'#ffd9a0');
    for(const [x,y,w] of [[60,40,70],[200,26,90],[380,60,60]]){ c.fillStyle='rgba(255,255,255,0.18)'; c.beginPath(); c.ellipse(x,y,w,7,0,0,7); c.fill(); }
    c.fillStyle=vgrad(c,150,FLOOR,['#2f6a9a','#103457','#071b30']); c.fillRect(0,150,AW,FLOOR-150);
    c.fillStyle='rgba(255,200,130,0.45)'; for(let i=0;i<14;i++) c.fillRect(300+Math.sin(i)*14,154+i*4,60-i*3,1);
    c.fillStyle='#061526'; c.beginPath(); c.ellipse(130,182,64,14,0,Math.PI,0); c.fill(); poly(c,[[64,180],[50,166],[58,182]],'#061526'); poly(c,[[50,166],[44,158],[56,164]],'#061526');
    R(c,380,166,90,12,'#1a2a3a'); R(c,400,152,20,14,'#c0262d'); R(c,422,152,20,14,'#ff6a00'); R(c,444,156,16,10,'#2a4fbf'); R(c,452,140,8,16,'#dfe8f5');
    for(let i=0;i<5;i++){ const x=20+i*110; R(c,x,140,8,92,'#3a2410'); R(c,x,140,8,3,'#5a3a1a'); R(c,x+6,140,2,92,'rgba(0,0,0,0.3)'); }
    c.strokeStyle='#c9a06a'; c.lineWidth=1; for(let i=0;i<4;i++){ c.beginPath(); c.moveTo(28+i*110,150); c.quadraticCurveTo(79+i*110,164,130+i*110,150); c.stroke(); }
    for(const [x,col] of [[300,'#8a5a2b'],[318,'#a06a35']]){ R(c,x,FLOOR-18,18,18,col); c.strokeStyle='#5a3a18'; c.strokeRect(x+0.5,FLOOR-17.5,17,17); c.beginPath(); c.moveTo(x,FLOOR-18); c.lineTo(x+18,FLOOR); c.stroke(); }
    c.fillStyle=vgrad(c,FLOOR,AH,['#9a6a35','#5a3a18']); c.fillRect(0,FLOOR,AW,AH-FLOOR);
    for(let y=FLOOR;y<AH;y+=6) R(c,0,y,AW,0.6,'rgba(40,20,5,0.5)');
    for(let x=0;x<AW;x+=40) R(c,x+((x/40)%2)*20,FLOOR,0.6,AH-FLOOR,'rgba(40,20,5,0.5)');
    R(c,0,FLOOR,AW,1,'#c9a06a');
    vignette(c,0.35);
  },
  coliseum(c){
    c.fillStyle=vgrad(c,0,FLOOR,['#ffcf8a','#ffb36b','#ff8c2e']); c.fillRect(0,0,AW,FLOOR);
    glow(c,240,0,260,'rgba(255,255,220,0.5)');
    for(let t=0;t<4;t++){ const y=58+t*36; R(c,0,y,AW,36,['#d9a070','#c98d63','#b77a52','#a56a45'][t]); R(c,0,y,AW,2,'#f2c79a'); R(c,0,y+34,AW,2,'rgba(0,0,0,0.25)');
      for(let x=0;x<AW;x+=32){ R(c,x+((t%2)*16)+6,y+8,20,26,'rgba(90,45,20,0.55)'); c.fillStyle='rgba(90,45,20,0.55)'; c.beginPath(); c.arc(x+((t%2)*16)+16,y+8,10,Math.PI,0); c.fill(); } }
    const r=rnd(4); for(let t=0;t<4;t++) for(let i=0;i<70;i++){ const x=r()*AW, y=58+t*36+26; const col=['#ff6a00','#fff4e6','#2b1405','#ffd23f','#c0262d','#2a4fbf'][(i+t)%6]; R(c,x,y-4,5,6,col); circ(c,x+2.5,y-6,2.4,['#e8b48a','#c98d63','#6b3f1f','#f0c6a0'][i%4]); }
    const tags=[['+1','#18a34a'],['L + RATIO','#e0262d'],['W','#18a34a'],['FIRST','#c98a00'],['SOURCE?','#2a4fbf']];
    tags.forEach((tg,i)=>{ const x=18+i*94; R(c,x,16,80,26,'#fff'); c.strokeStyle='#2b1405'; c.lineWidth=1; c.strokeRect(x+0.5,16.5,79,25);
      circ(c,x+10,29,6,'#ffb36b'); R(c,x+20,21,36,3,'#999'); txt(c,tg[0],x+20,28,tg[1],6); R(c,x+12,42,6,6,'#fff'); });
    R(c,0,202,AW,30,'#7a4b2a'); R(c,0,202,AW,2,'#f2c79a'); for(let x=0;x<AW;x+=60) R(c,x+24,208,12,18,'#ff6a00');
    floor(c,'#ecc58e','#c99a62','#a8794a',{alpha:0.3,noRadial:true});
    const r2=rnd(8); for(let i=0;i<40;i++) R(c,r2()*AW,FLOOR+4+r2()*34,2,1,'rgba(120,80,40,0.4)');
    vignette(c,0.25);
  },
  gas(c){
    c.fillStyle=vgrad(c,0,FLOOR,['#03020a','#090722','#16123e','#2a1a4a']); c.fillRect(0,0,AW,FLOOR);
    stars(c,13,120,140,['#cfd6ff','#ffffff']);
    skyline(c,77,200,'#0a0818',30,80,['#3a2e6a','#ffcf8a'],0.12);
    glow(c,240,108,200,'rgba(255,180,90,0.25)');
    R(c,50,88,380,16,'#ff6a00'); R(c,50,88,380,2,'#ffd23f'); R(c,50,103,380,2,'#a84300'); txt(c,'GWEI GAS · OPEN 24/7',240,93,'#2b1405',7,'center');
    R(c,50,105,380,4,'#fff0d8'); poly(c,[[60,109],[420,109],[470,FLOOR],[10,FLOOR]],grad(c,0,109,0,FLOOR,[[0,'rgba(255,240,210,0.3)'],[1,'rgba(255,240,210,0)']]));
    R(c,62,109,8,123,'#d9d9e0'); R(c,410,109,8,123,'#d9d9e0');
    for(let i=0;i<2;i++){ const x=150+i*150; R(c,x,150,34,82,'#c0262d'); R(c,x,150,34,3,'#ff6a5a'); R(c,x+4,158,26,16,'#0b0b12'); txt(c,'$80',x+17,163,'#3bff8a',6,'center'); R(c,x+4,180,26,4,'#ffd23f'); R(c,x+34,166,4,24,'#222'); R(c,x+36,188,2,14,'#222'); glow(c,x+17,166,24,'rgba(59,255,138,0.2)'); }
    R(c,428,26,46,58,'#1b1206'); R(c,450,84,2,40,'#555'); c.strokeStyle='#ff6a00'; c.lineWidth=1; c.strokeRect(428.5,26.5,45,57); txt(c,'GAS',451,32,'#ff6a00',6,'center'); txt(c,'420',451,46,'#3bff8a',8,'center'); txt(c,'GWEI',451,64,'#ffd23f',5,'center');
    floor(c,'#2c2a36','#121118','#4a4858',{alpha:0.35});
    for(let x=0;x<AW;x+=44) R(c,x,FLOOR+20,22,2,'#ffd23f');
    c.fillStyle='rgba(255,240,210,0.08)'; c.fillRect(0,FLOOR,AW,14);
    vignette(c,0.5);
  },
  server(c){
    c.fillStyle=vgrad(c,0,FLOOR,['#060914','#0d1630','#182a54','#22386a']); c.fillRect(0,0,AW,FLOOR);
    stars(c,17,90,110,['#9fb4ff','#ffffff']);
    skyline(c,21,170,'#0d1426',40,130,['#ff6a00','#ffb36b','#5ad1ff'],0.35);
    skyline(c,29,190,'#080d1a',20,70,['#ff6a00'],0.2);
    R(c,400,118,3,40,'#3a4256'); c.fillStyle='#8a93a8'; c.beginPath(); c.ellipse(402,116,18,8,-0.4,0,Math.PI); c.fill();
    R(c,70,96,2,60,'#3a4256'); R(c,62,96,18,2,'#3a4256');
    for(let i=0;i<7;i++){ const x=8+i*68; R(c,x,150,56,82,'#1c2232'); R(c,x,150,56,2,'#3a4256'); R(c,x+54,150,2,82,'rgba(0,0,0,0.4)');
      for(let k=0;k<9;k++){ R(c,x+4,156+k*8.4,48,6.4,'#0f1320'); for(let l=0;l<3;l++) R(c,x+8+l*4,158+k*8.4,1.6,1.6,(i+k+l)%4?'#3bff8a':'#ff6a00'); R(c,x+30,158+k*8.4,18,1,'#2a3248'); } }
    c.strokeStyle='#ff6a00'; c.lineWidth=1.2; c.beginPath(); c.moveTo(0,148); c.bezierCurveTo(120,170,180,130,300,150); c.bezierCurveTo(360,160,420,140,480,152); c.stroke();
    floor(c,'#3a4256','#1a1f2c','#5a6680',{alpha:0.3});
    vignette(c,0.45);
  },
  discord(c){
    c.fillStyle=vgrad(c,0,FLOOR,['#16171f','#22232f','#2c2e3e']); c.fillRect(0,0,AW,FLOOR);
    for(let y=36;y<FLOOR;y+=8) for(let x=((y/8)%2)*10;x<AW;x+=20) R(c,x,y,19,7,'rgba(255,255,255,0.025)');
    R(c,0,0,AW,34,'#0e0f15'); for(let x=0;x<AW;x+=26) R(c,x,30,2,4,'#333');
    for(let i=0;i<4;i++){ const x=60+i*120; R(c,x,34,1,16,'#444'); poly(c,[[x-8,58],[x+8,58],[x+4,50],[x-4,50]],'#222'); glow(c,x,64,60,'rgba(255,214,150,0.22)'); poly(c,[[x-8,58],[x+8,58],[x+50,FLOOR],[x-50,FLOOR]],'rgba(255,214,150,0.07)'); }
    R(c,26,70,150,104,'#0a0a10'); R(c,30,74,142,96,'#313338'); R(c,30,74,24,96,'#1e1f22');
    for(let i=0;i<5;i++) circ(c,42,86+i*16,6,['#ff6a00','#5865f2','#3bff8a','#ff2e2e','#ffd23f'][i]);
    for(let i=0;i<8;i++){ circ(c,64,86+i*10.5,3.5,['#ff6a00','#5865f2','#3bff8a','#ff2e2e'][i%4]); R(c,71,83+i*10.5,20,2,['#ffb36b','#a3b1ff','#8affb2','#ff9a9a'][i%4]); R(c,71,87+i*10.5,30+((i*29)%60),2,'#b5bac1'); }
    glow(c,100,120,110,'rgba(88,101,242,0.18)');
    R(c,300,150,160,6,'#3a2a1f'); R(c,306,156,4,76,'#2a1d14'); R(c,450,156,4,76,'#2a1d14');
    R(c,330,100,90,50,'#0a0a10'); R(c,333,103,84,42,'#ff6a00'); txt(c,'MODS',375,113,'#2b1405',8,'center'); txt(c,'ASLEEP',375,127,'#2b1405',8,'center'); R(c,372,145,6,5,'#222');
    for(let i=0;i<6;i++) R(c,310+i*7,144,5,6,['#ff6a00','#ffd23f','#3bff8a'][i%3]);
    glow(c,375,124,70,'rgba(255,106,0,0.3)');
    R(c,0,FLOOR-3,AW,1.5,'#7b2cff'); glow(c,240,FLOOR-2,240,'rgba(123,44,255,0.15)');
    floor(c,'#3e3226','#1c1610','#5a4a3a',{alpha:0.3,noRadial:true});
    vignette(c,0.5);
  },
  arcade(c){
    c.fillStyle=vgrad(c,0,FLOOR,['#12041f','#220838','#350d55']); c.fillRect(0,0,AW,FLOOR);
    glow(c,240,58,150,'rgba(255,46,196,0.35)');
    R(c,112,36,256,44,'#0b0414'); c.strokeStyle='#ff2ec4'; c.lineWidth=2; c.strokeRect(114,38,252,40); c.strokeStyle='#ffb3ec'; c.lineWidth=0.6; c.strokeRect(114,38,252,40);
    txt(c,'PUMP & DUMP',240,48,'#ff6a00',14,'center'); txt(c,'ARCADE · INSERT $DOJO',240,66,'#ffd23f',5,'center');
    const cols=['#ff2e2e','#2a4fbf','#ff6a00','#18a34a','#7b2cff','#ffd23f','#ff2ec4'];
    for(let i=0;i<7;i++){ const x=8+i*67;
      R(c,x,108,56,124,cols[i]); R(c,x+54,108,2,124,'rgba(0,0,0,0.3)');
      R(c,x,100,56,12,'#111'); txt(c,['PUMP','RUG','HODL','MOON','APE','FOMO','DUMP'][i],x+28,103,'#fff',5,'center');
      R(c,x+6,118,44,36,'#05050c'); R(c,x+9,121,38,30,['#103a1c','#1a1040','#3a1a05'][i%3]);
      glow(c,x+28,136,30,['rgba(59,255,138,0.35)','rgba(90,209,255,0.35)','rgba(255,106,0,0.35)'][i%3]);
      R(c,x+4,160,48,10,'#151515'); circ(c,x+16,165,2.5,'#ff2e2e'); circ(c,x+28,165,2,'#ffd23f'); circ(c,x+36,165,2,'#3bff8a'); R(c,x+11,162,1.5,4,'#ccc');
      R(c,x+20,190,16,10,'#111'); R(c,x+24,194,8,2,'#ff6a00'); }
    floor(c,'#1c0c33','#0a0414','#ff2ec4',{alpha:0.35});
    c.save(); c.beginPath(); c.rect(0,FLOOR,AW,AH-FLOOR); c.clip(); for(let y=FLOOR;y<AH;y+=9) for(let x=((y/9)%2)*12;x<AW;x+=24) R(c,x,y,12,9,'rgba(255,255,255,0.04)'); c.restore();
    vignette(c,0.45);
  },
  park(c){
    c.fillStyle=vgrad(c,0,FLOOR,['#5fb2ff','#93ceff','#cde9ff','#e8f6ff']); c.fillRect(0,0,AW,FLOOR);
    glow(c,70,48,70,'rgba(255,250,200,0.8)'); circ(c,70,48,16,'#fffbe0');
    for(const [x,y,s] of [[150,40,1],[290,28,1.3],[410,58,0.9]]){ c.fillStyle='rgba(255,255,255,0.95)'; for(const [dx,dy,r] of [[0,0,12],[14,-6,14],[30,0,12],[16,4,12]]){ c.beginPath(); c.arc(x+dx*s,y+dy*s,r*s,0,7); c.fill(); } }
    c.fillStyle='#8ccf6a'; c.beginPath(); c.moveTo(0,170); for(let x=0;x<=AW;x+=10) c.lineTo(x,150+Math.sin(x*0.015+1)*16); c.lineTo(AW,FLOOR); c.lineTo(0,FLOOR); c.fill();
    c.fillStyle='#66b246'; c.beginPath(); c.moveTo(0,180); for(let x=0;x<=AW;x+=10) c.lineTo(x,174+Math.sin(x*0.02)*10); c.lineTo(AW,FLOOR); c.lineTo(0,FLOOR); c.fill();
    const r=rnd(31); for(let i=0;i<7;i++){ const x=20+i*70+r()*20, s=0.8+r()*0.5; R(c,x-3*s,150,6*s,40,'#6b4220');
      circ(c,x,140,20*s,'#2f7d2a'); circ(c,x-12*s,148,14*s,'#2f7d2a'); circ(c,x+12*s,148,14*s,'#2f7d2a'); circ(c,x-5*s,132,12*s,'#46a33a'); circ(c,x+6*s,138,9*s,'#58b84a'); }
    R(c,330,196,64,4,'#8a5a2b'); R(c,330,186,64,3,'#8a5a2b'); R(c,334,200,3,14,'#4a3018'); R(c,387,200,3,14,'#4a3018');
    R(c,90,180,2,34,'#4a3018'); R(c,72,170,40,14,'#2f7d2a'); txt(c,'OUTSIDE',92,175,'#fff',4,'center');
    floor(c,'#58b03a','#3a8a24','#2f7a1e',{alpha:0.25,noRadial:true});
    const r2=rnd(77); for(let i=0;i<160;i++){ const x=r2()*AW, y=FLOOR+r2()*38; R(c,x,y-2,0.8,3,'#2f7a1e'); }
    for(let i=0;i<12;i++){ const x=r2()*AW, y=FLOOR+6+r2()*30; circ(c,x,y,1.2,['#fff','#ffd23f','#ff9ad5'][i%3]); }
    vignette(c,0.15);
  },
  laneway(c){
    c.fillStyle=vgrad(c,0,FLOOR,['#1e1424','#2e1e34','#4a3044']); c.fillRect(0,0,AW,FLOOR);
    skyline(c,44,186,'#140c18',60,150,['#ffcf8a','#ff6a00'],0.4);
    glow(c,240,170,140,'rgba(255,140,60,0.25)');
    const wall=(x0,x1,col)=>{ R(c,x0,0,x1-x0,FLOOR,col);
      for(let y=0;y<FLOOR;y+=6) for(let x=x0+((y/6)%2)*7;x<x1;x+=14){ R(c,x,y,13,5,'rgba(255,255,255,0.04)'); R(c,x,y+5,14,1,'rgba(0,0,0,0.25)'); } };
    wall(0,118,'#5c3b2a'); wall(362,AW,'#6b4a35');
    c.fillStyle=grad(c,100,0,118,0,[[0,'rgba(0,0,0,0)'],[1,'rgba(0,0,0,0.45)']]); c.fillRect(100,0,18,FLOOR);
    c.fillStyle=grad(c,362,0,380,0,[[0,'rgba(0,0,0,0.45)'],[1,'rgba(0,0,0,0)']]); c.fillRect(362,0,18,FLOOR);
    const tags=['#ff6a00','#ff2ec4','#3bff8a','#5ad1ff','#ffd23f'];
    for(let i=0;i<9;i++) circ(c,10+(i*37)%100,40+(i*53)%150,3+(i%3)*2,tags[i%5]);
    c.save(); c.translate(56,110); c.rotate(-0.12); txt(c,'DOJO',1.5,1.5,'#2b1405',18,'center'); txt(c,'DOJO',0,0,'#ff6a00',18,'center'); c.restore();
    c.save(); c.translate(420,80); c.rotate(0.08); txt(c,'GM',0,0,'#3bff8a',16,'center'); c.restore();
    txt(c,'WAGMI',424,150,'#ff2ec4',7,'center');
    R(c,126,140,84,92,'#2a1a14'); R(c,130,150,76,46,'#ffcf8a'); glow(c,168,172,60,'rgba(255,200,120,0.4)');
    R(c,126,132,84,10,'#ff6a00'); txt(c,'FLAT WHITE',168,135,'#2b1405',5,'center');
    for(let i=0;i<4;i++) circ(c,140+i*18,186,4,'#3a2414');
    c.strokeStyle='#222'; c.lineWidth=0.6; c.beginPath(); c.moveTo(118,30); c.quadraticCurveTo(240,90,362,30); c.stroke();
    for(let i=1;i<12;i++){ const t=i/12, x=118+244*t, y=30+60*t*(1-t)*2; circ(c,x,y+2,1.6,'#ffe6a8'); glow(c,x,y+2,8,'rgba(255,230,168,0.5)'); }
    R(c,372,196,26,36,'#2a4a2a'); R(c,370,194,30,4,'#1d331d'); R(c,96,0,4,FLOOR,'#3a2a20');
    floor(c,'#3a3438','#1a171a','#5a5458',{alpha:0.35});
    for(let i=0;i<6;i++){ c.fillStyle='rgba(255,170,90,0.12)'; c.beginPath(); c.ellipse(80+i*70,FLOOR+18+(i%2)*10,22,3,0,0,7); c.fill(); }
    vignette(c,0.45);
  },
};

const ANIM = {
  floor(c,t){ c.save(); c.beginPath(); c.rect(0,112,AW,13); c.clip(); const items=['DOJO +420%','BTC -2.1%','ETH +1.3%','SOL +6.9%','GAS +99%','COPE +12%','HOPIUM -8%','FUD -40%'];
    const span=items.length*90, off=-(t*0.6)%span; for(let k=0;k<2;k++) items.forEach((s,i)=>txt(c,s,off+k*span+i*90,115,s.includes('-')?'#5a0000':'#2b1405',6)); c.restore(); },
  moon(c,t){ const x=(t*0.5)%620-60; R(c,x,26,6,1.2,'#fff'); c.globalAlpha=0.5; R(c,x-14,26.2,14,0.8,'#ff6a00'); c.globalAlpha=1;
    if((t>>5)%2) glow(c,153,96,6,'rgba(255,60,60,0.9)'); },
  volcano(c,t){ for(let i=0;i<14;i++){ const p=((t*0.7+i*37)%160); const x=226+((i*13)%28)+Math.sin(t*0.04+i)*6; c.globalAlpha=1-p/160; R(c,x,70-p*0.6,1.5,1.5,i%2?'#ffd23f':'#ff6a00'); } c.globalAlpha=1;
    for(let i=0;i<10;i++){ const p=(t*0.3+i*29)%AW; c.globalAlpha=0.6; R(c,p,FLOOR-40-((i*31)%120)+Math.sin(t*0.02+i)*4,1,1,'#ff8a3a'); } c.globalAlpha=1; },
  dock(c,t){ for(let i=0;i<9;i++){ const x=((t*0.25+i*60)%(AW+40))-20, y=158+(i%4)*16; R(c,x,y,22,0.8,'rgba(160,210,255,0.5)'); }
    const by=Math.sin(t*0.03)*1.5; R(c,236,196+by,8,8,'#ff6a00'); R(c,238,192+by,4,4,'#fff'); },
  arcade(c,t){ for(let i=0;i<7;i++){ const x=8+i*67; if(((t>>4)+i)%3===0){ c.globalAlpha=0.25; R(c,x+9,121,38,30,'#ffffff'); c.globalAlpha=1; }
    const bx=x+12+((t*0.8+i*9)%28); R(c,bx,132,3,3,'#ffd23f'); }
    if((t>>3)%8===0){ c.globalAlpha=0.3; R(c,114,38,252,40,'#ff2ec4'); c.globalAlpha=1; } },
  server(c,t){ for(let i=0;i<7;i++) for(let k=0;k<9;k++) if(((t>>2)+i*7+k*3)%11===0) R(c,12+i*68,158+k*8.4,1.6,1.6,'#ffffff'); },
  park(c,t){ for(let i=0;i<3;i++){ const x=(t*0.25+i*170)%560-40, y=70+i*14+Math.sin(t*0.05+i)*3, w=((t>>3)+i)%2; c.fillStyle='#2b1405'; c.fillRect(x,y,3,1.5); c.fillRect(x-3,y-1-w,3,1); c.fillRect(x+3,y-1-w,3,1); } },
  coliseum(c,t){ const r=rnd((t>>4)+1); for(let i=0;i<30;i++){ const tier=(r()*4)|0; R(c,r()*AW,58+tier*36+18-((t>>2)%2)*2,5,2,'#fff4e6'); } },
  gas(c,t){ c.globalAlpha=0.08+0.04*Math.sin(t*0.3); R(c,50,105,380,4,'#ffffff'); c.globalAlpha=1;
    for(let i=0;i<20;i++){ const a=t*0.02+i; c.globalAlpha=0.5; R(c,240+Math.cos(a)*180*((i%5)/5+0.2),112+((t*0.4+i*11)%110),0.8,0.8,'#ffe6c0'); } c.globalAlpha=1; },
  discord(c,t){ if((t>>5)%2){ circ(c,46,170,4,'#ff2e2e'); txt(c,'@',46,168,'#fff',4,'center'); }
    const y=86+((t>>4)%8)*10.5; c.globalAlpha=0.12; R(c,56,y-5,110,10,'#ffffff'); c.globalAlpha=1; },
  laneway(c,t){ for(let i=0;i<40;i++){ const x=(i*53+t*0.6)%AW, y=(i*97+t*3.2)%AH; c.globalAlpha=0.25; R(c,x,y,0.5,5,'#cfd6ff'); } c.globalAlpha=1;
    for(let i=1;i<12;i+=2){ if(((t>>4)+i)%5===0){ const tt=i/12; glow(c,118+244*tt,30+60*tt*(1-tt)*2+2,12,'rgba(255,230,168,0.7)'); } } },
  bazaar(c,t){ for(let i=0;i<5;i++){ const x=6+i*96; const sway=Math.sin(t*0.05+i)*1.2; R(c,x+38+sway,152,1,6,'#ffd23f'); } },
};

function render(id){
  if(cache[id]) return cache[id];
  const cv=document.createElement('canvas'); cv.width=AW*RES; cv.height=AH*RES;
  const c=cv.getContext('2d'); c.scale(RES,RES);
  (DRAW[id]||DRAW.floor)(c);
  cache[id]=cv; return cv;
}
function draw(ctx,id,t){ ctx.drawImage(render(id),0,0,AW,AH); if(ANIM[id]) ANIM[id](ctx,t); }
function thumb(id){ const cv=render(id), s=document.createElement('canvas'); s.width=AW; s.height=AH; const c=s.getContext('2d'); c.drawImage(cv,0,0,AW,AH); if(ANIM[id]) ANIM[id](c,0); return s.toDataURL('image/jpeg',0.85); }
function clearCache(){ for(const k in cache) delete cache[k]; }

DD.Arenas = { draw, thumb, render, clearCache, AW, AH, FLOOR };
})();
