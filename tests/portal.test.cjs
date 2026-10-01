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
 await portal.open('career');assert.ok(window.document.querySelector('.login-card'));
 window.document.querySelector('[name=username]').value='ui_player';window.document.querySelector('[name=password]').value='ui-password-1234';
 const button=label=>[...window.document.querySelectorAll('#portal button')].find(b=>b.textContent===label);
 button('Criar conta com esses dados').click();
 try{await until(()=>window.document.querySelector('[name=clubId]'),'career creation form');}catch(error){console.error('UI status:',window.document.querySelector('#portal-status').textContent,'errors:',errors);throw error;}
 window.document.querySelector('[name=name]').value='POGGI';
 window.document.querySelector('.sport-form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));
 await until(()=>button('Entrar em campo'),'career fixture');assert.match(window.document.querySelector('#portal-content').textContent,/Aurora FC/);
 await portal.open('shop');assert.ok(window.document.querySelectorAll('.cosmetic-grid canvas').length>=22);
 const buy=button('Comprar');buy.click();await until(()=>portal.account.wallet.balance<200,'purchase');
 await portal.open('inventory');const equip=button('Equipar');if(equip){equip.click();await until(()=>!equip.disabled,'equip');}
 await portal.open('profile');assert.equal(window.document.querySelector('[name=shirtName]').value,'POGGI');
 app.db.run("UPDATE users SET role='SUPER_ADMIN' WHERE id=?",portal.account.user.id);await portal.refreshAccount();await portal.open('admin');assert.match(window.document.querySelector('#portal-content').textContent,/Administração MAXBALL/);
 await portal.open('career');button('Entrar em campo').click();
 await until(()=>window.document.querySelector('#game').classList.contains('on'),'live match');
 await until(()=>window.MaxballGame.input()!==null,'remote controls');
 const room=[...app.rooms.rooms.values()][0];assert.equal(room.kind,'CAREER');
 // Advance the authoritative clock to completion; the client never submits a result.
 room.match.G.score=[2,0];room.match.G.time=0;room.match.finish();app.rooms.persistResult(room);
 await until(()=>window.document.querySelector('#res').classList.contains('on'),'match result overlay');
 window.document.querySelector('#menu').click();await until(()=>window.document.querySelector('#portal').classList.contains('on'),'return to career');
 await until(()=>/Rodada 2/.test(window.document.querySelector('#portal-content').textContent),'next fixture');
 assert.equal(app.career.view(portal.account.user.id).career.stats.matches,1);
 assert.deepEqual(errors,[]);
});
test('snapshot interpolation uses buffered positions and resets for a new match',()=>{
 const buffer=new SnapshotBuffer(50),state=x=>({matchId:'one',P:[{id:'a',x,y:0}],ball:{x,y:10}});
 buffer.push(state(0),0);buffer.push(state(100),100);assert.equal(buffer.sample(100).P[0].x,50);assert.equal(buffer.sample(100).ball.x,50);
 buffer.push({...state(9),matchId:'two'},110);assert.equal(buffer.sample(110).P[0].x,9);
});
