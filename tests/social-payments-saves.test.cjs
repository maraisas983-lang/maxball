const test=require('node:test'),assert=require('node:assert/strict');
const {createApp}=require('../server/app.cjs');
const {createSocial}=require('../server/services/social.cjs');
const {createPayments}=require('../server/services/payments.cjs');
const {permit}=require('../server/services/operations.cjs');
const {createParty}=require('../server/services/party.cjs');
const {roundRobin}=require('../server/services/career.cjs');
async function fixture(t){const app=createApp({databasePath:':memory:',logger:{warn(){},error:console.error}});t.after(()=>app.close());const a=(await app.auth.register({username:'pending_a',password:'long-password-123'})).user,b=(await app.auth.register({username:'pending_b',password:'long-password-123'})).user;return {app,a,b};}
test('Cakto admin configuration, verified checkout, authenticated amounts, duplicate and refund debt',async t=>{
 const {app,a,b}=await fixture(t),admin={...a,role:'ADMIN'},payments=createPayments(app.db,app.economy,{permit,audit(){}}),secret='test-webhook-secret-123456';
 const config={enabled:true,secret,packs:[50,120,500,1200].map(gems=>({gems,offerId:'offer'+gems,checkoutUrl:'https://pay.cakto.com.br/offer'+gems,priceCents:gems*10}))};
 assert.throws(()=>payments.save(b,config));assert.throws(()=>payments.save(admin,{...config,secret:'short'}));
 assert.throws(()=>payments.save(admin,{...config,packs:config.packs.map(p=>({...p,checkoutUrl:'https://evil.test/pay'}))}));
 payments.save(admin,config);assert.equal(payments.publicConfig().secret,undefined);assert.equal(payments.admin(admin).secret,undefined);
 assert.throws(()=>payments.checkout(a,{gems:50}),e=>e.code==='PAYMENT_EMAIL');app.db.run('INSERT INTO verified_emails VALUES(?,?)',a.id,'buyer@example.com');
 assert.equal(new URL(payments.checkout(a,{gems:50}).url).searchParams.get('email'),'buyer@example.com');
 const payload={secret,event:'purchase_approved',data:{id:'order-1',status:'paid',offer:{id:'offer50'},amount:5,customer:{email:'BUYER@example.com'}}};
 assert.throws(()=>payments.webhook({...payload,secret:'bad'}),e=>e.status===401);
 assert.throws(()=>payments.webhook({...payload,data:{...payload.data,amount:1}}),e=>e.code==='PAYMENT_AMOUNT');
 payments.webhook(payload);payments.webhook(payload);assert.equal(app.economy.wallet(a.id).balance,250);assert.equal(payments.history(a.id).length,1);
 app.db.transaction(()=>app.economy.change(a.id,-240,'PURCHASE','test-spend','test-spend'));payments.webhook({...payload,event:'refund'});payments.webhook({...payload,event:'refund'});
 assert.equal(app.economy.wallet(a.id).balance,0);assert.equal(app.db.one('SELECT amount FROM gem_debts WHERE user_id=?',a.id).amount,40);
 payments.webhook(payload);assert.equal(app.economy.wallet(a.id).balance,0,'late approval cannot undo a refund');
 assert.throws(()=>app.economy.purchase(a.id,{itemId:'emote-1',requestId:'debt-purchase'}),e=>e.code==='PAYMENT_DEBT');
 app.db.transaction(()=>app.economy.change(a.id,60,'REWARD','test-reward','test-reward'));assert.equal(app.economy.wallet(a.id).balance,20);assert.equal(app.db.one('SELECT amount FROM gem_debts WHERE user_id=?',a.id).amount,0);
 const rotated=payments.rotate(admin);assert.throws(()=>payments.webhook(payload),e=>e.status===401);assert.equal(rotated.secret.length,64);
});
test('career saves isolate names, roster, money, fixtures and ownership; all clubs selectable and odd league has byes',async t=>{
 const {app,a,b}=await fixture(t),first=app.career.create(a.id,{name:'Primeiro',shirtNumber:9,clubId:'br-0',saveName:'Save A'}).career;
 assert.equal(first.roster[0].name,'Rossi');const f=app.career.nextMatch(a.id);assert.equal(f.cfg.teams[1].squad.length>=5,true);
 app.db.run('UPDATE careers SET money=777 WHERE id=?',first.id);
 const second=app.career.create(a.id,{name:'Segundo',shirtNumber:11,clubId:'mamo-20',saveName:'Save B'}).career;
 assert.notEqual(first.id,second.id);assert.equal(second.money,0);assert.equal(app.career.saves(a.id).length,2);
 assert.equal(app.career.view(a.id).current.schedule.some(f=>f.status==='BYE'),true);
 app.career.selectSave(a.id,first.id);assert.equal(app.career.view(a.id).career.money,777);assert.equal(app.career.view(a.id).career.player_name,'Primeiro');
 assert.equal(app.auth.profile(a.id).shirt_name,'pending_a');assert.throws(()=>app.career.selectSave(b.id,first.id),e=>e.status===404);
 assert.throws(()=>app.career.removeSave(a.id,first.id,{confirm:false}));app.career.renameSave(a.id,first.id,{name:'Renomeado'});app.server.listen(0,'127.0.0.1');await require('node:events').once(app.server,'listening');const session=app.auth.session(a.id),response=await fetch('http://127.0.0.1:'+app.server.address().port+'/api/career/saves/'+second.id,{method:'DELETE',headers:{Origin:'http://127.0.0.1:5173','Content-Type':'application/json',Cookie:'maxball_session='+session.token,'X-CSRF-Token':session.csrf},body:JSON.stringify({confirm:true})});assert.equal(response.status,200,JSON.stringify(await response.json()));assert.equal(app.career.saves(a.id).length,1);assert.equal(app.career.view(a.id).career.save_name,'Renomeado');
 const all=app.career.view(a.id).clubs;assert.equal(all.filter(c=>c.category==='BRASILEIRÃO').length,20);assert.equal(all.filter(c=>c.category==='MAMOBALL').length,21);
 const pairs=roundRobin(Array.from({length:21},(_,i)=>i)).flat().filter(p=>!p.includes(null));assert.equal(pairs.length,210);assert.equal(new Set(pairs.map(p=>p.sort((a,b)=>a-b).join('-'))).size,210);
});
test('chat scopes, sanitizable plain text, history, mute, spam limit and owned emotes never change game physics',async t=>{
 const {app,a,b}=await fixture(t),events=[],membership=new Map([[a.id,'room-one'],[b.id,'room-two']]),rooms={current:uid=>({id:membership.get(uid),players:[{id:uid}]}),socialBroadcast:(scope,event,allow)=>events.push({scope,event,allow})},social=createSocial(app.db,rooms,app.auth);
 social.send(a,{message:'<img src=x onerror=alert(1)>'});assert.equal(social.history(a.id).messages.length,1);assert.equal(social.history(b.id).messages.length,0);
 membership.set(b.id,'room-one');social.mute(b,{playerId:a.id,muted:true});assert.equal(social.history(b.id).messages.length,0);
 social.send(a,{message:'segunda'});assert.equal(events.at(-1).allow(b.id),false);social.send(a,{message:'terceira'});assert.throws(()=>social.send(a,{message:'quarta'}),e=>e.status===429);
 assert.throws(()=>social.send(b,{message:'x'.repeat(241)}));assert.throws(()=>app.economy.equip(a.id,{itemId:'emote-1',slot:1}),e=>e.status===403);
 app.economy.purchase(a.id,{itemId:'emote-1',requestId:'emote-purchase'});app.economy.equip(a.id,{itemId:'emote-1',slot:3});assert.equal(social.slots(a.id).find(s=>s.slot===3).emoji,'🔥');
 social.use(a,{slot:3});assert.equal(events.at(-1).event.type,'emote');assert.equal(events.at(-1).event.playerId,a.id);assert.throws(()=>social.use(a,{slot:3}),e=>e.status===429);assert.throws(()=>app.economy.equip(a.id,{itemId:'emote-1',slot:4}));app.db.run('UPDATE profiles SET effect=1 WHERE user_id=?',a.id);app.admin.action({...b,role:'ADMIN'},a.id,{action:'REMOVE_ITEM',itemId:'emote-1',reason:'Remoção para validar inventário'});assert.equal(app.auth.profile(a.id).effect,1);assert.equal(social.slots(a.id).some(s=>s.slot===3),false);
});
test('groups keep one leader, enforce ready/capacity, cancel the full queue, promote leader and recover disconnect',()=>{
 const users=Array.from({length:6},(_,i)=>({id:'p'+i,name:'P'+i})),connected=new Set(users.map(u=>u.id)),canceled=[],party=createParty({lookup:uid=>users.find(u=>u.id===uid),connected:uid=>connected.has(uid),available:()=>true,cancel:uid=>canceled.push(uid),notify(){}});
 party.ensure(users[0]);for(let i=1;i<4;i++){party.invite(users[0],users[i].id);const invite=party.view(users[i].id).invites[0];assert.throws(()=>party.accept(users[5],invite.id));party.accept(users[i],invite.id);}
 assert.equal(party.view(users[0].id).group.members.length,4);assert.throws(()=>party.invite(users[0],users[4].id));assert.throws(()=>party.search(users[0]));
 for(const u of users.slice(1,4))party.ready(u,true);assert.throws(()=>party.search(users[1]));party.search(users[0]);assert.equal(party.view(users[1].id).group.state,'SEARCHING');
 connected.delete(users[2].id);party.tick();assert.equal(party.view(users[0].id).group.state,'IDLE');assert.ok(canceled.includes(users[0].id));party.leave(users[0].id);assert.equal(party.view(users[1].id).group.leader,users[1].id);
});
test('verified career squads place the goalkeeper in goal and balanced attributes affect movement',()=>{
 const rosters=require('../src/data/rosters2026.js'),{Match}=require('../server/online/match.cjs'),{integrate}=require('../src/physics/movement.js');
 const m=new Match({id:'roster-placement',cfg:{n:5,teams:[{squad:rosters.forTeam('br-0').players},{squad:rosters.forTeam('br-1').players}]}});m.update(1/60);
 assert.equal(m.P[0].name,'Pedro');assert.equal(m.P[4].name,'Rossi');assert.equal(m.P[4].role,'GOLEIRO');assert.equal(m.P[9].name,'Carlos Miguel');
 const base={x:0,y:0,vx:0,vy:0},fast={...base,attributes:{speed:80,acceleration:80}};integrate(base,{x:1,y:0},.1);integrate(fast,{x:1,y:0},.1);assert.ok(fast.vx>base.vx);assert.equal(rosters.forTeam('br-0').players[0].ratingKind,'GAME_BALANCE');
});
