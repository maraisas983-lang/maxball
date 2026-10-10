const test=require('node:test'),assert=require('node:assert/strict');
const {createCakto}=require('../server/services/cakto.cjs'),{createApp}=require('../server/app.cjs');
const token=()=>Response.json({access_token:'test-private-token',token_type:'Bearer',expires_in:36000});
const catalog=()=>Response.json({count:1,next:null,results:[{id:'offer-test',name:'50 gemas',price:4.9,currency:'BRL',status:'active',product:'product-test',secret:'must-not-return'}]});
test('Cakto serializes authentication, caches tokens, expires and filters catalog responses',async()=>{
 let calls=0,time=0;const api=createCakto({clientId:'test-client',clientSecret:'test-secret',now:()=>time,fetch:async(url,options)=>{assert.equal(options.redirect,'error');if(url.endsWith('token/')){calls++;assert.equal(options.body.get('client_secret'),'test-secret');return token();}assert.equal(options.headers.Authorization,'Bearer test-private-token');return catalog();}});
 const result=await Promise.all([api.offers(),api.offers(),api.check()]);assert.equal(calls,1);assert.equal(result[0].offers[0].priceCents,490);assert.ok(!JSON.stringify(result).includes('must-not-return'));assert.ok(!JSON.stringify(result).includes('test-private-token'));
 await api.offers();assert.equal(calls,1);time=36000000;await api.offers();assert.equal(calls,2);
});
test('Cakto retries an expired token once and sanitizes provider/network errors',async()=>{
 let auth=0,gets=0;const api=createCakto({clientId:'client',clientSecret:'secret',fetch:async url=>{if(url.endsWith('token/')){auth++;return token();}gets++;return gets===1?new Response('secret-echo',{status:401}):catalog();}});
 await api.offers();assert.equal(auth,2);assert.equal(gets,2);
 for(const [status,code] of [[403,'CAKTO_SCOPE'],[429,'CAKTO_RATE'],[500,'CAKTO_UNAVAILABLE']]){const denied=createCakto({clientId:'client',clientSecret:'secret',fetch:async()=>new Response('secret-echo',{status})});await assert.rejects(denied.check(),e=>e.code===code&&!e.message.includes('secret-echo'));}
 const missing=createCakto();await assert.rejects(missing.check(),e=>e.code==='CAKTO_CONFIG');
 const broken=createCakto({clientId:'client',clientSecret:'secret',fetch:async()=>{throw Error('secret-echo');}});await assert.rejects(broken.check(),e=>e.code==='CAKTO_UNAVAILABLE'&&!e.message.includes('secret-echo'));
 await assert.rejects(api.offers(-1),e=>e.code==='CAKTO_PAGE');
});
test('Cakto catalog HTTP enforces verified commerce owner and never exposes credentials',async t=>{
 let calls=0;const app=createApp({databasePath:':memory:',cakto:{clientId:'private-client',clientSecret:'private-secret',fetch:async url=>{calls++;return url.endsWith('token/')?token():catalog();}},logger:{warn(){},error(){}}});t.after(()=>app.close());
 const owner=(await app.auth.register({username:'cakto_owner',password:'test-password-123'})).user,other=(await app.auth.register({username:'cakto_other',password:'test-password-123'})).user;
 app.db.run('INSERT INTO verified_emails VALUES(?,?)',owner.id,'maraisas983@gmail.com');app.db.run("UPDATE users SET role='SUPER_ADMIN' WHERE id=?",other.id);
 await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+app.server.address().port;
 for(const [user,status] of [[null,401],[other,403],[owner,200]]){const session=user&&app.auth.session(user.id),response=await fetch(base+'/api/command/payments/cakto',{headers:session?{cookie:'maxball_session='+session.token}:{}});assert.equal(response.status,status);const body=await response.text();for(const secret of ['private-client','private-secret','test-private-token','must-not-return'])assert.ok(!body.includes(secret));}
 assert.equal(calls,2);assert.equal(app.payments.publicConfig().apiConfigured,undefined);assert.equal(app.payments.admin(owner).apiConfigured,true);
});
