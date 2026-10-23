(()=>{'use strict';
const W=1280,H=720,PLAYER_X=310,GRAVITY=1850,JUMP_VELOCITY=-760,RAMP_JUMP_VELOCITY=-990,FLIP_RATE=Math.PI*2*3.2,TAU=Math.PI*2;
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
ctx.imageSmoothingEnabled=true;
const assetPaths={
 bikeFrame:'assets/characters/cyclist/bike_frame.svg',wheel:'assets/characters/cyclist/wheel.svg',
 ride:'assets/characters/cyclist/rider_ride.svg',takeoff:'assets/characters/cyclist/rider_takeoff.svg',apex:'assets/characters/cyclist/rider_apex.svg',flip_return:'assets/characters/cyclist/rider_flip_return.svg',descent:'assets/characters/cyclist/rider_descent.svg',landing:'assets/characters/cyclist/rider_landing.svg',recover:'assets/characters/cyclist/rider_recover.svg',
 rock:'assets/obstacles/rock.svg',log:'assets/obstacles/log.svg',ramp:'assets/obstacles/ramp.svg',
 mountain:'assets/environments/mountain.svg',forest:'assets/environments/forest.svg',canyon:'assets/environments/canyon.svg',volcano:'assets/environments/volcano.svg'
};
const images={};
for(const [key,src] of Object.entries(assetPaths)){const img=new Image();img.onload=()=>{};img.onerror=()=>console.warn('Asset failed to load:',src);img.src=src;images[key]=img;}
const state={mode:'riding',elapsed:0,worldDistance:0,speed:420,hazardGap:310,verticalOffset:0,verticalVelocity:0,touchHeld:false,flipAngle:0,airTime:0,score:0,recoveryProgress:0,landingPoseTimer:0,nextSpawnDistance:560,obstacles:[],background:'',region:0};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rand=(min,max)=>min+Math.random()*(max-min);
// A broad downhill fall is combined with shorter rolling bumps. Terrain is sampled in WORLD space,
// so its curve scrolls beneath the rider instead of behaving like a flat floor.
function terrainY(x){return 455+125*Math.sin(x/560+.15)+26*Math.sin(x/190+.6)+10*Math.sin(x/74+.2);}
function terrainSlope(x){return (terrainY(x+3)-terrainY(x-3))/6;}
function worldAtScreen(x){return state.worldDistance+(x-PLAYER_X);}
function image(key,x,y,w,h,rotation=0,originX=.5,originY=.5){const img=images[key];if(!img||!img.complete||!img.naturalWidth)return;ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.drawImage(img,-w*originX,-h*originY,w,h);ctx.restore();}
function roundRect(x,y,w,h,r,fill,stroke=null,lineWidth=1){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lineWidth;ctx.stroke();}}
function startJump(ramp=false){state.mode='airborne';state.verticalOffset=0;state.verticalVelocity=ramp?RAMP_JUMP_VELOCITY:JUMP_VELOCITY;state.flipAngle=0;state.airTime=0;}
function crash(){state.mode='fallen';state.recoveryProgress=0;state.speed=Math.max(290,state.speed*.64);state.hazardGap-=75;state.verticalOffset=0;state.verticalVelocity=0;state.flipAngle=0;state.touchHeld=false;}
function resolveLanding(){const completed=Math.floor(state.flipAngle/TAU),rem=state.flipAngle%TAU,error=Math.min(rem,TAU-rem),attempted=state.flipAngle>.35;if(!attempted||error<=.62){state.score+=completed*100+25;state.speed=Math.min(state.speed+16+completed*20,570);state.mode='riding';state.landingPoseTimer=.22;state.flipAngle=0;}else crash();}
function reset(){state.mode='riding';state.elapsed=0;state.worldDistance=0;state.speed=420;state.hazardGap=310;state.verticalOffset=0;state.verticalVelocity=0;state.touchHeld=false;state.flipAngle=0;state.airTime=0;state.score=0;state.recoveryProgress=0;state.landingPoseTimer=0;state.nextSpawnDistance=560;state.obstacles=[];state.background='';state.region=0;}
function press(){if(state.mode==='gameover'){reset();return;}if(state.mode==='fallen'){state.recoveryProgress=Math.min(1,state.recoveryProgress+.19);return;}state.touchHeld=true;if(state.mode==='riding')startJump(false);}
function release(){state.touchHeld=false;}
canvas.addEventListener('pointerdown',e=>{e.preventDefault();canvas.setPointerCapture?.(e.pointerId);press();},{passive:false});
canvas.addEventListener('pointerup',e=>{e.preventDefault();release();},{passive:false});
canvas.addEventListener('pointercancel',release);canvas.addEventListener('lostpointercapture',release);
window.addEventListener('keydown',e=>{if(e.code==='Space'||e.code==='ArrowUp'){e.preventDefault();if(!e.repeat)press();}if(e.code==='KeyR'&&state.mode==='gameover')reset();});
window.addEventListener('keyup',e=>{if(e.code==='Space'||e.code==='ArrowUp')release();});
window.addEventListener('blur',release);
function update(dt){
 if(state.mode!=='gameover'){
  state.elapsed+=dt;
  const slope=terrainSlope(state.worldDistance);
  if(state.mode!=='fallen')state.speed=clamp(state.speed+dt*(.5+slope*8),365,560);
  const pursuitSpeed=410+state.elapsed*2.2;
  if(state.mode==='fallen'){
   state.worldDistance+=state.speed*dt*.38;state.hazardGap-=(pursuitSpeed-state.speed*.38)*dt;
   state.recoveryProgress+=dt*.075;
   if(state.recoveryProgress>=1){state.mode='riding';state.verticalOffset=0;state.verticalVelocity=0;state.flipAngle=0;state.landingPoseTimer=.22;}
  }else{
   state.worldDistance+=state.speed*dt;
   state.hazardGap+=(state.speed-pursuitSpeed)*dt;
  }
  if(state.mode==='airborne'){
   state.airTime+=dt;state.verticalVelocity+=GRAVITY*dt;state.verticalOffset+=state.verticalVelocity*dt;
   if(state.touchHeld&&state.airTime>=.14)state.flipAngle+=FLIP_RATE*dt;
   if(state.verticalOffset>=0&&state.verticalVelocity>0){state.verticalOffset=0;resolveLanding();}
  }
  spawnObstacles();checkObstacles();cleanupObstacles();
  if(state.hazardGap<=85){state.mode='gameover';state.touchHeld=false;}
 }
 state.landingPoseTimer=Math.max(0,state.landingPoseTimer-dt);
}
function spawnObstacles(){while(state.nextSpawnDistance<state.worldDistance+1800){const roll=Math.random(),kind=roll<.2?'ramp':roll<.58?'rock':'log';state.obstacles.push({worldX:state.nextSpawnDistance,kind,handled:false});state.nextSpawnDistance+=rand(430,690);}}
function checkObstacles(){for(const o of state.obstacles){if(o.handled||o.worldX>state.worldDistance+20)continue;o.handled=true;if(o.kind==='ramp'){if(state.mode==='riding')startJump(true);}else if(state.mode==='riding'||(state.mode==='airborne'&&state.verticalOffset>-42))crash();}}
function cleanupObstacles(){state.obstacles=state.obstacles.filter(o=>o.worldX>=state.worldDistance-180);}
function drawBackground(){
 const keys=['mountain','forest','canyon','volcano'];const region=Math.floor(state.worldDistance/5400)%keys.length;const key=keys[region];
 if(key!==state.background){state.background=key;state.region=region;}
 const img=images[key];if(img&&img.complete&&img.naturalWidth){ctx.drawImage(img,0,0,W,H);}
 else{ctx.fillStyle='#ffe8a5';ctx.fillRect(0,0,W,H);ctx.fillStyle='#86c8c5';ctx.beginPath();ctx.moveTo(0,450);for(let x=0;x<=W;x+=100)ctx.lineTo(x,330+Math.sin(x*.006)*95);ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.fill();}
 // A little parallax haze and drifting cloud detail gives the stationary mountain backdrop depth.
 ctx.save();ctx.globalAlpha=.22;ctx.fillStyle='#fff8e8';
 for(let i=0;i<4;i++){const x=((i*370-state.worldDistance*.045)%(W+180)+W+180)%(W+180)-70,y=85+(i%3)*46;ctx.beginPath();ctx.ellipse(x,y,42,10,0,0,Math.PI*2);ctx.ellipse(x+24,y-5,24,13,0,0,Math.PI*2);ctx.ellipse(x-22,y-3,20,9,0,0,Math.PI*2);ctx.fill();}
 ctx.restore();
}
function drawTerrain(){
 const left=worldAtScreen(0),g=ctx;
 // The mountain mass itself follows the same continuous curve as the riding surface.
 g.beginPath();g.moveTo(0,terrainY(left));for(let x=8;x<=W;x+=8)g.lineTo(x,terrainY(worldAtScreen(x)));g.lineTo(W,H);g.lineTo(0,H);g.closePath();g.fillStyle='#4e7547';g.fill();
 // Exposed soil strata echo the curved silhouette; these move with the same world-space profile.
 for(const layer of [{offset:52,color:'#6e5038',width:15},{offset:98,color:'#8a6240',width:8},{offset:150,color:'#3c5e3b',width:5}]){
  g.beginPath();g.moveTo(0,terrainY(left)+layer.offset);for(let x=8;x<=W;x+=8)g.lineTo(x,terrainY(worldAtScreen(x))+layer.offset);g.strokeStyle=layer.color;g.lineWidth=layer.width;g.lineCap='round';g.stroke();
 }
 // Sparse tufts are fixed to world positions, not screen positions.
 const first=Math.floor((state.worldDistance-PLAYER_X)/145)*145;
 for(let wx=first;wx<worldAtScreen(W)+145;wx+=145){
  const sx=PLAYER_X+wx-state.worldDistance,sy=terrainY(wx);
  const n=Math.sin(wx*12.9898)*43758.5453;const r=n-Math.floor(n);
  if(r<.56)continue;
  g.strokeStyle=r>.82?'#315b35':'#3c6c3b';g.lineWidth=3;g.lineCap='round';g.beginPath();g.moveTo(sx,sy+5);g.lineTo(sx-5,sy-7);g.moveTo(sx+2,sy+4);g.lineTo(sx+8,sy-5);g.stroke();
 }
 // Dirt track on the ridge: dark outline, warm trail and a thin sunlit center.
 g.beginPath();g.moveTo(0,terrainY(left));for(let x=8;x<=W;x+=8)g.lineTo(x,terrainY(worldAtScreen(x)));
 g.lineJoin='round';g.lineCap='round';g.strokeStyle='#3b3029';g.lineWidth=27;g.stroke();
 g.strokeStyle='#b77b43';g.lineWidth=19;g.stroke();
 g.strokeStyle='#e8b66d';g.lineWidth=4;g.stroke();
}
function drawLandslide(){
 // Keep the pursuing landslide visible at the far left even while it is still distant.
 const frontX=clamp(PLAYER_X-state.hazardGap,36,PLAYER_X-76),wx=worldAtScreen(frontX),ground=terrainY(wx);
 ctx.save();
 // Dust and broken earth swell upward from the slope behind the rider.
 ctx.beginPath();ctx.moveTo(0,terrainY(worldAtScreen(0))+14);ctx.bezierCurveTo(frontX*.25,ground-22,frontX*.58,ground-12,frontX,ground-12);ctx.lineTo(frontX, H);ctx.lineTo(0,H);ctx.closePath();ctx.fillStyle='#57483e';ctx.globalAlpha=.82;ctx.fill();
 const puffs=[
  [frontX-62,ground-50,62,45,'#776354'],[frontX-38,ground-84,56,48,'#655448'],
  [frontX-12,ground-66,55,42,'#806a56'],[frontX-2,ground-34,43,34,'#4d4239'],
  [frontX-88,ground-27,52,33,'#655344']
 ];
 for(const [x,y,rx,ry,color] of puffs){ctx.beginPath();ctx.ellipse(x,y,rx,ry,-.12,0,Math.PI*2);ctx.fillStyle=color;ctx.globalAlpha=.94;ctx.fill();}
 // Flying pebbles make the edge feel like a moving mass rather than a red UI wedge.
 for(let i=0;i<11;i++){const phase=state.elapsed*5+i*2.1;const x=frontX-18-((i*29+state.elapsed*54)%185),y=ground-22-Math.abs(Math.sin(phase))*88;ctx.beginPath();ctx.ellipse(x,y,4+(i%3)*2,3+(i%2)*2,phase*.3,0,Math.PI*2);ctx.fillStyle=i%2?'#453a32':'#9b8066';ctx.globalAlpha=.85;ctx.fill();}
 ctx.restore();
}
function drawObstacles(){for(const o of state.obstacles){const x=PLAYER_X+o.worldX-state.worldDistance;if(x<-120||x>W+120)continue;const y=terrainY(o.worldX)+5;const dims=o.kind==='ramp'?[105,56]:o.kind==='rock'?[56,42]:[72,33];image(o.kind,x,y,dims[0],dims[1],0,.5,1);}}
function drawCyclist(){
 let pose='ride',separation=0;
 const slopeAngle=Math.atan(terrainSlope(state.worldDistance));
 if(state.mode==='airborne'){
  const heightRatio=clamp(-state.verticalOffset/190,0,1);
  if(state.airTime<.18){pose='takeoff';separation=24*clamp(state.airTime/.18,0,1);}
  else if(state.airTime<.36){pose='apex';separation=28;}
  else if(state.touchHeld&&state.flipAngle>0){pose='flip_return';separation=0;}
  else if(state.verticalVelocity<0){pose='apex';separation=24+6*heightRatio;}
  else{pose='descent';separation=12+16*heightRatio;}
 }else if(state.mode==='fallen'){pose='landing';separation=30;}
 else if(state.landingPoseTimer>.12){pose='landing';separation=18*(state.landingPoseTimer/.22);}
 else if(state.landingPoseTimer>0){pose='recover';separation=6*(state.landingPoseTimer/.12);}
 const rotation=slopeAngle+(state.mode==='airborne'?state.flipAngle:state.mode==='fallen'?.25:0);
 const bikeX=PLAYER_X,bikeY=terrainY(state.worldDistance)-28+state.verticalOffset;
 const cos=Math.cos(rotation),sin=Math.sin(rotation);
 const rearX=bikeX-54*cos,rearY=bikeY-54*sin,frontX=bikeX+54*cos,frontY=bikeY+54*sin;
 image('wheel',rearX,rearY,56,56,state.elapsed*8+rotation);
 image('wheel',frontX,frontY,56,56,state.elapsed*8+rotation);
 image('bikeFrame',bikeX,bikeY,180,100,rotation,.5,.7);
 const localX=-18,localY=-34-separation,rx=bikeX+localX*cos-localY*sin,ry=bikeY+localX*sin+localY*cos;
 image(pose,rx,ry,130,150,rotation,62/130,91/150);
 // A soft contact shadow makes the gap between rider and rolling ground readable.
 if(state.mode!=='airborne'&&state.mode!=='fallen'){ctx.save();ctx.globalAlpha=.2;ctx.fillStyle='#1f3427';ctx.beginPath();ctx.ellipse(PLAYER_X,terrainY(state.worldDistance)+7,70,10,slopeAngle,0,Math.PI*2);ctx.fill();ctx.restore();}
}
function drawHud(){
 roundRect(16,14,250,106,14,'rgba(248,244,233,.93)');
 ctx.fillStyle='#10252b';ctx.textAlign='left';ctx.font='bold 23px Inter,system-ui,sans-serif';ctx.fillText('DOWNHILL  '+Math.floor(state.worldDistance/10)+' m',29,45);
 ctx.font='bold 18px Inter,system-ui,sans-serif';ctx.fillText('SCORE  '+state.score,29,75);
 ctx.font='bold 13px Inter,system-ui,sans-serif';ctx.fillStyle='#4d6c5b';ctx.fillText('SPEED',29,101);
 roundRect(87,88,158,13,6,'#d5dfcf');roundRect(87,88,158*clamp((state.speed-350)/220,0,1),13,6,'#e99a48');
 // The danger bar tightens as the landslide closes in.
 roundRect(W-242,17,224,54,12,'rgba(248,244,233,.91)');ctx.font='bold 12px Inter,system-ui,sans-serif';ctx.fillStyle='#514238';ctx.fillText('LANDSLIDE',W-226,37);
 roundRect(W-226,46,190,10,5,'#e1d5c3');roundRect(W-226,46,190*(1-clamp((state.hazardGap-85)/430,0,1)),10,5,'#b75a3c');
 ctx.textAlign='center';ctx.font='bold 15px Inter,system-ui,sans-serif';ctx.lineWidth=4;ctx.strokeStyle='#172b32';
 const hint='TAP TO JUMP  ·  HOLD IN AIR TO FLIP  ·  TAP TO RECOVER';ctx.strokeText(hint,W/2,H-22);ctx.fillStyle='#fff';ctx.fillText(hint,W/2,H-22);
 if(state.mode==='fallen'){centerLabel('TAP RAPIDLY TO GET BACK UP',27);}
 else if(state.mode==='gameover'){ctx.fillStyle='rgba(17,25,29,.72)';ctx.fillRect(0,0,W,H);centerLabel('THE LANDSLIDE CAUGHT YOU',40,-24);centerLabel('Tap to ride again',23,28);}
}
function centerLabel(text,size,dy=0){ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold '+size+'px Inter,system-ui,sans-serif';ctx.lineWidth=7;ctx.strokeStyle='#172b32';ctx.strokeText(text,W/2,H/2+dy);ctx.fillStyle='#fff';ctx.fillText(text,W/2,H/2+dy);ctx.textBaseline='alphabetic';}
let previous=0;function frame(now){if(!previous)previous=now;const dt=Math.min((now-previous)/1000,.04);previous=now;update(dt);ctx.clearRect(0,0,W,H);drawBackground();drawTerrain();drawLandslide();drawObstacles();drawCyclist();drawHud();requestAnimationFrame(frame);}
reset();requestAnimationFrame(frame);
})();