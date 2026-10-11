const {chromium}=require('../.work/browser/node_modules/playwright'),{createApp}=require('../server/app.cjs'),{once}=require('node:events'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const origin='http://127.0.0.1:4423',out='docs/qa-1.0.14',app=createApp({databasePath:':memory:',origin,logger:{warn(){},error:console.error}});let browser;fs.mkdirSync(out,{recursive:true});
 try{
  const a=await app.auth.register({username:'lobby_mobile',password:'mobile-preview-123'});app.db.run("UPDATE profiles SET display_name='JogadorMax12345',shirt_name='JogadorMax12345' WHERE user_id=?",a.user.id);app.db.run('UPDATE wallets SET balance=999999999 WHERE user_id=?',a.user.id);
  app.server.listen(4423,'127.0.0.1');await once(app.server,'listening');browser=await chromium.launch({headless:true,executablePath:process.env.MAXBALL_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--disable-gpu','--renderer-process-limit=1','--js-flags=--max-old-space-size=96']});
  const context=await browser.newContext({viewport:{width:740,height:360},hasTouch:true});await context.addCookies([{name:'maxball_session',value:a.token,url:origin}]);const page=await context.newPage(),errors=[],results=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(origin);await page.waitForFunction(()=>window.MaxballPortal);await page.evaluate(async()=>{await MaxballPortal.ready;await MaxballPortal.refreshAccount();MaxballGame.show('home');MaxballHome.refresh();});
  for(const [width,height] of [[568,240],[640,280],[568,320],[740,360],[844,390],[915,412],[1024,600],[1024,768],[1280,720],[390,844],[844,390],[740,300]]){
   await page.setViewportSize({width,height});await page.waitForTimeout(100);
   const layout=await page.evaluate(()=>{
    const home=document.querySelector('#home'),rect=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
    return {screen:rect(home),scrollWidth:home.scrollWidth,scrollHeight:home.scrollHeight,clientHeight:home.clientHeight,groups:['.home-profile','.home-wallet','.home-brand','.home-side','.home-features','.home-player','.home-bottom','.home-footer'].map(s=>({selector:s,...rect(home.querySelector(s))})),buttons:[...home.querySelectorAll('button')].filter(b=>b.getClientRects().length&&!b.closest('details:not([open])')).map(b=>({label:b.textContent.trim()||b.getAttribute('aria-label'),...rect(b)}))};
   });
   assert.equal(layout.screen.width,width);assert.equal(layout.screen.height,height);assert.ok(layout.scrollWidth<=width+1);
   if(width>height){assert.ok(layout.scrollHeight<=height+1,JSON.stringify({width,height,layout}));for(const b of [...layout.buttons,...layout.groups])assert.ok(b.x>=-1&&b.y>=-1&&b.right<=width+1&&b.bottom<=height+1,JSON.stringify({width,height,clipped:b}));
    for(let i=0;i<layout.groups.length;i++)for(let j=i+1;j<layout.groups.length;j++){const a=layout.groups[i],b=layout.groups[j];assert.ok(Math.min(a.right,b.right)-Math.max(a.x,b.x)<=1||Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)<=1,JSON.stringify({width,height,overlap:[a.selector,b.selector]}));}
   }
   const [profile,wallet]=layout.groups;assert.ok(profile.right<=wallet.x+1||wallet.right<=profile.x+1,'profile and wallet overlap');
   results.push({width,height,...layout});await page.screenshot({path:out+'/lobby-'+width+'x'+height+'.png'});
  }
  await page.setViewportSize({width:740,height:360});await page.locator('#home-fullscreen').click();await page.waitForFunction(()=>!!document.fullscreenElement);await page.evaluate(()=>document.exitFullscreen());
  await page.evaluate(()=>document.documentElement.classList.add('maxball-android'));assert.equal(await page.locator('#home-fullscreen').isVisible(),false);await page.screenshot({path:out+'/lobby-apk-740x360.png'});await page.evaluate(()=>document.documentElement.classList.remove('maxball-android'));
  await page.locator('.home-footer summary').click();await page.getByRole('button',{name:'Treino',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#portal.on')?.dataset.lobby==='training');assert.ok(await page.evaluate(()=>document.querySelector('#portal').scrollWidth<=innerWidth+1));await page.screenshot({path:out+'/training-lobby.png'});
  await page.evaluate(()=>MaxballGame.show('home'));await page.locator('[data-account-page=online]').click();await page.getByRole('button',{name:'Criar sala',exact:true}).click();await page.locator('.room-lobby').waitFor();assert.ok(await page.evaluate(()=>document.querySelector('#portal').scrollWidth<=innerWidth+1));await page.screenshot({path:out+'/room-lobby.png'});
  assert.deepEqual(errors,[]);fs.writeFileSync(out+'/layout.json',JSON.stringify({results,errors},null,2)+'\n');console.log('PASS full viewport, no overlapping lobby groups, large balance, long name, rotation and secondary lobbies');
 }finally{await browser?.close();await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
