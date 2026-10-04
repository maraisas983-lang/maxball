const test=require('node:test'),assert=require('node:assert/strict'),{once}=require('node:events'),fs=require('node:fs');
const {createApp}=require('../server/app.cjs');
test('real HTTP room creation accepts every stadium and Final; invalid edits preserve the previous configuration',async t=>{
 const app=createApp({databasePath:':memory:',logger:{warn(){},error:console.error}});t.after(()=>app.close());const user=await app.auth.register({username:'stadium_http',password:'stadium-http-password'});app.server.listen(0,'127.0.0.1');await once(app.server,'listening');const base='http://127.0.0.1:'+app.server.address().port;
 async function request(path,method='GET',body){const r=await fetch(base+'/api'+path,{method,headers:{Origin:'http://127.0.0.1:5173',Cookie:'maxball_session='+user.token,'X-CSRF-Token':user.csrf,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,data:await r.json()};}
 for(const stadium of require('../src/data/stadiums.js').stadiums){const made=await request('/rooms','POST',{name:'Arena HTTP',password:'',n:4,time:180,fs:0,stadium:stadium.id});assert.equal(made.status,201,JSON.stringify(made.data));assert.equal(made.data.cfg.stadium,stadium.id);const invalid=await request('/rooms/'+made.data.id,'PATCH',{stadium:'missing-arena',time:60});assert.equal(invalid.status,400);assert.equal(app.rooms.current(user.user.id).cfg.time,180);await request('/rooms/leave','POST',{});}
 const final=await request('/rooms','POST',{name:'Decisão HTTP',n:4,time:300,stadium:'night',final:true,halftime:true});assert.equal(final.status,201);assert.equal(final.data.cfg.final,true);assert.equal(final.data.cfg.settings.penalties,true);
 for(const path of ['/leaderboard','/friendlies','/ranked','/profile'])assert.equal((await request(path)).status,200,path);
 const html=fs.readFileSync('index.html','utf8'),assets=[...html.matchAll(/(?:src|href)="((?:src|styles)\/[^"<>]+)"/g)].map(m=>m[1]);for(const asset of assets){const response=await fetch(base+'/'+asset);assert.equal(response.status,200,asset);}
});
test('friendly offers expire or decline without creating a room or leaving groups locked',()=>{
 const {createFriendlies}=require('../server/services/friendlies.cjs'),groups=new Map(),byPlayer=new Map();
 for(let team=0;team<2;team++){const members=Array.from({length:4},(_,i)=>({id:team+'-'+i,name:'Player '+i,ready:true})),g={leader:members[0].id,members,state:'IDLE'};groups.set(g.leader,g);for(const p of members)byPlayer.set(p.id,g);}
 const party={current:id=>byPlayer.get(id),view:id=>({group:byPlayer.get(id)}),search:u=>{const g=byPlayer.get(u.id);g.state='SEARCHING';return g;},state:(uid,state)=>byPlayer.get(uid).state=state},db={one:(sql,...args)=>sql.includes('custom_clubs')?{id:args[0],name:args[0]}:{ok:1}};
 let created=0;const service=createFriendlies({db,party,available:()=>true,connected:()=>true,createMatch:()=>{created++;return {id:'match'};}}),a={id:'0-0'},b={id:'1-0'};
 function offer(){service.search(a,{clubId:'A',penalties:true});service.search(b,{clubId:'B',penalties:true});return service.view(a.id).offer;}
 let o=offer();service.accept(a,{offerId:o.id,accepted:true});service.accept(b,{offerId:o.id,accepted:false});assert.equal(created,0);assert.equal(service.has(a.id),false);assert.equal(groups.get(a.id).state,'IDLE');
 o=offer();service.offers.get(o.id).expiresAt=Date.now()-1;service.tick();assert.equal(service.has(a.id),false);assert.equal(service.has(b.id),false);assert.equal(groups.get(b.id).state,'IDLE');assert.equal(created,0);
});
