const test=require('node:test'),assert=require('node:assert/strict');
const {Match}=require('../server/online/match.cjs');
const {Tactics}=require('../src/ai/tactics.js');
const {resolveContacts}=require('../src/physics/contacts.js');
test('contested contacts are independent of array order, bounded and separate overlaps',()=>{
 for(const count of [2,3]){
  const players=Array.from({length:count},(_,i)=>{const a=i*2*Math.PI/count;return {id:String(i),team:i%2,x:Math.cos(a)*25,y:Math.sin(a)*25,vx:-Math.cos(a)*200,vy:-Math.sin(a)*200};});
  const run=reverse=>{const p=structuredClone(players),ball={x:0,y:0,vx:0,vy:0};if(reverse)p.reverse();for(let i=0;i<120;i++)resolveContacts(p,ball,11,1/60);return {p:p.sort((a,b)=>a.id.localeCompare(b.id)),ball};};
  const a=run(false),b=run(true);for(const k of ['x','y','vx','vy'])assert.ok(Math.abs(a.ball[k]-b.ball[k])<1e-6);
  assert.ok(Math.hypot(a.ball.vx,a.ball.vy)<1e-6);assert.ok(Math.hypot(a.ball.x,a.ball.y)<.01);for(const p of a.p)assert.ok(Math.hypot(p.x-a.ball.x,p.y-a.ball.y)>30.99);
 }
});
test('players cross field lines while ball stays inside sidelines',()=>{
 const m=new Match({id:'bounds',players:[{id:'human',team:0,slot:0}],cfg:{n:1}});m.G.restarting=false;
 const p=m.P[0];p.x=100;p.y=8;m.ball.x=200;m.ball.y=12;m.ball.vy=-300;
 m.setInput('human',{x:0,y:-1});for(let i=0;i<45;i++)m.update(1/60);
 assert.ok(p.y<0);assert.ok(p.y>=-50);assert.ok(m.ball.y>=m.BR);
});
test('kickoff belongs to home, then conceded side; opponents wait',()=>{
 const m=new Match({id:'ko',cfg:{n:4}});assert.equal(m.G.ko,0);const before=m.P.filter(p=>p.team===1).map(p=>[p.x,p.y]);m.update(1/60);assert.deepEqual(m.P.filter(p=>p.team===1).map(p=>[p.x,p.y]),before);
 m.goal(0);m.goal(0);assert.deepEqual(m.G.score,[1,0]);assert.equal(m.G.ko,1);for(let i=0;i<400&&m.G.phase==='goal';i++)m.update(1/60);assert.equal(m.G.phase,'play');assert.equal(m.G.restarting,true);
});
test('square roles, one chaser, human area reservation and hysteresis',()=>{
 const m=new Match({id:'ai',players:[{id:'human',team:0,slot:0}],cfg:{n:4}});m.G.restarting=false;m.P[0].x=80;m.P[0].y=m.H/2;m.ball.x=100;m.ball.y=m.H/2;
 const brain=new Tactics(()=>m,()=>.5);brain.update(.1);
 const team=m.P.filter(p=>p.team===0);assert.equal(new Set(team.map(p=>p.role)).size,4);assert.equal(team.filter(p=>p.primaryBallChaser).length,1);assert.ok(team.every(p=>p.defensiveAreaOwner==='human'));
 assert.ok(team.every(p=>p.defensiveAreaOwners.includes('human')));assert.ok(team.every(p=>p.defensiveAreaOwners.length<=2));
 const chaser=team.find(p=>p.primaryBallChaser).id;m.ball.x+=2;brain.update(.1);assert.equal(team.find(p=>p.primaryBallChaser).id,chaser);
});
test('career pass request directs an actual kick toward the human; shot request aims at goal',()=>{
 for(const type of ['PASS','SHOOT']){
  const m=new Match({id:type,players:[{id:'human',team:0,slot:0}],cfg:{n:2,career:true,diff:2}});m.G.restarting=false;m.G.elapsed=1;
  const human=m.P[0],bot=m.P[1];m.ball.x=650;m.ball.y=280;m.ball.vx=m.ball.vy=0;
  human.x=800;human.y=280;bot.x=618;bot.y=280;bot.cd=0;
  for(const p of m.P.filter(p=>p.team===1)){p.x=100;p.y=70;}
  m.setInput('human',{x:0,y:0,requestPass:type==='PASS',requestShot:type==='SHOOT'});
  m.update(1/60);assert.equal(m.stats[bot.id][type==='PASS'?'passes':'shots'],1);assert.ok(m.ball.vx>150);assert.equal(bot.currentState,type==='PASS'?'PASSING':'SHOOTING');
 }
});
test('long headless match remains finite with playable ball speed',()=>{
 const m=new Match({id:'soak',cfg:{n:4,time:180,diff:2}});
 for(let i=0;i<60*180;i++){m.update(1/60);assert.ok(Math.hypot(m.ball.vx,m.ball.vy)<=560.001);for(const p of m.P)assert.ok(Number.isFinite(p.x+p.y+p.vx+p.vy));}
 assert.ok(m.log.some(e=>e.type==='GOAL_SCORED'),'bots must create goals during a full match');
});
