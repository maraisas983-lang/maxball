// Local test dependency: .work/browser/node_modules/playwright.
const {chromium}=require('../.work/browser/node_modules/playwright');
const {createApp}=require('../server/app.cjs'),{once}=require('node:events');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const origin='http://127.0.0.1:4418',out=process.env.MAXBALL_DB_QA_OUT||'docs/qa-1.0.9';fs.mkdirSync(out,{recursive:true});
 const app=createApp({databasePath:':memory:',origin,logger:{warn(){},error:console.error}});let browser;
 try{
  app.server.listen(4418,'127.0.0.1');await once(app.server,'listening');
  browser=await chromium.launch({headless:true,executablePath:process.env.MAXBALL_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--disable-gpu','--renderer-process-limit=1','--js-flags=--max-old-space-size=96']});
  const context=await browser.newContext({viewport:{width:740,height:360},hasTouch:true}),page=await context.newPage(),errors=[],results=[];
  page.on('pageerror',e=>errors.push(e.message));await page.goto(origin);await page.waitForFunction(()=>window.MaxballGame);await page.evaluate(()=>MaxballGame.startLocal('train',{n:1}));
  const reset=()=>page.evaluate(()=>{const s=MaxballGame.state(),p=s.P[0];s.G.phase='play';s.G.restarting=false;s.G.kl=0;p.cd=0;p.x=s.W/2;p.y=s.H/2;p.vx=p.vy=0;p.shootBuffer=p.passBuffer=0;s.ball.x=p.x+20+s.BR;s.ball.y=p.y;s.ball.vx=s.ball.vy=0;s.G.stats[p.id].passes=s.G.stats[p.id].shots=0;});
  const read=()=>page.evaluate(()=>{const s=MaxballGame.state(),p=s.P[0];return {passes:s.G.stats[p.id].passes,shots:s.G.stats[p.id].shots,vx:s.ball.vx,vy:s.ball.vy,cooldown:p.cd,distance:Math.hypot(s.ball.x-p.x,s.ball.y-p.y),impact:s.ball.impactVersion,lastPlayer:s.ball.lastPlayer,playerId:p.id};});
  const cdp=await context.newCDPSession(page),pass=await page.locator('#bP').boundingBox(),shot=await page.locator('#bS').boundingBox();
  const finger=(b,id)=>({id,x:b.x+b.width/2,y:b.y+b.height/2,radiusX:4,radiusY:4,force:1});
  await page.evaluate(()=>{window.dbInputTimes=[];for(const id of ['bP','bS'])document.getElementById(id).addEventListener('pointerdown',()=>window.dbInputTimes.push({id,at:performance.now()}));});
  await reset();const passDown=cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[finger(pass,1)]});
  await new Promise(resolve=>setTimeout(resolve,150));const shotDown=cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[finger(pass,1),finger(shot,2)]});await passDown;await shotDown;
  await page.waitForFunction(()=>{const s=MaxballGame.state(),v=s.G.stats[s.P[0].id];return v.passes===1&&v.shots===1;});results.push({control:'touch',gestureDelayMs:150,...await read()});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.waitForTimeout(200);await reset();const keyPass=page.keyboard.down('KeyG');await new Promise(resolve=>setTimeout(resolve,150));const keyShot=page.keyboard.down('KeyF');await keyPass;await keyShot;
  await page.waitForFunction(()=>{const s=MaxballGame.state(),v=s.G.stats[s.P[0].id];return v.passes===1&&v.shots===1;});results.push({control:'keyboard',gestureDelayMs:150,...await read()});
  await page.keyboard.up('KeyG');await page.keyboard.up('KeyF');
  for(const r of results){assert.equal(r.passes,1);assert.equal(r.shots,1);assert.ok(r.vx>0);assert.ok(Math.abs(r.vy)<1e-6);}
  const touchTimes=await page.evaluate(()=>window.dbInputTimes);assert.deepEqual(errors,[]);console.log('actual touch input times',touchTimes);await page.screenshot({path:out+'/db-mobile.png'});
  fs.writeFileSync(out+'/db-browser.json',JSON.stringify({results,touchTimes,errors},null,2)+'\n');console.log('PASS DB via real touch and keyboard',results);
 }finally{await browser?.close();await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
