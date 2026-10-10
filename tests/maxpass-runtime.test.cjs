const test=require('node:test'),assert=require('node:assert/strict'),{createApp}=require('../server/app.cjs'),{Match}=require('../server/online/match.cjs');
test('real room result commits MaxPass with match statistics and sends the same result on retry',async t=>{
 const app=createApp({databasePath:':memory:',logger:{warn(){},error:console.error}});t.after(()=>app.close());const user=(await app.auth.register({username:'pass_runtime',password:'test-password-123'})).user;
 const visible=await app.rooms.create(user,{name:'MaxPass integration',n:1});app.rooms.start(user,visible.id);const room=app.rooms.rooms.get(visible.id),m=room.match;
 m.G.phase='play';m.G.elapsed=180;m.G.score=[2,0];m.activity.set(user.id,100);m.stats[user.id].inputs=100;m.stats[user.id].goals=2;app.db.run('UPDATE matches SET created_at=? WHERE id=?',Date.now()-180000,m.id);m.finish('TIME');app.rooms.persistResult(room);
 const result=room.results.get(user.id);assert.ok(result.maxpass);assert.equal(result.maxpass.beforeLevel,0);assert.ok(result.maxpass.gained>=600);assert.equal(app.db.one('SELECT status FROM matches WHERE id=?',m.id).status,'COMPLETED');const xp=app.maxpass.view(user.id).totalXp;app.rooms.persistResult(room);assert.equal(app.maxpass.view(user.id).totalXp,xp);assert.equal(room.results.get(user.id).maxpass.gained,result.maxpass.gained);
});
test('activity counts active simulation, stops during pause and expires stale input',()=>{
 const m=new Match({id:'activity-pass',players:[{id:'human',name:'Jogador',team:0,slot:0}],cfg:{n:1,time:180,sk0:0,sk1:1,offside:false},seed:7});m.G.phase='play';m.setInput('human',{x:1,y:0});for(let i=0;i<180;i++)m.update(1/60);const first=m.activity.get('human');assert.ok(first>=1.45&&first<=1.55);m.setInput('human',{x:0,y:0});for(let i=0;i<60;i++)m.update(1/60);assert.equal(m.activity.get('human'),first);m.setInput('human',{x:1,y:0});m.pause('human');for(let i=0;i<60;i++)m.update(1/60);assert.equal(m.activity.get('human'),first);
});
