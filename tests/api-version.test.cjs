const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),{once}=require('node:events');
const {read}=require('./helpers.cjs'),{createApp}=require('../server/app.cjs'),contract=require('../src/core/apiContract.js');
function client(fetch,hostname='127.0.0.1'){
 const context=vm.createContext({location:{protocol:'http:',hostname},AbortController,setTimeout,clearTimeout,fetch});
 vm.runInContext(read('src/core/apiContract.js'),context);vm.runInContext(read('src/services/apiClient.js'),context);return context.MaxballAPI;
}
function response(data,version=contract.version,status=200){return {ok:status<400,status,headers:{get:name=>name==='content-type'?'application/json':name==='x-maxball-api-version'?version:null},json:async()=>data};}
test('old running server is detected before any login or purchase mutation',async()=>{
 const paths=[],api=client(async(path)=>{paths.push(path);return response({authProvider:'local'},null);});
 await assert.rejects(api.request('/auth/login','POST',{}),e=>e.code==='SERVER_VERSION_MISMATCH'&&/npm.cmd run dev/.test(e.message));
 assert.deepEqual(paths,['/api/config']);
 const online=client(async()=>response({},'old-version'),'maxball.onrender.com');
 await assert.rejects(online.request('/skins'),e=>e.code==='SERVER_VERSION_MISMATCH'&&/deploy/.test(e.message));
});
test('matching version preserves auth, CSRF and genuine missing-resource errors',async()=>{
 const calls=[],api=client(async(path,options)=>{calls.push({path,options});return path==='/api/config'?response({apiVersion:contract.version}):path==='/api/auth/login'?response({csrf:'test-csrf'}):response({error:{code:'ITEM',message:'Item inexistente.'}},contract.version,404);});
 await api.request('/auth/login','POST',{});
 await assert.rejects(api.request('/shop/purchase','POST',{}),e=>e.code==='ITEM'&&e.status===404&&e.message==='Item inexistente.');
 assert.equal(calls[2].options.headers['X-CSRF-Token'],'test-csrf');
 assert.deepEqual(calls.map(c=>c.path),['/api/config','/api/auth/login','/api/shop/purchase']);
 api.clear();await api.request('/auth/login','POST',{});assert.equal(calls[3].path,'/api/config');
});
test('all main lobby routes are present in the current authenticated server',async t=>{
 const app=createApp({databasePath:':memory:',logger:{warn(){},error(){}}});t.after(()=>app.close());
 const login=await app.auth.register({username:'route_tester',password:'route-test-password-123'});
 app.server.listen(0,'127.0.0.1');await once(app.server,'listening');const url='http://127.0.0.1:'+app.server.address().port;
 const config=await fetch(url+'/api/config');assert.equal(config.headers.get('x-maxball-api-version'),contract.version);assert.equal((await config.json()).apiVersion,contract.version);
 for(const route of ['/auth/me','/ranked','/party','/profile','/chat','/emotes','/shop','/gems','/inventory','/wallet','/career','/career/saves','/skins','/championships','/clubs/directory','/clubs','/teams','/rooms','/matches','/support']){
  const res=await fetch(url+'/api'+route,{headers:{Cookie:'maxball_session='+login.token}});
  assert.equal(res.status,200,route+': '+await res.text());assert.equal(res.headers.get('x-maxball-api-version'),contract.version);
 }
 for(const route of ['/admin','/command','/command/championships','/command/payments']){
  const res=await fetch(url+'/api'+route,{headers:{Cookie:'maxball_session='+login.token}});assert.equal(res.status,403,route+' must exist and restrict players');
 }
 const unauthorized=await fetch(url+'/api/skins');assert.equal(unauthorized.status,401);assert.equal(unauthorized.headers.get('x-maxball-api-version'),contract.version);
});
