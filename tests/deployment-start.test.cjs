const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawn}=require('node:child_process'),{once}=require('node:events');

test('Render production startup binds publicly, derives HTTPS origin and migrates a fresh database',async t=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'maxball-deploy-'));
 const server=spawn(process.execPath,[path.resolve('server/index.cjs')],{cwd:directory,windowsHide:true,env:{...process.env,NODE_ENV:'production',HOST:'',PORT:'0',PUBLIC_ORIGIN:' ',RENDER_EXTERNAL_HOSTNAME:'maxball-deploy-test.onrender.com',DATABASE_PATH:path.join(directory,'data','maxball.sqlite'),AUTH_PROVIDER:'local',ADMIN_EMAILS:''},stdio:['ignore','pipe','pipe']});
 t.after(async()=>{if(server.exitCode===null){server.kill();await once(server,'exit');}assert.equal(path.dirname(directory),path.resolve(os.tmpdir()));assert.ok(path.basename(directory).startsWith('maxball-deploy-'));fs.rmSync(directory,{recursive:true,force:true});});
 let output='',errors='';server.stderr.on('data',data=>errors+=data);
 const listening=await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error('Startup timed out: '+errors)),15000);
  server.on('exit',code=>{clearTimeout(timer);reject(Error('Startup exited '+code+': '+errors));});
  server.stdout.on('data',data=>{output+=data;for(const line of output.split('\n')){try{const message=JSON.parse(line);if(message.event==='listening'){clearTimeout(timer);resolve(message);}}catch{}}});
 });
 assert.equal(listening.host,'0.0.0.0');assert.equal(listening.url,'https://maxball-deploy-test.onrender.com');assert.ok(listening.port>0);
 const response=await fetch('http://127.0.0.1:'+listening.port+'/api/health');assert.equal(response.status,200);assert.deepEqual(await response.json(),{ok:true});assert.ok(fs.existsSync(path.join(directory,'data','maxball.sqlite')));
});
