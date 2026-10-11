const {chromium}=require('../.work/browser/node_modules/playwright'),{createApp}=require('../server/app.cjs'),{once}=require('node:events'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const origin='http://127.0.0.1:4421',out='docs/qa-1.0.11';fs.mkdirSync(out,{recursive:true});const app=createApp({databasePath:':memory:',origin,logger:{warn(){},error:console.error}});let browser;
 try{
  app.server.listen(4421,'127.0.0.1');await once(app.server,'listening');browser=await chromium.launch({headless:true,executablePath:process.env.MAXBALL_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--disable-gpu','--renderer-process-limit=1','--js-flags=--max-old-space-size=96']});
  const context=await browser.newContext({viewport:{width:740,height:360},hasTouch:true}),page=await context.newPage(),errors=[],results=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(origin);await page.waitForFunction(()=>window.MaxballGame);
  const reset=()=>page.evaluate(()=>{MaxballGame.startLocal('train',{n:1});const s=MaxballGame.state(),p=s.P[0];s.G.phase='play';s.G.restarting=false;s.G.kl=0;p.cd=0;p.x=s.W*.3;p.y=s.H/2;p.vx=p.vy=0;s.ball.x=p.x+20+s.BR+60;s.ball.y=p.y;s.ball.vx=s.ball.vy=0;});
  const read=()=>page.evaluate(()=>{const s=MaxballGame.state(),p=s.P[0],stats=s.G.stats[p.id];return {passes:stats.passes,shots:stats.shots,ball:{x:s.ball.x,y:s.ball.y,vx:s.ball.vx,vy:s.ball.vy},player:{x:p.x,y:p.y},areaRadius:MaxballInteraction.areaRadius(),wallReturn:MaxballConfig.physics.wallRestitution};});
  const cdp=await context.newCDPSession(page),finger=(id,x,y)=>({id,x,y,radiusX:4,radiusY:4,force:1});
  for(const action of ['pass','shoot']){
   await reset();const b=await page.locator(action==='pass'?'#bP':'#bS').boundingBox(),joy=await page.locator('#joy').boundingBox(),press=finger(2,b.x+b.width/2,b.y+b.height/2),center=finger(1,joy.x+joy.width/2,joy.y+joy.height/2);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[center,press]});await page.waitForTimeout(250);
   assert.equal((await read())[action==='pass'?'passes':'shots'],0);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[finger(1,center.x+joy.width*.32,center.y),press]});
   await page.waitForFunction(action=>{const s=MaxballGame.state();return s.G.stats[s.P[0].id][action==='pass'?'passes':'shots']===1;},action);
   await page.waitForTimeout(150);const result=await read();assert.equal(result[action==='pass'?'passes':'shots'],1);assert.ok(result.ball.vx>0);results.push({control:'touch joystick',action,preparedBeforeMovingMs:250,...result});await page.screenshot({path:out+'/carry-'+action+'-mobile.png'});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await reset();const key=action==='pass'?'KeyG':'KeyF';await page.keyboard.down(key);await page.waitForTimeout(250);await page.keyboard.down('KeyD');
   await page.waitForFunction(action=>{const s=MaxballGame.state();return s.G.stats[s.P[0].id][action==='pass'?'passes':'shots']===1;},action);
   const keyboard=await read();assert.equal(keyboard[action==='pass'?'passes':'shots'],1);assert.ok(keyboard.ball.vx>0);results.push({control:'keyboard',action,preparedBeforeMovingMs:250,...keyboard});await page.keyboard.up(key);await page.keyboard.up('KeyD');
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(out+'/carry-browser.json',JSON.stringify({results,errors},null,2)+'\n');console.log('PASS prepared pass and shot while carrying via touch joystick and keyboard',results);
 }finally{await browser?.close();await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
