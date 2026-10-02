const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {read}=require('./helpers.cjs');
const {createApp}=require('../server/app.cjs');
const {createSupabase}=require('../server/services/supabase.cjs');
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
 for(const [status,data,code] of [[400,{error_code:'invalid_credentials'},'LOGIN'],[400,{error_code:'email_not_confirmed'},'EMAIL_UNCONFIRMED'],[429,{},'AUTH_RATE_LIMIT']]){
  const cloud=createSupabase({url:'https://test.supabase.co',anonKey:'sb_publishable_test',serviceKey:'sb_secret_test',fetchImpl:async()=>({ok:false,status,json:async()=>data})});await assert.rejects(cloud.login('test@example.com','test'),e=>e.code===code);
 }
});
