const {createSupabase,useSupabaseAuth,createCloudSync}=require('./services/supabase.cjs');
const http=require('node:http');
const fs=require('node:fs/promises');
const path=require('node:path');
const {openDatabase}=require('./database/index.cjs');
const {createEconomy}=require('./services/economy.cjs');
const {createAuth}=require('./services/auth.cjs');
const {createCareer}=require('./services/career.cjs');
const {createAdmin}=require('./services/admin.cjs');
const {createRooms}=require('./online/rooms.cjs');
const {createOperations,permit}=require('./services/operations.cjs');
const {createSocial}=require('./services/social.cjs');
const {createPayments}=require('./services/payments.cjs');
const {AppError,fail,object}=require('./lib/validation.cjs');
const ROOT=path.resolve(__dirname,'..');

function createApp({databasePath='var/maxball.sqlite',origin='http://127.0.0.1:5173',production=false,logger=console,sessionMs,supabase,adminEmails=[]}={}){
 if(production&&!origin.startsWith('https://'))throw new Error('Production requires an HTTPS PUBLIC_ORIGIN');
 const db=openDatabase(databasePath),economy=createEconomy(db),localAuth=createAuth(db,economy,{sessionMs}),career=createCareer(db,economy),admin=createAdmin(db,economy),operations=createOperations(db);
 const cloud=supabase?createSupabase(supabase):null,auth=cloud?useSupabaseAuth(localAuth,db,economy,cloud,{adminEmails}):localAuth,cloudSync=cloud?createCloudSync(db,cloud,logger):null;
 const payments=createPayments(db,economy,{permit,audit:operations.audit});
 db.run("UPDATE matches SET status='ABANDONED',finished_at=? WHERE status='RUNNING'",Date.now());
 db.run("UPDATE ranked_matches SET reason='SERVER_RESTART',home_after=home_before,away_after=away_before,finished_at=? WHERE finished_at IS NULL",Date.now());
 const rooms=createRooms({db,auth,economy,career,origin,logger,syncResults:!!cloud,canRank:()=>{const s=operations.settings();return !s.maintenance&&s.ranked_enabled;},audit:(actor,action,resource,metadata)=>operations.audit(actor,action,resource,'OK',metadata)}),limits=new Map();
 const social=createSocial(db,rooms,auth);
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
  if(pathname==='/api/payments/cakto/webhook'&&method==='POST'){limit('webhook:'+req.socket.remoteAddress,120,60000);return json(res,200,payments.webhook(await body(req)));}
  if(write&&req.headers.origin!==origin)fail('ORIGIN','Origem não permitida.',403);
  if(pathname==='/api/config'&&method==='GET')return json(res,200,{authProvider:auth.provider,legal:{termsVersion:operations.policy.termsVersion,privacyVersion:operations.policy.privacyVersion},announcement:operations.settings().announcement});
  if(pathname==='/api/health'&&method==='GET')return json(res,200,{ok:true});
  if(['/api/auth/register','/api/auth/login'].includes(pathname)&&method==='POST'){
   limit('auth:'+req.socket.remoteAddress,12,15*60000);
   const data=await body(req);limit('username:'+String(data.username).toLowerCase().slice(0,24),8,15*60000);
   operations.consent(data);const credentials={username:data.username,password:data.password};
   const result=pathname.endsWith('register')?await auth.register(credentials):await auth.login(credentials);
   if(result.confirmationRequired){operations.pendingConsent(data.username);return json(res,200,{confirmationRequired:true});}
   operations.accept(result.user,data.username);operations.audit(result.user,pathname.endsWith('register')?'REGISTER':'LOGIN',result.user.id);
   cookie(res,result.token);return json(res,200,{user:result.user,csrf:result.csrf});
  }
  const sessionToken=token(req),{user,session}=auth.authenticate(sessionToken);
  if(write&&req.headers['x-csrf-token']!==session.csrf)fail('CSRF','Atualize a sessão e tente novamente.',403);
  const uid=user.id;req.actor=user;
  if(method==='GET'){
   if(pathname==='/api/support')return json(res,200,operations.list(user));
   if(pathname==='/api/command')return json(res,200,operations.overview(user,rooms,url.searchParams.get('q')||''));
   if(pathname==='/api/command/tickets')return json(res,200,operations.list(user,true));
   const ticket=pathname.match(/^\/api\/(support|command\/tickets)\/([\w-]+)$/);if(ticket)return json(res,200,operations.ticket(user,ticket[2],ticket[1]!=='support'));

   if(pathname==='/api/auth/me')return json(res,200,{user:auth.publicUser(user),csrf:session.csrf,profile:auth.profile(uid),wallet:economy.wallet(uid),room:rooms.current(uid)});
   if(pathname==='/api/ranked')return json(res,200,rooms.rankedStatus(user));
   if(pathname==='/api/party')return json(res,200,rooms.party.view(uid));
   if(pathname==='/api/party/players'){const q='%'+String(url.searchParams.get('q')||'').slice(0,40)+'%';return json(res,200,db.all('SELECT u.id,p.display_name name FROM users u JOIN profiles p ON p.user_id=u.id WHERE u.id<>? AND (p.display_name LIKE ? OR u.id=?) LIMIT 10',uid,q,String(url.searchParams.get('q')||'')));}
   if(pathname==='/api/profile')return json(res,200,{profile:auth.profile(uid),achievements:db.all('SELECT * FROM accolades WHERE user_id=? ORDER BY created_at DESC',uid)});
   if(pathname==='/api/chat')return json(res,200,social.history(uid));
   if(pathname==='/api/emotes')return json(res,200,social.slots(uid));
   if(pathname==='/api/shop')return json(res,200,economy.catalog());
   if(pathname==='/api/gems')return json(res,200,{...payments.publicConfig(),history:payments.history(uid)});
   if(pathname==='/api/command/payments')return json(res,200,payments.admin(user));
   if(pathname==='/api/inventory')return json(res,200,economy.inventory(uid));
   if(pathname==='/api/wallet')return json(res,200,economy.wallet(uid));
   if(pathname==='/api/career')return json(res,200,career.view(uid));
   if(pathname==='/api/career/saves')return json(res,200,{saves:career.saves(uid)});
   if(pathname==='/api/clubs')return json(res,200,rooms.clubs.list(uid));
   if(pathname==='/api/teams')return json(res,200,rooms.clubs.catalog(uid));
   if(pathname==='/api/rooms')return json(res,200,{rooms:rooms.list(),current:rooms.current(uid)});
   if(pathname==='/api/matches')return json(res,200,db.all("SELECT id,kind,score,duration,status,created_at FROM matches WHERE EXISTS(SELECT 1 FROM json_each(matches.participants) WHERE json_extract(value,'$.id')=?) ORDER BY created_at DESC LIMIT 30",uid));
   if(pathname==='/api/admin')return json(res,200,admin.dashboard(user,rooms.online()));
   if(pathname==='/api/admin/users')return json(res,200,admin.users(user,url.searchParams.get('q')||''));
   const detail=pathname.match(/^\/api\/admin\/users\/([\w-]+)$/);if(detail)return json(res,200,admin.detail(user,detail[1]));
  }
  if(method==='POST'||method==='PATCH'||method==='DELETE'){
   const data=await body(req);
   if(pathname==='/api/support'){limit('ticket:'+uid,15,60000);return json(res,201,operations.create(user,data));}
   if(pathname==='/api/command/settings')return json(res,200,operations.set(user,data));
   if(pathname==='/api/command/execute')return json(res,200,operations.command(user,data,rooms,admin));
   const ticket=pathname.match(/^\/api\/(support|command\/tickets)\/([\w-]+)$/);
   if(ticket){limit('reply:'+uid,30,60000);return json(res,200,operations.update(user,ticket[2],data,ticket[1]!=='support'));}
   if((['/api/rooms','/api/matchmaking','/api/career/play','/api/ranked/join'].includes(pathname)||/^\/api\/rooms\/[\w-]+\/start$/.test(pathname))&&operations.settings().maintenance)fail('MAINTENANCE','Novas partidas estão pausadas para manutenção.',503);
   if(pathname==='/api/ranked/join'&&!operations.settings().ranked_enabled)fail('RANKED_DISABLED','A fila ranqueada está pausada.',503);
   if(pathname==='/api/auth/logout'){await auth.logout(sessionToken);operations.audit(user,'LOGOUT',uid);rooms.leave(uid);cookie(res,'',0);return json(res,200,{ok:true});}
   if(pathname==='/api/auth/refresh'){const next=await auth.refresh(sessionToken);cookie(res,next.token);return json(res,200,{user:next.user,csrf:next.csrf});}
   if(pathname==='/api/profile'&&method==='PATCH')return json(res,200,await auth.updateProfile(uid,data));
   if(pathname==='/api/chat'){limit('chat:'+uid,30,60000);return json(res,201,social.send(user,data));}
   if(pathname==='/api/chat/mute')return json(res,200,social.mute(user,data));
   if(pathname==='/api/emotes/use')return json(res,200,social.use(user,data));
   if(pathname==='/api/shop/purchase')return json(res,200,economy.purchase(uid,data));
   if(pathname==='/api/gems/checkout')return json(res,200,payments.checkout(user,data));
   if(pathname==='/api/command/payments'&&method==='PATCH')return json(res,200,payments.save(user,data));
   if(pathname==='/api/command/payments/rotate')return json(res,200,payments.rotate(user));
   if(pathname==='/api/inventory/equip')return json(res,200,economy.equip(uid,data));
   if(pathname==='/api/career')return json(res,201,career.create(uid,data));
   const save=pathname.match(/^\/api\/career\/saves\/([\w-]+)(?:\/(select))?$/);
   if(save){if(method==='DELETE')return json(res,200,career.removeSave(uid,save[1],data));if(method==='PATCH')return json(res,200,career.renameSave(uid,save[1],data));if(method==='POST'&&save[2])return json(res,200,career.selectSave(uid,save[1]));fail('METHOD','Ação de save inválida.',405);}
   if(pathname==='/api/career/settings'&&method==='PATCH')return json(res,200,career.settings(uid,data));
   if(pathname==='/api/career/season')return json(res,200,career.advance(uid));
   if(pathname==='/api/career/play')return json(res,201,rooms.careerMatch(user));
   const offer=pathname.match(/^\/api\/career\/offers\/([\w-]+)$/);if(offer)return json(res,200,career.transfer(uid,offer[1],data));
   if(pathname==='/api/clubs')return json(res,201,rooms.clubs.create(uid,data));
   const editRoom=pathname.match(/^\/api\/rooms\/([\w-]+)$/);if(editRoom&&method==='PATCH')return json(res,200,rooms.edit(user,editRoom[1],data));
   if(pathname==='/api/rooms')return json(res,201,await rooms.create(user,data));
   if(pathname==='/api/rooms/leave'){rooms.leave(uid);return json(res,200,{ok:true});}
   if(pathname==='/api/ranked/join'){cloudSync?.assertReady();if(cloud&&rooms.party.current(uid)?.members.length>1&&(await cloud.partyVersion().catch(()=>null))!==2)fail('GROUPS_UNAVAILABLE','A ranqueada em grupo aguarda ativação pelo administrador.',503);return json(res,200,rooms.rankedJoin(user,data));}
   if(pathname.startsWith('/api/party/')){
    limit('party:'+uid,30,60000);
    const action=pathname.slice('/api/party/'.length);let result;
    if(action==='invite'){object(data,['playerId']);result=rooms.party.invite(user,data.playerId);}
    else if(action==='accept'){object(data,['inviteId']);result=rooms.party.accept(user,data.inviteId);}
    else if(action==='ready'){object(data,['ready']);result=rooms.party.ready(user,data.ready);}
    else if(action==='remove'){object(data,['playerId']);result=rooms.party.remove(user,data.playerId);}
    else if(action==='leave'){object(data,[]);result=rooms.party.leave(uid);}
    else if(action==='create'){object(data,[]);rooms.party.ensure(user);result=rooms.party.view(uid);}
    else fail('NOT_FOUND','Ação de grupo não encontrada.',404);
    return json(res,200,result);
   }
   if(pathname==='/api/ranked/cancel')return json(res,200,rooms.rankedCancel(user));
   if(pathname==='/api/matchmaking')return json(res,200,await rooms.matchmaking(user));
   const room=pathname.match(/^\/api\/rooms\/([\w-]+)\/(join|start)$/);if(room)return json(res,200,room[2]==='join'?await rooms.join(user,room[1],data):rooms.start(user,room[1]));
   const action=pathname.match(/^\/api\/admin\/users\/([\w-]+)$/);if(action)return json(res,200,admin.action(user,action[1],data));
  }
  fail('NOT_FOUND','Recurso não encontrado.',404);
 }
 const server=http.createServer((req,res)=>{res.on('finish',()=>{if(req.url.startsWith('/api/')&&!['GET','HEAD'].includes(req.method))try{operations.audit(req.actor,'HTTP_'+req.method,req.url.split('?')[0],res.statusCode<400?'OK':'ERROR',{status:res.statusCode});}catch(error){logger.error('Falha ao registrar auditoria: '+error.message);}});route(req,res).catch(error=>{
  const expected=error instanceof AppError;
  if(!expected||error.status===403||error.status===429)logger[expected?'warn':'error'](JSON.stringify({level:expected?'SECURITY':'ERROR',event:'request_failed',code:error.code||'INTERNAL',message:expected?error.message:'Falha interna',...(expected?{}:{stack:error.stack})}));
  if(!res.headersSent)json(res,expected?error.status:500,{error:{code:expected?error.code:'INTERNAL',message:expected?error.message:'Não foi possível concluir. Tente novamente.'}});else res.end();
 });});
 server.requestTimeout=15000;server.headersTimeout=10000;
 server.on('upgrade',(req,socket,head)=>rooms.upgrade(req,socket,head));
 async function close(){rooms.close();await cloudSync?.close();await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});db.close();}
 return {server,db,auth,economy,career,admin,operations,rooms,payments,cloudSync,close};
}
async function staticFile(req,res,pathname){
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'}).end();return;}
 let file;try{file=decodeURIComponent(pathname);}catch{res.writeHead(400).end();return;}
 if(file==='/')file='/index.html';
 if(!/^\/assets\/crests\/br-\d{1,2}\.png$/.test(file)&&file!=='/index.html'&&!/^\/(styles|src)\/[a-zA-Z0-9/_-]+\.(css|js)$/.test(file)){res.writeHead(404).end();return;}
 try{const content=await fs.readFile(path.join(ROOT,file));res.writeHead(200,{'Content-Type':({'.html':'text/html','.css':'text/css','.js':'text/javascript','.png':'image/png'})[path.extname(file)]+'; charset=utf-8','Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:content);}
 catch{res.writeHead(404).end();}
}
module.exports={createApp};
