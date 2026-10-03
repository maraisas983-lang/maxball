const test=require('node:test'),assert=require('node:assert/strict');
const {JSDOM,CookieJar}=require('jsdom');
const {once}=require('node:events');
const WebSocket=require('ws');
const {createApp}=require('../server/app.cjs');
const {read,Element}=require('./helpers.cjs');
const {SnapshotBuffer}=require('../src/online/snapshotBuffer.js');
async function until(predicate,description,timeout=7000){
 const end=Date.now()+timeout;
 while(Date.now()<end){if(predicate())return;await new Promise(resolve=>setTimeout(resolve,20));}
 assert.fail('Timeout: '+description);
}
test('account UI creates career, purchases/equips, renders admin and plays a server match',async t=>{
 const origin='http://maxball.test',app=createApp({databasePath:':memory:',origin,logger:{warn(){},error:console.error}});
 app.server.listen(0,'127.0.0.1');await once(app.server,'listening');
 const base='http://127.0.0.1:'+app.server.address().port,jar=new CookieJar();
 const dom=new JSDOM(read('index.html'),{url:base,runScripts:'outside-only',pretendToBeVisual:true,cookieJar:jar});
 const {window}=dom,errors=[];t.after(async()=>{window.MaxballPortal?.connection.close();window.close();await app.close();});
 window.addEventListener('error',event=>errors.push(event.error));
 window.matchMedia=()=>({matches:false});window.HTMLCanvasElement.prototype.getContext=function(){return new Element().getContext()};
 window.AbortController=AbortController;
 window.HTMLDialogElement.prototype.showModal=function(){this.open=true};window.HTMLDialogElement.prototype.close=function(){this.open=false};
 window.fetch=async(url,options={})=>{
  const response=await fetch(new URL(url,base),{...options,headers:{...options.headers,Origin:origin,Cookie:jar.getCookieStringSync(base)}});
  for(const cookie of response.headers.getSetCookie())jar.setCookieSync(cookie,base);
  return response;
 };
 window.WebSocket=class extends WebSocket{constructor(url){super(url,{origin,headers:{Cookie:jar.getCookieStringSync(base)}})}};
 Object.defineProperty(window.document,'fonts',{value:{ready:Promise.resolve()}});
 for(const file of [...read('index.html').matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]))window.eval(read(file));
 const portal=window.MaxballPortal;
 for(const mode of ['play','training','local','support','ranked']){
  await portal.open(mode);
  assert.equal(window.document.querySelector('#portal').dataset.lobby,mode);
  assert.equal(window.document.querySelector('#portal-nav .tab'),null,'modes do not share a tab bar');
  assert.ok(window.document.querySelector('.lobby-cover'),'destination identity remains visible, including login');
 }
 await portal.open('training');assert.ok(window.document.querySelector('[name=n]'),'guest can configure training format');
 await portal.open('play');window.document.querySelector('[data-mode=local] button').click();
 await until(()=>window.document.querySelector('#portal').dataset.lobby==='local'&&window.document.querySelector('[name=players]'),'mode selector opens the local lobby');
 await portal.open('career');assert.ok(window.document.querySelector('.login-card'));
 window.document.querySelector('[name=username]').value='ui_player';window.document.querySelector('[name=password]').value='ui-password-1234';
 const button=label=>[...window.document.querySelectorAll('#portal button')].find(b=>b.textContent===label);
 const acceptance=window.document.querySelector('[name=acceptTerms]');assert.equal(button('Criar conta com esses dados').disabled,true);acceptance.checked=true;acceptance.dispatchEvent(new window.Event('change'));
 button('Criar conta com esses dados').click();
 try{await until(()=>window.document.querySelector('[name=clubId]'),'career creation form');}catch(error){console.error('UI status:',window.document.querySelector('#portal-status').textContent,'errors:',errors);throw error;}
 window.document.querySelector('[name=name]').value='POGGI';
 window.document.querySelector('.sport-form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));
 await until(()=>button('Entrar em campo'),'career fixture');assert.match(window.document.querySelector('#portal-content').textContent,/Flamengo/);
 await portal.open('shop');assert.ok(window.document.querySelectorAll('.cosmetic-grid canvas').length>=22);
 const buy=button('Comprar');buy.click();await until(()=>portal.account.wallet.balance<200,'purchase');
 await portal.open('inventory');const equip=button('Equipar');if(equip){equip.click();await until(()=>!equip.disabled,'equip');}
 await portal.open('profile');assert.equal(window.document.querySelector('[name=shirtName]').value,'ui_player');
 await portal.open('support');assert.ok(window.document.querySelector('[name=description]'));assert.equal(window.document.querySelector('#portal').dataset.lobby,'support');
 app.db.run("UPDATE users SET role='SUPER_ADMIN' WHERE id=?",portal.account.user.id);await portal.refreshAccount();await portal.open('admin');assert.match(window.document.querySelector('#portal-content').textContent,/Administração MAXBALL/);
 await portal.open('career');button('Entrar em campo').click();
 await until(()=>window.document.querySelector('#game').classList.contains('on'),'live match');
 await until(()=>window.MaxballGame.input()!==null,'remote controls');
 const room=[...app.rooms.rooms.values()][0];assert.equal(room.kind,'CAREER');
 window.document.dispatchEvent(new window.KeyboardEvent('keydown',{code:'KeyT',bubbles:true}));await until(()=>window.document.querySelectorAll('.emote-bar button').length===4,'in-game chat and equipped slots');
 const chat=window.document.querySelector('.game-chat');chat.querySelector('input').value='<img src=x onerror=alert(1)>';chat.querySelector('form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));await until(()=>chat.querySelector('.chat-history').textContent.includes('<img src=x onerror=alert(1)>'),'server chat delivered');assert.equal(chat.querySelector('.chat-history img'),null);
 window.dispatchEvent(new window.KeyboardEvent('keydown',{code:'KeyW',bubbles:true}));assert.equal(window.MaxballGame.input().x,0);assert.equal(window.MaxballGame.input().y,0);window.document.dispatchEvent(new window.KeyboardEvent('keydown',{code:'Escape',bubbles:true}));assert.equal(window.document.querySelector('.game-chat'),null);assert.equal(window.document.querySelector('#game.on')!==null,true);
 // Advance the authoritative clock to completion; the client never submits a result.
 room.match.G.score=[2,0];room.match.G.time=0;room.match.finish();app.rooms.persistResult(room);
 await until(()=>window.document.querySelector('#res').classList.contains('on'),'match result overlay');
 window.document.querySelector('#menu').click();await until(()=>window.document.querySelector('#portal').classList.contains('on'),'return to career');
 await until(()=>/Rodada 2/.test(window.document.querySelector('#portal-content').textContent),'next fixture');
 assert.equal(app.career.view(portal.account.user.id).career.stats.matches,1);
 await portal.open('online');button('Criar sala').click();await until(()=>window.document.querySelector('.room-lobby'),'custom room lobby');
 app.rooms.leave(portal.account.user.id);portal.connection.onMessage({type:'connected',room:null});
 await until(()=>button('Criar sala'),'stale lobby cleared after server lost the room');
 await portal.open('ranked');assert.equal(app.rooms.rankedStatus(portal.account.user).queued,false);button('Buscar partida').click();await until(()=>app.rooms.rankedStatus(portal.account.user).queued,'explicit ranked search');
 button('Cancelar busca').click();await until(()=>!app.rooms.rankedStatus(portal.account.user).queued,'cancel ranked queue');
 button('Buscar partida').click();await until(()=>app.rooms.rankedStatus(portal.account.user).queued,'join ranked queue again');
 const opponent=await app.auth.register({username:'ranked_opponent',password:'opponent-password-123'});
 const ws=new WebSocket(base.replace('http','ws')+'/ws',{origin,headers:{Cookie:'maxball_session='+opponent.token}});t.after(()=>ws.terminate());await once(ws,'open');
 let opponentSnapshot=null;ws.on('message',data=>{const message=JSON.parse(data);if(message.type==='snapshot')opponentSnapshot=message.state;});
 app.rooms.rankedJoin(opponent.user);app.rooms.pairRanked();
 await until(()=>window.document.querySelector('#game').classList.contains('on')&&opponentSnapshot?.cfg.ranked,'two ranked clients playing');
 const rankedRoom=[...app.rooms.rooms.values()].find(r=>r.ranked);assert.equal(opponentSnapshot.matchId,rankedRoom.match.id);
 ws.terminate();await until(()=>rankedRoom.absent?.[opponent.user.id],'disconnect grace');
 assert.notEqual(rankedRoom.match.G.phase,'end');
 rankedRoom.absent[opponent.user.id]=Date.now()-21000;
 await until(()=>rankedRoom.saved,'ranked disconnect result');assert.equal(rankedRoom.match.G.reason,'FORFEIT');
 assert.equal(app.auth.profile(portal.account.user.id).rating,1016);assert.equal(app.auth.profile(opponent.user.id).rating,984);
 portal.connection.onMessage({type:'connected',room:null});await until(()=>window.document.querySelector('#portal').classList.contains('on'),'return from a lost remote match');
 assert.deepEqual(errors,[]);
});
test('snapshot interpolation uses buffered positions and resets for a new match',()=>{
 const buffer=new SnapshotBuffer(50),state=x=>({matchId:'one',P:[{id:'a',x,y:0}],ball:{x,y:10}});
 buffer.push(state(0),0);buffer.push(state(100),100);assert.equal(buffer.sample(100).P[0].x,50);assert.equal(buffer.sample(100).ball.x,50);
 buffer.push({...state(9),matchId:'two'},110);assert.equal(buffer.sample(110).P[0].x,9);
});
