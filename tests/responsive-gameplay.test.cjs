const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const {Match}=require('../server/online/match.cjs'),movement=require('../src/physics/movement.js'),interaction=require('../src/physics/interaction.js'),ballPhysics=require('../src/physics/ballPhysics.js'),{resolveContacts}=require('../src/physics/contacts.js'),{Tactics}=require('../src/ai/tactics.js'),{SnapshotBuffer}=require('../src/online/snapshotBuffer.js');
const cfg=require('../src/core/config.js');
function practice(n=1){const m=new Match({id:'responsive',players:[{id:'human',team:0,slot:0}],cfg:{n,time:600}});m.G.restarting=false;for(const p of m.P){p.ctrl='remote';p.x=100+p.team*400+p.slot*50;p.y=100;}m.ball={x:350,y:250,vx:0,vy:0,rot:0};return m;}
test('release stops real movement within one tick in every direction and after turning',()=>{
 for(let a=0;a<8;a++){const p={x:100,y:100,vx:0,vy:0,fx:1,fy:0},i={x:Math.cos(a*Math.PI/4),y:Math.sin(a*Math.PI/4)};for(let n=0;n<30;n++)movement.integrate(p,i,1/60);assert.ok(Math.hypot(p.vx,p.vy)<=180.001);movement.integrate(p,{x:-i.x,y:-i.y},1/60);const {x,y}=p;movement.integrate(p,{x:0,y:0},1/60);assert.deepEqual([p.x,p.y,p.vx,p.vy],[x,y,0,0]);}
});
test('online authoritative release has zero velocity; stopping near ball adds no force',()=>{
 const m=practice(),p=m.P[0];m.setInput(p.id,{x:1,y:0});for(let i=0;i<20;i++)m.update(1/60);m.setInput(p.id,{x:0,y:0});const x=p.x;m.update(1/60);assert.deepEqual([p.x,p.vx,p.vy],[x,0,0]);m.ball.x=p.x+30;m.ball.y=p.y;m.ball.vx=m.ball.vy=0;m.update(1/60);assert.equal(Math.hypot(m.ball.vx,m.ball.vy),0);
});
test('interaction ring and kick detection agree at the exact boundary on all fields',()=>{
 let previous=0;for(let n=1;n<=5;n++){const m=practice(n),p=m.P[0],r=interaction.radius(m);assert.ok(r===cfg.physics.playerRadius+m.BR+cfg.physics.kickReach);assert.ok(r>=previous);previous=r;m.ball.x=p.x+r-.000001;m.ball.y=p.y;assert.ok(interaction.contains(p,m.ball,m));assert.ok(m.physics.kick(p,'s'));p.cd=0;m.G.kl=0;m.ball.x=p.x+r+.01;assert.equal(interaction.contains(p,m.ball,m),false);assert.equal(m.physics.kick(p,'s'),false);}
});
test('fast ball cannot cross a stationary player between physics ticks',()=>{
 const m=practice(),p=m.P[0];m.P=[p];p.x=400;p.y=250;m.ball.x=362;m.ball.vx=560;for(let i=0;i<30;i++){m.update(1/60);assert.ok(m.ball.x<=p.x-cfg.physics.playerRadius-m.BR+.01);assert.ok(Math.hypot(m.ball.vx,m.ball.vy)<=560.001);}assert.ok(m.ball.vx<=0.5);
});
test('player and ball squeezed against each side wall separate without jitter or energy',()=>{
 for(const side of ['top','bottom','left','right']){const field={W:1000,H:560,GY0:210,GY1:350},p={id:1,team:0,x:100,y:100,vx:0,vy:0},b={x:100,y:100,vx:0,vy:0};if(side==='top'){b.y=11;p.y=35;}if(side==='bottom'){b.y=549;p.y=525;}if(side==='left'){b.x=11;p.x=35;}if(side==='right'){b.x=989;p.x=965;}for(let i=0;i<120;i++)resolveContacts([p],b,11,1/60,()=>{},field);assert.ok(Math.hypot(b.x-p.x,b.y-p.y)>30.99);assert.equal(Math.hypot(b.vx,b.vy),0);assert.ok(b.x>=11&&b.x<=989&&b.y>=11&&b.y<=549);}
});
test('wall bounce loses energy, friction stops the ball, and roll follows travel direction',()=>{
 const m=practice();m.P=[];m.ball.x=350;m.ball.y=12;m.ball.vx=0;m.ball.vy=-340;ballPhysics.moveBall(m,1/60);assert.ok(m.ball.vy>0&&m.ball.vy<340);assert.ok(m.ball.rollX);const horizontal=practice();horizontal.P=[];horizontal.ball.vx=340;ballPhysics.moveBall(horizontal,1/60);assert.equal(horizontal.ball.rollX,0);assert.ok(horizontal.ball.rollY<0);for(let i=0;i<1800;i++)ballPhysics.moveBall(horizontal,1/60);assert.deepEqual([horizontal.ball.vx,horizontal.ball.vy],[0,0]);
});
test('trajectory forecast reflects a side wall and remains inside the playable field',()=>{
 const m=practice();m.ball.x=350;m.ball.y=14;m.ball.vy=-300;const expected=ballPhysics.predictTrajectory(m,.25);assert.ok(expected.vy>0);assert.ok(expected.y>=11&&expected.y<m.H-11);const source=structuredClone(m.ball);assert.deepEqual(m.ball,source);
});
test('bots use bounded interception near walls, one chaser and distinct formation lanes',()=>{
 for(const x of [90,800,1450]){const m=new Match({id:'tactics',cfg:{n:4,diff:2}});m.G.restarting=false;m.ball.x=x;m.ball.y=14;m.ball.vy=-300;const brain=new Tactics(()=>m,()=>.5);brain.update(1/60);for(const team of [0,1]){const players=m.P.filter(p=>p.team===team);assert.equal(players.filter(p=>p.primaryBallChaser).length,1);assert.ok(new Set(players.map(p=>Math.round(p.targetPosition.y))).size>1);for(const p of players){assert.ok(p.targetPosition.x>=-40&&p.targetPosition.x<=m.W+40);assert.ok(p.targetPosition.y>=-40&&p.targetPosition.y<=m.H+40);assert.ok(Object.values(p.decisionScores).every(Number.isFinite));}}}
});
test('real roster attributes cannot produce invalid decisions and a clear shot is taken',()=>{
 const m=new Match({id:'real-shot',cfg:{n:2,diff:2}});m.G.restarting=false;const p=m.P[0];p.x=m.W-232;p.y=m.H/2;m.ball.x=p.x+cfg.physics.playerRadius+m.BR+.5;m.ball.y=p.y;p.attributes={speed:70,shooting:70,passing:70};for(const q of m.P.slice(1)){q.x=80;q.y=60;}m.update(1/60);assert.equal(m.stats[p.id].shots,1);assert.ok(Object.values(p.decisionScores).every(Number.isFinite));
});
test('AI decisions stay throttled instead of recalculating every physics frame',()=>{
 const m=practice(),brain=new Tactics(()=>m);let decisions=0;brain.decide=()=>decisions++;for(let i=0;i<60;i++)brain.update(1/60);assert.ok(decisions>=7&&decisions<=9);
});
test('interpolation ignores old packets, unwraps rolling values and bounds missing frames',()=>{
 const m=practice(),state=m.snapshot();state.ball.rollY=0;state.tick=1;state.serverTime=1000;const buffer=new SnapshotBuffer(70);buffer.push(state,1000);const second=structuredClone(state);second.tick=2;second.serverTime=1050;second.ball.x+=10;second.ball.vx=200;second.ball.rollY=-1;buffer.push(second,1050);buffer.push(state,1060);assert.equal(buffer.frames.length,2);const mid=buffer.sample(1095);assert.equal(mid.ball.x,state.ball.x+5);assert.equal(mid.ball.rollY,-.5);const late=buffer.sample(1400);assert.ok(late.ball.x>=second.ball.x&&late.ball.x<=second.ball.x+11);assert.deepEqual(second.ball.x,state.ball.x+10);
});
test('online release freezes the predicted position only until the server acknowledges stop',()=>{
 const context={MaxballProtocol:require('../src/online/protocol.js'),MaxballPrediction:require('../src/online/prediction.js'),performance:{now:()=>now}};let now=1000,input={x:1,y:0};vm.runInNewContext(fs.readFileSync('src/online/connection.js','utf8'),context);const connection=new context.MaxballOnline.Connection({input:()=>input,onMessage(){},onStatus(){}}),m=practice();connection.decoder.state=m.snapshot();connection.lastFrameAt=950;connection.sequence=10;const moved=connection.predict('human');input={x:0,y:0};const stop=connection.predict('human');assert.deepEqual([stop.x,stop.y,stop.vx,stop.vy],[moved.x,moved.y,0,0]);connection.decoder.state.acks={human:11};const confirmed=connection.predict('human');assert.equal(confirmed.x,m.P[0].x);assert.ok(connection.commands.length<=256);
});
test('career settings persist per save, validate values and reach the match configuration',async t=>{
 const {createApp}=require('../server/app.cjs'),app=createApp({databasePath:':memory:',logger:{warn(){},error:console.error}});t.after(()=>app.close());const user=(await app.auth.register({username:'settings_user',password:'long-password-123'})).user;
 const first=app.career.create(user.id,{name:'Primeiro',shirtNumber:7,clubId:'br-0'}).career;app.career.settings(user.id,{time:300,diff:2});assert.equal(app.career.nextMatch(user.id).cfg.time,300);assert.equal(app.career.nextMatch(user.id).cfg.diff,2);app.career.create(user.id,{name:'Segundo',shirtNumber:8,clubId:'br-1'});assert.equal(app.career.nextMatch(user.id).cfg.time,120);assert.equal(app.career.nextMatch(user.id).cfg.diff,1);app.career.selectSave(user.id,first.id);assert.equal(app.career.view(user.id).career.config.time,300);assert.throws(()=>app.career.settings(user.id,{time:73,diff:1}));assert.throws(()=>app.career.settings(user.id,{time:120,diff:3}));
 app.server.listen(0,'127.0.0.1');await require('node:events').once(app.server,'listening');const session=app.auth.session(user.id),res=await fetch('http://127.0.0.1:'+app.server.address().port+'/api/career/settings',{method:'PATCH',headers:{Origin:'http://127.0.0.1:5173','Content-Type':'application/json',Cookie:'maxball_session='+session.token,'X-CSRF-Token':session.csrf},body:JSON.stringify({time:180,diff:0})});assert.equal(res.status,200);assert.equal((await res.json()).career.config.time,180);
});

test('direct network frames match the existing codec without serializing a full roster twice',()=>{const protocol=require('../src/online/protocol.js'),m=practice(5);m.update(1/60);const a=protocol.frame(protocol.snapshot(m,3)),b=protocol.frameFromMatch(m,3);delete a.serverTime;delete b.serverTime;assert.deepEqual(a,b);});

test('an incoming ball transfers momentum to a stationary player on first contact',()=>{const p={id:'p',team:0,x:100,y:100,vx:0,vy:0},b={x:70,y:100,vx:340,vy:0};resolveContacts([p],b,11,1/60);assert.ok(b.vx<p.vx);assert.ok(p.vx>0);assert.equal(p.vy,0);assert.ok(Math.abs(cfg.physics.ballMass*b.vx+cfg.physics.playerMass*p.vx-cfg.physics.ballMass*340)<1e-8);assert.ok(Math.hypot(p.x-b.x,p.y-b.y)>=30.999);});

test('bots can circle outside the pitch lines and release a ball pinned in a corner',()=>{const m=new Match({id:'corner',cfg:{n:4,time:180,diff:2}});m.G.restarting=false;m.ball.x=11;m.ball.y=m.H-11;m.ball.vx=m.ball.vy=0;const a=m.P[3],b=m.P[4];a.x=12;a.y=m.H-42;b.x=51;b.y=m.H-31;for(const p of m.P)if(p!==a&&p!==b){p.x=m.W/2+(p.team?100:-100);p.y=m.H/2;}for(let i=0;i<600;i++)m.update(1/60);assert.ok(Math.hypot(m.ball.x-11,m.ball.y-(m.H-11))>80);assert.ok(m.P.some(p=>p.id===m.ball.lastPlayer));assert.ok(Math.hypot(m.ball.vx,m.ball.vy)<=cfg.physics.ballMaxSpeed);});
