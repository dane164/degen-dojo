/* DEGEN DOJO — roster + arenas data */
window.DD = window.DD || {};

DD.FIGHTERS = [
  { id:'diamond', name:'Diamond Hands', tag:'NEVER SELLING', head:'human', hair:'short', hairC:'#2b1405', skin:'#e8b48a', top:'#ffffff', pants:'#1e2a44', shoes:'#111', acc:'diamondFists', eyes:'shades', idle:'cool', win:'flex', outfit:'tee',
    special:{ name:'Unbreakable', type:'crystalShell', desc:'Encases you in a diamond shell. Hit it and it shatters back in their face. Leave it and it bursts anyway.' }, stats:{spd:0.95,pow:1.05,def:1.15} },
  { id:'paper', name:'Paper Hands', tag:'SOLD THE BOTTOM', head:'bag', skin:'#f3e9d2', top:'#d8c7a1', pants:'#7a6a4f', shoes:'#3a2d1a', acc:'paperHands', idle:'nervous', win:'laugh', outfit:'tee',
    special:{ name:'Panic Sell', type:'panicSell', desc:'Blinks away, leaves a SELL order that explodes, and throws three homing paper planes.' }, stats:{spd:1.15,pow:0.9,def:0.85} },
  { id:'moon', name:'Moon Boy', tag:'1000X OR BUST', head:'helmet', skin:'#e8b48a', top:'#f2f2f2', pants:'#f2f2f2', shoes:'#ff6a00', acc:'jetpack', idle:'bouncy', win:'arms', outfit:'space',
    special:{ name:'To The Moon', type:'moonShot', desc:'Rocket launch: three hits on the way up, crash-landing shockwave on the way down.' }, stats:{spd:1.0,pow:1.0,def:1.0} },
  { id:'rug', name:'Rug Puller', tag:'DEV IS DOING SOMETHING', head:'mask', skin:'#c98d63', top:'#3b2a4a', pants:'#241a30', shoes:'#111', acc:'rug', idle:'boxer', win:'laugh', outfit:'hoodie',
    special:{ name:'Rug Pull', type:'rugPull', desc:'Rolls a rug across the floor, then yanks it. Anyone standing on it gets swept and dragged in.' }, stats:{spd:1.05,pow:1.0,def:0.95} },
  { id:'linegoup', name:'Line Go Up', tag:'NUMBER GO UP', head:'human', hair:'bald', skin:'#f0c6a0', top:'#2a4fbf', pants:'#1b2f73', shoes:'#111', acc:'tie', eyes:'normal', idle:'cool', win:'point', outfit:'suit',
    special:{ name:'Green Candle', type:'candles', desc:'Three green candles erupt in a rising staircase toward the enemy. The last one launches.' }, stats:{spd:0.95,pow:1.05,def:1.0} },
  { id:'bear', name:'Bear Market', tag:'IT\'S OVER', head:'bear', skin:'#6b3f1f', top:'#c0262d', pants:'#3a1f10', shoes:'#2a1608', acc:null, idle:'heavy', win:'flex', outfit:'tee',
    special:{ name:'Capitulation', type:'capitulation', desc:'Roars, leaps and slams. Red shockwaves both ways and debris rains on the enemy.' }, stats:{spd:0.85,pow:1.2,def:1.15} },
  { id:'bull', name:'Bull Run', tag:'WE\'RE SO BACK', head:'bull', skin:'#4a2c1a', top:'#18a34a', pants:'#0f5e2b', shoes:'#2a1608', acc:null, idle:'heavy', win:'arms', outfit:'tee',
    special:{ name:'Stampede', type:'stampede', desc:'Paws the ground, then charges with green after-images. Tosses the enemy sky-high on contact.' }, stats:{spd:1.0,pow:1.15,def:1.05} },
  { id:'whale', name:'The Whale', tag:'MOVES MARKETS', head:'whale', skin:'#3d6fb6', top:'#14213d', pants:'#14213d', shoes:'#000', acc:'monocle', idle:'heavy', win:'cross', outfit:'suit', tie:'#ffd23f',
    special:{ name:'Market Dump', type:'tsunami', desc:'Tail splash into a tsunami that carries the enemy across the screen, hitting four times.' }, stats:{spd:0.8,pow:1.2,def:1.2} },
  { id:'gas', name:'Gas Fee Goblin', tag:'THAT\'LL BE $80', head:'goblin', skin:'#6fbf3a', top:'#7a4b1e', pants:'#4a2c12', shoes:'#2a1608', acc:'nozzle', idle:'nervous', win:'laugh', outfit:'vest',
    special:{ name:'Gas Spike', type:'gasSpike', desc:'Sprays a toxic gas cloud that lingers: drains their special meter, poisons and slows.' }, stats:{spd:1.1,pow:0.9,def:0.9} },
  { id:'brain', name:'Galaxy Brain', tag:'5D CHESS', head:'brain', skin:'#c9a0ff', top:'#4b1f8f', pants:'#2d1257', shoes:'#160830', acc:null, idle:'float', win:'float', outfit:'robe',
    special:{ name:'Big Brain Beam', type:'bigBrainBeam', desc:'Opens a galaxy portal, then fires a huge multi-hit psychic beam across the screen.' }, stats:{spd:0.9,pow:1.1,def:0.9} },
  { id:'copium', name:'Copium Huffer', tag:'IT\'S FINE. IT\'S FINE.', head:'human', hair:'messy', hairC:'#6b4a2b', skin:'#e8b48a', top:'#2f7d6d', pants:'#1d4d43', shoes:'#fff', acc:'gasmask', eyes:'normal', idle:'nervous', win:'arms', outfit:'hoodie',
    special:{ name:'Huff', type:'copiumHuff', desc:'Huffs copium, exhales a blast that shoves the enemy away, then heals over time.' }, stats:{spd:1.0,pow:0.95,def:1.05} },
  { id:'npc', name:'NPC', tag:'HELLO TRAVELLER', head:'npc', skin:'#b8b8b8', top:'#8a8a8a', pants:'#5c5c5c', shoes:'#333', acc:'bang', idle:'boxer', win:'bow', outfit:'tee',
    special:{ name:'Scripted', type:'scripted', desc:'Spawns three NPC clones that march in lockstep and all swing at the same time.' }, stats:{spd:1.0,pow:0.95,def:1.0} },
  { id:'clickbait', name:'Clickbait', tag:'YOU WON\'T BELIEVE #7', head:'human', hair:'spiky', hairC:'#ffd23f', skin:'#f0c6a0', top:'#ff2e2e', pants:'#222', shoes:'#fff', acc:'arrow', eyes:'shock', idle:'bouncy', win:'point', outfit:'tee',
    special:{ name:'Thumbnail Face', type:'thumbnailFace', desc:'Slaps a SHOCKING thumbnail on the enemy (stunning them), then blinks in for an unblockable hit.' }, stats:{spd:1.15,pow:0.95,def:0.85} },
  { id:'keyboard', name:'Keyboard Warrior', tag:'ACTUALLY...', head:'human', hair:'long', hairC:'#2b1405', skin:'#f4d0b0', top:'#1a1a1a', pants:'#333', shoes:'#111', acc:'keyboard', eyes:'angry', idle:'typing', win:'cross', outfit:'hoodie',
    special:{ name:'CAPS LOCK RAGE', type:'flurry', desc:'Types at 200 WPM: an 8-hit keyboard smash with keycaps flying. The last key launches.' }, stats:{spd:0.95,pow:1.0,def:0.95} },
  { id:'grass', name:'Touch Grass', tag:'LOG OFF', head:'human', hair:'strawhat', hairC:'#e7c25a', skin:'#d99a6c', top:'#4c8c3a', pants:'#2e5b9a', shoes:'#5a3a1a', acc:'sprout', eyes:'normal', idle:'boxer', win:'arms', outfit:'tee',
    special:{ name:'Grass Field', type:'touchGrass', desc:'A wave of grass rolls across the floor and roots the enemy in vines. Flowers heal you.' }, stats:{spd:1.0,pow:0.95,def:1.1} },
  { id:'sigma', name:'Sigma Grinder', tag:'4AM. COLD SHOWER.', head:'human', hair:'slick', hairC:'#111', skin:'#e2a87c', top:'#111111', pants:'#222', shoes:'#111', acc:null, eyes:'shades', idle:'cool', win:'cross', outfit:'tank',
    special:{ name:'4AM Grind', type:'timeStop', desc:'It\'s 4AM and only you are awake. A giant clock appears and the enemy runs at half speed.' }, stats:{spd:1.1,pow:1.0,def:0.95} },
  { id:'skill', name:'Skill Issue', tag:'GIT GUD', head:'human', hair:'cap', hairC:'#ff6a00', skin:'#c98d63', top:'#3355ff', pants:'#222', shoes:'#fff', acc:'controller', eyes:'normal', idle:'cocky', win:'point', outfit:'tee',
    special:{ name:'Reverse Card', type:'reverseCard', desc:'Holds up a spinning reverse card: reflects projectiles and counters punches. Unused, it\'s thrown as a boomerang.' }, stats:{spd:1.05,pow:1.0,def:1.0} },
  { id:'ratio', name:'Ratio', tag:'+ L + YOU FELL OFF', head:'human', hair:'mohawk', hairC:'#ff2ec4', skin:'#f0c6a0', top:'#7b2cff', pants:'#1a1a1a', shoes:'#fff', acc:null, eyes:'smug', idle:'cocky', win:'laugh', outfit:'hoodie',
    special:{ name:'Ratio\'d', type:'ratioDrop', desc:'Three giant Ls rain down on the enemy\'s position. Every hit steals health.' }, stats:{spd:1.05,pow:1.0,def:0.95} },
  { id:'main', name:'Main Character', tag:'PLOT ARMOUR ON', head:'human', hair:'anime', hairC:'#ffb000', skin:'#f0c6a0', top:'#ffffff', pants:'#1e2a44', shoes:'#c0262d', acc:'scarf', eyes:'normal', idle:'boxer', win:'fist', outfit:'tee',
    special:{ name:'Plot Armour', type:'plotArmour', desc:'Spotlights snap on and a golden blast knocks them back. For 8 seconds you can\'t drop below 1 HP.' }, stats:{spd:1.0,pow:1.0,def:1.0} },
  { id:'lag', name:'Lag Spike', tag:'999MS', head:'glitch', skin:'#00ffd0', top:'#ff00aa', pants:'#2200ff', shoes:'#000', acc:null, idle:'nervous', win:'fist', outfit:'tee',
    special:{ name:'Rollback', type:'rollback', desc:'VHS rewind: snap back to where you were 2 seconds ago, with that HP, and desync the enemy.' }, stats:{spd:1.1,pow:0.95,def:0.9} },
  { id:'shiba', name:'Zoomie Shiba', tag:'SUCH SPEED', head:'shiba', skin:'#e0913a', top:'#ffffff', pants:'#ffffff', shoes:'#e0913a', acc:'belt', idle:'bouncy', win:'arms', outfit:'gi',
    special:{ name:'Zoomies', type:'zoomies', desc:'Three zig-zag dashes with after-images, then a spinning tackle that launches.' }, stats:{spd:1.2,pow:0.9,def:0.85} },
  { id:'cat', name:'Loaf Cat', tag:'IF I FITS I SITS', head:'cat', skin:'#9a9a9a', top:'#f4f4f4', pants:'#f4f4f4', shoes:'#9a9a9a', acc:'belt', idle:'lazy', win:'sit', outfit:'gi',
    special:{ name:'Loaf Mode', type:'loafRoll', desc:'Turns into a loaf of bread and rolls invulnerable, bouncing off a wall. Then sits and heals.' }, stats:{spd:1.1,pow:0.95,def:0.95} },
  { id:'unit', name:'Absolute Unit', tag:'IN AWE OF THE SIZE', head:'sheep', skin:'#3a3a3a', top:'#f2ece0', pants:'#3a3a3a', shoes:'#111', acc:null, wide:true, idle:'heavy', win:'flex', outfit:'wool',
    special:{ name:'Body Slam', type:'bodySlam', desc:'Command grab: leaps to the top of the screen and piledrives the enemy into a crater.' }, stats:{spd:0.8,pow:1.25,def:1.2} },
  { id:'doom', name:'Doomscroller', tag:'ONE MORE SCROLL', head:'human', hair:'hood', hairC:'#2b2b2b', skin:'#d8c6b8', top:'#2b2b2b', pants:'#1a1a1a', shoes:'#fff', acc:'phone', eyes:'tired', idle:'phone', win:'phone', outfit:'hoodie',
    special:{ name:'Infinite Scroll', type:'infiniteScroll', desc:'An endless feed of phones scrolls down onto the enemy, then ONE MORE giant phone.' }, stats:{spd:1.0,pow:0.95,def:0.95} },
];

DD.ARENAS = [
  { id:'floor',   name:'Trading Floor',      sub:'NYSE AFTER HOURS',      music:{bpm:150, root:45, mode:'minor', seed:11} },
  { id:'moon',    name:'Moon Base',          sub:'WE MADE IT',            music:{bpm:132, root:50, mode:'dorian', seed:23} },
  { id:'bazaar',  name:'Rug Bazaar',         sub:'ALL SALES FINAL',       music:{bpm:140, root:47, mode:'phrygian', seed:37} },
  { id:'volcano', name:'Liquidation Volcano',sub:'100X LEVERAGE',         music:{bpm:168, root:40, mode:'minor', seed:41} },
  { id:'dock',    name:'Whale Dock',         sub:'DEEP WATER',            music:{bpm:120, root:43, mode:'dorian', seed:53} },
  { id:'coliseum',name:'Comment Section',    sub:'COLISEUM',              music:{bpm:156, root:48, mode:'minor', seed:61} },
  { id:'gas',     name:'Gas Station 3AM',    sub:'PUMP 4 ONLY',           music:{bpm:128, root:46, mode:'minor', seed:71} },
  { id:'server',  name:'Server Farm Roof',   sub:'NODE DOWN',             music:{bpm:160, root:49, mode:'phrygian', seed:83} },
  { id:'discord', name:'Discord Basement',   sub:'MODS ASLEEP',           music:{bpm:144, root:44, mode:'dorian', seed:97} },
  { id:'arcade',  name:'Pump & Dump Arcade', sub:'INSERT COIN',           music:{bpm:176, root:52, mode:'major', seed:103} },
  { id:'park',    name:'Touch Grass Park',   sub:'OUTSIDE (RARE)',        music:{bpm:124, root:48, mode:'major', seed:113} },
  { id:'laneway', name:'Melbourne Laneway',  sub:'FLAT WHITE DISTRICT',   music:{bpm:136, root:45, mode:'dorian', seed:127} },
];

DD.TEXT_POPS = ['REKT','WAGMI','NGMI','BONK','GG','RATIO','COPE','DUMP','PUMP','LFG','FUD','NO CAP','BASED','L'];

// Arena ids with a hand-made image in img/arenas/<id>.png. Only listed ids are fetched (avoids 404s).
DD.ARENA_ART = [];

/* ---- $DOJO token config: fill in MINT once the coin is live (pump.fun contract address) ---- */
DD.TOKEN={ symbol:'$DOJO', mint:'', holderMin:1,
  rpc:['https://solana-rpc.publicnode.com','https://api.mainnet-beta.solana.com'] };
/* ---- community vote: next fighter. Bump round + candidates to start a new vote ---- */
DD.VOTE={ round:1, title:'WHO JOINS THE DOJO NEXT?', ends:'Vote closes when the next update drops',
  candidates:[
    {id:'bagholder', name:'Bag Holder', tag:'STILL HOLDING', desc:'Carries 40 bags. Every hit he takes makes him heavier and harder to knock down.'},
    {id:'exitliq', name:'Exit Liquidity', tag:'THANKS FOR BUYING', desc:'Steals a slice of your health every time you block.'},
    {id:'devsold', name:'The Dev (Sold)', tag:'IT WAS A SOCIAL EXPERIMENT', desc:'Teleports out mid-combo. Literally rugs the round.'},
    {id:'shill', name:'The Influencer', tag:'NFA DYOR', desc:'Summons a crowd of followers that body-block for him.'},
    {id:'farmer', name:'Airdrop Farmer', tag:'50 WALLETS DEEP', desc:'Splits into clones. Only one of them is real.'},
    {id:'jeet', name:'The Jeet', tag:'SOLD AT 2X', desc:'Fastest walk speed in the game. Runs away the second it gets close.'}
  ]};
