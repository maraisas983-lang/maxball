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
const {createSkins}=require('./services/skins.cjs'),{createChampionships}=require('./services/championships.cjs');
const {AppError,fail,object}=require('./lib/validation.cjs');
const ROOT=path.resolve(__dirname,'..');
const apiContract=require('../src/core/apiContract.js');
const {securityConfig,createLimiter,createSecurityReporter,clientAddress}=require('./lib/security.cjs');

function createApp({databasePath='var/maxball.sqlite',origin='http://127.0.0.1:5173',production=false,trustProxy=false,logger=console,sessionMs,supabase,adminEmails=[],security={},cakto={}}={}){
 const securityLimits=securityConfig(security),limit=createLimiter();
 if(production&&!origin.startsWith('https://'))throw new Error('Production requires an HTTPS PUBLIC_ORIGIN');
 const securityEvents=createSecurityReporter(logger);
 const db=openDatabase(databasePath),economy=createEconomy(db),localAuth=createAuth(db,economy,{sessionMs}),career=createCareer(db,economy),admin=createAdmin(db,economy),operations=createOperations(db);
 const cloud=supabase?createSupabase(supabase):null,auth=cloud?useSupabaseAuth(localAuth,db,economy,cloud,{adminEmails}):localAuth,cloudSync=cloud?createCloudSync(db,cloud,logger):null;
 const maxpass=require('./services/maxpass.cjs').createMaxpass(db,economy,{permit,audit:operations.audit});
 const payments=createPayments(db,economy,{permit,audit:operations.audit,maxpass,cakto:require('./services/cakto.cjs').createCakto(cakto)});
 db.run("UPDATE matches SET status='ABANDONED',finished_at=? WHERE status='RUNNING'",Date.now());
 db.run("UPDATE ranked_matches SET reason='SERVER_RESTART',home_after=home_before,away_after=away_before,finished_at=? WHERE finished_at IS NULL",Date.now());
 const collections=require('./services/collections.cjs').createCollections(db,economy);
 const rooms=createRooms({db,auth,economy,career,maxpass,origin,logger,security:securityLimits,securityEvent:securityEvents.record,syncResults:!!cloud,canRank:()=>{const s=operations.settings();return !s.maintenance&&s.ranked_enabled;},audit:(actor,action,resource,metadata)=>operations.audit(actor,action,resource,'OK',metadata)});
 const social=createSocial(db,rooms,auth),skins=createSkins(db,economy),championships=createChampionships(db,economy,{permit,audit:operations.audit,rooms});
 rooms.setChampionshipResult(championships.rounds.complete);
 const championshipTimer=setInterval(()=>{try{championships.rounds.tick();}catch(error){logger.error('championship_tick: '+error.message);}},1000);championshipTimer.unref();
 const token=req=>(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('maxball_session='))?.slice(16);
 const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
 function cookie(res,value,maxAge=30*86400){res.setHeader('Set-Cookie',`maxball_session=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${production?'; Secure':''}`);}
 async function body(req){
  if(!/^application\/json(?:\s*;|\s*$)/i.test(String(req.headers['content-type']||'')))fail('CONTENT_TYPE','Envie JSON.',415);
  if(Number(req.headers['content-length'])>16384)fail('BODY_TOO_LARGE','Requisição muito grande.',413);
  const chunks=[];let size=0;for await(const chunk of req.iterator({destroyOnReturn:false})){size+=chunk.length;if(size>16384)fail('BODY_TOO_LARGE','Requisição muito grande.',413);chunks.push(chunk);}
  const raw=Buffer.concat(chunks).toString('utf8');
  try{return object(JSON.parse(raw||'{}'));}catch(error){if(error instanceof AppError)throw error;fail('JSON','JSON inválido.');}
 }
 async function route(req,res){
  const url=new URL(req.url,origin),pathname=url.pathname,method=req.method;
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' "+origin.replace(/^http/,'ws')+"; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
  if(production)res.setHeader('Strict-Transport-Security','max-age=31536000');
  if(!pathname.startsWith('/api/'))return staticFile(req,res,pathname);
  res.setHeader('X-Maxball-API-Version',apiContract.version);
  const address=clientAddress(req,trustProxy);
  limit('api:'+address,600,60000);
  const write=!['GET','HEAD'].includes(method);
  if(pathname==='/api/payments/cakto/webhook'&&method==='POST'){limit('webhook:'+address,120,60000);return json(res,200,payments.webhook(await body(req)));}
  if(write&&req.headers.origin!==origin)fail('ORIGIN','Origem não permitida.',403);
  if(pathname==='/api/config'&&method==='GET')return json(res,200,{apiVersion:apiContract.version,authProvider:auth.provider,legal:{termsVersion:operations.policy.termsVersion,privacyVersion:operations.policy.privacyVersion},announcement:operations.settings().announcement});
  if(pathname==='/api/maxpass/preview'&&method==='GET')return json(res,200,maxpass.preview());
  if(pathname==='/api/health'&&method==='GET')return json(res,200,{ok:true});
  if(['/api/auth/register','/api/auth/login'].includes(pathname)&&method==='POST'){
   limit('auth:'+address,12,15*60000);
   const data=await body(req);
   const identity=typeof data.username==='string'?data.username.trim().toLowerCase().slice(0,254):'';
   limit('username:'+require('./services/auth.cjs').hash(identity),8,15*60000);
   operations.consent(data);const credentials={username:data.username,password:data.password};
   const result=pathname.endsWith('register')?await auth.register(credentials):await auth.login(credentials);
   if(result.confirmationRequired){operations.pendingConsent(data.username);return json(res,200,{confirmationRequired:true});}
   maxpass.enrollUser(result.user.id);operations.accept(result.user,data.username);operations.audit(result.user,pathname.endsWith('register')?'REGISTER':'LOGIN',result.user.id);
   cookie(res,result.token);return json(res,200,{user:result.user,csrf:result.csrf});
  }
  const sessionToken=token(req);if(pathname==='/api/auth/me'&&method==='GET'&&auth.restore)await auth.restore(sessionToken);let {user,session}=auth.authenticate(sessionToken);
  if(write&&req.headers['x-csrf-token']!==session.csrf)fail('CSRF','Atualize a sessão e tente novamente.',403);
  const uid=user.id;req.actor=user;
  limit('account:'+uid,securityLimits.apiPerAccount,60000);
  if(method==='GET'){
   if(pathname==='/api/support')return json(res,200,operations.list(user));
   if(pathname==='/api/command')return json(res,200,operations.overview(user,rooms,url.searchParams.get('q')||''));
   if(pathname==='/api/command/tickets')return json(res,200,operations.list(user,true));
   const ticket=pathname.match(/^\/api\/(support|command\/tickets)\/([\w-]+)$/);if(ticket)return json(res,200,operations.ticket(user,ticket[2],ticket[1]!=='support'));

   if(pathname==='/api/auth/me'){maxpass.enrollUser(uid);return json(res,200,{user:auth.publicUser(user),csrf:session.csrf,profile:auth.profile(uid),wallet:economy.wallet(uid),room:rooms.current(uid)});}
   if(pathname==='/api/leaderboard')return json(res,200,rooms.progression.leaderboard(uid));
   if(pathname==='/api/ranked')return json(res,200,rooms.rankedStatus(user));
   if(pathname==='/api/friendlies')return json(res,200,{...rooms.friendlies.view(uid),room:rooms.current(uid)});
   if(pathname==='/api/party')return json(res,200,rooms.party.view(uid));
   if(pathname==='/api/party/players'){const q='%'+String(url.searchParams.get('q')||'').slice(0,40)+'%';return json(res,200,db.all('SELECT u.id,p.display_name name FROM users u JOIN profiles p ON p.user_id=u.id WHERE u.id<>? AND (p.display_name LIKE ? OR u.id=?) LIMIT 10',uid,q,String(url.searchParams.get('q')||'')));}
   if(pathname==='/api/profile')return json(res,200,{profile:auth.profile(uid),achievements:db.all('SELECT a.*,c.player_name,c.save_name,club.name club_name FROM accolades a LEFT JOIN careers c ON c.id=a.career_id LEFT JOIN clubs club ON club.id=a.club_id WHERE a.user_id=? ORDER BY a.created_at DESC',uid)});
   if(pathname==='/api/chat')return json(res,200,social.history(uid,url.searchParams.get('channel')||'players'));
   if(pathname==='/api/emotes')return json(res,200,social.slots(uid));
   if(pathname==='/api/collections')return json(res,200,collections.shop(uid));
   if(pathname==='/api/maxpass')return json(res,200,maxpass.view(uid,url.searchParams.get('season')||undefined));
   if(pathname==='/api/maxpass/cosmetics')return json(res,200,maxpass.cosmetics(uid));
   if(pathname==='/api/command/maxpass/payment')return json(res,200,maxpass.paymentConfig(user));
   if(pathname==='/api/pass')return json(res,200,collections.pass(uid));
   if(pathname==='/api/room-invites')return json(res,200,rooms.features.pending(uid));
   if(pathname==='/api/command/collections'){require('./lib/commerceOwner.cjs').requireCommerceOwner(db,user);return json(res,200,collections.config());}
   const inspected=pathname.match(/^\/api\/profiles\/([\w-]+)$/);if(inspected)return json(res,200,collections.profile(inspected[1]));
   if(pathname==='/api/shop')return json(res,200,economy.catalog());
   if(pathname==='/api/gems')return json(res,200,{...payments.publicConfig(),history:payments.history(uid)});
   if(pathname==='/api/command/payments')return json(res,200,payments.admin(user));
   if(pathname==='/api/command/payments/cakto'){limit('cakto:'+uid,5,60000);return json(res,200,await payments.caktoOffers(user,Number(url.searchParams.get('page')||1)));}
   if(pathname==='/api/inventory')return json(res,200,economy.inventory(uid));
   if(pathname==='/api/wallet')return json(res,200,economy.wallet(uid));
   if(pathname==='/api/career')return json(res,200,career.view(uid));
   if(pathname==='/api/career/saves')return json(res,200,{saves:career.saves(uid)});
   if(pathname==='/api/skins')return json(res,200,skins.list(uid));
   if(pathname==='/api/championships')return json(res,200,championships.list(user));
   if(pathname==='/api/command/championships')return json(res,200,championships.list(user,true));
   if(pathname==='/api/clubs/directory')return json(res,200,rooms.clubs.directory(uid));
   const clubDetail=pathname.match(/^\/api\/clubs\/([\w-]+)$/);if(clubDetail)return json(res,200,rooms.clubs.detail(uid,clubDetail[1]));
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
   // Authentication before reading the body is not enough: a streamed request
   // can outlive logout, expiry, bans or a change of staff permissions.
   ({user,session}=auth.authenticate(sessionToken));req.actor=user;
   if(req.headers['x-csrf-token']!==session.csrf)fail('CSRF','Atualize a sessão e tente novamente.',403);
   if(pathname.startsWith('/api/rooms')||['/api/matchmaking','/api/career/play','/api/ranked/join','/api/friendlies/search'].includes(pathname))limit('room-actions:'+uid,securityLimits.roomOperations,60000);
   if(pathname==='/api/maxpass/plus')return json(res,200,maxpass.unlock(uid,data));
   if(pathname==='/api/maxpass/claim')return json(res,200,maxpass.claim(uid,data));
   if(pathname==='/api/maxpass/checkout')return json(res,200,maxpass.checkout(user,data));
   if(pathname==='/api/maxpass/cosmetics/equip')return json(res,200,maxpass.equip(uid,data));
   if(pathname==='/api/command/maxpass/payment')return json(res,200,maxpass.savePayment(user,data));
   if(pathname==='/api/collections/open')return json(res,200,collections.open(uid,data));
   if(pathname==='/api/pass/max'){object(data,[]);return json(res,200,collections.unlock(uid));}
   if(pathname==='/api/pass/claim')return json(res,200,collections.claim(uid,data));
   if(pathname==='/api/command/collections')return json(res,200,collections.saveConfig(user,data));
   if(pathname==='/api/room-invites/accept')return json(res,200,await rooms.features.accept(user,data));
   const feature=pathname.match(/^\/api\/rooms\/([\w-]+)\/(cancel|customize|card|invite|move)$/);if(feature){if(feature[2]==='cancel')object(data,[]);return json(res,200,await rooms.features[feature[2]](user,feature[1],data));}
   if(pathname==='/api/friendlies/search'&&method==='POST'){if(operations.settings().maintenance)fail('MAINTENANCE','Novas partidas estão pausadas.',503);return json(res,200,rooms.friendlies.search(user,data));}
   if(pathname==='/api/friendlies/accept'&&method==='POST')return json(res,200,rooms.friendlies.accept(user,data));
   if(pathname==='/api/friendlies/cancel'&&method==='POST'){object(data,[]);rooms.friendlies.cancel(uid);return json(res,200,rooms.friendlies.view(uid));}
   if(pathname==='/api/skins'&&method==='POST')return json(res,201,skins.save(uid,data));
   const skinPath=pathname.match(/^\/api\/skins\/([\w-]+)$/);if(skinPath&&method==='PATCH')return json(res,200,skins.save(uid,data,skinPath[1]));
   if(pathname==='/api/championships'&&method==='POST')return json(res,201,championships.save(user,data));
   if(pathname==='/api/command/championships'&&method==='POST')return json(res,201,championships.save(user,data,null,true));
   const roundPublish=pathname.match(/^\/api\/command\/championships\/([\w-]+)\/rounds$/);if(roundPublish&&method==='POST'){object(data,[]);return json(res,201,championships.rounds.publish(user,roundPublish[1]));}
   const fixtureAction=pathname.match(/^\/api\/championship-fixtures\/([\w-]+)\/(propose|respond|checkin)$/);if(fixtureAction&&method==='POST'){if(fixtureAction[2]==='checkin')object(data,[]);return json(res,200,championships.rounds[fixtureAction[2]](user,fixtureAction[1],data));}
   const fixtureReopen=pathname.match(/^\/api\/command\/championship-fixtures\/([\w-]+)\/reopen$/);if(fixtureReopen&&method==='POST'){object(data,[]);return json(res,200,championships.rounds.reopen(user,fixtureReopen[1]));}
   const champAdmin=pathname.match(/^\/api\/command\/championships\/([\w-]+)(?:\/(status))?$/);
   if(champAdmin){if(method==='DELETE')return json(res,200,championships.moderate(user,champAdmin[1],'CANCELLED'));if(champAdmin[2]&&method==='POST'){object(data,['status']);return json(res,200,championships.moderate(user,champAdmin[1],data.status));}if(method==='PATCH')return json(res,200,championships.save(user,data,champAdmin[1],true));}
   const entryReview=pathname.match(/^\/api\/command\/championship-entries\/([\w-]+)$/);if(entryReview&&method==='POST'){object(data,['status']);return json(res,200,championships.review(user,entryReview[1],data.status));}
   const champEnter=pathname.match(/^\/api\/championships\/([\w-]+)\/enter$/);if(champEnter&&method==='POST')return json(res,200,championships.register(user,champEnter[1],data));
   const champLeave=pathname.match(/^\/api\/championship-entries\/([\w-]+)\/withdraw$/);if(champLeave&&method==='POST'){object(data,[]);return json(res,200,championships.withdraw(user,champLeave[1]));}
   const clubPath=pathname.match(/^\/api\/clubs\/([\w-]+)(?:\/(join|leave|members))?$/);if(clubPath){if(!clubPath[2]&&method==='PATCH')return json(res,200,rooms.clubs.create(uid,data,clubPath[1]));if(method==='POST'){if(clubPath[2]==='join'){object(data,[]);return json(res,200,rooms.clubs.join(uid,clubPath[1]));}if(clubPath[2]==='leave'){object(data,[]);return json(res,200,rooms.clubs.leave(uid,clubPath[1]));}if(clubPath[2]==='members'){object(data,['playerId','approved']);if(typeof data.approved!=='boolean')fail('MEMBER','Aprovação inválida.');return json(res,200,rooms.clubs.member(uid,clubPath[1],data.playerId,data.approved));}}}
   const refereePath=pathname.match(/^\/api\/rooms\/([\w-]+)\/referee$/);if(refereePath&&method==='POST')return json(res,200,rooms.assignReferee(user,refereePath[1],data));
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
   const pauseRoom=pathname.match(/^\/api\/rooms\/([\w-]+)\/pause$/);if(pauseRoom&&method==='POST')return json(res,200,rooms.pause(user,pauseRoom[1],data));
   const substituteRoom=pathname.match(/^\/api\/rooms\/([\w-]+)\/substitute$/);if(substituteRoom&&method==='POST')return json(res,200,rooms.substitute(user,substituteRoom[1],data));
   const substitutionsRoom=pathname.match(/^\/api\/rooms\/([\w-]+)\/substitutions$/);if(substitutionsRoom&&method==='POST')return json(res,200,rooms.substitutions(user,substitutionsRoom[1],data));
   const lockerSkinRoom=pathname.match(/^\/api\/rooms\/([\w-]+)\/locker\/skin$/);if(lockerSkinRoom&&method==='POST')return json(res,200,rooms.lockerSkin(user,lockerSkinRoom[1],data));
   const lockerRoom=pathname.match(/^\/api\/rooms\/([\w-]+)\/locker$/);if(lockerRoom&&method==='POST')return json(res,200,rooms.locker(user,lockerRoom[1],data));
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
 const server=http.createServer((req,res)=>{res.on('finish',()=>{if(req.actor&&res.statusCode<400&&req.url.startsWith('/api/')&&!['GET','HEAD'].includes(req.method))try{operations.audit(req.actor,'HTTP_'+req.method,req.url.split('?')[0],'OK',{status:res.statusCode});}catch{securityEvents.record('AUDIT_WRITE_FAILED');}});route(req,res).catch(error=>{
  const expected=error instanceof AppError;
  if(!res.headersSent&&[413,415].includes(error.status))res.setHeader('Connection','close');
  if(!expected||[401,403,413,429].includes(error.status))securityEvents.record(expected?error.code:'INTERNAL');
  const retryAfter=expected&&Number.isSafeInteger(error.retryAfter)&&error.retryAfter>0?error.retryAfter:null;
  if(!res.headersSent&&retryAfter)res.setHeader('Retry-After',String(retryAfter));
  if(!res.headersSent)json(res,expected?error.status:500,{error:{code:expected?error.code:'INTERNAL',message:expected?error.message:'Não foi possível concluir. Tente novamente.',...(retryAfter?{retryAfter}:{})}});else res.end();
 });});
 server.requestTimeout=15000;server.headersTimeout=10000;
 server.on('upgrade',(req,socket,head)=>rooms.upgrade(req,socket,head));
 async function close(){clearInterval(championshipTimer);rooms.close();await cloudSync?.close();await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});securityEvents.close();db.close();}
 return {server,db,auth,economy,collections,career,admin,operations,rooms,payments,maxpass,skins,championships,cloudSync,close};
}
async function staticFile(req,res,pathname){
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'}).end();return;}
 let file;try{file=decodeURIComponent(pathname);}catch{res.writeHead(400).end();return;}
 if(file==='/')file='/index.html';
 if(/^\/assets\/crests\/br-\d{1,2}\.png$/.test(file)){res.writeHead(302,{Location:file.replace(/\.png$/,'.svg'),'Cache-Control':'no-cache'}).end();return;}
 if(!/^\/assets\/crests\/(br|mamo)-\d{1,2}\.svg$/.test(file)&&file!=='/index.html'&&!/^\/(styles|src)\/[a-zA-Z0-9/_-]+\.(css|js)$/.test(file)){res.writeHead(404).end();return;}
 try{const content=await fs.readFile(path.join(ROOT,file));res.writeHead(200,{'Content-Type':({'.html':'text/html','.css':'text/css','.js':'text/javascript','.png':'image/png','.svg':'image/svg+xml'})[path.extname(file)]+'; charset=utf-8','Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:content);}
 catch{res.writeHead(404).end();}
}
module.exports={createApp};
