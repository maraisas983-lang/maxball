const test=require('node:test'),assert=require('node:assert/strict');
const {createApp}=require('../server/app.cjs');
test('collections, passes, nicknames and custom-room permissions',async t=>{
 const app=createApp({databasePath:':memory:',origin:'http://maxball.test',logger:{warn(){},error:console.error}});t.after(()=>app.close());
 const a=(await app.auth.register({username:'collection_host',password:'test-password-123'})).user,b=(await app.auth.register({username:'collection_guest',password:'test-password-123'})).user;
 const {db,collections:c,rooms:r}=app;
 await t.test('packs are atomic, without duplicates and idempotent',()=>{
  assert.throws(()=>c.open(a.id,{category:'BALL',requestId:'request-empty'}));
  db.run('UPDATE wallets SET balance=300 WHERE user_id=?',a.id);
  const pool=c.shop(a.id).packs.find(p=>p.category==='BALL');assert.equal(pool.remaining,7);assert.ok(Math.abs(pool.items.reduce((s,i)=>s+i.chance,0)-1)<1e-9);
  const one=c.open(a.id,{category:'BALL',requestId:'request-ball'});assert.equal(c.open(a.id,{category:'BALL',requestId:'request-ball'}).item.id,one.item.id);assert.equal(app.economy.wallet(a.id).balance,270);
  assert.throws(()=>c.open(a.id,{category:'KIT',requestId:'request-ball'}));assert.notEqual(c.open(a.id,{category:'BALL',requestId:'request-ball2'}).item.id,one.item.id);
  app.economy.equip(a.id,{itemId:one.item.id});assert.equal(app.auth.profile(a.id).ball_skin,one.item.asset_index);
 });
 await t.test('Mini progression and MAX unlock cannot be forged or double charged',()=>{
  assert.throws(()=>c.claim(a.id,{track:'Mini',tier:1}));db.run('UPDATE profiles SET ranked_reward_matches=4 WHERE user_id=?',a.id);assert.equal(c.pass(a.id).level,2);
  c.claim(a.id,{track:'Mini',tier:1});c.claim(a.id,{track:'Mini',tier:1});assert.equal(db.one('SELECT count(*) n FROM pass_claims').n,1);
  assert.throws(()=>c.claim(a.id,{track:'MAX',tier:1}));c.unlock(a.id);c.unlock(a.id);assert.equal(app.economy.wallet(a.id).balance,90);c.claim(a.id,{track:'MAX',tier:2});assert.ok(c.pass(a.id).tiers.every(t=>t.Mini&&t.MAX));
 });
 await t.test('one free nickname change, then exactly ten gems; safe public profile',()=>{
  const values={displayName:'Primeiro',shirtName:'MAX',shirtNumber:10,avatar:'ball'};app.auth.updateProfile(a.id,values);assert.equal(app.economy.wallet(a.id).balance,90);
  app.auth.updateProfile(a.id,{...values,displayName:'Segundo'});app.auth.updateProfile(a.id,{...values,displayName:'Segundo'});assert.equal(app.economy.wallet(a.id).balance,80);
  assert.equal(c.profile(a.id).display_name,'Segundo');for(const k of ['email','password_hash','balance'])assert.equal(c.profile(a.id)[k],undefined);
 });
 const room=await r.create(a,{name:'Private room',password:'private-test',n:2});
 await t.test('targeted invitation bypasses password only for invitee; positions may repeat',async()=>{
  await assert.rejects(r.join(b,room.id,{}));r.features.invite(a,room.id,{playerId:b.id});const invite=r.features.pending(b.id)[0];await assert.rejects(r.features.accept(a,{inviteId:invite.id,accepted:true}));await r.features.accept(b,{inviteId:invite.id,accepted:true});
  r.features.customize(a,room.id,{position:'PV'});r.features.customize(b,room.id,{position:'PV'});assert.ok(r.current(a.id).players.every(p=>p.position==='PV'));
  assert.throws(()=>r.features.customize(b,room.id,{itemId:'kit-2'}));
 });
 await t.test('only owner cancels, preserving room and no rewards',async()=>{
  await r.start(a,room.id);const match=r.rooms.get(room.id).match;assert.throws(()=>r.features.cancel(b,room.id));assert.throws(()=>r.features.card(a,room.id,{playerId:b.id,color:'RED'}));
  const before=app.auth.profile(a.id).xp;r.features.cancel(a,room.id);assert.equal(r.current(b.id).id,room.id);assert.equal(r.current(a.id).status,'waiting');assert.equal(app.auth.profile(a.id).xp,before);assert.equal(db.one('SELECT status FROM matches WHERE id=?',match.id).status,'ABANDONED');await r.start(a,room.id);assert.ok(r.rooms.get(room.id).match);
 });
 await t.test('referee cards persist expulsion and prevent replacement',()=>{
  const m=r.rooms.get(room.id).match;m.G.phase='play';m.G.pauseState='PAUSED';r.assignReferee(a,room.id,{playerId:b.id});
  for(let i=0;i<200;i++)m.update(1/60);assert.equal(m.G.substitution??null,null);
  const target=m.P.find(p=>p.ctrl==='ai');assert.throws(()=>r.features.card(a,room.id,{playerId:target.id,color:'YELLOW'}));
  r.features.card(b,room.id,{playerId:target.id,color:'YELLOW'});assert.equal(m.G.cards[target.id].yellow,1);
  r.features.card(b,room.id,{playerId:target.id,color:'YELLOW'});assert.equal(target.sentOff,true);assert.equal(target.inactive,true);
  require('../src/game/kickoff.js').kickoff(m);assert.equal(target.inactive,true);assert.equal(target.hid,true);assert.throws(()=>m.substitute(target.id,{id:'illegal',name:'Illegal'}));
 });
 await t.test('paused owner can move a player out without a bot and back into the free slot',()=>{
  const m=r.rooms.get(room.id).match;m.G.phase='play';m.G.pauseState='PAUSED';const team=m.P.find(p=>p.id===b.id).team;
  const count=m.P.length;r.features.move(a,room.id,{playerId:b.id,destination:'SPECTATORS'});assert.equal(m.P.length,count-1);assert.equal(m.P.some(p=>p.id===b.id),false);assert.ok(r.current(a.id).spectators.some(p=>p.id===b.id));
  for(let i=0;i<200;i++)m.update(1/60);
  r.features.move(a,room.id,{playerId:b.id,destination:team?'AWAY':'HOME'});assert.equal(m.P.length,count);assert.equal(m.P.find(p=>p.id===b.id).team,team);assert.equal(r.rooms.get(room.id).originalPlayers.filter(p=>p.id===b.id).length,1);
 });
});
