const test=require('node:test'),assert=require('node:assert/strict'),{once}=require('node:events'),WebSocket=require('ws');
const {createApp}=require('../server/app.cjs');
test('two two-player groups enter one authoritative match intact and all four receive Elo/history once',async t=>{
 const origin='http://maxball.test',app=createApp({databasePath:':memory:',origin,logger:{warn(){},error:console.error}});app.server.listen(0,'127.0.0.1');await once(app.server,'listening');const base='ws://127.0.0.1:'+app.server.address().port+'/ws',clients=[],users=[];t.after(async()=>{for(const c of clients)c.terminate();await app.close();});
 for(let i=0;i<4;i++){const session=await app.auth.register({username:'group_'+i,password:'group-password-123'});users.push(session.user);const ws=new WebSocket(base,{origin,headers:{Cookie:'maxball_session='+session.token}});clients.push(ws);await once(ws,'open');}
 const party=app.rooms.party;for(const [a,b] of [[0,1],[2,3]]){party.ensure(users[a]);party.invite(users[a],users[b].id);party.accept(users[b],party.view(users[b].id).invites[0].id);party.ready(users[b],true);}
 assert.throws(()=>app.rooms.rankedJoin(users[1],{n:2}),e=>e.status===403);assert.throws(()=>app.rooms.rankedJoin(users[0],{n:1}));
 app.rooms.rankedJoin(users[0],{n:2});app.rooms.rankedJoin(users[2],{n:3});app.rooms.pairRanked();assert.equal(app.rooms.rooms.size,0,'different formats cannot match');
 app.rooms.rankedCancel(users[2]);app.rooms.rankedJoin(users[2],{n:2});app.rooms.pairRanked();const room=[...app.rooms.rooms.values()][0];assert.equal(room.players.length,4);assert.equal(room.cfg.n,2);
 assert.equal(room.players.find(p=>p.id===users[0].id).team,room.players.find(p=>p.id===users[1].id).team);assert.notEqual(room.players.find(p=>p.id===users[0].id).team,room.players.find(p=>p.id===users[2].id).team);
 assert.equal(party.view(users[1].id).group.state,'IN_MATCH');room.match.G.score=[2,0];room.match.finish();app.rooms.persistResult(room);app.rooms.persistResult(room);
 for(let i=0;i<4;i++){assert.equal(app.auth.profile(users[i].id).rating,i<2?1016:984);const history=app.rooms.ranked.history(users[i].id);assert.equal(history.length,1);assert.equal(history[0].rating_before,1000);assert.equal(history[0].rating_after,i<2?1016:984);assert.equal(party.view(users[i].id).group.state,'IDLE');app.rooms.leave(users[i].id);}
 app.rooms.rankedJoin(users[0],{n:2});party.leave(users[1].id);assert.equal(app.rooms.ranked.queue.size,0,'leaving cancels the complete queued group');
});
