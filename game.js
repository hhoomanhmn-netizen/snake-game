(()=>{
"use strict";
const $=id=>document.getElementById(id);
const canvas=$("game"),ctx=canvas.getContext("2d");
const SAVE_KEY="greenSnakeQuestSave_v1";
const bosses=[
 {name:"Thorn Dragon",emoji:"🐉",desc:"A thorny guardian grows barriers around the arena.",ability:"Thorn walls appear around the edges",color:"#9a5b3d"},
 {name:"Frost Wyrm",emoji:"🐲",desc:"The Frost Wyrm chills the board and slows your turns.",ability:"Ice patches briefly slow your snake",color:"#75c9dc"},
 {name:"Sand Colossus",emoji:"🗿",desc:"A giant stone guardian fills the maze with pillars.",ability:"Extra stone pillars block the center",color:"#c69a58"},
 {name:"Phantom Serpent",emoji:"👻",desc:"A sneaky spirit shifts the maze while you hunt.",ability:"A wall pair relocates after each few apples",color:"#b19ae8"},
 {name:"Volcanic Hydra",emoji:"🐲",desc:"The Hydra leaves hot lanes across the arena.",ability:"Lava lanes become temporary hazards",color:"#ef744b"},
 {name:"Clockwork King",emoji:"🤖",desc:"A mechanical boss speeds up the challenge.",ability:"The snake accelerates as the fight goes on",color:"#d2b36c"},
 {name:"Jungle Beast",emoji:"🦍",desc:"The Beast summons vines that narrow your route.",ability:"Vine barriers grow after every 2 apples",color:"#82b65d"},
 {name:"Storm Raven",emoji:"🦅",desc:"A storm guardian sends lightning across the grid.",ability:"A warning lane flashes before lightning strikes",color:"#83a7e8"},
 {name:"Crystal Titan",emoji:"💎",desc:"The Titan guards its core behind crystal blocks.",ability:"Crystal blocks are added during the battle",color:"#79d9d0"},
 {name:"The Grand Serpent",emoji:"👑",desc:"The final guardian combines every trick. Good luck!",ability:"Shifting walls, speed surges and hazard lanes",color:"#f1c65e"}
];
const shop=[
 {id:"wide",emoji:"↔️",name:"Wide arena",desc:"+2 columns and rows for future runs",cost:18,max:4},
 {id:"slow",emoji:"⏳",name:"Chill scales",desc:"Reduce snake speed slightly",cost:12,max:3},
 {id:"shield",emoji:"🛡️",name:"One-hit shield",desc:"Survive one wall/self collision per run",cost:25,max:1},
 {id:"magnet",emoji:"🧲",name:"Apple magnet",desc:"Apples spawn a little closer to you",cost:15,max:3}
];
let save=loadSave(),level=save.level||1,wallet=save.wallet||0,best=save.best||0,upgrades=save.upgrades||{},sound=true;
let snake=[],dir={x:1,y:0},nextDir={x:1,y:0},apple=null,obstacles=[],runApples=0,levelNeed=5,gameState="ready",lastTick=0,acc=0,shieldUsed=false,bossProgress=0,bossMax=5,bossHazards=[],hazardTick=0,flash=0;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function loadSave(){try{return JSON.parse(localStorage.getItem(SAVE_KEY))||{level:1,wallet:0,best:0,upgrades:{}}}catch(e){return {level:1,wallet:0,best:0,upgrades:{}}}}
function persist(){localStorage.setItem(SAVE_KEY,JSON.stringify({level,wallet,best,upgrades}))}
function isBoss(l=level){return l%10===0}
function bossFor(l=level){return bosses[Math.floor(l/10)-1]||bosses[9]}
function cols(){return 18+(upgrades.wide||0)*2}
function rows(){return 18+(upgrades.wide||0)*2}
function cellSize(){return canvas.width/cols()}
function levelTarget(l=level){return 4+Math.floor((l-1)/4)}
function speed(){return clamp(145-(level-1)*1.1-(upgrades.slow||0)*12-(isBoss()?bossProgress*2:0),62,155)}
function setupLevel(){
 const c=cols(),r=rows(),cx=Math.floor(c/2),cy=Math.floor(r/2);
 snake=[{x:cx-2,y:cy},{x:cx-1,y:cy},{x:cx,y:cy}];dir={x:1,y:0};nextDir={x:1,y:0};
 runApples=0;levelNeed=levelTarget();bossProgress=0;bossMax=Math.max(5,Math.ceil(levelNeed*1.4));shieldUsed=false;bossHazards=[];hazardTick=0;
 obstacles=makeObstacles(level,c,r);
 apple=spawnApple();
 gameState="ready";updateUI();draw();
 showOverlay("🐍","Level "+level+": "+levelName(level),isBoss()?"Boss battle! Collect "+bossMax+" apples to defeat "+bossFor().name+".":"Eat "+levelNeed+" apples to unlock the next level.","START LEVEL");
 $("bossPanel").classList.toggle("inactive",!isBoss());
}
function levelName(l){const names=["The Meadow","Clover Fields","Woodland Trail","Mossy Crossing","Fern Maze","River Bend","Old Orchard","Deep Forest","Stone Garden","Dragon's Lair"];return l===100?"The Final Crown":names[(l-1)%10]+" "+(Math.floor((l-1)/10)+1)}
function makeObstacles(l,c,r){
 let out=[];if(l<=1)return out;
 let n=Math.min(3+Math.floor(l/3),Math.floor(c*r*.17));
 // deterministic patterns so every layout is reproducible and leaves a clear centre start
 for(let i=0;i<n;i++){
  let x,y,tries=0;
  do{x=(i*7+l*3+Math.floor(i/3)*5)%c;y=(i*11+l*5+Math.floor(i/2)*3)%r;tries++}
  while(tries<100&&(Math.abs(x-Math.floor(c/2))<3&&Math.abs(y-Math.floor(r/2))<3));
  if(!out.some(p=>p.x===x&&p.y===y))out.push({x,y,type:"wall"});
 }
 // themed boss patterns
 if(isBoss(l)){
  if(l===10||l===100){for(let x=2;x<c-2;x+=c-5){out.push({x,y:3,type:"thorn"},{x,y:r-4,type:"thorn"})}}
  if(l===20){for(let x=3;x<c-3;x+=4)out.push({x,y:Math.floor(r/2),type:"ice"})}
  if(l===30||l===90){for(let y=4;y<r-4;y+=5)out.push({x:Math.floor(c/2),y,type:"pillar"})}
  if(l===40||l===80){out.push({x:3,y:3,type:"crystal"},{x:c-4,y:r-4,type:"crystal"})}
  if(l===50||l===100){for(let x=4;x<c-4;x+=5)out.push({x,y:Math.floor(r/2)+3,type:"lava"})}
 }
 return out.filter(p=>!(p.x>=Math.floor(c/2)-2&&p.x<=Math.floor(c/2)+2&&p.y>=Math.floor(r/2)-2&&p.y<=Math.floor(r/2)+2));
}
function spawnApple(){
 let c=cols(),r=rows(),free=[];
 for(let y=0;y<r;y++)for(let x=0;x<c;x++)if(!snake.some(s=>s.x===x&&s.y===y)&&!obstacles.some(o=>o.x===x&&o.y===y)&&!bossHazards.some(o=>o.x===x&&o.y===y))free.push({x,y});
 if(!free.length)return {x:1,y:1};
 let idx=Math.floor(Math.random()*free.length),mag=upgrades.magnet||0;
 if(mag&&snake.length){let head=snake[snake.length-1];free.sort((a,b)=>dist(a,head)-dist(b,head));idx=Math.floor(Math.random()*Math.min(free.length,4+mag*3))}
 return free[idx];
}
function dist(a,b){return Math.abs(a.x-b.x)+Math.abs(a.y-b.y)}
function showOverlay(emoji,title,desc,btn){$("overlayEmoji").textContent=emoji;$("overlayTitle").textContent=title;$("overlayText").textContent=desc;$("mainBtn").textContent=btn;$("overlay").classList.remove("hidden")}
function hideOverlay(){$("overlay").classList.add("hidden")}
function start(){if(gameState==="over"||gameState==="won")setupLevel();gameState="playing";hideOverlay();lastTick=0;requestAnimationFrame(loop)}
function loop(t){if(gameState!=="playing")return;if(!lastTick)lastTick=t;acc+=Math.min(50,t-lastTick);lastTick=t;let step=speed();while(acc>=step&&gameState==="playing"){tick();acc-=step}draw();requestAnimationFrame(loop)}
function tick(){
 dir=nextDir;let head=snake[snake.length-1],n={x:head.x+dir.x,y:head.y+dir.y};
 let ate=apple&&n.x===apple.x&&n.y===apple.y;
 let body=ate?snake:snake.slice(1);
 let hitWall=n.x<0||n.y<0||n.x>=cols()||n.y>=rows();
 let hitBody=body.some(s=>s.x===n.x&&s.y===n.y);
 let hitObstacle=obstacles.some(o=>o.x===n.x&&o.y===n.y)||bossHazards.some(o=>o.x===n.x&&o.y===n.y);
 if(hitWall||hitBody||hitObstacle){
  if((upgrades.shield||0)>0&&!shieldUsed){shieldUsed=true;updateUI();showToast("🛡️ Shield saved you!");return}
  die();return;
 }
 snake.push(n);
 if(ate){
  runApples++;wallet++;best=Math.max(best,runApples,save.best||0);save.best=best;
  if(sound)beep(660,55);
  if(isBoss()){
   bossProgress++;bossHazardAction();
   if(bossProgress>=bossMax){wallet+=5;persist();updateUI();draw();levelComplete(true);return}
  }else if(runApples>=levelNeed){persist();updateUI();draw();levelComplete(false);return}
  apple=spawnApple();
  if(!apple){levelComplete(isBoss());return}
 }else snake.shift();
 if(isBoss())bossHazardAction(false);
 updateUI();
}
function bossHazardAction(onApple=true){
 hazardTick++;
 if(!onApple)return;
 // Each boss has its own escalation; dynamic hazards are kept away from snake/apple.
 let bossIndex=Math.floor(level/10)-1;
 if(bossIndex===3||bossIndex===7||bossIndex===9){
  if(bossProgress%2===0){let x=2+(bossProgress*3)%Math.max(1,cols()-4),y=2+(bossProgress*5)%Math.max(1,rows()-4);addHazard(x,y,"⚡")}
 }
 if(bossIndex===6||bossIndex===8||bossIndex===9){
  if(bossProgress%2===0){let x=2+(bossProgress*7)%Math.max(1,cols()-4),y=2+(bossProgress*3)%Math.max(1,rows()-4);addHazard(x,y,"vine")}
 }
 if(bossIndex===1&&bossProgress%2===0){ // frost patch effect is represented as temporary ice
  let x=2+(bossProgress*5)%Math.max(1,cols()-4),y=2+(bossProgress*2)%Math.max(1,rows()-4);addHazard(x,y,"ice")
 }
 if(bossIndex===4&&bossProgress%2===0){let y=2+(bossProgress*3)%Math.max(1,rows()-4);for(let x=2;x<cols()-2;x+=1)addHazard(x,y,"lava")}
}
function addHazard(x,y,type){
 let head=snake[snake.length-1];if(dist({x,y},head)<4||apple&&apple.x===x&&apple.y===y||obstacles.some(o=>o.x===x&&o.y===y)||bossHazards.some(o=>o.x===x&&o.y===y))return;
 bossHazards.push({x,y,type});if(bossHazards.length>12)bossHazards.shift();
}
function die(){gameState="over";if(sound)beep(150,180);persist();showOverlay("💥","SNAKE DOWN!","You ate "+runApples+" apples this run. Your collected apples stay in your shop wallet.","TRY AGAIN");updateUI()}
function levelComplete(boss){
 gameState="won";if(sound)beep(880,100);
 let msg=boss?"Boss defeated! Bonus: +5 apples.":"Level cleared!";showOverlay(boss?"🏆":"⭐",msg,level>=100?"You conquered all 100 levels! You are the Snake Champion.": "You collected "+runApples+" apples. Ready for the next map?","NEXT LEVEL");updateUI();
}
function nextLevel(){if(level>=100){level=1;save.level=1;persist();setupLevel();return}level++;save.level=level;persist();setupLevel()}
function changeDir(x,y){if(x===-dir.x&&y===-dir.y)return;nextDir={x,y};if(gameState==="ready")start()}
function updateUI(){
 $("best").textContent=best;$("wallet").textContent=wallet;$("shopWallet").textContent=wallet;$("levelLabel").textContent=level+" / 100";$("runApples").textContent=runApples;
 $("levelTitle").textContent=levelName(level);$("modeLabel").textContent=isBoss()?"⚔️ BOSS BATTLE":"CLASSIC RUN";
 $("progressText").textContent=isBoss()?"BOSS HEALTH":"LEVEL "+level+" PROGRESS";
 let target=isBoss()?bossMax:levelNeed,done=isBoss()?bossProgress:runApples;
 $("progressCount").textContent=done+" / "+target;$("progressFill").style.width=clamp(done/target*100,0,100)+"%";
 $("mapTag").textContent=level+" / 100";$("mapGrid").innerHTML="";
 for(let i=1;i<=100;i++){let d=document.createElement("div");d.className="map-cell"+(i<level?" done":"")+(i===level?" current":"")+(i%10===0?" boss":"");d.textContent=i%10===0?"★":i;if(i<level)d.textContent="✓";$("mapGrid").appendChild(d)}
 if(isBoss()){
  let b=bossFor();$("bossPortrait").textContent=b.emoji;$("bossName").textContent=b.name;$("bossDesc").textContent=b.desc;$("bossTag").textContent="LEVEL "+level;$("bossNote").textContent="Boss ability: "+b.ability;$("bossHealthText").textContent=Math.max(0,bossMax-bossProgress)+" apples left";$("bossHealthFill").style.width=clamp((bossMax-bossProgress)/bossMax*100,0,100)+"%";
 }else{$("bossPortrait").textContent="🐍";$("bossName").textContent="Next guardian";$("bossDesc").textContent="A boss waits every 10 levels.";$("bossTag").textContent="LEVEL "+(Math.ceil(level/10)*10);$("bossNote").textContent="Collect apples to advance.";$("bossHealthText").textContent="Boss at level "+(Math.ceil(level/10)*10);$("bossHealthFill").style.width="100%"}
 renderShop();
}
function renderShop(){
 $("shopItems").innerHTML="";
 shop.forEach(item=>{let owned=upgrades[item.id]||0,price=item.cost*(owned+1),maxed=owned>=item.max;
 let row=document.createElement("div");row.className="shop-item";
 row.innerHTML='<span class="shop-emoji">'+item.emoji+'</span><div class="shop-copy"><b>'+item.name+(owned?' ×'+owned:'')+'</b><small>'+item.desc+'</small></div>';
 let btn=document.createElement("button");btn.className="buy-btn";btn.textContent=maxed?"MAX":("🍎 "+price);btn.disabled=maxed||wallet<price;
 btn.addEventListener("click",()=>{if(wallet<price||maxed)return;wallet-=price;upgrades[item.id]=owned+1;persist();updateUI();if(item.id==="wide"&&gameState!=="playing"){setupLevel()}else draw();showToast(item.name+" upgraded!")});
 row.appendChild(btn);$("shopItems").appendChild(row);
 });
}
function draw(){
 let c=cols(),r=rows(),size=canvas.width/c;ctx.clearRect(0,0,600,600);
 // classic green checkerboard
 for(let y=0;y<r;y++)for(let x=0;x<c;x++){ctx.fillStyle=(x+y)%2===0?"#aad751":"#a2d149";ctx.fillRect(x*size,y*size,size,size)}
 // dark border
 ctx.strokeStyle="#315b31";ctx.lineWidth=5;ctx.strokeRect(2,2,596,596);
 obstacles.forEach(o=>drawBlock(o.x,o.y,o.type));
 bossHazards.forEach(o=>drawBlock(o.x,o.y,o.type));
 if(apple){let px=(apple.x+.5)*size,py=(apple.y+.5)*size;ctx.font=(size*.78)+"px Arial";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("🍎",px,py+1)}
 snake.forEach((s,i)=>{let pad=size*.07;ctx.fillStyle=i===snake.length-1?"#245f27":"#347d2c";roundRect(ctx,s.x*size+pad,s.y*size+pad,size-pad*2,size-pad*2,size*.22,true);if(i===snake.length-1){ctx.fillStyle="#f6ffe9";let ex=s.x*size+size*(dir.x===1?.69:dir.x===-1?.31:.5),ey=s.y*size+size*(dir.y===1?.69:dir.y===-1?.31:.5);ctx.beginPath();ctx.arc(ex-size*.12,ey-size*.1,size*.07,0,Math.PI*2);ctx.arc(ex+size*.12,ey-size*.1,size*.07,0,Math.PI*2);ctx.fill();ctx.fillStyle="#18331b";ctx.beginPath();ctx.arc(ex-size*.12,ey-size*.1,size*.03,0,Math.PI*2);ctx.arc(ex+size*.12,ey-size*.1,size*.03,0,Math.PI*2);ctx.fill()}});
 if(isBoss()&&gameState==="playing"){ctx.fillStyle="#10291eaa";ctx.fillRect(8,8,130,24);ctx.fillStyle="#fff";ctx.font="bold 12px Arial";ctx.textAlign="left";ctx.fillText(bossFor().emoji+" "+bossFor().name,15,25)}
}
function drawBlock(x,y,type){let s=600/cols(),px=x*s,py=y*s;let colors={wall:"#456b38",thorn:"#9b5139",ice:"#70c6d8",pillar:"#8b795b",crystal:"#83d7df",lava:"#e36c36",vine:"#3c7337","⚡":"#d6b34b"};ctx.fillStyle=colors[type]||"#456b38";ctx.fillRect(px+s*.08,py+s*.08,s*.84,s*.84);ctx.strokeStyle="#172d1b";ctx.lineWidth=2;ctx.strokeRect(px+s*.08,py+s*.08,s*.84,s*.84);ctx.font=s*.55+"px Arial";ctx.textAlign="center";ctx.textBaseline="middle";let em={thorn:"✦",ice:"❄",pillar:"▧",crystal:"◆",lava:"♨",vine:"⌁","⚡":"ϟ"};ctx.fillStyle="#ffffffaa";ctx.fillText(em[type]||"",px+s/2,py+s/2)}
function roundRect(c,x,y,w,h,r,fill){c.beginPath();c.roundRect(x,y,w,h,r);if(fill)c.fill()}
function showToast(msg){let t=$("toast");if(!t){t=document.createElement("div");t.id="toast";t.style.cssText="position:fixed;left:50%;bottom:20px;transform:translateX(-50%);background:#d5f2a5;color:#1b3824;padding:10px 16px;border-radius:30px;font-weight:bold;font-size:12px;z-index:10;box-shadow:0 5px 20px #0006";document.body.appendChild(t)}t.textContent=msg;t.style.display="block";clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>t.style.display="none",1500)}
function beep(freq,dur){try{let ac=new (window.AudioContext||window.webkitAudioContext)(),o=ac.createOscillator(),g=ac.createGain();o.frequency.value=freq;g.gain.value=.035;o.connect(g);g.connect(ac.destination);o.start();o.stop(ac.currentTime+dur/1000);o.onended=()=>ac.close()}catch(e){}}
$("mainBtn").addEventListener("click",()=>{if(gameState==="won")nextLevel();else if(gameState==="over")setupLevel(),start();else start()});
$("pauseBtn").addEventListener("click",()=>{if(gameState==="playing"){gameState="paused";showOverlay("⏸️","PAUSED","Take a breather. Your run is waiting.","RESUME")}else if(gameState==="paused"){start()}});
$("restartBtn").addEventListener("click",()=>{setupLevel()});
$("soundBtn").addEventListener("click",()=>{sound=!sound;$("soundBtn").textContent=sound?"🔊":"🔇"});
document.addEventListener("keydown",e=>{let map={ArrowUp:[0,-1],w:[0,-1],ArrowDown:[0,1],s:[0,1],ArrowLeft:[-1,0],a:[-1,0],ArrowRight:[1,0],d:[1,0]};let v=map[e.key];if(v){e.preventDefault();changeDir(v[0],v[1])}if(e.key===" "){e.preventDefault();$("pauseBtn").click()}});
document.querySelectorAll("[data-dir]").forEach(b=>b.addEventListener("click",()=>{let m={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[b.dataset.dir];changeDir(...m)}));
let touchStart=null;canvas.addEventListener("touchstart",e=>{let t=e.changedTouches[0];touchStart={x:t.clientX,y:t.clientY}},{passive:true});canvas.addEventListener("touchend",e=>{if(!touchStart)return;let t=e.changedTouches[0],dx=t.clientX-touchStart.x,dy=t.clientY-touchStart.y;if(Math.max(Math.abs(dx),Math.abs(dy))>18){if(Math.abs(dx)>Math.abs(dy))changeDir(dx>0?1:-1,0);else changeDir(0,dy>0?1:-1)}touchStart=null},{passive:true});
window.addEventListener("beforeunload",persist);
setupLevel();
})();