const test=require('node:test'),assert=require('node:assert/strict'),{once}=require('node:events'),WebSocket=require('ws');
const {createApp}=require('../server/app.cjs'),{Match}=require('../server/online/match.cjs'),ceremony=require('../src/game/ceremony.js');
const quiet={warn(){},error:console.error};
async function accounts(app,n){const result=[];for(let i=0;i<n;i++)result.push(await app.auth.register({username:'competition_'+i,password:'competition-test-password'}));return result;}
test('ranked gems every second eligible game, MVP bonus, trophies and retries are atomic; casual games give no gems',async t=>{
 const app=createApp({databasePath:':memory:',logger:quiet});t.after(()=>app.close());const [a,b]=(await accounts(app,2)).map(x=>x.user);
 assert.equal(app.economy.wallet(a.id).balance,0);
 for(let round=0;round<2;round++){
  app.rooms.rankedJoin(a,{n:1});app.rooms.rankedJoin(b,{n:1});app.rooms.pairRanked();const room=app.rooms.rooms.get(app.rooms.current(a.id).id),m=room.match;
  m.G.score=[2,0];m.stats[a.id].inputs=30;m.stats[b.id].inputs=30;m.stats[a.id].goals=2;m.finish('TIME');app.rooms.persistResult(room);app.rooms.persistResult(room);
  assert.equal(app.economy.wallet(a.id).balance,round?25:10);assert.equal(app.economy.wallet(b.id).balance,round?5:0);
  assert.equal(app.auth.profile(a.id).trophies,(round+1)*30);assert.equal(app.auth.profile(b.id).trophies,0);app.rooms.leave(a.id);app.rooms.leave(b.id);
 }
 const casual=await app.rooms.create(a,{name:'Casual teste',n:1});app.rooms.start(a,casual.id);const room=app.rooms.rooms.get(casual.id);room.match.stats[a.id].inputs=30;room.match.G.score=[1,0];room.match.finish('TIME');app.rooms.persistResult(room);assert.equal(app.economy.wallet(a.id).balance,25);assert.equal(app.auth.profile(a.id).ranked_reward_matches,2);
});
test('profile supports four distinct roles and Top 100 retains the position of players below the cutoff',async t=>{
 const app=createApp({databasePath:':memory:',logger:quiet});t.after(()=>app.close());const [a]=await accounts(app,1),body={displayName:'Titular',shirtName:'Titular',shirtNumber:10,avatar:'ball',positions:['GK','MC','VL','TEC']};
 assert.deepEqual(app.auth.updateProfile(a.user.id,body).positions,body.positions);assert.throws(()=>app.auth.updateProfile(a.user.id,{...body,positions:['GK','MC','VL','PV','TEC']}));assert.throws(()=>app.auth.updateProfile(a.user.id,{...body,positions:['GK','GK']}));assert.deepEqual(app.auth.profile(a.user.id).positions,body.positions);
 for(let i=0;i<105;i++){const id='rank-'+String(i).padStart(3,'0');app.db.run('INSERT INTO users(id,username,password_hash,created_at,updated_at) VALUES(?,?,?,?,?)',id,id,'fixture',Date.now(),Date.now());app.db.run('INSERT INTO profiles(id,user_id,display_name,shirt_name,shirt_number,created_at,trophies) VALUES(?,?,?,?,?,?,?)',id,id,id,id,10,Date.now(),3000-i);}
 const board=app.rooms.progression.leaderboard(a.user.id);assert.equal(board.top.length,100);assert.equal(board.top[0].position,1);assert.equal(board.top[0].patent,'MaxImortal');assert.equal(board.self.position,106);assert.equal(board.self.trophies,0);assert.ok(!board.top.some(p=>p.user_id===a.user.id));
});
test('four club members per side must accept a friendly; halftime freezes until host restarts and preserves the score',async t=>{
 const origin='http://maxball.test',app=createApp({databasePath:':memory:',origin,logger:quiet});app.server.listen(0,'127.0.0.1');await once(app.server,'listening');const people=await accounts(app,9),sockets=[];t.after(async()=>{for(const ws of sockets)ws.terminate();await app.close();});
 for(const p of people){const ws=new WebSocket('ws://127.0.0.1:'+app.server.address().port+'/ws',{origin,headers:{Cookie:'maxball_session='+p.token}});sockets.push(ws);await once(ws,'open');}
 const clubBody={primaryColor:'#176633',secondaryColor:'#ffffff',accentColor:'#ffeeaa',kitStyle:'HALF'},clubs=[];
 for(let side=0;side<2;side++){const captain=people[side*4].user,club=app.rooms.clubs.create(captain.id,{...clubBody,name:'Time '+side});clubs.push(club);app.rooms.party.ensure(captain);for(let i=1;i<4;i++){const p=people[side*4+i].user;app.rooms.clubs.join(p.id,club.id);app.rooms.party.invite(captain,p.id);app.rooms.party.accept(p,app.rooms.party.view(p.id).invites[0].id);app.rooms.party.ready(p,true);}}
 const a=people[0].user,b=people[4].user;assert.throws(()=>app.rooms.friendlies.search(a,{clubId:clubs[1].id,penalties:true}));
 app.rooms.friendlies.search(a,{clubId:clubs[0].id,penalties:true});assert.throws(()=>app.rooms.rankedJoin(a));await assert.rejects(()=>app.rooms.create(a,{name:'Fila duplicada'}));
 app.rooms.friendlies.search(b,{clubId:clubs[1].id,penalties:true});const offer=app.rooms.friendlies.view(a.id).offer;assert.ok(offer);assert.equal(app.rooms.rooms.size,0);
 assert.throws(()=>app.rooms.friendlies.accept(people[1].user,{offerId:offer.id,accepted:true}));app.rooms.friendlies.accept(a,{offerId:offer.id,accepted:true});assert.equal(app.rooms.rooms.size,0);
 const ready=app.rooms.friendlies.accept(b,{offerId:offer.id,accepted:true}),room=app.rooms.rooms.get(ready.room.id);assert.equal(room.players.length,8);assert.equal(room.cfg.time,1200);assert.throws(()=>app.rooms.edit(a,room.id,{time:60}));
 await app.rooms.join(people[8].user,room.id,{spectator:true});app.rooms.assignReferee(a,room.id,{playerId:people[8].user.id});app.rooms.start(a,room.id);const m=room.match;m.G.phase='play';m.G.score=[1,0];m.G.time=600.01;m.G.restarting=false;m.update(.02);assert.equal(m.G.phase,'halftime');assert.equal(m.G.sidesSwapped,true);const time=m.G.time;m.update(30);assert.equal(m.G.time,time);assert.equal(m.G.phase,'halftime');assert.throws(()=>app.rooms.start(b,room.id));
 app.rooms.start(people[8].user,room.id);assert.deepEqual(m.G.score,[1,0]);assert.equal(m.G.pauseState,'RESUMING');for(let i=0;i<180;i++)m.update(1/60);assert.equal(m.G.pauseState,null);m.goal(0);for(let i=0;i<380;i++)m.update(1/60);assert.equal(m.G.reason,'GOLDEN_GOAL');app.rooms.persistResult(room);assert.equal(app.economy.wallet(a.id).balance,0);
});
test('Final has its own ceremony and a tied regulation match advances to penalties; lineup remains readable',()=>{
 const m=new Match({id:'final-fixture',cfg:{n:4,time:60,final:true,presentation:true,settings:{penalties:true}}}),seen=new Set();let lineup=0;
 for(let i=0;i<2500&&m.G.phase==='starting';i++){const before=m.P.map(p=>({x:p.x,y:p.y,hid:p.hid}));m.update(1/60);for(let j=0;j<m.P.length;j++)if(!before[j].hid&&!m.P[j].hid)assert.ok(Math.hypot(m.P[j].x-before[j].x,m.P[j].y-before[j].y)<12,'Final ceremony must not teleport');seen.add(m.G.startStage);if(m.G.startStage==='LINEUP')lineup+=1/60;}
 assert.ok(seen.has('TROPHY'));assert.ok(lineup>5.8);assert.equal(m.G.phase,'play');m.G.time=.001;m.update(1/60);assert.equal(m.G.phase,'penalties');assert.ok(ceremony.duration({final:true})>ceremony.duration({}));
});
