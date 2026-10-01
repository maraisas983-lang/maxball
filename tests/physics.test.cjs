const test=require('node:test'),assert=require('node:assert/strict');
const {crossedGoal,moveBall}=require('../src/physics/ballPhysics.js');
const {Net}=require('../src/physics/netPhysics.js');
const {createClock,createTimers}=require('../src/core/runtime.js');
const field={W:1000,H:560,GY0:210,GY1:350,BR:11};
test('goal requires full ball crossing inside posts',()=>{
 assert.equal(crossedGoal({x:1000,y:280},{x:1012,y:280},field),0);
 assert.equal(crossedGoal({x:1000,y:280},{x:1011,y:280},field),null);
 assert.equal(crossedGoal({x:1000,y:220},{x:1020,y:220},field),null);
 assert.equal(crossedGoal({x:1020,y:200},{x:1020,y:280},field),null);
 assert.equal(crossedGoal({x:0,y:280},{x:-12,y:280},field),1);
});
test('fast ball hits post and never gains unbounded speed',()=>{
 const state={...field,G:{phase:'play'},ball:{x:960,y:210,vx:10000,vy:0,rot:0}};let goals=0;
 moveBall(state,.1,()=>goals++);assert.equal(goals,0);assert.ok(state.ball.vx<0);assert.ok(Math.hypot(state.ball.vx,state.ball.vy)<=560);
});
test('net scales impact, stays bounded and returns to rest',()=>{
 const weak=new Net(),strong=new Net();weak.impact(.5,100);strong.impact(.5,500);
 weak.update(1/60);strong.update(1/60);assert.ok(strong.sample(.5,1)>weak.sample(.5,1));
 for(let i=0;i<2400;i++)strong.update(1/120);
 assert.ok(strong.sleeping);assert.ok([...strong.u].every(x=>x===0));
});
test('fixed clock simulates equal duration at 30, 60 and 144 FPS',()=>{
 for(const fps of [30,60,144]){let ticks=0;const clock=createClock(()=>ticks++);for(let i=0;i<fps*3;i++)clock.advance(1/fps);assert.equal(ticks,180);}
});
test('match timers are cancelled on teardown',()=>{
 const pending=new Map();let next=0,called=0;
 const timers=createTimers(fn=>{pending.set(++next,fn);return next},id=>pending.delete(id));
 timers.after(()=>called++,100);timers.clear();for(const fn of pending.values())fn();assert.equal(called,0);
});
