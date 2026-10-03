const test=require('node:test'),assert=require('node:assert/strict'),{once}=require('node:events');
const {createApp}=require('../server/app.cjs');
const {Match}=require('../server/online/match.cjs');
const protocol=require('../src/online/protocol.js');
const {predict}=require('../src/online/prediction.js');
const {SnapshotBuffer}=require('../src/online/snapshotBuffer.js');
const policy=require('../src/data/legal.js');
const legal={acceptTerms:true,termsVersion:policy.termsVersion,privacyVersion:policy.privacyVersion};
test('consent, ticket ownership, staff permissions, audited commands and maintenance use HTTP',async t=>{
 const origin='http://ops.test',app=createApp({databasePath:':memory:',origin,logger:{warn(){},error:console.error}});app.server.listen(0,'127.0.0.1');await once(app.server,'listening');t.after(()=>app.close());const base='http://127.0.0.1:'+app.server.address().port;
 async function request(path,method='GET',body,session){const r=await fetch(base+'/api'+path,{method,headers:{Origin:origin,'Content-Type':'application/json',...(session?{Cookie:'maxball_session='+session.token,'X-CSRF-Token':session.csrf}:{})},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')};}
 assert.equal((await request('/auth/register','POST',{username:'test_ops',password:'password-testing-123'})).status,400);
 assert.equal((await request('/auth/login','POST',{...legal,acceptTerms:false,username:'test_ops',password:'password-testing-123'})).status,400);
 const created=await request('/auth/register','POST',{...legal,username:'test_ops',password:'password-testing-123'});assert.equal(created.status,200);const player={...created.data,token:created.cookie.match(/maxball_session=([^;]+)/)[1]};
 assert.equal(app.db.one('SELECT terms_version FROM legal_consents WHERE user_id=?',player.user.id).terms_version,policy.termsVersion);
 const staff=await app.auth.register({username:'support_ops',password:'password-testing-123'}),owner=await app.auth.register({username:'owner_ops',password:'password-testing-123'});
 app.db.run("UPDATE users SET staff_role='SUPPORT' WHERE id=?",staff.user.id);app.db.run("UPDATE users SET staff_role='OWNER' WHERE id=?",owner.user.id);
 assert.equal((await request('/command','GET',undefined,player)).status,403);assert.equal((await request('/command','GET',undefined,staff)).status,200);
 const opened=await request('/support','POST',{category:'BUG',subject:'Bola no campo',description:'A bola travou após iniciar uma partida.'},player);assert.equal(opened.status,201);const id=opened.data.id;
 assert.equal((await request('/support/'+id,'GET',undefined,staff)).status,404);
 let response=await request('/command/tickets/'+id,'PATCH',{message:'Informe o código da partida.',priority:'HIGH',assignee:staff.user.id},staff);assert.equal(response.status,200);assert.equal(response.data.status,'AWAITING_USER');
 response=await request('/support/'+id,'PATCH',{message:'O código era abc-123.'},player);assert.equal(response.data.status,'REVIEW');assert.equal(response.data.messages.length,3);
 assert.equal((await request('/command/execute','POST',{command:'/maintenance on',confirm:true},staff)).status,403);
 assert.equal((await request('/admin/users/'+player.user.id,'POST',{action:'BAN',reason:'Teste de acesso'},staff)).status,403);
 assert.equal((await request('/command/execute','POST',{command:'/maintenance on'},owner)).status,409);
 assert.equal((await request('/command/execute','POST',{command:'cmd /c whoami',confirm:true},owner)).status,400);
 assert.equal((await request('/command/execute','POST',{command:'/maintenance on',confirm:true},owner)).status,200);
 assert.equal((await request('/rooms','POST',{name:'Sala teste'},player)).status,503);
 assert.equal((await request('/command/execute','POST',{command:'/maintenance off',confirm:true},owner)).status,200);
 assert.equal((await request('/command/tickets/'+id,'PATCH',{status:'RESOLVED'},staff)).status,200);
 assert.equal((await request('/support/'+id,'PATCH',{message:'Outra resposta'},player)).status,409);
 const logs=app.db.all('SELECT * FROM operations_log');assert.ok(logs.some(l=>l.action==='SETTING_CHANGED'&&JSON.parse(l.metadata).before===false));assert.ok(logs.some(l=>l.action==='TICKET_UPDATED'));
 assert.throws(()=>app.admin.requireRole({role:'UNKNOWN'}));assert.throws(()=>app.operations.permit({role:'UNKNOWN'},'read'));
});
test('formats 1–5, career 5v5, async passwords, editable settings and atomic capacity validation',async t=>{
 const app=createApp({databasePath:':memory:',logger:{warn(){},error:console.error}});t.after(()=>app.close());const user=(await app.auth.register({username:'formats_test',password:'password-testing-123'})).user;
 for(const n of [1,2,3,4,5]){const room=await app.rooms.create(user,{name:'Formato '+n,n,password:'room-pass'});assert.equal(room.cfg.n,n);const changed=app.rooms.edit(user,room.id,{n:5,time:300,ball:2,fs:1,goalLimit:3,halftime:true});assert.equal(changed.cfg.ball,1);assert.equal(changed.cfg.fs,0);app.rooms.start(user,room.id);const m=app.rooms.rooms.get(room.id).match;assert.equal(m.P.length,10);for(let i=0;i<Math.ceil(require('../src/core/config.js').match.introSeconds*60)+60;i++)m.update(1/60);assert.ok(m.P.every(p=>p.name&&Number.isFinite(p.x)));assert.equal(new Set(m.P.filter(p=>p.team===0).map(p=>p.role)).size,5);app.rooms.leave(user.id);}
 app.career.create(user.id,{name:'Teste',shirtNumber:10,clubId:'club-0'});assert.equal(app.career.nextMatch(user.id).cfg.n,5);
 let timerRan=false;setTimeout(()=>{timerRan=true;},0);await app.rooms.create(user,{name:'Async hash',password:'room-pass'});assert.equal(timerRan,true,'room password must not block the event loop');
});
test('goal limit and halftime remain authoritative while foul penalties are disabled',()=>{
 const m=new Match({id:'limit',cfg:{goalLimit:1,halftime:true,time:60}});m.goal(0);for(let i=0;i<400&&m.G.phase==='goal';i++)m.update(1/60);assert.equal(m.G.reason,'GOAL_LIMIT');
 const half=new Match({id:'half',cfg:{n:1,halftime:true,time:60}});half.G.time=30.01;half.update(1/60);assert.equal(half.G.phase,'halftime');const frozen=half.G.time;half.update(1);assert.equal(half.G.time,frozen);for(let i=0;i<400&&half.G.phase==='halftime';i++)half.update(1/60);assert.equal(half.G.halfPlayed,true);assert.equal(half.G.phase,'play');
 const foul=new Match({id:'foul',cfg:{n:1,settings:{penaltyFouls:true}}});foul.G.restarting=false;foul.G.elapsed=10;const [a,b]=foul.P;Object.assign(a,{x:foul.W-100,y:foul.H/2,vx:0,vy:0});Object.assign(b,{x:a.x+39,y:a.y,vx:-200,vy:0});Object.assign(foul.ball,{x:a.x-30,y:a.y});foul.contact(a,b);assert.equal(foul.pendingFoul,undefined);assert.equal(foul.applyFoul(),false);assert.equal(foul.G.phase,'play');assert.equal(foul.penalties,undefined);assert.equal(foul.cfg.settings.penaltyFouls,false);
});
test('wire codec excludes AI internals, reduces bandwidth and rejects stale frames',()=>{
 const m=new Match({id:'wire',cfg:{n:5}});for(let i=0;i<240;i++)m.update(1/60);const baseline=protocol.snapshot(m,240),decoder=new protocol.Decoder();decoder.read({type:'snapshot',state:baseline});m.update(1/60);const packet=protocol.frame(protocol.snapshot(m,243)),encoded=JSON.stringify(packet),decoded=decoder.read(packet);assert.equal(decoded.state.P.length,10);assert.ok(!encoded.includes('decisionScores'));assert.ok(encoded.length<JSON.stringify(m.snapshot()).length*.5);assert.equal(decoded.state.P[0].name,m.P[0].name);assert.equal(decoder.read(packet),null);
});
test('jitter buffer stays bounded and prediction cannot move the ball or cross world bounds',()=>{
 const m=new Match({id:'jitter',cfg:{n:1}}),buffer=new SnapshotBuffer();for(let i=0;i<100;i++){const s=protocol.snapshot(m,i);s.serverTime=i*50;buffer.push(s,i*50+(i%5)*15);}assert.ok(buffer.frames.length<=20);assert.ok(buffer.delay>=70&&buffer.delay<=150);
 const state=protocol.snapshot(m,101);state.G.restarting=false;Object.assign(state.P[0],{x:100,y:100,vx:0,vy:0});state.P[1].x=600;state.P[1].y=400;const ball=JSON.stringify(state.ball),predicted=predict(state,state.P[0].id,{x:1,y:0},10);assert.ok(predicted.x>100&&predicted.x<125);assert.equal(JSON.stringify(state.ball),ball);assert.equal(state.P[0].x,100);state.G.phase='starting';assert.equal(predict(state,state.P[0].id,{x:1,y:0},1).x,100);
});
