const test=require('node:test'),assert=require('node:assert/strict');
const {once}=require('node:events');
const {clientAddress,createLimiter}=require('../server/lib/security.cjs');
const {createApp}=require('../server/app.cjs');
const {createSupabase}=require('../server/services/supabase.cjs');

test('trusted ingress isolates clients; untrusted and malformed headers cannot replace socket IP',()=>{
 const req={socket:{remoteAddress:'10.0.0.1'},headers:{'x-forwarded-for':'198.51.100.99, 203.0.113.2'}};
 assert.equal(clientAddress(req),'10.0.0.1');assert.equal(clientAddress(req,true),'203.0.113.2');
 req.headers['x-forwarded-for']='203.0.113.5, invalid';assert.equal(clientAddress(req,true),'10.0.0.1');
 req.headers['x-forwarded-for']='2001:db8::1';assert.equal(clientAddress(req,true),'2001:db8::1');
});
test('limiter returns remaining wait and unblocks at expiration',()=>{
 let now=0;const limit=createLimiter({now:()=>now});limit('auth',1,900000);now=300000;
 assert.throws(()=>limit('auth',1,900000),e=>e.status===429&&e.retryAfter===600);
 now=900000;assert.doesNotThrow(()=>limit('auth',1,900000));
});
test('registration behind ingress does not share one twelve-request quota across all players',async t=>{
 const origin='http://auth-limits.test',app=createApp({origin,trustProxy:true,databasePath:':memory:',logger:{warn(){},error(){}},supabase:{url:'https://test.supabase.co',anonKey:'sb_publishable_test',serviceKey:'sb_secret_test',fetchImpl:async()=>({ok:true,status:200,json:async()=>({user:{id:'confirmation-only'}})})}});
 t.after(()=>app.close());app.server.listen(0,'127.0.0.1');await once(app.server,'listening');const base='http://127.0.0.1:'+app.server.address().port;
 const legal=(await (await fetch(base+'/api/config')).json()).legal;
 const request=(email,ip)=>fetch(base+'/api/auth/register',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','X-Forwarded-For':ip},body:JSON.stringify({username:email,password:'test-password-1234',acceptTerms:true,...legal})});
 for(let i=1;i<=13;i++){const res=await request(`player${i}@example.com`,`203.0.113.${i}`);assert.equal(res.status,200);assert.equal((await res.json()).confirmationRequired,true);}
 for(let i=0;i<12;i++){const res=await request(`shared${i}@example.com`,'203.0.113.200');assert.equal(res.status,200);await res.json();}
 const blocked=await request('shared-new@example.com','203.0.113.200');assert.equal(blocked.status,429);assert.ok(Number(blocked.headers.get('retry-after'))>0);assert.equal((await blocked.json()).error.code,'RATE_LIMIT');
 for(let i=0;i<8;i++){const res=await request('same@example.com',`198.51.100.${i+1}`);assert.equal(res.status,200);await res.json();}
 const accountBlocked=await request('SAME@example.com','198.51.100.100');assert.equal(accountBlocked.status,429);await accountBlocked.json();
});
test('provider email quota has a distinct error and preserves Retry-After without retrying signup',async()=>{
 for(const field of ['code','error_code']){
  let calls=0;const cloud=createSupabase({url:'https://test.supabase.co',anonKey:'sb_publishable_test',serviceKey:'sb_secret_test',fetchImpl:async()=>{calls++;return {ok:false,status:429,headers:new Headers({'Retry-After':'3600'}),json:async()=>({[field]:'over_email_send_rate_limit'})};}});
  await assert.rejects(cloud.register('test@example.com','test-password-1234'),e=>e.code==='AUTH_EMAIL_RATE_LIMIT'&&e.retryAfter===3600&&/e-mails/.test(e.message));assert.equal(calls,1);
 }
});
