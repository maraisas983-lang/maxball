const test=require('node:test'),assert=require('node:assert/strict');
const {PGlite}=require('@electric-sql/pglite');
const {read}=require('./helpers.cjs');
test('new API keys use apikey while user JWTs use Authorization; legacy keys remain supported',async()=>{
 const {createSupabase}=require('../server/services/supabase.cjs'),{supabaseConfig}=require('../server/lib/supabaseConfig.cjs'),requests=[];
 const config=supabaseConfig({AUTH_PROVIDER:'supabase',SUPABASE_URL:'https://example.supabase.co/',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',SUPABASE_SECRET_KEY:'sb_secret_test'});
 const cloud=createSupabase({...config,fetchImpl:async(url,options)=>{requests.push(options);return {ok:true,json:async()=>[]};}});
 await cloud.login('test@example.com','test-password');await cloud.profile('test');await cloud.user('user-jwt');
 assert.equal(requests[0].headers.apikey,'sb_publishable_test');assert.equal(requests[0].headers.Authorization,undefined);
 assert.equal(requests[1].headers.apikey,'sb_secret_test');assert.equal(requests[1].headers.Authorization,undefined);
 assert.equal(requests[2].headers.Authorization,'Bearer user-jwt');
 const legacy=supabaseConfig({AUTH_PROVIDER:'supabase',SUPABASE_URL:config.url,SUPABASE_ANON_KEY:'legacy-anon',SUPABASE_SERVICE_ROLE_KEY:'legacy-service'});
 const old=createSupabase({...legacy,fetchImpl:async(url,options)=>{assert.equal(options.headers.Authorization,'Bearer legacy-service');return {ok:true,json:async()=>[]};}});await old.profile('test');
});
test('Supabase SQL executes; RLS blocks rating edits and RPC settles once',async()=>{
 const pg=new PGlite();
 const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002',c='00000000-0000-4000-8000-000000000003',mid='00000000-0000-4000-8000-000000000004';
 try{
  await pg.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,email text);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`);
  await pg.exec(read('server/database/supabase/001_ranked.sql'));
  for(const [uid,email] of [[a,'a@example.com'],[b,'b@example.com'],[c,'c@example.com']])await pg.query('insert into auth.users values($1,$2)',[uid,email]);
  const result={id:mid,home_id:a,away_id:b,home_before:1000,away_before:1000,home_after:1016,away_after:984,score:'[2,1]',reason:'TIME',created_at:1,finished_at:2,events:[{type:'GOAL_SCORED'}],stats:{[a]:{goals:2,assists:1},[b]:{goals:1,assists:0}}};
  await pg.exec('set role service_role');await pg.query('select public.record_ranked_match($1)',[JSON.stringify(result)]);await pg.query('select public.record_ranked_match($1)',[JSON.stringify(result)]);
  await pg.exec('reset role');assert.equal((await pg.query('select count(*)::int n from public.ranked_matches')).rows[0].n,1);
  assert.equal((await pg.query('select rating from public.profiles where id=$1',[a])).rows[0].rating,1016);
  await pg.exec('set role authenticated');await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[a]);
  assert.equal((await pg.query('select * from public.profiles')).rows.length,1);assert.equal((await pg.query('select * from public.ranked_matches')).rows.length,1);assert.equal((await pg.query('select * from public.ranked_events')).rows.length,1);
  await assert.rejects(pg.query('update public.profiles set rating=9000 where id=$1',[a]),/permission denied/);
  await assert.rejects(pg.query('select public.record_ranked_match($1)',[JSON.stringify(result)]),/permission denied/);
  await pg.query('update public.profiles set display_name=$1 where id=$2',['Novo nome',a]);
  await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[c]);assert.equal((await pg.query('select * from public.ranked_matches')).rows.length,0);assert.equal((await pg.query('select * from public.ranked_events')).rows.length,0);
  await pg.exec('reset role');const invalid={...result,id:'00000000-0000-4000-8000-000000000005'};await assert.rejects(pg.query('select public.record_ranked_match($1)',[JSON.stringify(invalid)]),/Rating conflict/);
 }finally{await pg.close();}
});
test('Supabase BFF registration, verified identity, refresh, profile and local logout',async()=>{
 const {createApp}=require('../server/app.cjs');
 const uid='00000000-0000-4000-8000-000000000001';let profile={id:uid,display_name:'Cloud',rating:1020,wins:2,draws:1,losses:0,goals:5,assists:2};
 const fetchImpl=async(url,options)=>{const data=url.endsWith('/user')?{id:uid,email:'cloud@example.com'}:url.includes('/profiles')?options.method==='PATCH'?(profile={...profile,...JSON.parse(options.body)}):[profile]:url.includes('/signup')?{id:uid}:{access_token:'valid-access',refresh_token:'valid-refresh',expires_in:3600};return {ok:true,json:async()=>data};};
 const app=createApp({databasePath:':memory:',supabase:{url:'https://example.supabase.co',anonKey:'public',serviceKey:'secret',fetchImpl},logger:{error(){},warn(){}}});
 try{
  const credentials={username:'cloud@example.com',password:'cloud-password-123'};
  assert.equal((await app.auth.register(credentials)).confirmationRequired,true);
  const result=await app.auth.login(credentials);assert.equal(result.user.id,uid);assert.equal(app.auth.profile(uid).rating,1020);assert.equal(app.economy.wallet(uid).balance,200);
  assert.equal(app.auth.authenticate(result.token).user.id,uid);const next=await app.auth.refresh(result.token);assert.throws(()=>app.auth.authenticate(result.token));assert.equal(app.auth.authenticate(next.token).user.id,uid);assert.equal(app.economy.wallet(uid).balance,200);
  await app.auth.updateProfile(uid,{displayName:'Novo nome',shirtName:'Novo',shirtNumber:7});assert.equal(profile.display_name,'Novo nome');await app.auth.logout(next.token);assert.throws(()=>app.auth.authenticate(next.token));assert.equal(app.db.one('select count(*) n from external_sessions').n,0);
 }finally{await app.close();}
});
