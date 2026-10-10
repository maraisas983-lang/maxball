const test=require('node:test'),assert=require('node:assert/strict');
const {createApp}=require('../server/app.cjs');
const {createChampionshipRounds,pairings,WINDOW,GRACE}=require('../server/services/championshipRounds.cjs');
const {once}=require('node:events');
async function setup(t){
 const app=createApp({databasePath:':memory:',logger:{warn(){},error:console.error}});t.after(()=>app.close());
 const users=[];for(let i=0;i<2;i++)users.push((await app.auth.register({username:'round_player_'+i,password:'round-password-123'})).user);
 const admin={...users[0],role:'ADMIN',staff_role:'ADMIN'},champ=app.championships.save(admin,{name:'Copa Rodadas',description:'',n:1,entryFee:0,maxTeams:4,startsAt:Date.now()+86400000},null,true);
 for(let i=0;i<2;i++){const club=app.rooms.clubs.create(users[i].id,{name:'Clube rodada '+i,primaryColor:'#123456',secondaryColor:'#ffffff',accentColor:'#ffdd00',kitStyle:'SOLID'});const signed=app.championships.register(users[i],champ.id,{clubId:club.id,players:[users[i].id]});app.championships.review(admin,signed.entries.find(e=>e.captain_id===users[i].id).id,'APPROVED');}
 let time=Date.now();const connected=new Set(users.map(u=>u.id)),rooms=Object.create(app.rooms);rooms.isConnected=id=>connected.has(id);
 const service=createChampionshipRounds(app.db,{rooms,now:()=>time,permit:actor=>{if(actor.staff_role!=='ADMIN')throw Error('ADMIN');},audit(){}});
 const current=()=>service.list(champ.id,users[0].id)[0].fixtures[0];
 return {app,users,admin,champ,service,connected,current,setTime:value=>time=value,getTime:()=>time};
}
test('round robin has unique opponents, home and away, and one bye for odd rosters',()=>{
 for(const n of [2,3,4,5,16]){const rounds=pairings(Array.from({length:n},(_,i)=>i+1)),seen=new Set();assert.equal(rounds.length,n%2?n:n-1);for(const round of rounds){const players=new Set();for(const [a,b] of round){assert.ok(!players.has(a)&&!players.has(b));players.add(a);players.add(b);const key=[a,b].sort((x,y)=>x-y).join(':');assert.ok(!seen.has(key));seen.add(key);}}assert.equal(seen.size,n*(n-1)/2);}
});
test('home proposes, away accepts the current version; genuine attendance starts an official match and saves its score',async t=>{
 const f=await setup(t),{app,users,admin,champ,service,current}=f;assert.throws(()=>service.publish(users[1],champ.id),/ADMIN/);service.publish(admin,champ.id);let game=current();const home=users.find(u=>u.id===game.captains[0]),away=users.find(u=>u.id===game.captains[1]);
 assert.throws(()=>service.publish(admin,champ.id),/rodada anterior/);assert.throws(()=>service.propose(away,game.id,{startsAt:f.getTime()+60000}),/mandante/);assert.throws(()=>service.propose(home,game.id,{startsAt:f.getTime()+WINDOW+1}));
 service.propose(home,game.id,{startsAt:f.getTime()+60000});game=current();assert.throws(()=>service.respond(home,game.id,{version:game.proposal_version,accepted:true}),/visitante/);assert.throws(()=>service.respond(away,game.id,{version:game.proposal_version-1,accepted:true}),/mudou/);service.respond(away,game.id,{version:game.proposal_version,accepted:true});
 for(const user of users)service.checkin(user,game.id);game=current();assert.deepEqual(game.present,[1,1]);assert.throws(()=>app.rooms.start(home,game.room_id),/horário acordado/);
 f.setTime(game.scheduled_at);service.tick();game=current();assert.equal(game.status,'RUNNING');const room=app.rooms.rooms.get(game.room_id);assert.equal(room.match.id,game.match_id);room.match.G.score=[2,1];room.match.finish('TIME');app.rooms.persistResult(room);service.complete(room);assert.equal(current().status,'COMPLETED');assert.deepEqual(current().score,[2,1]);
});
test('check-in does not protect a disconnected club from W.O.',async t=>{
 const f=await setup(t),{users,admin,champ,service,current}=f;service.publish(admin,champ.id);let game=current();const home=users.find(u=>u.id===game.captains[0]),away=users.find(u=>u.id===game.captains[1]);service.propose(home,game.id,{startsAt:f.getTime()+60000});game=current();service.respond(away,game.id,{version:game.proposal_version,accepted:true});for(const user of users)service.checkin(user,game.id);game=current();f.connected.delete(away.id);f.setTime(game.scheduled_at+GRACE);service.tick();assert.equal(current().status,'WO');assert.equal(current().winner,0);assert.deepEqual(current().score,[3,0]);
});
test('deadline without agreement awards no victory and attendance without either club gives double W.O.',async t=>{
 const f=await setup(t),{app,users,admin,champ,service,current}=f;service.publish(admin,champ.id);let game=current();f.setTime(game.deadline);service.tick();assert.equal(current().status,'NO_AGREEMENT');assert.equal(current().winner,null);
 app.db.run("UPDATE championship_fixtures SET status='SCHEDULED',scheduled_at=?,score=NULL,winner=NULL WHERE id=?",f.getTime()-GRACE,game.id);service.tick();assert.equal(current().status,'DOUBLE_WO');assert.equal(current().winner,null);assert.deepEqual(current().score,[0,0]);
});
test('server restart interrupts overdue scheduled games; admin may reopen after the original deadline',async t=>{
 const f=await setup(t),{app,users,admin,champ,service,current}=f;service.publish(admin,champ.id);let game=current();const home=users.find(u=>u.id===game.captains[0]),away=users.find(u=>u.id===game.captains[1]);service.propose(home,game.id,{startsAt:f.getTime()+60000});game=current();service.respond(away,game.id,{version:game.proposal_version,accepted:true});f.setTime(game.deadline+1);
 const recovered=createChampionshipRounds(app.db,{rooms:app.rooms,now:f.getTime,permit(){},audit(){}});assert.equal(current().status,'INTERRUPTED');recovered.tick();assert.equal(current().status,'INTERRUPTED');recovered.reopen(admin,game.id);assert.equal(current().status,'NEGOTIATING');assert.equal(current().deadline,f.getTime()+WINDOW);
});
test('fixture HTTP routes enforce sessions, CSRF, administrator publication and captain agreement',async t=>{
 const f=await setup(t),{app,users,champ}=f;app.db.run("UPDATE users SET role='ADMIN',staff_role='ADMIN' WHERE id=?",users[0].id);const logins=[];for(const user of users)logins.push(await app.auth.login({username:user.username,password:'round-password-123'}));app.server.listen(0,'127.0.0.1');await once(app.server,'listening');const base='http://127.0.0.1:'+app.server.address().port;
 async function post(route,body,login,csrf=login?.csrf){const r=await fetch(base+'/api'+route,{method:'POST',headers:{Origin:'http://127.0.0.1:5173','Content-Type':'application/json',...(login?{Cookie:'maxball_session='+login.token,'X-CSRF-Token':csrf}:{})},body:JSON.stringify(body)});return {status:r.status,data:await r.json()};}
 const release='/command/championships/'+champ.id+'/rounds';assert.equal((await post(release,{})).status,401);assert.equal((await post(release,{},logins[0],'wrong')).status,403);assert.equal((await post(release,{},logins[1])).status,403);assert.equal((await post(release,{},logins[0])).status,201);
 const game=f.current(),home=logins.find(l=>l.user.id===game.captains[0]),away=logins.find(l=>l.user.id===game.captains[1]),path='/championship-fixtures/'+game.id;assert.equal((await post(path+'/propose',{startsAt:Date.now()+120000},away)).status,403);const proposal=await post(path+'/propose',{startsAt:Date.now()+120000},home);assert.equal(proposal.status,200);assert.equal((await post(path+'/respond',{version:proposal.data.proposal_version,accepted:true},away)).status,200);assert.equal((await post(path+'/checkin',{},home)).status,409);
});
