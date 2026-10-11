const test=require('node:test'),assert=require('node:assert/strict');
const {scene}=require('./gameplay-calibration.cjs'),cfg=require('../src/core/config.js').physics;
const {createPhysics}=require('../src/physics/playerPhysics.js'),{moveBall,collideCircle}=require('../src/physics/ballPhysics.js');
const {resolveContacts}=require('../src/physics/contacts.js'),{Match}=require('../server/online/match.cjs');
const {createClock}=require('../src/core/runtime.js'),movement=require('../src/physics/movement.js');
function setup(input={x:0,y:0}){const s=scene(),events=[],sim=createPhysics({state:()=>s,input:()=>input,externalAI:{update(){}},effects:{kick:(p,type)=>events.push(type)}});return {s,input,sim,events,tick(){sim.step(1/60);moveBall(s,1/60);}};}
test('player speed is 150 in cardinal and diagonal movement; bots share the reduced ceiling',()=>{
 assert.equal(cfg.playerMaxSpeed,150);assert.ok(cfg.botMaxSpeeds.every(speed=>speed<=150));
 for(let i=0;i<8;i++){const a=i*Math.PI/4,p={x:0,y:0,vx:0,vy:0};for(let n=0;n<60;n++)movement.integrate(p,{x:Math.cos(a),y:Math.sin(a)},1/60);assert.ok(Math.abs(Math.hypot(p.vx,p.vy)-150)<.001);}
});
test('DB accepts pass then shot 1-5 ticks apart in eight directions, stationary and running',()=>{
 for(const delay of [1,2,3,4,5])for(const running of [0,1])for(let dir=0;dir<8;dir++){
  const h=setup(),p=h.s.P[0],x=Math.cos(dir*Math.PI/4),y=Math.sin(dir*Math.PI/4);
  h.s.ball.x=p.x+x*(cfg.playerRadius+h.s.BR);h.s.ball.y=p.y+y*(cfg.playerRadius+h.s.BR);
  Object.assign(h.input,{x:x*running,y:y*running,pass:true});p.vx=x*running*cfg.playerMaxSpeed;p.vy=y*running*cfg.playerMaxSpeed;
  h.tick();for(let n=1;n<delay;n++)h.tick();h.input.shoot=true;h.tick();
  assert.deepEqual(h.events,['p','s'],JSON.stringify({delay,running,dir}));
  const speed=Math.hypot(h.s.ball.vx,h.s.ball.vy);assert.ok(speed>cfg.shotImpulse&&speed<=cfg.ballMaxSpeed);assert.ok((h.s.ball.vx*x+h.s.ball.vy*y)/speed>.999);
  for(let n=0;n<60;n++)h.tick();assert.deepEqual(h.events,['p','s'],'holding buttons must not repeat the combo');
 }
});
test('same-tick inputs and coalesced network sequence counters preserve both actions in pass-shot order',()=>{
 for(const input of [{x:0,y:0,pass:true,shoot:true},{x:0,y:0,pass:false,shoot:false,passSeq:1,shootSeq:1}]){const h=setup(input);h.tick();assert.deepEqual(h.events,['p','s']);for(let n=0;n<30;n++)h.tick();assert.deepEqual(h.events,['p','s']);}
});
test('DB window is one-use, expires, and cannot extend ordinary shot range',()=>{
 const h=setup({x:0,y:0,pass:true}),p=h.s.P[0];h.tick();assert.ok(h.sim.kick(p,'s'));assert.equal(h.sim.kick(p,'s'),false);
 const expired=setup({x:0,y:0,pass:true});for(let i=0;i<8;i++)expired.tick();assert.equal(expired.sim.kick(expired.s.P[0],'s'),false);
 const normal=setup();normal.s.ball.x+=10;assert.equal(normal.sim.kick(normal.s.P[0],'s'),false);
 const far=setup({x:0,y:0,pass:true});far.tick();far.s.ball.x+=100;assert.equal(far.sim.kick(far.s.P[0],'s'),false);
 const behind=setup({x:0,y:0,pass:true});behind.tick();behind.s.ball.x=behind.s.P[0].x-28;assert.equal(behind.sim.kick(behind.s.P[0],'s'),false);
});
test('an intervening player, post or wall impact cancels the pass follow-through',()=>{
 for(const kind of ['player','post','wall']){
  const h=setup({x:0,y:0,pass:true});h.tick();const b=h.s.ball;
  if(kind==='player')resolveContacts([{id:'defender',x:b.x+28,y:b.y,vx:0,vy:0}],b,h.s.BR,1/60);
  if(kind==='post')collideCircle(b,b.x+10,b.y,14,.32);
  if(kind==='wall'){b.y=h.s.BR+.1;b.vy=-200;moveBall(h.s,1/60);}
  // Even if it remains close and points outward again, the old pass is invalid.
  b.x=h.s.P[0].x+28;b.y=h.s.P[0].y;b.vx=100;b.vy=0;
  assert.equal(h.sim.kick(h.s.P[0],'s'),false,kind);
 }
});
test('DB executes through the authoritative match input path with the same speed cap',()=>{
 const m=new Match({id:'db-network',players:[{id:'human',team:0,slot:0}],cfg:{n:1}}),p=m.P[0];m.P=[p];m.G.phase='play';m.G.restarting=false;p.x=250;p.y=200;m.ball.x=p.x+cfg.playerRadius+m.BR;m.ball.y=p.y;
 m.setInput(p.id,{x:1,y:0,pass:true,passSeq:1});m.update(1/60);m.setInput(p.id,{x:1,y:0,pass:true,passSeq:1,shoot:true,shootSeq:1});m.update(1/60);
 assert.equal(m.stats[p.id].passes,1);assert.equal(m.stats[p.id].shots,1);assert.ok(m.ball.vx>cfg.shotImpulse&&m.ball.vx<=cfg.ballMaxSpeed);
});
test('DB timing and trajectory are identical at 20, 30, 60, 120 and 144 render FPS',()=>{
 const results=[];for(const fps of [20,30,60,120,144]){const h=setup({x:1,y:0}),clock=createClock(dt=>{h.input.pass=true;h.input.shoot=tick>=3;h.sim.step(dt);moveBall(h.s,dt);tick++;});let tick=0;for(let f=0;f<fps;f++)clock.advance(1/fps);assert.deepEqual(h.events,['p','s']);results.push({ball:h.s.ball,player:h.s.P[0]});}for(const r of results)assert.deepEqual(r,results[0]);
});
