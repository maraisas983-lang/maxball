const test=require('node:test'),assert=require('node:assert/strict');
const {once}=require('node:events');
const WebSocket=require('ws');
const {createApp}=require('../server/app.cjs');
const {roundRobin,performance}=require('../server/services/career.cjs');
const {Match}=require('../server/online/match.cjs');
const {openDatabase}=require('../server/database/index.cjs');
const quiet={warn(){},error(error){console.error(error)}};
test('server accounts, economy, career, RBAC and authoritative networking',async t=>{
 const origin='http://maxball.test',app=createApp({databasePath:':memory:',origin,logger:quiet});
 app.server.listen(0,'127.0.0.1');await once(app.server,'listening');
 const url='http://127.0.0.1:'+app.server.address().port;
 t.after(()=>app.close());
 async function request(route,{method='GET',body,session,csrf=true,requestOrigin=origin}={}){
  if(/^\/api\/auth\/(register|login)$/.test(route)&&body)body={...body,acceptTerms:true,termsVersion:'2026-10-02',privacyVersion:'2026-10-02'};
  const headers={Origin:requestOrigin};if(body!==undefined)headers['Content-Type']='application/json';
  if(session){headers.Cookie=session.cookie;if(csrf)headers['X-CSRF-Token']=session.csrf;}
  const response=await fetch(url+route,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
  return {status:response.status,body:await response.json(),cookie:response.headers.get('set-cookie')};
 }
 async function register(username){const r=await request('/api/auth/register',{method:'POST',body:{username,password:'a-long-password-123'}});assert.equal(r.status,200,JSON.stringify(r.body));return {cookie:r.cookie.split(';')[0],csrf:r.body.csrf,user:r.body.user};}
 const a=await register('player_a'),b=await register('player_b');
 await t.test('credentials and sessions',async()=>{
  const me=await request('/api/auth/me',{session:a});assert.equal(me.status,200);assert.equal(me.body.wallet.balance,0);assert.equal(me.body.user.password_hash,undefined);assert.equal(me.body.user.role,'PLAYER');
  const stored=app.db.one('SELECT password_hash FROM users WHERE id=?',a.user.id);assert.match(stored.password_hash,/^scrypt\$/);assert.ok(!stored.password_hash.includes('a-long-password'));
  assert.equal((await request('/api/auth/login',{method:'POST',body:{username:'player_a',password:'wrong'}})).status,401);
  assert.equal((await request('/api/wallet')).status,401);
  assert.equal((await request('/api/shop/purchase',{method:'POST',session:a,csrf:false,body:{itemId:'kit-2',requestId:'missing-csrf'}})).status,403);
  assert.equal((await request('/api/auth/login',{method:'POST',requestOrigin:'https://bad.test',body:{username:'player_a',password:'a-long-password-123'}})).status,403);
 });
 await t.test('atomic purchase, idempotency, ownership and exact balance',async()=>{
  app.db.run('UPDATE wallets SET balance=90 WHERE user_id=?',a.user.id);
  const buy=()=>request('/api/shop/purchase',{method:'POST',session:a,body:{itemId:'kit-2',requestId:'purchase-001'}});
  const results=await Promise.all([buy(),buy()]);assert.deepEqual(results.map(r=>r.status),[200,200]);assert.equal(results[0].body.id,results[1].body.id);
  assert.equal(app.economy.wallet(a.user.id).balance,0);assert.equal(app.db.one('SELECT count(*) n FROM purchases WHERE user_id=?',a.user.id).n,1);
  assert.equal((await request('/api/shop/purchase',{method:'POST',session:a,body:{itemId:'kit-3',requestId:'purchase-002'}})).status,409);
  assert.equal((await request('/api/shop/purchase',{method:'POST',session:a,body:{itemId:'missing',requestId:'purchase-003'}})).status,404);
  assert.equal((await request('/api/inventory/equip',{method:'POST',session:a,body:{itemId:'kit-2'}})).status,200);
  assert.equal((await request('/api/inventory/equip',{method:'POST',session:b,body:{itemId:'kit-2'}})).status,403);
  assert.equal((await request('/api/shop/purchase',{method:'POST',session:a,body:{itemId:'kit-2',requestId:'purchase-004',balance:999999}})).status,400);
 });
 await t.test('career profile validates, fixtures persist and accept only server results',async()=>{
  assert.equal((await request('/api/career',{method:'POST',session:a,body:{name:'POGGI',shirtNumber:100,clubId:'club-0'}})).status,400);
  assert.equal((await request('/api/career',{method:'POST',session:a,body:{name:'POGGI',shirtNumber:10,clubId:'club-0'}})).status,201);
  assert.equal((await request('/api/matches',{method:'POST',session:a,body:{score:[99,0]}})).status,404);
  const c=app.career.view(a.user.id);assert.equal(c.current.schedule.length,10);assert.equal(c.career.season,1);
  assert.equal((await request('/api/career/season',{method:'POST',session:a,body:{}})).status,409);
 });
 await t.test('two authenticated sockets receive one authoritative match',async()=>{
  const created=await request('/api/rooms',{method:'POST',session:a,body:{name:'Teste online',n:1,time:60}});assert.equal(created.status,201);
  const roomId=created.body.id;assert.equal((await request('/api/rooms/'+roomId+'/join',{method:'POST',session:b,body:{}})).status,200);
  const connect=session=>new WebSocket(url.replace('http:','ws:')+'/ws',{origin,headers:{Cookie:session.cookie}});
  const wa=connect(a),wb=connect(b);t.after(()=>{wa.terminate();wb.terminate();});
  const messagesA=[],messagesB=[];wa.on('message',m=>messagesA.push(JSON.parse(m)));wb.on('message',m=>messagesB.push(JSON.parse(m)));
  await Promise.all([once(wa,'open'),once(wb,'open')]);
  assert.equal((await request('/api/rooms/'+roomId+'/start',{method:'POST',session:b,body:{}})).status,403);
  assert.equal((await request('/api/rooms/'+roomId+'/start',{method:'POST',session:a,body:{}})).status,200);
  wa.send(JSON.stringify({type:'input',seq:1,x:1,y:0,shoot:false,pass:false}));
  await new Promise(resolve=>{const timer=setTimeout(resolve,250);timer.unref?.();});
  assert.ok(messagesA.some(m=>m.type==='snapshot'));assert.ok(messagesB.some(m=>m.type==='snapshot'));
  const room=app.rooms.rooms.get(roomId);assert.equal(room.match.G.phase,'starting');for(let i=0;i<Math.ceil(require('../src/core/config.js').match.introSeconds*60)+2;i++)room.match.update(1/60);room.match.setInput(a.user.id,{x:1,y:0});assert.equal(room.match.P.find(p=>p.id===a.user.id).ctrl,'remote');
  room.match.G.score=[1,0];room.match.finish();app.rooms.persistResult(room);app.rooms.persistResult(room);
  assert.equal(app.db.one("SELECT count(*) n FROM gem_transactions WHERE user_id=? AND source=?",a.user.id,room.match.id).n,0);
  assert.equal((await request('/api/matches',{session:a})).body[0].status,'COMPLETED');
  wb.send(JSON.stringify({type:'input',seq:2,x:999,y:0,shoot:false,pass:false}));await once(wb,'close');
  await request('/api/rooms/leave',{method:'POST',session:a,body:{}});await request('/api/rooms/leave',{method:'POST',session:b,body:{}});
 });
 await t.test('RBAC, audited grants, ban enforcement and expired sessions',async()=>{
  assert.equal((await request('/api/admin',{session:a})).status,403);
  app.db.run("UPDATE users SET role='ADMIN' WHERE id=?",b.user.id);
  assert.equal((await request('/api/admin/users/'+a.user.id,{method:'POST',session:b,body:{action:'GEMS',amount:40,reason:'Teste de concessão'}})).status,200);
  assert.equal(app.db.one('SELECT count(*) n FROM admin_audit WHERE target_user_id=?',a.user.id).n,1);
  assert.equal((await request('/api/admin/users/'+b.user.id,{method:'POST',session:b,body:{action:'ROLE',role:'SUPER_ADMIN',reason:'Auto promoção'}})).status,403);
  assert.equal((await request('/api/admin/users/'+a.user.id,{method:'POST',session:b,body:{action:'BAN',reason:'Teste de banimento'}})).status,200);
  assert.equal((await request('/api/auth/login',{method:'POST',body:{username:'player_a',password:'a-long-password-123'}})).status,403);
  app.db.run('UPDATE sessions SET expires_at=0 WHERE user_id=?',b.user.id);assert.equal((await request('/api/auth/me',{session:b})).status,401);
 });
});
test('season competition lifecycle, history, transfers and award thresholds',()=>{
 const db=openDatabase(':memory:');const {createEconomy}=require('../server/services/economy.cjs'),{createCareer}=require('../server/services/career.cjs');
 const economy=createEconomy(db),career=createCareer(db,economy),uid='fixture-user',now=Date.now();
 db.run('INSERT INTO users(id,username,password_hash,created_at,updated_at) VALUES(?,?,?,?,?)',uid,'fixture','unused',now,now);
 db.run('INSERT INTO profiles(id,user_id,display_name,shirt_name,shirt_number,created_at) VALUES(?,?,?,?,?,?)','profile',uid,'POGGI','POGGI',10,now);
 career.create(uid,{name:'POGGI',shirtNumber:10,clubId:'club-0'});
 let count=0;
 while(career.view(uid).current.status==='ACTIVE'){
  const next=career.nextMatch(uid);db.transaction(()=>career.complete({id:'test-'+count,career_id:next.career.id,season:1,fixture:next.index,score:[3,0],stats:{[uid]:{goals:2,assists:1,passes:12}},duration:120}));
  if(++count>20)throw Error('Season did not finish');
 }
 let view=career.view(uid);assert.equal(view.current.status,'COMPLETED');assert.equal(view.career.stats.matches,count);assert.ok(view.trophies.some(x=>x.code==='LEAGUE'));assert.ok(view.trophies.some(x=>x.code==='WORLD'));assert.ok(!view.trophies.some(x=>x.code==='BALLON_DOR'));
 const offer=view.offers.find(o=>o.status==='PENDING');assert.ok(offer);career.transfer(uid,offer.id,{accept:true});
 career.advance(uid);view=career.view(uid);assert.equal(view.career.season,2);assert.equal(view.history.length,2);assert.equal(view.transfers.length,1);assert.equal(view.current.stats.matches,0);
 db.close();
});
test('round robin has all pairs exactly once and performance includes assists and titles',()=>{
 const rounds=roundRobin(['a','b','c','d','e','f','g','h']);assert.equal(rounds.length,7);
 const pairs=rounds.flat().map(p=>p.sort().join(''));assert.equal(new Set(pairs).size,28);
 assert.ok(performance({matches:10,ratingTotal:80,goals:3,assists:10,wins:7,titles:2})>performance({matches:10,ratingTotal:60,goals:10,assists:0,wins:2,titles:0}));
});
test('server match runs headlessly and finishes tied knockout with a decision',()=>{
 const match=new Match({id:'headless',cfg:{n:1,time:.01,gold:1},seed:3});match.G.time=0;match.nextPeriod();assert.equal(match.G.period,'EXTRA_TIME');match.G.time=0;match.nextPeriod();assert.equal(match.G.period,'PENALTIES');
 for(let i=0;i<36000&&match.G.phase!=='end';i++)match.update(1/60);
 assert.equal(match.G.phase,'end');assert.deepEqual(match.G.score,[0,0]);assert.ok([0,1].includes(match.G.winner));assert.ok(match.log.some(e=>e.type==='PENALTY_TAKEN'));
});
