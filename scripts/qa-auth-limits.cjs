const {chromium}=require('../.work/browser/node_modules/playwright');
const {createApp}=require('../server/app.cjs'),{once}=require('node:events');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const origin='http://127.0.0.1:4430',out='docs/qa-auth-limits';let signups=0,logins=0,browser,release;
 const gate=new Promise(resolve=>{release=resolve;});
 const app=createApp({databasePath:':memory:',origin,supabase:{url:'https://fixture.supabase.co',anonKey:'fixture-public',serviceKey:'fixture-secret',fetchImpl:async url=>{
  if(url.includes('grant_type=password'))logins++;
  if(url.endsWith('/signup')){signups++;if(signups===1){await gate;return {ok:true,json:async()=>({id:'confirmation-only'})};}}
  return {ok:false,status:429,headers:new Headers({'Retry-After':'3600'}),json:async()=>({code:'over_email_send_rate_limit'})};
 }},logger:{warn(){},error:console.error}});
 try{
  app.server.listen(4430,'127.0.0.1');await once(app.server,'listening');
  browser=await chromium.launch({headless:true,executablePath:process.env.MAXBALL_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
  const context=await browser.newContext({viewport:{width:740,height:360},hasTouch:true,userAgent:'Mozilla/5.0 Android MAXBALL-Android/1'}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.goto(origin);
  const entry=page.locator('#entry');
  await entry.locator('input[name=username]').fill('preview@example.com');
  await entry.locator('input[name=password]').fill('fixture-password-123');
  await entry.locator('input[name=acceptTerms]').check();
  await entry.getByRole('button',{name:'Criar conta com esses dados'}).click();
  await page.waitForFunction(()=>document.querySelector('#entry button[type=submit]').disabled);
  // A second tap, Enter and repeated form submission during a pending signup.
  await entry.evaluate(node=>{
   [...node.querySelectorAll('button')].find(n=>n.textContent==='Criar conta com esses dados').click();
   node.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
   node.querySelector('form').requestSubmit();
  });
  release();await page.waitForFunction(()=>document.querySelector('.entry-status').textContent.includes('Confirme seu e-mail'));
  assert.equal(signups,1);assert.equal(logins,0);
  await entry.getByRole('button',{name:'Criar conta com esses dados'}).click();
  await page.waitForFunction(()=>document.querySelector('.entry-status').textContent.includes('limite de envio de e-mails'));
  assert.equal(signups,2);assert.equal(logins,0);assert.deepEqual(errors,[]);
  fs.mkdirSync(out,{recursive:true});await page.screenshot({path:out+'/email-limit.png'});
  fs.writeFileSync(out+'/result.json',JSON.stringify({signupRequests:signups,duplicateRequestsPrevented:true,loginRequests:logins,emailQuotaMessageVisible:true,viewport:{width:740,height:360},errors,provider:'local mock; no real accounts or emails'},null,2)+'\n');
  console.log('PASS mobile: concurrent auth prevented; provider email quota shown distinctly');
 }finally{release();await browser?.close();await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
