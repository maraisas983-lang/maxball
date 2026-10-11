const test=require('node:test'),assert=require('node:assert/strict'),{once}=require('node:events');
const WebSocket=require('ws');
const {createApp}=require('../server/app.cjs');
async function until(fn){for(let i=0;i<200;i++){if(fn())return;await new Promise(r=>setTimeout(r,10));}assert.fail('Timed out waiting for room state');}
test('passwords, host permissions, atomic edits, teams, spectators and host migration synchronize',async t=>{
 const origin='http://room.test',app=createApp({databasePath:':memory:',origin,logger:{warn(){},error:console.error}});app.server.listen(0,'127.0.0.1');await once(app.server,'listening');t.after(()=>app.close());
 const a=await app.auth.register({username:'room_host',password:'room-password-123'}),b=await app.auth.register({username:'room_guest',password:'room-password-123'}),c=await app.auth.register({username:'room_viewer',password:'room-password-123'});
 const connect=async session=>{const ws=new WebSocket('ws://127.0.0.1:'+app.server.address().port+'/ws',{origin,headers:{Cookie:'maxball_session='+session.token}}),messages=[];ws.on('message',x=>messages.push(JSON.parse(x)));await once(ws,'open');t.after(()=>ws.terminate());return {ws,messages};};
 const A=await connect(a),B=await connect(b),C=await connect(c),rooms=app.rooms;
 const club=rooms.clubs.create(a.user.id,{name:'Aurora Personalizado',primaryColor:'#125faa',secondaryColor:'#ffffff',accentColor:'#ffd500',kitStyle:'SLEEVES'});
 assert.equal(rooms.clubs.list(a.user.id)[0].id,club.id);assert.equal(rooms.clubs.list(b.user.id).length,0);assert.throws(()=>rooms.clubs.select(b.user.id,club.id));assert.throws(()=>rooms.clubs.create(a.user.id,{...club,name:'<script>'}));
 const room=await rooms.create(a.user,{name:'Sala teste',password:'segredo',n:2});assert.equal(room.hasPassword,true);assert.ok(!JSON.stringify(room).includes('segredo'));assert.ok(!JSON.stringify(room).includes('passwordHash'));
 await assert.rejects(()=>rooms.join(b.user,room.id,{password:'errada'}));await rooms.join(b.user,room.id,{password:'segredo'});await rooms.join(c.user,room.id,{password:'segredo',spectator:true});
 assert.throws(()=>rooms.edit(b.user,room.id,{homeTeamId:'mamo-0'}));assert.throws(()=>rooms.start(b.user,room.id));
 const before=rooms.current(a.user.id);assert.throws(()=>rooms.edit(a.user,room.id,{playerId:b.user.id,destination:'SPECTATORS',settings:{penaltiesAfterExtraTime:true}}));assert.deepEqual(rooms.current(a.user.id),before);
 rooms.edit(a.user,room.id,{playerId:b.user.id,destination:'HOME'});assert.equal(rooms.current(a.user.id).homePlayers.length,2);
 rooms.edit(a.user,room.id,{playerId:b.user.id,destination:'SPECTATORS'});rooms.edit(a.user,room.id,{playerId:b.user.id,destination:'AWAY'});
 const state=rooms.edit(a.user,room.id,{homeTeamId:club.id,awayTeamId:'mamo-20',settings:{offside:true,extraTime:true,penalties:true,penaltiesAfterExtraTime:true}});
 assert.equal(state.homeTeam.name,club.name);assert.equal(state.awayTeam.name,'Palestra');assert.equal(state.spectators.length,1);assert.equal(new Set([...state.players,...state.spectators].map(p=>p.id)).size,3);
 await until(()=>B.messages.some(m=>m.room?.homeTeam?.id===club.id)&&C.messages.some(m=>m.room?.settings?.offside));
 const started=rooms.start(a.user,room.id);assert.equal(started.roomStatus,'STARTING');assert.throws(()=>rooms.edit(a.user,room.id,{playerId:b.user.id,destination:'HOME'}));
 const match=rooms.rooms.get(room.id).match;for(let i=0;i<180;i++)match.update(1/60);
 C.ws.send(JSON.stringify({type:'input',seq:1,x:1,y:0,shoot:true,pass:false}));await until(()=>C.messages.some(m=>m.type==='snapshot'));assert.equal(match.inputs.has(c.user.id),false);
 rooms.leave(a.user.id);assert.equal(rooms.current(b.user.id).owner,b.user.id);assert.equal(match.P.some(p=>p.id===a.user.id),false);assert.equal(rooms.current(b.user.id).players.some(p=>p.id===a.user.id),false);
 rooms.leave(c.user.id);assert.equal(rooms.current(b.user.id).spectators.length,0);rooms.leave(b.user.id);assert.equal(match.G.reason,'ABANDONED');
});
test('custom clubs survive reopening the database and remain owner-scoped',async t=>{
 const fs=require('node:fs'),os=require('node:os'),path=require('node:path');const folder=fs.mkdtempSync(path.join(os.tmpdir(),'maxball-clubs-')),file=path.join(folder,'db.sqlite');
 let app=createApp({databasePath:file,origin:'http://club.test',logger:{warn(){},error:console.error}});
 t.after(async()=>{await app.close();assert.equal(path.dirname(path.resolve(folder)),path.resolve(os.tmpdir()));assert.ok(path.basename(folder).startsWith('maxball-clubs-'));fs.rmSync(folder,{recursive:true,force:true});});
 const account=await app.auth.register({username:'club_owner',password:'club-password-123'}),club=app.rooms.clubs.create(account.user.id,{name:'Clube Persistente',primaryColor:'#123456',secondaryColor:'#abcdef',accentColor:'#ffffff',kitStyle:'HALF'});await app.close();
 app=createApp({databasePath:file,origin:'http://club.test',logger:{warn(){},error:console.error}});assert.deepEqual(app.rooms.clubs.select(account.user.id,club.id),club);
});
