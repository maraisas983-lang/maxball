const test=require('node:test'),assert=require('node:assert/strict'),http=require('node:http');
const {once}=require('node:events'),{setTimeout:delay}=require('node:timers/promises'),WebSocket=require('ws');
const {createApp}=require('../server/app.cjs');
const {createLimiter,createSecurityReporter,securityFromEnv}=require('../server/lib/security.cjs');
const origin='http://security.test';
async function fixture(t,options={}){
 const logs=[],app=createApp({databasePath:':memory:',origin,logger:{warn:line=>logs.push(line),error:line=>logs.push(line)},...options}),sockets=[];
 t.after(async()=>{for(const ws of sockets)ws.terminate();await app.close();});
 app.server.listen(0,'127.0.0.1');await once(app.server,'listening');const base='http://127.0.0.1:'+app.server.address().port;
 function account(id){
  app.db.run('INSERT INTO users(id,username,password_hash,created_at,updated_at) VALUES(?,?,?,?,?)',id,id,'fixture',1,1);
  app.db.run('INSERT INTO profiles(id,user_id,display_name,shirt_name,shirt_number,created_at) VALUES(?,?,?,?,?,?)',id,id,id,id,10,1);
  app.db.run('INSERT INTO wallets VALUES(?,?,?)',id,0,1);
  return {...app.auth.session(id),user:app.auth.publicUser(app.db.one('SELECT * FROM users WHERE id=?',id))};
 }
 const headers=s=>({Origin:origin,'Content-Type':'application/json',...(s?{Cookie:'maxball_session='+s.token,'X-CSRF-Token':s.csrf}:{})});
 async function request(path,s,body,method=body===undefined?'GET':'POST',extra={}){
  const res=await fetch(base+path,{method,headers:{...headers(s),...extra},body:body===undefined?undefined:JSON.stringify(body)});
  return {status:res.status,data:await res.json(),headers:res.headers};
 }
 async function connect(s){const ws=new WebSocket(base.replace('http:','ws:')+'/ws',{origin,headers:{Cookie:'maxball_session='+s.token}});sockets.push(ws);const ready=once(ws,'message');await once(ws,'open');await ready;return ws;}
 return {app,base,logs,account,headers,request,connect,sockets};
}

test('bounded limiter expires keys without evicting live limits; security logs aggregate without payloads',()=>{
 let now=0;const limit=createLimiter({now:()=>now,capacity:2});
 limit('a',1,1000);assert.throws(()=>limit('a',1,1000),e=>e.status===429);limit('b',1,1000);
 assert.throws(()=>limit('c',1,1000),e=>e.status===503);now=10000;limit('c',1,1000);
 const logs=[],reporter=createSecurityReporter({warn:x=>logs.push(JSON.parse(x))});
 try{for(let i=0;i<1000;i++)reporter.record('RATE_LIMIT');assert.equal(logs.length,1);reporter.flush();assert.equal(logs[1].count,999);assert.deepEqual(Object.keys(logs[1]).sort(),['code','count','event','level']);}finally{reporter.close();}
 assert.throws(()=>securityFromEnv({MAX_ROOMS:'0'}));assert.equal(securityFromEnv({MAX_ROOMS:'4'}).maxRooms,4);
});

test('HTTP rechecks logout and role revocation after a streamed body, before applying a grant',async t=>{
 const {app,base,account,headers}=await fixture(t),a=account('actor'),b=account('target');
 for(const revoke of ['logout','demote']){
  app.db.run("UPDATE users SET role='ADMIN' WHERE id=?",a.user.id);const session=app.auth.session(a.user.id);
  const received=once(app.server,'request'),req=http.request(base+'/api/admin/users/'+b.user.id,{method:'POST',headers:headers(session)});
  const response=once(req,'response');req.flushHeaders();await received;
  if(revoke==='logout')app.auth.logout(session.token);else app.db.run("UPDATE users SET role='PLAYER' WHERE id=?",a.user.id);
  req.end(JSON.stringify({action:'GEMS',amount:50,reason:'Security regression fixture'}));const [res]=await response;res.resume();await once(res,'end');
  assert.equal(res.statusCode,revoke==='logout'?401:403);assert.equal(app.economy.wallet(b.user.id).balance,0);
 }
});

test('HTTP denies anonymous access, mass assignment, IDOR, injection and oversized bodies; valid purchases remain atomic',async t=>{
 const {app,account,request,base,headers}=await fixture(t),a=account('alice'),b=account('bob');
 assert.equal((await request('/api/wallet')).status,401);
 assert.equal((await request('/api/admin',a)).status,403);
 const save=app.career.create(a.user.id,{name:'Alice',shirtNumber:10,clubId:'club-0'}).career;
 assert.equal((await request('/api/career/saves/'+save.id,b,{name:'Stolen'},'PATCH')).status,404);
 assert.equal((await request('/api/shop/purchase',a,{itemId:'kit-2',requestId:'forged-001',balance:999999})).status,400);
 assert.equal((await request('/api/shop/purchase',a,{itemId:"' OR 1=1 --",requestId:'injection-001'})).status,404);
 assert.equal((await request('/api/chat',a,{message:'x'.repeat(17000)})).status,413);
 const content=await fetch(base+'/api/chat',{method:'POST',headers:{...headers(a),'Content-Type':'application/json-not-json'},body:'{}'});assert.equal(content.status,415);await content.arrayBuffer();
 assert.equal((await request('/api/chat',a,{message:'legitimate'},'POST',{'X-CSRF-Token':'invalid'})).status,403);
 app.db.run('UPDATE wallets SET balance=90 WHERE user_id=?',a.user.id);
 const buys=await Promise.all(['kit-2','kit-3'].map((itemId,i)=>request('/api/shop/purchase',a,{itemId,requestId:'concurrent-'+i})));
 assert.deepEqual(buys.map(x=>x.status).sort(),[200,409]);assert.equal(app.economy.wallet(a.user.id).balance,0);
 const paid=buys.find(x=>x.status===200).data;
 assert.equal((await request('/api/shop/purchase',a,{itemId:paid.item_id,requestId:paid.idempotency_key})).data.id,paid.id);
 assert.equal((await request('/api/inventory/equip',b,{itemId:paid.item_id})).status,403);
 for(const path of ['/.env','/var/maxball.sqlite','/.work/fortaleza-baseline.log','/server/app.cjs']){const res=await fetch(base+path);assert.equal(res.status,404);await res.arrayBuffer();}
});

test('request rate limits are per account; rejected anonymous writes do not grow the audit database',async t=>{
 const {app,account,request,logs}=await fixture(t,{security:{apiPerAccount:2}}),a=account('alice'),b=account('bob');
 assert.equal((await request('/api/wallet',a)).status,200);assert.equal((await request('/api/wallet',a)).status,200);assert.equal((await request('/api/wallet',a)).status,429);
 assert.equal((await request('/api/wallet',b)).status,200);
 for(let i=0;i<20;i++)assert.equal((await request('/api/chat',null,{message:'spam'})).status,401);
 assert.equal(app.db.one('SELECT count(*) n FROM operations_log').n,0);assert.ok(logs.length<=3);
});

test('oversized chunked HTTP bodies receive 413 without killing the response first',async t=>{
 const {base,account,headers}=await fixture(t),a=account('alice');
 const req=http.request(base+'/api/chat',{method:'POST',headers:headers(a)}),response=once(req,'response');
 req.write('{"message":"'+'x'.repeat(17000));req.end('"}');const [res]=await response;
 let body='';for await(const chunk of res)body+=chunk;assert.equal(res.statusCode,413);assert.equal(JSON.parse(body).error.code,'BODY_TOO_LARGE');
});

test('administrative revocation unequips the correct cosmetic category and leaves other equipment intact',async t=>{
 const {app,account,request}=await fixture(t),a=account('alice'),b=account('admin');app.db.run("UPDATE users SET role='ADMIN' WHERE id=?",b.user.id);
 for(const [itemId,column] of [['ball-1','ball_skin'],['celebration-1','celebration']]){
  app.db.run('INSERT INTO inventory VALUES(?,?,?)',a.user.id,itemId,Date.now());app.economy.equip(a.user.id,{itemId});app.db.run('UPDATE profiles SET effect=1 WHERE user_id=?',a.user.id);
  assert.equal((await request('/api/admin/users/'+a.user.id,b,{action:'REMOVE_ITEM',itemId,reason:'Security regression fixture'})).status,200);
  assert.equal(app.auth.profile(a.user.id)[column],0);assert.equal(app.auth.profile(a.user.id).effect,1);assert.equal(app.economy.inventory(a.user.id).some(i=>i.id===itemId),false);
 }
});

test('Supabase refresh cannot revive logout, change identity or refresh the same token concurrently',async t=>{
 let release,gate,refreshCalls=0,identity='cloud-user';
 const fetchImpl=async url=>{if(url.includes('grant_type=refresh_token')){refreshCalls++;if(gate)await gate;}return {ok:true,json:async()=>url.endsWith('/user')?{id:identity,email:'fixture@example.test'}:url.includes('/profiles')?[{display_name:'Cloud',rating:1000,wins:0,draws:0,losses:0,goals:0,assists:0}]:{access_token:'fixture-access',refresh_token:'fixture-refresh',expires_in:3600}};};
 const {app}=await fixture(t,{supabase:{url:'https://example.test',anonKey:'fixture',serviceKey:'fixture',fetchImpl}});
 const login=()=>app.auth.login({username:'fixture@example.test',password:'fixture-password'});
 let s=await login();gate=new Promise(r=>release=r);const pending=app.auth.refresh(s.token);
 await assert.rejects(app.auth.refresh(s.token),e=>e.code==='REFRESH_BUSY');assert.equal(refreshCalls,1);
 await app.auth.logout(s.token);release();await assert.rejects(pending,e=>e.status===401);assert.equal(app.db.one('SELECT count(*) n FROM sessions').n,0);
 gate=null;s=await login();identity='other-user';await assert.rejects(app.auth.refresh(s.token),e=>e.code==='IDENTITY');
 assert.equal(app.db.one('SELECT id FROM users WHERE id=?',identity),undefined);
 identity='cloud-user';const before=app.auth.authenticate(s.token).session.absolute_expires_at,next=await app.auth.refresh(s.token);
 assert.throws(()=>app.auth.authenticate(s.token));assert.equal(app.auth.authenticate(next.token).session.absolute_expires_at,before);
 assert.ok(app.auth.authenticate(next.token).session.expires_at<=Date.now()+3600000);
});

test('session count and privileged absolute lifetime are bounded',async t=>{
 const {app,account}=await fixture(t),a=account('alice'),first=a.token;
 for(let i=0;i<12;i++)app.auth.session(a.user.id);
 assert.equal(app.db.one('SELECT count(*) n FROM sessions WHERE user_id=?',a.user.id).n,10);assert.throws(()=>app.auth.authenticate(first));
 app.db.run("UPDATE users SET role='ADMIN' WHERE id=?",a.user.id);const privileged=app.auth.session(a.user.id),session=app.auth.authenticate(privileged.token).session;
 assert.ok(session.absolute_expires_at-session.created_at<=8*3600000);
});

test('global room capacity covers career and ranked creation without consuming a queued pair',async t=>{
 const {app,account}=await fixture(t,{security:{maxRooms:1}}),a=account('alice').user,b=account('bob').user,c=account('carol').user;
 const room=await app.rooms.create(a,{name:'Capacity room'});app.career.create(b.id,{name:'Bob',shirtNumber:10,clubId:'club-0'});
 assert.throws(()=>app.rooms.careerMatch(b),e=>e.code==='CAPACITY');
 app.rooms.rankedJoin(b,{n:1});app.rooms.rankedJoin(c,{n:1});app.rooms.pairRanked();assert.equal(app.rooms.rooms.size,1);assert.equal(app.rooms.ranked.queue.size,2);
 app.rooms.leave(a.id);assert.equal(app.rooms.rooms.has(room.id),false);app.rooms.pairRanked();assert.equal(app.rooms.rooms.size,1);assert.equal(app.rooms.ranked.queue.size,0);
});

test('abandoned ranked matches preserve ratings/statistics and cannot award rewards or create cloud results',async t=>{
 const {app,account}=await fixture(t),a=account('alice').user,b=account('bob').user;
 app.db.run('UPDATE profiles SET rating=1100 WHERE user_id=?',b.id);
 app.rooms.rankedJoin(a,{n:1});app.rooms.rankedJoin(b,{n:1});app.rooms.pairRanked();const room=[...app.rooms.rooms.values()][0];
 room.match.G.score=[5,0];room.match.stats[a.id].goals=5;room.match.finish('ABANDONED');app.rooms.persistResult(room);app.rooms.persistResult(room);
 for(const [u,rating] of [[a,1000],[b,1100]]){const p=app.auth.profile(u.id);assert.equal(p.rating,rating);assert.equal(p.ranked_wins+p.ranked_losses+p.ranked_draws,0);assert.equal(app.economy.wallet(u.id).balance,0);}
 assert.equal(app.db.one('SELECT count(*) n FROM cloud_outbox').n,0);assert.equal(app.db.one('SELECT count(*) n FROM ranked_progress').n,0);
 assert.equal(app.db.one('SELECT reason FROM ranked_matches').reason,'ABANDONED');
});

test('WebSocket rejects unknown/binary/oversized messages and flooding; valid ping works',async t=>{
 const {account,connect}=await fixture(t,{security:{wsMessages:3}}),a=account('alice');
 for(const [send,code] of [[ws=>ws.send(JSON.stringify({type:'goal',score:[99,0]})),1008],[ws=>ws.send(Buffer.from('{"type":"ping","sentAt":1}')),1008],[ws=>ws.send('x'.repeat(4097)),1009],[ws=>{for(let i=0;i<4;i++)ws.send('{"type":"ping","sentAt":1}');},1008]]){
  const ws=await connect(a),closed=once(ws,'close',{signal:AbortSignal.timeout(3000)});send(ws);assert.equal((await closed)[0],code);
 }
 const ws=await connect(a),pong=once(ws,'message');ws.send('{"type":"ping","sentAt":7}');assert.equal(JSON.parse((await pong)[0]).sentAt,7);
});

test('forfeits grant no profile XP or achievements, while a completed match awards XP exactly once',async t=>{
 const {app,account}=await fixture(t),a=account('alice').user,b=account('bob').user;
 app.rooms.rankedJoin(a,{n:1});app.rooms.rankedJoin(b,{n:1});app.rooms.pairRanked();const ranked=[...app.rooms.rooms.values()][0];
 ranked.match.stats[a.id].inputs=1;ranked.match.stats[b.id].inputs=1;app.rooms.leave(a.id);
 for(const user of [a,b])assert.equal(app.auth.profile(user.id).xp,0);assert.equal(app.db.one('SELECT count(*) n FROM accolades').n,0);
 app.rooms.leave(b.id);const visible=await app.rooms.create(a,{name:'Completed game',n:1});app.rooms.start(a,visible.id);const room=app.rooms.rooms.get(visible.id);
 room.match.stats[a.id].inputs=1;room.match.G.score=[1,0];room.match.finish('TIME');app.rooms.persistResult(room);app.rooms.persistResult(room);
 assert.equal(app.auth.profile(a.id).xp,60);
});

test('WebSocket membership, sequence and revoked sessions are enforced on the real transport',async t=>{
 const {app,account,connect}=await fixture(t),a=account('alice'),b=account('bob');
 const visible=await app.rooms.create(a.user,{name:'Private room',password:'room-password',n:1});
 await assert.rejects(app.rooms.join(b.user,visible.id,{password:'wrong'}),e=>e.status===403);
 await app.rooms.join(b.user,visible.id,{password:'room-password'});app.rooms.start(a.user,visible.id);
 const m=app.rooms.rooms.get(visible.id).match;m.G.phase='play';const ws=await connect(a);
 const packet={type:'input',seq:1,x:1,y:0,shoot:false,pass:false};ws.send(JSON.stringify(packet));await delay(40);assert.equal(m.inputs.get(a.user.id)?.x,1);
 const duplicate=once(ws,'close',{signal:AbortSignal.timeout(3000)});ws.send(JSON.stringify(packet));assert.equal((await duplicate)[0],1008);
 const next=await connect(a),closed=once(next,'close',{signal:AbortSignal.timeout(3000)});app.auth.logout(a.token);await closed;assert.equal(m.inputs.has(a.user.id),false);
});

test('a replaced WebSocket cannot write commands while its close handshake is pending',async t=>{
 const {app,account,connect}=await fixture(t),a=account('alice');const r=await app.rooms.create(a.user,{name:'Socket takeover',n:1});app.rooms.start(a.user,r.id);const m=app.rooms.rooms.get(r.id).match;m.G.phase='play';
 const old=await connect(a);old.pause();const current=await connect(a);
 current.send(JSON.stringify({type:'input',seq:1,x:1,y:0,shoot:false,pass:false}));await delay(40);
 old.send(JSON.stringify({type:'input',seq:2,x:-1,y:0,shoot:false,pass:false}));await delay(40);assert.equal(m.inputs.get(a.user.id)?.x,1);old.terminate();
});

test('a fresh connection receives a baseline before any delta even before its subscribe arrives',async t=>{
 const {app,base,account,sockets}=await fixture(t),a=account('alice');const visible=await app.rooms.create(a.user,{name:'Reconnect baseline',n:1});app.rooms.start(a.user,visible.id);
 const room=app.rooms.rooms.get(visible.id);room.match.G.phase='play';await delay(100);assert.equal(room.sentBaseline,true);
 const decoder=new (require('../src/online/protocol.js').Decoder)(),packets=[];
 const ws=new WebSocket(base.replace('http:','ws:')+'/ws',{origin,headers:{Cookie:'maxball_session='+a.token}});sockets.push(ws);
 ws.on('message',raw=>{const message=JSON.parse(raw);if(['snapshot','delta'].includes(message.type))packets.push({type:message.type,decoded:!!decoder.read(message)});});
 await once(ws,'open');await delay(160);assert.ok(packets.length>0);assert.equal(packets[0].type,'snapshot');assert.ok(packets.every(p=>p.decoded));
});

test('WebSocket handshake rate limit and global capacity reject upgrades before allocation',async t=>{
 const {base,account,connect}=await fixture(t,{security:{maxConnections:1,wsAccountHandshakes:1}}),a=account('alice'),b=account('bob');
 const first=await connect(a);
 async function rejected(s,expected){const ws=new WebSocket(base.replace('http:','ws:')+'/ws',{origin,headers:{Cookie:'maxball_session='+s.token}});ws.on('error',()=>{});const [req,res]=await once(ws,'unexpected-response');assert.equal(res.statusCode,expected);res.resume();req.destroy();ws.terminate();}
 await rejected(b,503);first.terminate();await once(first,'close');await delay(20);await rejected(a,429);
});
