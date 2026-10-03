const test=require('node:test'),assert=require('node:assert/strict');
const {GoalReplay}=require('../src/ui/goalReplay.js'),{Match}=require('../server/online/match.cjs'),{gameHarness,plain}=require('./helpers.cjs');
function state(x=0){return {ball:{x,y:100,vx:40,rollY:-x/11},P:[{id:'one',x:x-30,y:100,hop:0}]};}
test('replay memory is bounded, interpolates positions and leaves live bodies unchanged',()=>{
 const r=new GoalReplay();for(let i=0;i<1200;i++)r.capture(1/60,state(i));assert.ok(r.frames.length<=66);assert.ok(r.frames.at(-1).time-r.frames[0].time<=3.06);
 const live=state(1200),before=structuredClone(live);r.start(live);r.advance(1.7);const f=r.sample();assert.ok(f.ball.x<live.ball.x);f.P[0].x=-99;f.ball.x=-99;assert.deepEqual(live,before);assert.notEqual(r.clip[0].P[0].x,-99);r.advance(5);assert.equal(r.sample(),null);assert.equal(r.clip,null);
});
test('empty replay and skip are safe and a new match clears history',()=>{const r=new GoalReplay();r.start(state());r.advance(1);assert.equal(r.sample(),null);r.skip();assert.equal(r.clip,null);r.capture(.1,state());r.reset();assert.equal(r.frames.length,0);assert.equal(r.time,0);});
test('local replay draws past positions without changing score, rewards, physics or identity',()=>{
 const h=gameHarness();h.api.start('train');for(let i=0;i<120;i++)h.api.update(1/60);const s=h.api.state;s.ball.x=s.W+s.BR-1;s.ball.y=s.H/2;s.ball.vx=100;h.api.moveBall(1/30);assert.equal(s.G.phase,'goal');const before=plain(h.api.state),identities={G:s.G,P:s.P,ball:s.ball};h.api.drawWithReplay(1.7);assert.equal(h.api.replaySkip.hidden,false);assert.deepEqual(plain(h.api.state),before);assert.equal(h.api.state.G,identities.G);assert.equal(h.api.state.P,identities.P);assert.equal(h.api.state.ball,identities.ball);assert.equal(h.errors.length,0);
 h.api.replaySkip.onclick();h.api.update(1/60);assert.equal(h.api.state.G.phase,'play');assert.deepEqual(plain(h.api.state.G.score),[1,0]);assert.equal(h.api.goalReplay.clip,null);h.api.start('local');assert.equal(h.api.goalReplay.frames.length,0);
});
test('authoritative goal pause holds the clock and increments score only once before synchronized kickoff',()=>{
 const m=new Match({id:'replay',players:[{id:'human',team:0,slot:0}],cfg:{n:1,time:60}});m.G.restarting=false;m.goal(0);const time=m.G.time;for(let i=0;i<240;i++)m.update(1/60);assert.equal(m.G.phase,'goal');assert.equal(m.G.time,time);m.goal(0);assert.deepEqual(m.G.score,[1,0]);for(let i=0;i<400&&m.G.phase==='goal';i++)m.update(1/60);assert.equal(m.G.phase,'play');assert.deepEqual(m.G.score,[1,0]);assert.equal(m.G.time,time);
});
