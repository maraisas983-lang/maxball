const {chromium}=require('../.work/browser/node_modules/playwright');
const {createApp}=require('../server/app.cjs'),{once}=require('node:events'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const origin='http://127.0.0.1:4420',out='docs/qa-1.0.10';fs.mkdirSync(out,{recursive:true});
 const app=createApp({databasePath:':memory:',origin,logger:{warn(){},error:console.error}});let browser;
 try{
  app.server.listen(4420,'127.0.0.1');await once(app.server,'listening');
  browser=await chromium.launch({headless:true,executablePath:process.env.MAXBALL_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--disable-gpu','--renderer-process-limit=1','--js-flags=--max-old-space-size=96']});
  const context=await browser.newContext({viewport:{width:740,height:360},hasTouch:true}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin);await page.waitForFunction(()=>window.MaxballGame);await page.evaluate(()=>MaxballGame.startLocal('train',{n:1}));
  await page.evaluate(()=>{
   const s=MaxballGame.state(),p=s.P[0];s.G.phase='play';s.G.restarting=false;s.G.kl=0;p.cd=0;p.x=s.W/2;p.y=s.H/2;s.ball.x=p.x+200;s.ball.y=p.y;s.ball.vx=s.ball.vy=0;
   window.areaPaint={idle:0,flash:0};const c=document.getElementById('cv'),g=c.getContext('2d'),arc=g.arc.bind(g),stroke=g.stroke.bind(g);let radius=0;
   g.arc=(...args)=>{radius=args[2];return arc(...args);};g.stroke=(...args)=>{
    if(Math.abs(radius-(MaxballInteraction.areaRadius()-.5))<1e-8){
     const bright=g.strokeStyle==='rgba(255, 255, 255, 0.95)';window.areaPaint[bright?'flash':'idle']++;
     if(bright&&!window.areaPulseFrame)queueMicrotask(()=>{window.areaPulseFrame ||= c.toDataURL('image/png');});
    }
    return stroke(...args);
   };
  });
  await page.waitForFunction(()=>window.areaPaint.idle>0);const idle=await page.locator('#cv').evaluate(c=>c.toDataURL('image/png'));
  const cdp=await context.newCDPSession(page),pass=await page.locator('#bP').boundingBox();
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:pass.x+pass.width/2,y:pass.y+pass.height/2}]});
  await page.waitForFunction(()=>window.areaPulseFrame);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.waitForTimeout(220);
  const flashesBeforeKeyboard=await page.evaluate(()=>window.areaPaint.flash);
  await page.keyboard.down('KeyF');await page.keyboard.up('KeyF');
  await page.waitForFunction(before=>window.areaPaint.flash>before,flashesBeforeKeyboard);
  const result=await page.evaluate(()=>{const s=MaxballGame.state(),p=s.P[0];return {ballRadius:s.BR,playerRadius:MaxballConfig.physics.playerRadius,areaRadius:MaxballInteraction.areaRadius(),paint:window.areaPaint,stats:s.G.stats[p.id]};});
  assert.equal(result.stats.passes,0);assert.equal(result.stats.shots,0);assert.ok(result.paint.flash>0);assert.ok(result.paint.idle>0);
  fs.writeFileSync(out+'/area-idle.png',Buffer.from(idle.split(',')[1],'base64'));fs.writeFileSync(out+'/area-flash.png',Buffer.from((await page.evaluate(()=>window.areaPulseFrame)).split(',')[1],'base64'));
  await page.evaluate(()=>{const s=MaxballGame.state();s.ball.x=s.W/2;s.ball.y=s.BR+.01;s.ball.vx=0;s.ball.vy=-360;});
  await page.waitForFunction(()=>MaxballGame.state().ball.vy>0);
  result.wallReturn=await page.evaluate(()=>{const s=MaxballGame.state();return {vx:s.ball.vx,vy:s.ball.vy,restitution:MaxballConfig.physics.wallRestitution};});
  assert.ok(result.wallReturn.vy>180&&result.wallReturn.vy<360);assert.deepEqual(errors,[]);
  fs.writeFileSync(out+'/area-browser.json',JSON.stringify({result,errors},null,2)+'\n');console.log('PASS transparent action area, missed-press pulse, size and concrete wall',result);
 }finally{await browser?.close();await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
