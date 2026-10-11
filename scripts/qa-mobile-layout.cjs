const {chromium}=require('../.work/browser/node_modules/playwright');
const {createApp}=require('../server/app.cjs');
const {once}=require('events'),assert=require('assert/strict');
const fs=require('node:fs'),out=process.env.MAXBALL_QA_DIR||'docs/qa-1.0.5';fs.mkdirSync(out,{recursive:true});
(async()=>{
 const origin='http://127.0.0.1:4416',app=createApp({databasePath:':memory:',origin,logger:{warn(){},error:console.error}});let browser;
 try{
  app.server.listen(4416,'127.0.0.1');await once(app.server,'listening');
  const account=await app.auth.register({username:'mobile_qa',password:'test-only-mobile-qa-123'});
  browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--disable-gpu','--renderer-process-limit=1','--js-flags=--max-old-space-size=96']});
  const context=await browser.newContext({viewport:{width:740,height:360},hasTouch:true,userAgent:'Mozilla/5.0 Android MAXBALL-Android/1'});
  await context.addCookies([{name:'maxball_session',value:account.token,url:origin}]);
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.stack);});
  page.on('requestfailed',r=>console.log('FAILED REQUEST',r.url(),r.failure()?.errorText));
  page.on('response',r=>{if(r.status()>=400)console.log('HTTP',r.status(),r.url());});
  await page.goto(origin);console.log('Page loaded');await page.waitForFunction(()=>window.MaxballGame&&window.MaxballPortal);
  await page.evaluate(()=>MaxballGame.show('home'));
  for(const [width,height] of [[568,320],[640,360],[740,360],[844,390],[915,412],[1280,720]]){
   await page.setViewportSize({width,height});
   const layout=await page.evaluate(()=>{
    const home=document.querySelector('#home'),r=home.getBoundingClientRect();
    return {width:r.width,height:r.height,scrollHeight:home.scrollHeight,clientHeight:home.clientHeight,buttons:[...home.querySelectorAll('button')].filter(b=>b.getClientRects().length&&getComputedStyle(b).visibility!=='hidden'&&!b.closest('details:not([open])')).map(b=>{const r=b.getBoundingClientRect();return {text:b.textContent.trim(),x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};})};
   });
   assert.equal(layout.width,width);assert.equal(layout.height,height);assert.ok(layout.scrollHeight<=height+1,JSON.stringify({width,height,layout}));
   for(const b of layout.buttons)assert.ok(b.x>=-1&&b.y>=-1&&b.right<=width+1&&b.bottom<=height+1,JSON.stringify({width,height,b}));
   for(let i=0;i<layout.buttons.length;i++)for(let j=i+1;j<layout.buttons.length;j++){const a=layout.buttons[i],b=layout.buttons[j];assert.ok(Math.min(a.right,b.right)-Math.max(a.x,b.x)<=1||Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)<=1,JSON.stringify({width,height,overlap:[a.text,b.text]}));}
   await page.screenshot({path:out+'/mobile-home-'+width+'.png'});console.log('PASS full viewport and non-overlapping home controls',width,height);
  }
  await page.setViewportSize({width:740,height:360});
  await page.locator('[data-go=ctl]').first().click();await page.screenshot({path:out+'/mobile-controls.png'});
  const before=await page.evaluate(()=>MaxballGame.controlSettings());
  await page.locator('#r0').focus();await page.keyboard.press('End');
  const after=await page.evaluate(()=>MaxballGame.controlSettings());assert.equal(after.j.s,2);assert.deepEqual(after.s,before.s);assert.deepEqual(after.p,before.p);
  await page.locator('#r1').focus();await page.keyboard.press('Home');
  assert.equal(await page.evaluate(()=>MaxballGame.controlSettings().s.s),.6);
  await page.locator('#crst').click();await page.locator('#cpan [data-go=home]').click();
  await page.evaluate(()=>MaxballPortal.open('play'));await page.screenshot({path:out+'/mobile-mode-lobby.png'});
  assert.ok(await page.evaluate(()=>document.querySelector('#portal').scrollWidth<=innerWidth+1));
  await page.evaluate(()=>MaxballPortal.open('online'));await page.getByRole('button',{name:'Criar sala',exact:true}).click();await page.locator('.room-lobby').waitFor();await page.screenshot({path:out+'/mobile-room.png'});
  assert.ok(await page.evaluate(()=>document.querySelector('#portal').scrollWidth<=innerWidth+1));await page.getByRole('button',{name:'Sair da sala',exact:true}).click();
  await page.evaluate(()=>MaxballGame.startLocal('train',{n:1}));await page.locator('#gset').click();
  await page.locator('#gpan [data-control-size=p]').focus();await page.keyboard.press('End');
  assert.equal(await page.evaluate(()=>MaxballGame.controlSettings().p.s),2);await page.screenshot({path:out+'/mobile-match-settings.png'});
  await page.locator('#zok').click();await page.evaluate(()=>{MaxballGame.setControlSize('p',1);const s=MaxballGame.state();s.G.restarting=false;const p=s.P[0];p.x=s.W/2;p.y=s.H/2;p.vx=p.vy=0;s.ball.x=p.x;s.ball.y=p.y+20+s.BR;s.ball.vx=s.ball.vy=0;});
  await page.keyboard.down('ArrowDown');await page.keyboard.down('KeyF');
  await page.waitForFunction(()=>{const s=MaxballGame.state();return s.ball.kickedBy===s.P[0].id;});
  const kick=await page.evaluate(()=>{const s=MaxballGame.state();return {vx:s.ball.vx,vy:s.ball.vy};});assert.ok(kick.vy>0&&Math.abs(kick.vx)<1,kick);
  await page.keyboard.up('KeyF');await page.keyboard.up('ArrowDown');await page.screenshot({path:out+'/mobile-gameplay.png'});
  const cdp=await context.newCDPSession(page),joy=await page.locator('#joy').boundingBox(),shot=await page.locator('#bS').boundingBox(),pass=await page.locator('#bP').boundingBox();
  const finger={id:1,x:joy.x+joy.width/2,y:joy.y+joy.height*.8,radiusX:4,radiusY:4,force:1};
  assert.ok(await page.evaluate(({x,y})=>!!document.elementFromPoint(x,y)?.closest('#joy'),finger),'no menu or chat button may cover the joystick touch area');
  for(const [button,type] of [[shot,'s'],[pass,'p']]){
   await page.evaluate(()=>{const s=MaxballGame.state(),p=s.P[0];s.G.kl=0;p.cd=0;p.x=s.W/2;p.y=s.H/2;p.vx=p.vy=0;s.ball.kickedBy=null;s.ball.x=p.x;s.ball.y=p.y+20+s.BR;s.ball.vx=s.ball.vy=0;});
   const action={id:2,x:button.x+button.width/2,y:button.y+button.height/2,radiusX:4,radiusY:4,force:1};
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[finger,action]});
   await page.waitForFunction(()=>{const s=MaxballGame.state();return s.ball.kickedBy===s.P[0].id;});
   const direction=await page.evaluate(()=>{const s=MaxballGame.state();return {vx:s.ball.vx,vy:s.ball.vy,py:s.P[0].vy};});assert.ok(direction.vy>0&&Math.abs(direction.vx)<1&&direction.py>0,JSON.stringify({type,direction}));
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[action]});
   await page.waitForFunction(()=>MaxballGame.state().P[0].vy>0);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await page.waitForFunction(()=>MaxballGame.state().P[0].vy===0);
  }
  await page.evaluate(()=>MaxballGame.show('home'));await page.setViewportSize({width:390,height:844});await page.screenshot({path:out+'/mobile-portrait-fallback.png'});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);console.log('PASS controls, in-game independent sliders, movement+shot, portrait fallback; no runtime errors');
 }finally{await browser?.close();await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
