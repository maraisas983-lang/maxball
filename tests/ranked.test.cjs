const test=require('node:test'),assert=require('node:assert/strict');
const {createApp}=require('../server/app.cjs');const {elo,range}=require('../server/services/ranked.cjs');
test('Elo and expanding ranges',()=>{assert.deepEqual(elo(1000,1000,1),[1016,984]);assert.deepEqual(elo(1000,1000,.5),[1000,1000]);assert.deepEqual([0,9,10,19,20,60].map(range),[100,100,200,200,400,400]);assert.ok(elo(800,1200,1)[0]>816);});
test('real ranked queue matches humans, cancellation, forfeits and persists Elo exactly once',async()=>{
 const app=createApp({databasePath:':memory:',logger:{warn(){},error(){}}});
 try{
  const a=(await app.auth.register({username:'rank_a',password:'secure-password-a'})).user,b=(await app.auth.register({username:'rank_b',password:'secure-password-b'})).user;
  assert.equal(app.rooms.rankedJoin(a).queued,true);assert.equal(app.rooms.rankedCancel(a).queued,false);
  app.db.run('UPDATE profiles SET rating=1300 WHERE user_id=?',b.id);
  app.rooms.rankedJoin(a);app.rooms.rankedJoin(b);app.rooms.pairRanked();assert.equal(app.rooms.rooms.size,0);
  for(const q of app.rooms.ranked.queue.values())q.since-=21000;
  app.rooms.pairRanked();assert.equal(app.rooms.rooms.size,1);const room=[...app.rooms.rooms.values()][0];assert.equal(room.players.length,2);assert.equal(room.match.P.length,8);assert.equal(app.rooms.rankedStatus(a).queued,false);
  app.rooms.leave(a.id);assert.equal(room.match.G.reason,'FORFEIT');const ar=app.auth.profile(a.id).rating,br=app.auth.profile(b.id).rating;assert.ok(ar<1000);assert.ok(br>1300);assert.equal(ar+br,2300);
  app.rooms.persistResult(room);assert.equal(app.auth.profile(a.id).rating,ar);assert.equal(app.db.one('SELECT count(*) n FROM ranked_matches').n,1);assert.ok(app.db.one("SELECT id FROM ranked_events WHERE type='FORFEIT'"));assert.equal(app.db.one('SELECT count(*) n FROM cloud_outbox').n,0);
  await assert.rejects(()=>app.rooms.join(a,room.id));
 }finally{await app.close();}
});
test('Supabase adapter verifies identity and keeps service credentials server side',async()=>{
 const {createSupabase}=require('../server/services/supabase.cjs'),requests=[];
 const cloud=createSupabase({url:'https://test.supabase.co',anonKey:'public-test',serviceKey:'private-test',fetchImpl:async(url,options)=>{requests.push({url,options});return {ok:true,json:async()=>({id:'verified'})};}});
 await cloud.login('user@example.com','example-password');await cloud.user('access');await cloud.complete({id:'match'});
 assert.equal(requests[0].options.headers.apikey,'public-test');assert.equal(requests[1].options.headers.Authorization,'Bearer access');assert.equal(requests[2].options.headers.apikey,'private-test');assert.ok(requests[2].url.endsWith('/rpc/record_ranked_match'));
 assert.throws(()=>createSupabase({url:'http://bad',anonKey:'x',serviceKey:'y'}));
});
