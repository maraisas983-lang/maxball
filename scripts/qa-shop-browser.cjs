// Real browser + real HTTP economy against an isolated in-memory test database.
const {chromium}=require('../.work/browser/node_modules/playwright');
const {createApp}=require('../server/app.cjs'),{once}=require('node:events');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const origin='http://127.0.0.1:4419',out='docs/qa-1.0.8';fs.mkdirSync(out,{recursive:true});
 const app=createApp({databasePath:':memory:',origin,logger:{warn(){},error:console.error}});let browser;
 try{
  const account=await app.auth.register({username:'shop_browser',password:'shop-browser-test-123'}),uid=account.user.id;
  app.db.transaction(()=>app.economy.change(uid,5000,'ADMIN_GRANT','browser-test','browser-test'));
  app.server.listen(4419,'127.0.0.1');await once(app.server,'listening');
  browser=await chromium.launch({headless:true,executablePath:process.env.MAXBALL_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--disable-gpu','--renderer-process-limit=1','--js-flags=--max-old-space-size=96']});
  const context=await browser.newContext({viewport:{width:740,height:360},hasTouch:true}),errors=[];
  await context.addCookies([{name:'maxball_session',value:account.token,url:origin}]);
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(origin);await page.waitForFunction(()=>window.MaxballPortal);
  await page.evaluate(()=>MaxballPortal.open('shop'));await page.locator('[data-pack="pack-max"]').waitFor();
  assert.equal(await page.locator('[data-pack]').count(),5);
  await page.locator('[data-pack="pack-common"]').scrollIntoViewIfNeeded();await page.screenshot({path:out+'/shop-mobile.png'});
  await page.setViewportSize({width:1280,height:720});await page.screenshot({path:out+'/shop-desktop.png'});
  await page.setViewportSize({width:740,height:360});
  await page.locator('[data-pack="pack-max"] button').click();await page.locator('dialog[open]').waitFor();
  assert.ok((await page.locator('dialog').innerText()).includes('Bola de olho'));
  assert.ok((await page.locator('dialog').innerText()).includes('0.0200%'));
  await page.screenshot({path:out+'/max-pack-mobile.png'});
  await page.locator('dialog button').filter({hasText:'Fechar'}).click();
  await page.locator('[data-pack="pack-common"] button').click();
  await page.locator('dialog button').filter({hasText:'Abrir por'}).click();
  await page.getByRole('heading',{name:'Novo item!',exact:true}).waitFor();
  assert.equal(app.economy.wallet(uid).balance,4970);
  await page.locator('dialog button').filter({hasText:'Fechar'}).click();
  await page.evaluate(()=>MaxballPortal.open('skins'));await page.getByRole('button',{name:'Salvar skin',exact:true}).waitFor();
  assert.ok((await page.locator('#portal-content').innerText()).includes('50 gemas para salvar'));
  await page.getByRole('button',{name:'Salvar skin',exact:true}).click();await page.getByRole('button',{name:'Editar',exact:true}).waitFor();
  assert.equal(app.economy.wallet(uid).balance,4920);
  await page.getByRole('button',{name:'Editar',exact:true}).click();await page.locator('#portal-content input[name="name"]').fill('Skin alterada');
  await page.waitForFunction(()=>document.querySelector('#portal-content').textContent.includes('5 gemas para salvar'));
  await page.screenshot({path:out+'/skin-price-mobile.png'});
  await page.getByRole('button',{name:'Salvar alterações',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#portal-content').textContent.includes('Skin alterada'));
  assert.equal(app.economy.wallet(uid).balance,4915);
  app.db.run('INSERT OR IGNORE INTO inventory VALUES(?,?,?)',uid,'ball-20',Date.now());
  await page.evaluate(()=>MaxballPortal.open('inventory'));
  const eye=page.locator('.sport-card').filter({has:page.getByRole('heading',{name:'Bola de olho',exact:true})});await eye.getByRole('button',{name:'Equipar',exact:true}).click();
  assert.equal(app.auth.profile(uid).ball_skin,20);
  await page.evaluate(()=>MaxballGame.startLocal('train',{n:1}));await page.screenshot({path:out+'/eye-match-mobile.png'});
  await page.evaluate(()=>{
   const c=document.createElement('canvas');c.id='balls-qa';c.width=640;c.height=180;c.style='position:fixed;inset:0;z-index:99999;background:#102441';document.body.append(c);const g=c.getContext('2d');
   [13,14,17,20].forEach((skin,i)=>{MaxballBallVisual.draw(g,{x:80+i*160,y:75,qw:1},55,skin,{time:1,target:{x:500,y:20}});g.fillStyle='#fff';g.font='14px sans-serif';g.textAlign='center';g.fillText(MaxballCollections.balls[skin].name,80+i*160,150);});
  });await page.screenshot({path:out+'/ball-designs.png'});await page.locator('#balls-qa').evaluate(c=>c.remove());
  // Deterministic visual frames also verify the closed eyelid and both gaze directions.
  await page.evaluate(()=>{
   const c=document.createElement('canvas');c.id='eye-qa';c.width=540;c.height=160;c.style='position:fixed;inset:0;z-index:99999;background:#102441';document.body.append(c);const g=c.getContext('2d');
   [1,6,6.3].forEach((time,i)=>{MaxballBallVisual.draw(g,{x:90+i*180,y:75,qw:1},55,20,{time,target:{x:i===0?0:700,y:30}});g.fillStyle='#fff';g.font='14px sans-serif';g.fillText(time+' s',65+i*180,150);});
  });await page.screenshot({path:out+'/eye-gaze-blink.png'});
  assert.deepEqual(errors,[]);fs.writeFileSync(out+'/browser.json',JSON.stringify({viewport:'740x360 touch',packCount:5,balance:app.economy.wallet(uid).balance,eyeEquipped:true,errors},null,2)+'\n');
  console.log('PASS shop, opening, skin charges, inventory equip, eye preview and match; no browser errors');
 }finally{await browser?.close();await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
