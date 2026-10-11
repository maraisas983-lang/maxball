// Run after installing Playwright locally in .work/browser (no production dependency).
const {chromium}=require('../.work/browser/node_modules/playwright');
const {createApp}=require('../server/app.cjs');
const {once}=require('node:events'),assert=require('node:assert/strict'),fs=require('node:fs'),{execFileSync}=require('node:child_process');
const out=process.env.MAXBALL_QA_DIR||'docs/qa-1.0.5';fs.mkdirSync(out,{recursive:true});
const spriteSource=source=>source.slice(source.indexOf('function drawSkin('),source.indexOf('const lum='));
(async()=>{
 const origin='http://127.0.0.1:4417',app=createApp({databasePath:':memory:',origin,logger:{warn(){},error:console.error}});let browser;
 try{
  app.server.listen(4417,'127.0.0.1');await once(app.server,'listening');
  browser=await chromium.launch({headless:true,executablePath:process.env.MAXBALL_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--disable-gpu','--renderer-process-limit=1','--js-flags=--max-old-space-size=96']});
  const context=await browser.newContext({viewport:{width:900,height:600},hasTouch:true}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin);await page.waitForFunction(()=>window.MaxballGame);await page.evaluate(()=>MaxballGame.startLocal('train',{n:1}));
  const sources={previous:spriteSource(execFileSync('git',['show','51d4664:src/legacy/game.js'],{encoding:'utf8'})),flat:spriteSource(execFileSync('git',['show','c0b4569:src/legacy/game.js'],{encoding:'utf8'})),restored:spriteSource(fs.readFileSync('src/legacy/game.js','utf8'))};
  const visual=await page.evaluate(sources=>{
   const canvas=document.createElement('canvas');canvas.width=900;canvas.height=600;const g=canvas.getContext('2d');g.fillStyle='#152a22';g.fillRect(0,0,900,600);g.textAlign='center';g.fillStyle='#fff';g.font='20px sans-serif';
   const versions=Object.entries(sources).map(([key,code])=>({key,sprite:new Function('document','MaxballSkinDesign','SK',code+';return pSpr;')(document,MaxballSkinDesign,MaxballTeams.kits)}));
   ['Anterior 1.0.2','Rejeitado 1.0.3','Atual 1.0.5'].forEach((label,i)=>g.fillText(label,150+i*300,40));
   let matched=0;for(let kit=0;kit<MaxballTeams.kits.length;kit++){const a=versions[0].sprite(kit).getContext('2d').getImageData(0,0,96,96).data,b=versions[2].sprite(kit).getContext('2d').getImageData(0,0,96,96).data;if(a.some((v,i)=>v!==b[i]))throw Error('Restored sprite differs from original kit '+kit);matched++;}
   for(let row=0;row<4;row++)versions.forEach((v,col)=>{g.drawImage(v.sprite(row),102+col*300,66+row*130);g.fillStyle='#fff';g.font='bold 26px sans-serif';g.strokeStyle='#10182b';g.lineWidth=3;g.strokeText('10',150+col*300,123+row*130);g.fillText('10',150+col*300,123+row*130);});
   return {matched,png:canvas.toDataURL('image/png')};
  },sources);
  fs.writeFileSync(out+'/player-comparison.png',Buffer.from(visual.png.split(',')[1],'base64'));console.log('PASS restored sprites pixel-identical to 1.0.2:',visual.matched);
  const sheet=await page.evaluate(()=>{
   const c=document.createElement('canvas');c.width=900;c.height=600;const g=c.getContext('2d');g.fillStyle='#257240';g.fillRect(0,0,900,600);g.fillStyle='#fff';g.font='18px sans-serif';g.fillText('Giro acumulado por deslocamento: quadros sucessivos',20,25);
   const directions=[[1,0],[-1,0],[0,-1],[0,1],[.707,.707],[-.707,.707],[.707,-.707],[-.707,-.707]];
   directions.forEach(([x,y],row)=>{const b={x:0,y:0};g.fillStyle='#fff';g.fillText(x.toFixed(1)+', '+y.toFixed(1),15,70+row*69);for(let col=0;col<8;col++){MaxballBallRotation.roll(b,x*5,y*5,8.4);const rendered={...b,x:175+col*96,y:65+row*69};MaxballBallVisual.draw(g,rendered,23,0);}});
   return c.toDataURL('image/png');
  });fs.writeFileSync(out+'/ball-directions.png',Buffer.from(sheet.split(',')[1],'base64'));
  await page.setViewportSize({width:740,height:360});
  const cdp=await context.newCDPSession(page),joy=await page.locator('#joy').boundingBox();
  const finger={id:1,x:joy.x+joy.width/2,y:joy.y+joy.height*.2,radiusX:4,radiusY:4,force:1},results=[];
  for(const [selector,action] of [['#bS','shoot'],['#bP','pass']]){
   const button=await page.locator(selector).boundingBox(),press={id:2,x:button.x+button.width/2,y:button.y+button.height/2,radiusX:4,radiusY:4,force:1};
   await page.evaluate(()=>{const s=MaxballGame.state(),p=s.P[0];s.G.phase='play';s.G.restarting=false;s.G.kl=0;p.cd=0;p.x=s.W/2;p.y=s.H/2;p.vx=p.vy=0;s.ball.x=p.x+20+s.BR;s.ball.y=p.y;s.ball.vx=s.ball.vy=0;s.ball.kickedBy=null;});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[finger,press]});
   await page.waitForFunction(()=>{const s=MaxballGame.state();return s.ball.kickedBy===s.P[0].id;});
   const result=await page.evaluate(()=>{const s=MaxballGame.state();return {vx:s.ball.vx,vy:s.ball.vy,playerVy:s.P[0].vy,headingY:s.P[0].fy};});
   assert.ok(result.vx>0&&Math.abs(result.vy)<result.vx*.3&&result.playerVy<0,JSON.stringify(result));results.push({action,...result});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[press]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }
  await page.screenshot({path:out+'/mobile-game.png'});
  assert.deepEqual(errors,[]);fs.writeFileSync(out+'/browser-results.json',JSON.stringify({matchedPlayerSprites:visual.matched,touch:results,errors},null,2)+'\n');console.log('PASS real two-finger movement upward with shot/pass to the contacting right side',results);
 }finally{await browser?.close();await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
