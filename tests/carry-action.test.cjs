const test=require('node:test'),assert=require('node:assert/strict');
const {scene}=require('./gameplay-calibration.cjs'),cfg=require('../src/core/config.js').physics;
const {createPhysics}=require('../src/physics/playerPhysics.js'),{moveBall}=require('../src/physics/ballPhysics.js'),{createClock}=require('../src/core/runtime.js'),{Match}=require('../server/online/match.cjs');
function setup(dir=0,speed=1){const s=scene(),x=Math.cos(dir*Math.PI/4),y=Math.sin(dir*Math.PI/4),input={x:x*speed,y:y*speed},events=[];let tick=0;
 const p=s.P[0],sim=createPhysics({state:()=>s,input:()=>input,externalAI:{update(){}},effects:{kick:(_,type)=>events.push({type,tick,vx:s.ball.vx,vy:s.ball.vy})}});
 s.ball.x=p.x+x*(cfg.playerRadius+s.BR);s.ball.y=p.y+y*(cfg.playerRadius+s.BR);
 return {s,p,input,events,sim,x,y,advance(){sim.step(1/60);moveBall(s,1/60);tick++;}};
}
test('holding pass or shot before contact survives the former 120 ms expiry and fires once in eight directions',()=>{
 for(const action of ['pass','shoot'])for(const speed of [.25,1])for(let dir=0;dir<8;dir++){
  const h=setup(dir,speed);h.s.ball.x+=h.x*60;h.s.ball.y+=h.y*60;h.input[action]=true;
  for(let i=0;i<240;i++)h.advance();assert.equal(h.events.length,1,JSON.stringify({action,speed,dir}));
  const event=h.events[0],v=Math.hypot(event.vx,event.vy);assert.equal(event.type,action==='pass'?'p':'s');assert.ok(event.tick>7);
  assert.ok((event.vx*h.x+event.vy*h.y)/v>.999);assert.ok(v<=cfg.ballMaxSpeed);
 }
});
test('tap during sustained dribbling immediately passes or shoots in all eight directions',()=>{
 for(const action of ['pass','shoot'])for(let dir=0;dir<8;dir++)for(const delay of [60,61,62,63]){
  const h=setup(dir);for(let i=0;i<delay;i++)h.advance();h.input[action]=true;h.advance();
  assert.equal(h.events.length,1,JSON.stringify({action,dir,delay}));assert.equal(h.events[0].tick,delay);
 }
});
test('a consumed held press does not kick again when the ball returns; release and repress rearms it',()=>{
 const h=setup();h.input.pass=true;h.advance();assert.equal(h.events.length,1);
 for(let i=0;i<30;i++)h.advance();h.s.ball.x=h.p.x+cfg.playerRadius+h.s.BR;h.s.ball.y=h.p.y;h.s.ball.vx=h.s.ball.vy=0;
 h.advance();assert.equal(h.events.length,1);
 h.input.pass=false;h.advance();h.input.pass=true;h.advance();assert.equal(h.events.length,2);
});
test('releasing before reaching the ball expires the command; a held command survives cooldown',()=>{
 const released=setup();released.s.ball.x+=150;released.input.shoot=true;released.advance();released.input.shoot=false;
 for(let i=0;i<180;i++)released.advance();assert.equal(released.events.length,0);
 for(const action of ['shoot','pass']){const h=setup();h.p.cd=.4;h.input[action]=true;for(let i=0;i<90;i++)h.advance();assert.equal(h.events.length,1);assert.ok(h.events[0].tick>=23);}
});
test('both prepared buttons execute one pass-shot combo when approaching the ball',()=>{
 const h=setup();h.s.ball.x+=60;h.input.pass=h.input.shoot=true;for(let i=0;i<120;i++)h.advance();assert.deepEqual(h.events.map(e=>e.type),['p','s']);
});
test('authoritative online movement preserves a prepared pass until contact',()=>{
 for(const action of ['pass','shoot']){
  const m=new Match({id:'carry-'+action,players:[{id:'human',team:0,slot:0}],cfg:{n:1}}),p=m.P[0];m.P=[p];m.G.phase='play';m.G.restarting=false;p.x=200;p.y=200;m.ball.x=p.x+cfg.playerRadius+m.BR+60;m.ball.y=p.y;
  for(let i=0;i<120;i++){m.setInput(p.id,{x:1,y:0,[action]:true,[action+'Seq']:1});m.update(1/60);}
  assert.equal(m.stats[p.id][action==='pass'?'passes':'shots'],1);assert.equal(m.ball.kickedBy,p.id);
 }
});
test('prepared approach and dribbling action produce identical results across render frame rates',()=>{
 const records=[];for(const fps of [20,30,60,120,144]){const h=setup();h.s.ball.x+=60;h.input.pass=true;const clock=createClock(()=>h.advance());for(let i=0;i<fps;i++)clock.advance(1/fps);assert.equal(h.events.length,1);records.push({p:h.p,ball:h.s.ball,events:h.events});}
 for(const record of records)assert.deepEqual(record,records[0]);
});
