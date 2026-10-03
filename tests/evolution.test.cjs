const test=require('node:test'),assert=require('node:assert/strict');
const {Match}=require('../server/online/match.cjs');
const fields=require('../src/game/fieldConfig.js'),{inArea,limitDefense,geometry}=require('../src/game/field.js');
const {resolve}=require('../src/physics/goalColliders.js');
test('formats change actual physics dimensions; four-a-side has a larger defensive area',()=>{
 let prior=0;for(let n=1;n<=4;n++){const m=new Match({id:'field-'+n,cfg:{n}});assert.equal(m.W,fields.formats[n].width);assert.ok(m.W>prior);prior=m.W;}
 assert.ok(geometry(new Match({id:'four',cfg:{n:4}})).areaDepth>geometry(new Match({id:'three',cfg:{n:3}})).areaDepth);
});
test('defensive area admits two, blocks a third, then frees the vacancy; opponents unaffected',()=>{
 const m=new Match({id:'area',cfg:{n:4}});m.P.forEach(p=>{p.x=m.W/2;p.y=m.H/2;});const [a,b,c]=m.P;
 limitDefense(m);assert.deepEqual(m.G.areaOccupancy,[0,0]);
 a.x=100;limitDefense(m);assert.equal(m.G.areaOccupancy[0],1);
 b.x=150;limitDefense(m);assert.equal(m.G.areaOccupancy[0],2);
 const old=new Map(m.P.map(p=>[p.id,{x:p.x,y:p.y}]));c.x=170;limitDefense(m,old);assert.equal(inArea(c,0,m),false);
 a.x=m.W/2;c.x=170;limitDefense(m);assert.equal(inArea(c,0,m),true);assert.equal(m.G.areaOccupancy[0],2);
 const enemy=m.P.find(p=>p.team===1);enemy.x=100;limitDefense(m);assert.equal(enemy.x,100);
 const state=require('../src/online/protocol.js').snapshot(m);assert.deepEqual(state.G.areaOccupancy,[2,0]);
});
test('posts and goal net stop swept player movement while pitch lines remain passable',()=>{
 const s={W:1000,GY0:210,GY1:350};
 for(const [previous,target] of [[{x:80,y:210},{x:-80,y:210}],[{x:-23,y:150},{x:-23,y:300}],[{x:-90,y:280},{x:30,y:280}]]){
  const p={...target,vx:1000,vy:1000};resolve(p,previous,s);assert.ok(Math.hypot(p.x-target.x,p.y-target.y)>10);
 }
 const p={x:500,y:-30,vx:0,vy:-100};resolve(p,{x:500,y:30},s);assert.equal(p.y,-30);
});
test('foul contact never starts penalties; tied regulation progresses once to extra time and shootout',()=>{
 const m=new Match({id:'periods',cfg:{n:2,gold:1,settings:{penaltyFouls:true}}});assert.equal(m.cfg.settings.penaltyFouls,false);
 m.pendingFoul={team:0};assert.equal(m.applyFoul(),false);assert.equal(m.G.phase,'play');
 m.G.time=0;m.update(1/60);assert.equal(m.G.period,'EXTRA_TIME');m.G.time=0;m.update(1/60);assert.equal(m.G.period,'PENALTIES');
 m.update(1/60);assert.equal(m.log.filter(e=>e.type==='PENALTY_SHOOTOUT').length,1);
});
test('MVP is the highest modular grade, defense can win without goals, and ties are deterministic',()=>{
 const perf=require('../src/game/performance.js'),players=[{id:'b',team:0,name:'Scorer'},{id:'a',team:1,name:'Defender'}],stats={b:{...perf.empty(),goals:2},a:{...perf.empty(),saves:6,interceptions:5,recoveries:5}};
 const result=perf.finalize(players,stats,null);assert.equal(result.mvp.id,'a');assert.equal(result.mvp.goals,0);assert.equal(stats.a.grade,result.mvp.grade);
 const tied={b:perf.empty(),a:perf.empty()};assert.equal(perf.finalize(players,tied,null).mvp.id,'a');
 const m=new Match({id:'graded',cfg:{n:2}});m.finish();assert.ok(m.P.every(p=>Number.isFinite(m.stats[p.id].grade)));assert.equal(m.performance.mvp.grade,Math.max(...m.performance.players.map(p=>p.grade)));
});
