const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {read}=require('./helpers.cjs');
const {createApp}=require('../server/app.cjs');
const {createSupabase}=require('../server/services/supabase.cjs');

test('published Render configuration selects email authentication and HTTP login reaches Supabase',async t=>{
 const blueprint=read('render.yaml'),provider=blueprint.match(/key: AUTH_PROVIDER\s+value: (\w+)/)?.[1];assert.equal(provider,'supabase');
 const {supabaseConfig}=require('../server/lib/supabaseConfig.cjs'),{once}=require('node:events'),calls=[],uid='00000000-0000-4000-8000-000000000025',origin='http://maxball-email.test';
 const config=supabaseConfig({AUTH_PROVIDER:provider,SUPABASE_URL:'https://example.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',SUPABASE_SECRET_KEY:'sb_secret_test'});
 const fetchImpl=async(url,options)=>{calls.push({url,body:options.body});return {ok:true,json:async()=>url.endsWith('/user')?{id:uid,email:'player@example.com',email_confirmed_at:'2026-10-11'}:url.includes('/profiles')?[{id:uid,display_name:'Player',rating:1000,wins:0,draws:0,losses:0,goals:0,assists:0}]:{access_token:'cloud-access',refresh_token:'cloud-refresh',expires_in:3600}};};
 const app=createApp({databasePath:':memory:',origin,supabase:{...config,fetchImpl},logger:{warn(){},error(){}}});t.after(()=>app.close());app.server.listen(0,'127.0.0.1');await once(app.server,'listening');const base='http://127.0.0.1:'+app.server.address().port;
 const publicConfig=await (await fetch(base+'/api/config')).json();assert.equal(publicConfig.authProvider,'supabase');
 const response=await fetch(base+'/api/auth/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({username:'player@example.com',password:'existing-password',acceptTerms:true,...publicConfig.legal})});
 assert.equal(response.status,200);assert.equal((await response.json()).user.id,uid);assert.match(response.headers.get('set-cookie'),/maxball_session=/);assert.deepEqual(JSON.parse(calls[0].body),{email:'player@example.com',password:'existing-password'});
});
test('offline APK origins reject account requests locally without a network connection',async()=>{
 for(const location of [{protocol:'file:',hostname:''},{protocol:'https:',hostname:'appassets.androidplatform.net'}]){
  let calls=0;
  const context=vm.createContext({location,navigator:{userAgent:'MAXBALL-Android/1'},fetch:async()=>{calls++;throw Error('Network must not be used');}});
  vm.runInContext(read('src/services/apiClient.js'),context);
  assert.equal(context.MaxballAPI.offline,true);
  await assert.rejects(context.MaxballAPI.request('/auth/login','POST',{}),/APK está no modo local/);
  assert.equal(calls,0);
 }
 const context=vm.createContext({location:{protocol:'https:',hostname:'maxball.example'}});
 vm.runInContext(read('src/services/apiClient.js'),context);
 assert.equal(context.MaxballAPI.offline,false);
});
test('static preview produces a useful login error instead of a JSON parser error',async()=>{
 const context=vm.createContext({location:{protocol:'http:'},AbortController,setTimeout,clearTimeout,fetch:async()=>({status:405,headers:{get:()=>null},json:async()=>{throw Error('Unexpected end of JSON input');}})});vm.runInContext(read('src/services/apiClient.js'),context);
 await assert.rejects(context.MaxballAPI.request('/auth/login','POST',{username:'ana',password:'test'}),e=>e.code==='BACKEND_UNAVAILABLE'&&/servidor MAXBALL/.test(e.message));
 context.fetch=async()=>({status:200,headers:{get:()=> 'application/json'},json:async()=>{throw Error('Unexpected end of JSON input');}});
 await assert.rejects(context.MaxballAPI.request('/auth/login','POST',{}),e=>e.code==='BACKEND_UNAVAILABLE'&&/vazia ou inválida/.test(e.message));
});
test('Supabase login accepts the existing password length while new registration requires twelve',async t=>{
 const uid='00000000-0000-4000-8000-000000000021',calls=[];
 const fetchImpl=async(url,options)=>{calls.push({url,body:options.body});return {ok:true,json:async()=>url.endsWith('/user')?{id:uid,email:'short@example.com'}:url.includes('/profiles')?[{id:uid,display_name:'Ana',rating:1000,wins:0,draws:0,losses:0,goals:0,assists:0}]:{access_token:'access',refresh_token:'refresh',expires_in:3600}};};
 const app=createApp({databasePath:':memory:',supabase:{url:'https://test.supabase.co',anonKey:'sb_publishable_test',serviceKey:'sb_secret_test',fetchImpl},logger:{warn(){},error(){}}});t.after(()=>app.close());
 const result=await app.auth.login({username:' short@example.com ',password:'pass1234'});assert.equal(result.user.id,uid);assert.deepEqual(JSON.parse(calls[0].body),{email:'short@example.com',password:'pass1234'});
 await assert.rejects(app.auth.register({username:'short@example.com',password:'pass1234'}),/12 a 128/);
});
test('wrong credentials, unconfirmed email and rate limits have distinct actionable errors',async()=>{
 for(const [status,data,code] of [[400,{error_code:'invalid_credentials'},'LOGIN'],[400,{error_code:'email_not_confirmed'},'EMAIL_UNCONFIRMED'],[429,{},'AUTH_RATE_LIMIT'],[401,{message:'Invalid API key'},'AUTH_CONFIGURATION']]){
  const cloud=createSupabase({url:'https://test.supabase.co',anonKey:'sb_publishable_test',serviceKey:'sb_secret_test',fetchImpl:async()=>({ok:false,status,json:async()=>data})});await assert.rejects(cloud.login('test@example.com','test'),e=>e.code===code);
 }
});
test('temporary account outages retry login, while signups and refresh tokens are never replayed',async()=>{
 for(const failure of ['network','server']){let calls=0;const cloud=createSupabase({url:'https://test.supabase.co',anonKey:'sb_publishable_test',serviceKey:'sb_secret_test',fetchImpl:async()=>{calls++;if(calls===1){if(failure==='network')throw Error('offline');return {status:503,arrayBuffer:async()=>new ArrayBuffer(0)};}return {ok:true,status:200,json:async()=>({access_token:'ok'})};}});assert.equal((await cloud.login('test@example.com','test')).access_token,'ok');assert.equal(calls,2);}
 for(const method of ['register','refresh']){let calls=0;const cloud=createSupabase({url:'https://test.supabase.co',anonKey:'sb_publishable_test',serviceKey:'sb_secret_test',fetchImpl:async()=>{calls++;throw Error('offline');}});await assert.rejects(cloud[method]('test@example.com','test'),e=>e.code==='CLOUD'&&e.status===503);assert.equal(calls,1);}
});
