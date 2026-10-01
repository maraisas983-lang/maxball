const http=require('node:http');
const fs=require('node:fs/promises');
const path=require('node:path');
const {openDatabase}=require('./database/index.cjs');
const {createEconomy}=require('./services/economy.cjs');
const {createAuth}=require('./services/auth.cjs');
const {createCareer}=require('./services/career.cjs');
const {createAdmin}=require('./services/admin.cjs');
const {createRooms}=require('./online/rooms.cjs');
const {AppError,fail,object}=require('./lib/validation.cjs');
const ROOT=path.resolve(__dirname,'..');

function createApp({databasePath='var/maxball.sqlite',origin='http://127.0.0.1:5173',production=false,logger=console,sessionMs}={}){
 if(production&&!origin.startsWith('https://'))throw new Error('Production requires an HTTPS PUBLIC_ORIGIN');
 const db=openDatabase(databasePath),economy=createEconomy(db),auth=createAuth(db,economy,{sessionMs}),career=createCareer(db,economy),admin=createAdmin(db,economy);
 db.run("UPDATE matches SET status='ABANDONED',finished_at=? WHERE status='RUNNING'",Date.now());
 const rooms=createRooms({db,auth,economy,career,origin,logger}),limits=new Map();
 const token=req=>(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('maxball_session='))?.slice(16);
 const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
 function cookie(res,value,maxAge=7*86400){res.setHeader('Set-Cookie',`maxball_session=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${production?'; Secure':''}`);}
 function limit(key,max,window){
  const now=Date.now();let bucket=limits.get(key);
  if(!bucket||bucket.until<now){bucket={until:now+window,count:0};limits.set(key,bucket);}
  if(limits.size>10000)for(const [k,v] of limits)if(v.until<now)limits.delete(k);
  if(limits.size>15000)fail('BUSY','Servidor ocupado.',503);
  if(++bucket.count>max)fail('RATE_LIMIT','Muitas tentativas. Aguarde e tente novamente.',429);
 }
 async function body(req){
  if(!String(req.headers['content-type']||'').startsWith('application/json'))fail('CONTENT_TYPE','Envie JSON.',415);
  let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>16384)fail('BODY_TOO_LARGE','Requisição muito grande.',413);}
  try{return object(JSON.parse(raw||'{}'));}catch(error){if(error instanceof AppError)throw error;fail('JSON','JSON inválido.');}
 }
 async function route(req,res){
  const url=new URL(req.url,origin),pathname=url.pathname,method=req.method;
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' "+origin.replace(/^http/,'ws')+"; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
  if(production)res.setHeader('Strict-Transport-Security','max-age=31536000');
  if(!pathname.startsWith('/api/'))return staticFile(req,res,pathname);
  limit('api:'+req.socket.remoteAddress,600,60000);
  const write=!['GET','HEAD'].includes(method);
  if(write&&req.headers.origin!==origin)fail('ORIGIN','Origem não permitida.',403);
  if(pathname==='/api/health'&&method==='GET')return json(res,200,{ok:true});
  if(['/api/auth/register','/api/auth/login'].includes(pathname)&&method==='POST'){
   limit('auth:'+req.socket.remoteAddress,12,15*60000);
   const data=await body(req);limit('username:'+String(data.username).toLowerCase().slice(0,24),8,15*60000);
   const result=pathname.endsWith('register')?await auth.register(data):await auth.login(data);
   cookie(res,result.token);return json(res,200,{user:result.user,csrf:result.csrf});
  }
  const sessionToken=token(req),{user,session}=auth.authenticate(sessionToken);
  if(write&&req.headers['x-csrf-token']!==session.csrf)fail('CSRF','Atualize a sessão e tente novamente.',403);
  const uid=user.id;
  if(method==='GET'){
   if(pathname==='/api/auth/me')return json(res,200,{user:auth.publicUser(user),csrf:session.csrf,profile:auth.profile(uid),wallet:economy.wallet(uid),room:rooms.current(uid)});
   if(pathname==='/api/profile')return json(res,200,{profile:auth.profile(uid),achievements:db.all('SELECT * FROM accolades WHERE user_id=? ORDER BY created_at DESC',uid)});
   if(pathname==='/api/shop')return json(res,200,economy.catalog());
   if(pathname==='/api/inventory')return json(res,200,economy.inventory(uid));
   if(pathname==='/api/wallet')return json(res,200,economy.wallet(uid));
   if(pathname==='/api/career')return json(res,200,career.view(uid));
   if(pathname==='/api/rooms')return json(res,200,{rooms:rooms.list(),current:rooms.current(uid)});
   if(pathname==='/api/matches')return json(res,200,db.all("SELECT id,kind,score,duration,status,created_at FROM matches WHERE EXISTS(SELECT 1 FROM json_each(matches.participants) WHERE json_extract(value,'$.id')=?) ORDER BY created_at DESC LIMIT 30",uid));
   if(pathname==='/api/admin')return json(res,200,admin.dashboard(user,rooms.online()));
   if(pathname==='/api/admin/users')return json(res,200,admin.users(user,url.searchParams.get('q')||''));
   const detail=pathname.match(/^\/api\/admin\/users\/([\w-]+)$/);if(detail)return json(res,200,admin.detail(user,detail[1]));
  }
  if(method==='POST'||method==='PATCH'){
   const data=await body(req);
   if(pathname==='/api/auth/logout'){auth.logout(sessionToken);rooms.leave(uid);cookie(res,'',0);return json(res,200,{ok:true});}
   if(pathname==='/api/auth/refresh'){const next=auth.refresh(sessionToken);cookie(res,next.token);return json(res,200,{user:next.user,csrf:next.csrf});}
   if(pathname==='/api/profile'&&method==='PATCH')return json(res,200,auth.updateProfile(uid,data));
   if(pathname==='/api/shop/purchase')return json(res,200,economy.purchase(uid,data));
   if(pathname==='/api/inventory/equip')return json(res,200,economy.equip(uid,data));
   if(pathname==='/api/career')return json(res,201,career.create(uid,data));
   if(pathname==='/api/career/season')return json(res,200,career.advance(uid));
   if(pathname==='/api/career/play')return json(res,201,rooms.careerMatch(user));
   const offer=pathname.match(/^\/api\/career\/offers\/([\w-]+)$/);if(offer)return json(res,200,career.transfer(uid,offer[1],data));
   if(pathname==='/api/rooms')return json(res,201,rooms.create(user,data));
   if(pathname==='/api/rooms/leave'){rooms.leave(uid);return json(res,200,{ok:true});}
   if(pathname==='/api/matchmaking')return json(res,200,rooms.matchmaking(user));
   const room=pathname.match(/^\/api\/rooms\/([\w-]+)\/(join|start)$/);if(room)return json(res,200,room[2]==='join'?rooms.join(user,room[1]):rooms.start(user,room[1]));
   const action=pathname.match(/^\/api\/admin\/users\/([\w-]+)$/);if(action)return json(res,200,admin.action(user,action[1],data));
  }
  fail('NOT_FOUND','Recurso não encontrado.',404);
 }
 const server=http.createServer((req,res)=>route(req,res).catch(error=>{
  const expected=error instanceof AppError;
  if(!expected||error.status===403||error.status===429)logger[expected?'warn':'error'](JSON.stringify({level:expected?'SECURITY':'ERROR',event:'request_failed',code:error.code||'INTERNAL',message:expected?error.message:'Falha interna',...(expected?{}:{stack:error.stack})}));
  if(!res.headersSent)json(res,expected?error.status:500,{error:{code:expected?error.code:'INTERNAL',message:expected?error.message:'Não foi possível concluir. Tente novamente.'}});else res.end();
 }));
 server.requestTimeout=15000;server.headersTimeout=10000;
 server.on('upgrade',(req,socket,head)=>rooms.upgrade(req,socket,head));
 async function close(){rooms.close();await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});db.close();}
 return {server,db,auth,economy,career,admin,rooms,close};
}
async function staticFile(req,res,pathname){
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'}).end();return;}
 let file;try{file=decodeURIComponent(pathname);}catch{res.writeHead(400).end();return;}
 if(file==='/')file='/index.html';
 if(file!=='/index.html'&&!/^\/(styles|src)\/[a-zA-Z0-9/_-]+\.(css|js)$/.test(file)){res.writeHead(404).end();return;}
 try{const content=await fs.readFile(path.join(ROOT,file));res.writeHead(200,{'Content-Type':({'.html':'text/html','.css':'text/css','.js':'text/javascript'})[path.extname(file)]+'; charset=utf-8','Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:content);}
 catch{res.writeHead(404).end();}
}
module.exports={createApp};
