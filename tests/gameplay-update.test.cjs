const test=require('node:test'),assert=require('node:assert/strict');
const {Match}=require('../server/online/match.cjs');
const rules=require('../src/game/rules.js');
const {resolveContacts}=require('../src/physics/contacts.js');
const {bindJoystick,bindAction}=require('../src/input/pointerControls.js');
const {Element,Target}=require('./helpers.cjs');
const {geometry}=require('../src/game/field.js');
const teams=require('../src/data/teams.js');
function practice(){const m=new Match({id:'practice',players:[{id:'human',team:0,slot:0}],cfg:{n:2}});m.G.restarting=false;m.G.kl=0;const p=m.P[0];m.P.forEach((q,i)=>{q.ctrl='remote';q.x=100+i*60;q.y=70;});p.x=450;p.y=280;m.ball.x=480;m.ball.y=280;return {m,p};}
test('contact remains gentler than a pass, and stationary overlaps add no energy',()=>{
 const speeds=[];for(const speed of [0,60,205]){const p={id:'p',team:0,x:0,y:0,vx:speed,vy:0},b={x:30,y:0,vx:0,vy:0};resolveContacts([p],b,11,1/60);speeds.push(b.vx);assert.ok(b.vx<280);}
 assert.equal(speeds[0],0);assert.ok(speeds[1]>0&&speeds[2]>speeds[1]);assert.ok(speeds[2]<=190);
});
test('manual pass follows facing and recontact cannot immediately reverse it',()=>{
 const {m,p}=practice();p.fx=0;p.fy=-1;assert.ok(m.physics.kick(p,'p'));
 assert.equal(m.ball.vx,0);assert.equal(m.ball.vy,-280);
 p.x=m.ball.x;p.y=m.ball.y-30;p.vy=205;const before=m.ball.vy;resolveContacts([p],m.ball,11,1/60);assert.equal(m.ball.vy,before);
});
test('held shoot fires once; a new action sequence survives a short released tap',()=>{
 const {m,p}=practice();m.setInput(p.id,{x:0,y:0,shoot:true,shootSeq:1});m.physics.step(1/60);assert.equal(m.stats[p.id].shots,1);
 for(let i=0;i<90;i++){m.ball.x=p.x+30;m.ball.y=p.y;m.ball.vx=m.ball.vy=0;m.physics.step(1/60);}
 assert.equal(m.stats[p.id].shots,1);
 m.setInput(p.id,{x:0,y:0,shoot:false,shootSeq:2});m.physics.step(1/60);assert.equal(m.stats[p.id].shots,2);
});
test('joystick finger and action fingers remain independent and cancel safely',()=>{
 const host=new Target(),joy=new Element(),knob=new Element(),button=new Element(),value={x:0,y:0};joy.getBoundingClientRect=()=>({left:0,top:0,width:100,height:100});
 const j=bindJoystick(joy,knob,value,host);let held=false,presses=0;const a=bindAction(button,v=>held=v,()=>presses++,host);
 joy.onpointerdown({pointerId:1,clientX:51,clientY:50});assert.equal(value.x,0);
 host.dispatch('pointermove',{pointerId:1,clientX:82,clientY:50});assert.equal(value.x,1);
 button.onpointerdown({pointerId:2});assert.equal(held,true);assert.equal(presses,1);
 joy.onpointerdown({pointerId:3,clientX:18,clientY:50});assert.equal(value.x,1);
 host.dispatch('pointerup',{pointerId:2});assert.equal(held,false);assert.equal(value.x,1);
 button.onpointerdown({pointerId:4});host.dispatch('pointercancel',{pointerId:1});assert.equal(value.x,0);assert.equal(held,true);
 button.dispatch('lostpointercapture',{pointerId:4});assert.equal(held,false);a.reset();j.reset();assert.equal(value.y,0);
});
test('offside uses the kick instant, requires involvement and awards the other team a restart',()=>{
 const m=new Match({id:'offside',cfg:{n:2,settings:{offside:true}}});m.G.restarting=false;const [a,b,c,d]=m.P;
 a.x=650;b.x=850;c.x=900;d.x=750;m.ball.x=680;m.offside.kick(a);assert.ok(m.offside.candidates.has(b.id));assert.equal(m.offside.apply(),false);
 m.offside.touch(b);assert.equal(m.offside.apply(),true);assert.equal(m.G.ko,1);assert.ok(m.G.restarting);assert.equal(m.log.at(-1).type,'OFFSIDE');assert.equal(m.ball.vx,0);
 b.x=750;m.ball.x=680;m.offside.kick(a);assert.equal(m.offside.candidates.size,0);
 b.x=850;m.ball.x=870;m.offside.kick(a);assert.equal(m.offside.candidates.size,0);
 m.ball.x=680;m.offside.kick(a);m.offside.touch(c);assert.equal(m.offside.candidates.size,0);
 m.cfg.settings.offside=false;m.offside.kick(a);assert.equal(m.offside.candidates.size,0);
});
test('rule dependencies, normal draws, overtime and sudden death follow explicit states',()=>{
 assert.throws(()=>rules.settings({penaltiesAfterExtraTime:true}));assert.throws(()=>rules.settings({offside:'yes'}));
 assert.equal(rules.nextPeriod(rules.settings(),'REGULATION',true),'FINISHED');
 assert.equal(rules.nextPeriod(rules.settings({penalties:true}),'REGULATION',true),'PENALTIES');
 const r=rules.settings({},true);assert.equal(rules.nextPeriod(r,'REGULATION',true),'EXTRA_TIME');assert.equal(rules.nextPeriod(r,'EXTRA_TIME',true),'PENALTIES');assert.equal(rules.nextPeriod(r,'EXTRA_TIME',false),'FINISHED');
 assert.equal(rules.shootoutWinner([3,0],[3,3]),0);assert.equal(rules.shootoutWinner([5,5],[5,5]),null);assert.equal(rules.shootoutWinner([6,5],[6,5]),null);assert.equal(rules.shootoutWinner([6,5],[6,6]),0);
});
test('bot penalties finish with real goals/saves across seeds and preserve the match score',()=>{
 for(const n of [1,2,4])for(const seed of [3,42,510]){const m=new Match({id:'pen-'+n+'-'+seed,cfg:{n,settings:{penalties:true}},seed});m.G.score=[2,2];m.nextPeriod();
  for(let i=0;i<36000&&m.G.phase!=='end';i++)m.update(1/60);
  assert.equal(m.G.phase,'end',JSON.stringify({n,seed,state:m.G.penalties}));assert.deepEqual(m.G.score,[2,2]);assert.equal(m.G.reason,'PENALTIES');assert.ok(m.G.penalties.taken[0]>=3);assert.ok(m.log.some(e=>e.type==='PENALTY_TAKEN'&&e.scored));
 }
});
test('human penalty shooter and keeper receive input, spectators do not',()=>{
 const m=new Match({id:'human-pen',players:[{id:'a',team:0,slot:0},{id:'b',team:1,slot:0}],cfg:{n:1,settings:{penalties:true}}});m.nextPeriod();
 const start=m.P[1].y;m.setInput('b',{x:1,y:-1});m.setInput('a',{x:0,y:0,shoot:true});m.update(1/60);
 assert.equal(m.G.penalties.kicked,true);assert.ok(m.P[1].y<start);assert.equal(m.P[1].x,m.W-24);m.setInput('spectator',{x:1,y:1});assert.equal(m.inputs.has('spectator'),false);
});
test('presentation blocks play, then advances exactly once into the authoritative kickoff',()=>{
 const m=new Match({id:'intro',players:[{id:'a',team:0,slot:0}],cfg:{presentation:true}}),initial=m.P.map(p=>[p.x,p.y]);
 m.setInput('a',{x:1,y:0,shoot:true});for(let i=0;i<120;i++)m.update(1/60);assert.equal(m.G.phase,'starting');assert.deepEqual(m.P.map(p=>[p.x,p.y]),initial);assert.equal(m.stats.a.inputs,0);
 for(let i=0;i<241;i++)m.update(1/60);assert.equal(m.G.phase,'play');assert.equal(m.G.startRemaining,0);assert.ok(m.G.restarting);
});
test('catalog includes all 21 requested Mamoball teams and contrasting alternatives',()=>{
 assert.equal(teams.teams.filter(t=>t.category==='MAMOBALL').length,21);assert.equal(teams.kits.length,22);
 const t=teams.teams.find(t=>t.name==='Palestra'),alt=teams.contrast(t,t);assert.notEqual(alt.primaryColor,t.primaryColor);assert.equal(t.primaryColor,'#158447');assert.equal(alt.alternate,true);
 assert.ok(geometry({W:1000,H:560,GY0:210,GY1:350}).areaDepth>=200);
 assert.ok(geometry({W:760,H:440,GY0:170,GY1:270}).centerRadius>80);
});
test('contact crossing the goal line scores, while contact beside the post remains bounded',()=>{
 const m=new Match({id:'goal-contact',cfg:{n:2}});m.ball.x=m.W+12;m.ball.y=m.H/2;m.ball.vx=100;m.ball.vy=0;m.ball.sweepStart={x:m.W+10,y:m.H/2};m.moveBall(1/60,t=>m.goal(t));assert.deepEqual(m.G.score,[1,0]);
 m.G.phase='play';m.ball={x:m.W+10,y:m.GY0+12,vx:0,vy:0,rot:0};m.moveBall(1/60,t=>m.goal(t));assert.ok(m.ball.x<=m.W-m.BR);assert.deepEqual(m.G.score,[1,0]);
});
test('fixed simulation gives matching player and ball positions at 20, 60 and 144 FPS',()=>{
 const {createClock}=require('../src/core/runtime.js'),results=[];
 for(const fps of [20,60,144]){const {m,p}=practice();m.ball.x=600;m.ball.vx=120;m.setInput(p.id,{x:0,y:1});const clock=createClock(dt=>m.update(dt));for(let i=0;i<fps;i++)clock.advance(1/fps);results.push([p.x,p.y,p.vy,m.ball.x,m.ball.vx]);}
 assert.deepEqual(results[0],results[1]);assert.deepEqual(results[1],results[2]);
});
