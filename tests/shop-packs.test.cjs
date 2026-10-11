const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const {createApp}=require('../server/app.cjs'),data=require('../src/data/collections.js'),schema=require('../src/data/skinDesign.js');
const design={primaryColor:'#123456',secondaryColor:'#ffffff',accentColor:'#abcdef',kitStyle:'SOLID',layers:[]};
test('rarity packs, exclusive eye and paid custom skins use authoritative atomic gems',async t=>{
 const app=createApp({databasePath:':memory:',logger:{warn(){},error:console.error}});t.after(()=>app.close());
 const user=(await app.auth.register({username:'pack_collector',password:'packs-password-123'})).user,uid=user.id,{db,collections,economy}=app;
 const packs=()=>collections.shop(uid).packs.filter(p=>!p.legacy);
 await t.test('five ascending gem prices, mixed cosmetics and exact disclosed weighted odds',()=>{
  const all=packs();assert.deepEqual(all.map(p=>p.rarity),['COMMON','RARE','EPIC','LEGENDARY','MAX']);
  all.forEach((p,i)=>{assert.equal(p.currency,'GEMS');assert.ok(p.remaining>0);assert.ok(p.items.every(item=>item.rarity===p.rarity));assert.ok(Math.abs(p.items.reduce((sum,x)=>sum+x.chance,0)-1)<1e-12);if(i)assert.ok(p.price>all[i-1].price);});
  assert.ok(all.some(p=>p.items.some(i=>i.category==='KIT')&&p.items.some(i=>i.category==='BALL')));
  const max=all.at(-1),eye=max.items.find(i=>i.id==='ball-20');assert.ok(eye);assert.ok(eye.chance<.001);assert.ok(max.items.filter(i=>i!==eye).every(i=>i.chance>eye.chance));
  assert.ok(all.slice(0,-1).every(p=>p.items.every(i=>i.id!=='ball-20')));
  assert.equal(db.one("SELECT enabled FROM shop_items WHERE id='ball-14'").enabled,1);
  assert.ok(db.all("SELECT enabled FROM shop_items WHERE category='BALL' AND asset_index BETWEEN 8 AND 11").every(i=>!i.enabled));
 });
 await t.test('insufficient funds roll back opening, item and ledger',()=>{
  assert.throws(()=>collections.open(uid,{packId:'pack-max',requestId:'empty-request'}));
  assert.equal(db.one('SELECT count(*) n FROM pack_openings').n,0);assert.equal(economy.wallet(uid).balance,0);
 });
 await t.test('rarity selection, one charge, no repeats, forged pack and price rejected',()=>{
  db.run('UPDATE wallets SET balance=10000 WHERE user_id=?',uid);
  for(const pack of data.packs){const body={packId:pack.id,requestId:'opening-'+pack.id},before=economy.wallet(uid).balance;
   const result=collections.open(uid,body);assert.equal(result.item.rarity,pack.rarity);assert.equal(economy.wallet(uid).balance,before-pack.price);
   assert.equal(collections.open(uid,body).item.id,result.item.id);assert.equal(economy.wallet(uid).balance,before-pack.price);
   assert.ok(!packs().find(p=>p.id===pack.id).items.some(i=>i.id===result.item.id));
  }
  assert.throws(()=>collections.open(uid,{packId:'pack-fake',requestId:'forged-pack'}));
  assert.throws(()=>collections.open(uid,{packId:'pack-common',requestId:'forged-price',price:0}));
  assert.throws(()=>collections.open(uid,{packId:'pack-max',requestId:'opening-pack-common'}));
 });
 await t.test('eye cannot bypass MAX through legacy packs or direct purchases; ownership equips it',()=>{
  for(const p of collections.shop(uid).packs.filter(p=>p.legacy))assert.ok(p.items.every(i=>i.id!=='ball-20'));
  assert.throws(()=>economy.purchase(uid,{itemId:'ball-20',requestId:'direct-eye'}));
  // A preceding random MAX opening may legitimately have awarded the eye.
  db.run("DELETE FROM inventory WHERE user_id=? AND item_id='ball-20'",uid);
  assert.throws(()=>economy.equip(uid,{itemId:'ball-20'}));
  for(const item of packs().at(-1).items.filter(i=>i.id!=='ball-20'))db.run('INSERT INTO inventory VALUES(?,?,?)',uid,item.id,Date.now());
  const only=packs().at(-1);assert.equal(only.remaining,1);assert.equal(only.items[0].chance,1);
  assert.equal(collections.open(uid,{packId:'pack-max',requestId:'last-eye-item'}).item.id,'ball-20');
  economy.equip(uid,{itemId:'ball-20'});assert.equal(app.auth.profile(uid).ball_skin,20);
  assert.throws(()=>collections.open(uid,{packId:'pack-max',requestId:'completed-max'}));
 });
 await t.test('commerce base price updates visible rarity prices and actual charges together',()=>{
  db.run('UPDATE collection_settings SET pack_price=60 WHERE id=1');
  assert.equal(packs()[0].price,60);assert.equal(packs().at(-1).price,2400);
  const before=economy.wallet(uid).balance;
  assert.equal(collections.open(uid,{packId:'pack-legendary',requestId:'updated-price'}).price,900);
  assert.equal(economy.wallet(uid).balance,before-900);
  db.run('UPDATE collection_settings SET pack_price=30 WHERE id=1');
 });
 await t.test('creation and every changed property cost gems; no-op and request retries do not double charge',()=>{
  const before=economy.wallet(uid).balance,body={name:'Minha skin',design,requestId:'skin-create'};
  const s=app.skins.save(uid,body);assert.equal(s.charged,50);assert.equal(economy.wallet(uid).balance,before-50);
  assert.equal(app.skins.save(uid,body).id,s.id);assert.equal(economy.wallet(uid).balance,before-50);
  const next={name:'Outro nome',design:{...design,primaryColor:'#654321'},requestId:'skin-change'};
  const changed=app.skins.save(uid,next,s.id);assert.equal(changed.changes,2);assert.equal(changed.charged,10);
  app.skins.save(uid,next,s.id);assert.equal(economy.wallet(uid).balance,before-60);
  assert.equal(app.skins.save(uid,{name:next.name,design:next.design},s.id).charged,0);
  assert.throws(()=>app.skins.save(uid,{...next,name:'Request alterado'},s.id));
  db.run('UPDATE wallets SET balance=0 WHERE user_id=?',uid);
  assert.throws(()=>app.skins.save(uid,{...next,name:'Sem gemas',requestId:'skin-no-money'},s.id));
  assert.equal(app.skins.list(uid)[0].name,next.name);
  const club={name:'Clube teste',...next.design,design:next.design};delete club.layers;
  const c=app.rooms.clubs.create(uid,club);assert.equal(c.design.primaryColor,next.design.primaryColor);
  assert.throws(()=>app.rooms.clubs.create(uid,{...club,primaryColor:'#ff0000'},c.id));
  assert.equal(economy.wallet(uid).balance,0);
 });
});
test('skin quotes charge each layer property and treat omitted defaults consistently',()=>{
 const l={icon:'STAR',color:'#ffffff',x:0,y:0,scale:1,rotation:0},a={name:'Skin',design:{...design,layers:[l]}};
 assert.deepEqual(schema.quote(a,{...a,design:{...a.design,layers:[{...l,x:.2,rotation:10,color:'#ff0000'}]}}),{changes:3,price:15});
 assert.equal(schema.quote(a,{...a,design:{...a.design,layers:[{...l,opacity:1,visible:true,locked:false}]}}).price,0);
 assert.equal(schema.quote(a,{...a,design:{...design,layers:[]}}).price,5);
});
test('eye follows the player in all directions and blinks at six-second intervals',()=>{
 const context=vm.createContext({});vm.runInContext(fs.readFileSync('src/ui/ballVisual.js','utf8'),context);
 const pose=context.MaxballBallVisual.eyePose,ball={x:20,y:30};
 for(const [dx,dy] of [[0,-1],[0,1],[-1,0],[1,0],[1,1],[-1,1],[1,-1],[-1,-1]]){
  const p=pose(ball,10,{x:20+dx*100,y:30+dy*100},1);assert.equal(Math.sign(p.x),Math.sign(dx));assert.equal(Math.sign(p.y),Math.sign(dy));assert.ok(Math.hypot(p.x,p.y)<=2.90000001);assert.equal(p.open,1);
 }
 assert.equal(pose(ball,10,ball,0).open,1);
 for(const time of [6,12,18]){assert.equal(pose(ball,10,ball,time).open,0);assert.equal(pose(ball,10,ball,time+.2).open,1);}
 assert.deepEqual(ball,{x:20,y:30});
});
