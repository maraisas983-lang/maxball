const assert=require('node:assert/strict');
const config=require('../src/core/config.js').physics;
const {createPhysics}=require('../src/physics/playerPhysics.js');
const {moveBall,rolling}=require('../src/physics/ballPhysics.js');
const {createClock}=require('../src/core/runtime.js');
function scene(){
 const p={id:'human',ctrl:'p1',team:0,x:2000,y:2000,vx:0,vy:0,fx:1,fy:0,cd:0};
 return {W:5000,H:4000,GY0:1800,GY1:2200,BR:config.ballRadius,G:{phase:'play',kl:0,cfg:{diff:1}},P:[p],ball:{x:p.x+config.playerRadius+config.ballRadius,y:p.y,vx:0,vy:0}};
}
function physics(s,input){return createPhysics({state:()=>s,input:()=>input,externalAI:{update(){}}});}
function directions(){
 const records=[];
 for(const action of ['shoot','pass'])for(const movementAngle of [-Math.PI/2,Math.PI])for(const incoming of [0,-400])for(let degrees=0;degrees<360;degrees+=5){
  const s=scene(),p=s.P[0],r=config.playerRadius+s.BR,x=Math.cos(degrees*Math.PI/180),y=Math.sin(degrees*Math.PI/180);
  const input={x:Math.cos(degrees*Math.PI/180+movementAngle),y:Math.sin(degrees*Math.PI/180+movementAngle),[action]:true};
  p.fx=-x;p.fy=-y;Object.assign(s.ball,{x:p.x+x*r,y:p.y+y*r,vx:x*incoming,vy:y*incoming});
  const sim=physics(s,input);sim.step(1/60);assert.equal(s.ball.kickedBy,p.id,`${action} at contact ${degrees}`);
  const dx=s.ball.x-p.x,dy=s.ball.y-p.y,d=Math.hypot(dx,dy),nx=dx/d,ny=dy/d,speed=Math.hypot(s.ball.vx,s.ball.vy),dot=(s.ball.vx*nx+s.ball.vy*ny)/speed;
  assert.ok(dot>.988,`contact alignment ${dot}`);assert.ok(speed<=config.ballMaxSpeed);
  records.push({action,degrees,input:{x:input.x,y:input.y},incoming,normal:{x:nx,y:ny},velocity:{x:s.ball.vx,y:s.ball.vy},speed,alignment:dot});
  moveBall(s,1/60);assert.ok(Math.hypot(s.ball.x-p.x,s.ball.y-p.y)>=r-.002);
 }
 return records;
}
function frameRates(){
 const records=[];
 for(const fps of [20,30,60,90,120,144]){
  const s=scene(),p=s.P[0],input={x:.2,y:0};let ticks=0;
  const sim=physics(s,input),clock=createClock(dt=>{ticks++;input.shoot=ticks===90;sim.step(dt);moveBall(s,dt);});
  for(let frame=0;frame<fps*4;frame++)clock.advance(1/fps);
  records.push({fps,ticks,player:{x:p.x,y:p.y,vx:p.vx,vy:p.vy},ball:{x:s.ball.x,y:s.ball.y,vx:s.ball.vx,vy:s.ball.vy}});
 }
 for(const r of records){assert.equal(r.ticks,240);assert.deepEqual(r.player,records[0].player);assert.deepEqual(r.ball,records[0].ball);}
 return records;
}
function ranges(){return [config.passMinSpeed,config.passImpulse,config.passMaxSpeed,config.shotImpulse].map(speed=>({speed,diametersPerSecond:speed/(2*config.playerRadius),distanceAfterOneSecond:rolling(speed,1).distance,stoppingDistance:rolling(speed,60).distance}));}
module.exports={scene,physics,directions,frameRates,ranges};
if(require.main===module){const fs=require('node:fs'),path=require('node:path'),file=process.argv[2]||'docs/contact-calibration-1.0.4.json';const report={calibration:'MAXBALL 1.0.4; contact normals, measured field scale, not original Mamoball parameters',config,vectors:directions(),frameRates:frameRates(),freeRoll:ranges()};fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({file,vectors:report.vectors.length,frameRates:report.frameRates.map(r=>r.fps),freeRoll:report.freeRoll}));}
