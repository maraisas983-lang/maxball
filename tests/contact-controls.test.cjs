const test=require('node:test'),assert=require('node:assert/strict');
const {scene,physics}=require('./gameplay-calibration.cjs');
const cfg=require('../src/core/config.js').physics;
const {moveBall}=require('../src/physics/ballPhysics.js');
const {resolveContacts}=require('../src/physics/contacts.js');
const rotation=require('../src/physics/ballRotation.js');
test('one press produces one shot/pass, including hold, buffered taps and fresh sequence numbers',()=>{
 for(const action of ['shoot','pass']){
  const s=scene(),p=s.P[0],input={x:0,y:0,[action]:true,[action+'Seq']:1},sim=physics(s,input);let fired=0;
  const tick=()=>{s.ball.x=p.x+cfg.playerRadius+s.BR;s.ball.y=p.y;s.ball.vx=s.ball.vy=0;sim.step(1/60);if(Math.hypot(s.ball.vx,s.ball.vy)>0)fired++;};
  for(let i=0;i<180;i++)tick();assert.equal(fired,1);
  input[action]=false;tick();input[action]=true;input[action+'Seq']=2;tick();assert.equal(fired,2);
  for(let i=0;i<60;i++)tick();assert.equal(fired,2);
  input[action]=false;input[action+'Seq']=3;tick();assert.equal(fired,3);
 }
});
test('incoming lateral momentum is retained but bounded; opposite velocity cannot reverse either action',()=>{
 for(const type of ['s','p'])for(const vx of [-440,0,440])for(const vy of [-440,0,440]){
  const s=scene();s.ball.vx=vx;s.ball.vy=vy;assert.ok(physics(s,{}).kick(s.P[0],type));
  assert.ok(s.ball.vx>0);assert.ok(Math.abs(s.ball.vy)<=s.ball.vx*.17);assert.ok(Math.hypot(s.ball.vx,s.ball.vy)<=cfg.ballMaxSpeed);
  if(vy)assert.equal(Math.sign(s.ball.vy),Math.sign(vy));
 }
});
test('pass normal ignores even an explicit AI target direction; targets require physical positioning',()=>{
 for(const type of ['s','p']){const s=scene();assert.ok(physics(s,{}).kick(s.P[0],type,{x:0,y:-200}));assert.ok(s.ball.vx>0);assert.equal(s.ball.vy,0);}
});
test('continuous slow dribbling rotates by actual travelled distance in eight directions',()=>{
 for(let i=0;i<8;i++){
  const s=scene(),p=s.P[0],a=i*Math.PI/4,x=Math.cos(a),y=Math.sin(a),r=cfg.playerRadius+s.BR;
  s.ball.x=p.x+x*r;s.ball.y=p.y+y*r;const initial={...s.ball},sim=physics(s,{x:x*.1,y:y*.1});
  for(let tick=0;tick<180;tick++){const old={...s.ball};sim.step(1/60);moveBall(s,1/60);assert.ok(Math.hypot(s.ball.vx,s.ball.vy)<=18);assert.ok(Math.abs((s.ball.rollX||0)-(old.rollX||0))<.04);assert.ok(Math.abs((s.ball.rollY||0)-(old.rollY||0))<.04);}
  assert.ok(Math.abs(s.ball.rollX-(s.ball.y-initial.y)/s.BR)<.001);assert.ok(Math.abs(s.ball.rollY+(s.ball.x-initial.x)/s.BR)<.001);
 }
});
test('idle overlap repair produces neither kinetic energy nor spin',()=>{
 const s=scene(),p=s.P[0];s.ball.x=p.x+25;resolveContacts([p],s.ball,s.BR,1/60);assert.equal(s.ball.vx,0);assert.equal(s.ball.qw,undefined);
});
test('sphere preserves orientation through direction changes and slows its rotation as the ball stops',()=>{
 const b={};rotation.roll(b,7,0,cfg.ballRadius);const q={...b};rotation.roll(b,0,-5,cfg.ballRadius);assert.ok(b.qx&&b.qy&&b.qz);assert.notDeepEqual(b,q);
 const s=scene();s.ball.vx=40;let previous=Infinity;
 for(let i=0;i<600;i++){const before=s.ball.rollY||0;moveBall(s,1/60);const angle=Math.abs((s.ball.rollY||0)-before);assert.ok(angle<=previous+1e-10);previous=angle;}
 assert.equal(previous,0);const stopped={...s.ball};moveBall(s,1/60);assert.deepEqual(s.ball,stopped);
});
test('oblique contested contacts conserve total momentum and cannot increase kinetic energy',()=>{
 for(let angle=0;angle<Math.PI*2;angle+=.2){const s=scene();s.ball.x=s.ball.y=0;s.ball.vx=40;s.ball.vy=-20;const players=[{id:'a',team:0,x:-25,y:0,vx:120,vy:0},{id:'b',team:1,x:25*Math.cos(angle),y:25*Math.sin(angle),vx:-120*Math.cos(angle),vy:-120*Math.sin(angle)}];const energy=()=>cfg.ballMass*(s.ball.vx**2+s.ball.vy**2)+cfg.playerMass*players.reduce((sum,p)=>sum+p.vx**2+p.vy**2,0),before=energy();for(let i=0;i<30;i++)resolveContacts(players,s.ball,s.BR,1/60);assert.ok(energy()<=before+1e-8);}
});
