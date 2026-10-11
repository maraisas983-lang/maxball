const {Locker}=require('./locker.cjs');
const {Bots}=require('./bots.cjs');
const {scrypt,randomBytes,timingSafeEqual}=require('node:crypto');
const {settings}=require('../../src/game/rules.js');
const {createClubs}=require('../services/clubs.cjs');
const teamData=require('../../src/data/teams.js');
const {createRanked}=require('../services/ranked.cjs');
const {createParty}=require('../services/party.cjs');
const {randomInt}=require('node:crypto');
const {WebSocketServer}=require('ws');
const {id}=require('../database/index.cjs');
const {fail,object,text,integer}=require('../lib/validation.cjs');
const {Match}=require('./match.cjs');
const scryptAsync=require('node:util').promisify(scrypt);let hashingRooms=0;
async function derive(...args){if(hashingRooms>=4)fail('BUSY','Aguarde um instante para acessar a sala.',503);hashingRooms++;try{return await scryptAsync(...args);}finally{hashingRooms--;}}
const protocol=require('../../src/online/protocol.js');
const {securityConfig,createLimiter}=require('../lib/security.cjs');
function createRooms({db,auth,economy,career,maxpass,origin,logger=console,syncResults=false,canRank=()=>true,audit=()=>{},security=securityConfig(),securityEvent=()=>{}}){
 const upgradeLimit=createLimiter();
 const progression=require('../services/progression.cjs').createProgression(db,economy);const ranked=createRanked(db,{syncResults}),clubs=createClubs(db),bots=new Bots(logger);
 let socialEvent=()=>{},championshipResult=()=>{},friendlies;
 const rooms=new Map(),membership=new Map(),connections=new Map(),seenConnections=new Set();
 const wss=new WebSocketServer({noServer:true,maxPayload:4096,perMessageDeflate:false});
 const rosters=new WeakMap();
 const all=room=>{let cached=rosters.get(room);if(!cached||cached.players!==room.players||cached.spectators!==room.spectators||cached.coaches!==room.coaches||cached.referee!==room.referee||cached.count!==room.players.length+(room.spectators?.length||0)+(room.coaches?.length||0)){cached={players:room.players,spectators:room.spectators,coaches:room.coaches,referee:room.referee,count:room.players.length+(room.spectators?.length||0)+(room.coaches?.length||0),members:[...room.players,...(room.spectators||[]),...(room.coaches||[]),...(room.referee?[room.referee]:[])]};rosters.set(room,cached);}return cached.members;};
 const member=p=>{const profile=db.one('SELECT display_name,kit,effect,celebration FROM profiles WHERE user_id=?',p.id),club=db.one("SELECT c.name FROM custom_clubs c JOIN club_members m ON m.club_id=c.id WHERE m.user_id=? AND m.status='APPROVED' ORDER BY c.created_at LIMIT 1",p.id);return {id:p.id,name:profile?.display_name||p.name,num:p.num,team:p.team,slot:p.slot,position:p.position||'PV',kit:p.kit??(profile?.kit>1?profile.kit:null),trail:profile?.effect||0,celebration:profile?.celebration||0,clubName:club?.name||'Sem clube',connected:connections.has(p.id)};};
 const visible=room=>({id:room.id,name:room.name,owner:room.owner,hostId:room.owner,kind:room.kind,hasPassword:!!room.passwordHash,cfg:room.cfg,settings:room.cfg.settings||settings(),homeTeam:room.cfg.teams?.[0],awayTeam:room.cfg.teams?.[1],status:room.match?.G.phase||'waiting',cards:room.match?.G.cards||{},roomStatus:room.match?.G.pauseState||(!room.match?'LOBBY':({starting:'STARTING',end:'FINISHED',penalties:'PENALTIES'})[room.match.G.phase]||(room.match.G.ot?'EXTRA_TIME':'PLAYING')),players:room.players.map(member),homePlayers:room.players.filter(p=>p.team===0).map(member),awayPlayers:room.players.filter(p=>p.team===1).map(member),spectators:(room.spectators||[]).map(member),coaches:(room.coaches||[]).map(member),referee:room.referee?member(room.referee):null,matchId:room.match?.id||null,intermissionEndsAt:room.match?.G.intermissionEndsAt||null,breakRemaining:room.match?.G.breakRemaining||0,score:room.match?.G.score||[0,0]});
 const processingSamples=[],metrics={packets:0,bytes:0,dropped:0,reconnects:0,ticks:0,processingMs:0,peakProcessingMs:0,packetsPerSecond:0,bytesPerSecond:0};
 const send=(ws,data)=>{if(ws?.readyState!==1)return;if(ws.bufferedAmount>=256000){metrics.dropped++;ws.close(1013,'Reconecte para atualizar o estado');return;}const payload=typeof data==='string'?data:JSON.stringify(data);ws.send(payload);metrics.packets++;metrics.bytes+=Buffer.byteLength(payload);};
 const broadcast=(room,data)=>{if(data.type==='snapshot')room.encoder=new protocol.Encoder(data.state);const payload=JSON.stringify(data);for(const p of all(room))if(membership.get(p.id)===room.id)send(connections.get(p.id)?.ws,payload);};
 const notify=room=>broadcast(room,{type:'room',room:visible(room)});
 const party=createParty({lookup:uid=>db.one('SELECT u.id,p.display_name name FROM users u JOIN profiles p ON p.user_id=u.id WHERE u.id=? OR u.username=?',uid,uid),connected:uid=>connections.has(uid),available:uid=>!membership.has(uid)&&!ranked.queue.has(uid)&&!friendlies?.has(uid),cancel:uid=>{ranked.cancel(uid);friendlies?.cancel(uid);},notify:(uid,data)=>send(connections.get(uid)?.ws,data)});
 friendlies=require('../services/friendlies.cjs').createFriendlies({db,party,connected:uid=>connections.has(uid),available:uid=>!membership.has(uid)&&!ranked.queue.has(uid),createMatch:teams=>{
  if(rooms.size>=security.maxRooms)fail('CAPACITY','Servidor cheio.',503);
  const chosen=teams.map(t=>clubs.select(t.leader,t.clubId)),room={id:id(),owner:teams[0].leader,name:chosen[0].name+' × '+chosen[1].name,kind:'ONLINE',createdAt:Date.now(),spectators:[],coaches:[],cfg:{n:4,time:1200,diff:2,fs:0,ball:1,sk0:0,sk1:1,stadium:'max-arena',friendly:true,halftime:true,intermissionLobby:true,goldenSecondHalf:true,teams:[chosen[0],teamData.contrast(chosen[0],chosen[1])],settings:settings({penalties:teams[0].penalties})},players:teams.flatMap((t,team)=>t.members.map((m,slot)=>{const p=auth.profile(m.id);return {id:m.id,name:p.shirt_name,num:p.shirt_number,team,slot};}))};room.awayBase=chosen[1];rooms.set(room.id,room);for(const p of room.players)membership.set(p.id,room.id);notify(room);return visible(room);
 }});
 function championshipCheckin(user,fixture){
  if(ranked.queue.has(user.id)||friendlies.has(user.id))fail('QUEUE','Saia da fila antes de entrar no campeonato.',409);
  const existing=rooms.get(fixture.room_id);if(membership.has(user.id)&&membership.get(user.id)!==existing?.id)fail('ROOM','Saia da sala atual antes de confirmar presença.',409);
  let room=existing;if(!room){if(rooms.size>=security.maxRooms)fail('CAPACITY','Servidor cheio.',503);const chosen=fixture.teams.map(e=>clubs.select(e.captain_id,e.club_id));room={id:id(),owner:fixture.teams[0].captain_id,name:chosen.map(t=>t.name).join(' × '),kind:'ONLINE',createdAt:Date.now(),players:[],spectators:[],coaches:[],championshipRosters:fixture.teams.map(e=>e.players),cfg:{n:fixture.n,time:1200,diff:2,fs:0,ball:1,sk0:0,sk1:1,stadium:'max-arena',championship:true,championshipFixture:fixture.id,captains:fixture.teams.map(e=>e.captain_id),halftime:true,intermissionLobby:true,teams:[chosen[0],teamData.contrast(chosen[0],chosen[1])],settings:settings()}};rooms.set(room.id,room);}
  if(room.match)fail('MATCH','A partida já começou.',409);
  if(!all(room).some(p=>p.id===user.id)){const profile=auth.profile(user.id),team=fixture.team,slot=Array.from({length:room.cfg.n},(_,i)=>i).find(i=>!room.players.some(p=>p.team===team&&p.slot===i));(slot===undefined?room.spectators:room.players).push({id:user.id,name:profile.shirt_name,num:profile.shirt_number,team:slot===undefined?null:team,slot:slot??null});}membership.set(user.id,room.id);notify(room);return visible(room);
 }
 function closeChampionshipWaiting(rid){const room=rooms.get(rid);if(!room||room.match)return;for(const p of all(room))if(membership.get(p.id)===rid){membership.delete(p.id);send(connections.get(p.id)?.ws,{type:'championshipClosed',roomId:rid});}rooms.delete(rid);}
 function current(userId){const room=rooms.get(membership.get(userId));return room?visible(room):null;}
 async function join(user,roomId,body={},access={}){
  object(body,['password','spectator']);
  if(body.spectator!==undefined&&typeof body.spectator!=='boolean')fail('SPECTATOR','Opção de espectador inválida.');
  if(friendlies.has(user.id))fail('FRIENDLY_BUSY','Cancele a busca de amistoso primeiro.',409);
  if(ranked.queue.has(user.id))fail('QUEUE','Cancele a busca ranqueada primeiro.',409);
  const existing=rooms.get(membership.get(user.id));if(existing&&existing.id!==roomId)fail('ROOM','Saia da sala atual primeiro.',409);
  const room=rooms.get(roomId);if(!room)fail('ROOM','Sala não encontrada.',404);
  if(all(room).some(p=>p.id===user.id)){if(room.left?.has(user.id))fail('ROOM','Você saiu desta partida.',409);membership.set(user.id,room.id);return visible(room);}
  if(room.cfg.championship&&!body.spectator)fail('CHAMP_CHECKIN','Entre pelo confronto na página de campeonatos.',403);
  if(room.kind!=='ONLINE'||room.ranked||room.match&&!body.spectator)fail('ROOM','Partida já iniciada. Entre como espectador.',409);
  if(room.passwordHash&&!access.invitation){
   room.attempts??=new Map();const recent=(room.attempts.get(user.id)||[]).filter(t=>Date.now()-t<60000);if(recent.length>=5)fail('PASSWORD_RATE','Aguarde um minuto para tentar novamente.',429);recent.push(Date.now());room.attempts.set(user.id,recent);
   const password=text(body.password||'','Senha',0,64),actual=await derive(password,room.passwordSalt,32);
   if(!timingSafeEqual(actual,room.passwordHash))fail('PASSWORD','Senha da sala incorreta.',403);
   if(rooms.get(roomId)!==room||room.match&&!body.spectator||membership.has(user.id)&&membership.get(user.id)!==roomId||ranked.queue.has(user.id))fail('ROOM','A sala mudou. Tente novamente.',409);
   if(all(room).some(p=>p.id===user.id))return visible(room);
  }
  const spectator=!!body.spectator||room.players.length>=room.cfg.n*2;
  room.spectators??=[];if(spectator&&room.spectators.length>=12)fail('FULL','Espectadores lotados.',409);
  const profile=auth.profile(user.id);let team=0,slot=0;
  let found=false;
  for(let i=0;i<room.cfg.n*2;i++){team=i%2;slot=Math.floor(i/2);if(room.players.some(p=>p.team===team&&p.slot===slot))continue;if(room.cfg.friendly&&!db.one("SELECT 1 FROM club_members WHERE club_id=? AND user_id=? AND status='APPROVED'",room.cfg.teams[team].id,user.id))continue;found=true;break;}
  if(!spectator&&!found)fail('FULL','Não há vaga disponível no seu time.',409);
  if(room.cfg.friendly&&!spectator&&!db.one("SELECT 1 FROM club_members WHERE club_id=? AND user_id=? AND status='APPROVED'",room.cfg.teams[team].id,user.id))fail('FRIENDLY_CLUB','Essa vaga pertence a um integrante do clube.',403);
  (spectator?room.spectators:room.players).push({id:user.id,name:profile.shirt_name,num:profile.shirt_number,team:spectator?null:team,slot:spectator?null:slot});room.disconnected??={};room.disconnected[user.id]=Date.now();membership.set(user.id,room.id);audit(user,'ROOM_JOIN',room.id,{spectator});socialEvent(room.id,profile.display_name+' entrou na sala.');notify(room);return visible(room);
 }
 async function create(user,body){
  if(friendlies.has(user.id))fail('FRIENDLY_BUSY','Cancele a busca de amistoso primeiro.',409);
  object(body,['name','password','n','time','gold','fs','diff','settings','ball','goalLimit','halftime','stadium','final']);
  if(ranked.queue.has(user.id))fail('QUEUE','Cancele a busca ranqueada primeiro.',409);
  if(membership.has(user.id))fail('ROOM','Saia da sala atual primeiro.',409);
  if(rooms.size>=security.maxRooms)fail('CAPACITY','Servidor cheio. Tente novamente.',503);
  const room={id:id(),owner:user.id,name:text(body.name||'Sala MAXBALL','Nome da sala',3,40),kind:'ONLINE',players:[],createdAt:Date.now(),cfg:{n:integer(body.n??2,'Formato',1,5),time:integer(body.time??180,'Tempo',60,1200),gold:integer(body.gold??0,'Gol de ouro',0,1),fs:0,diff:integer(body.diff??1,'Dificuldade',0,2),ball:1,goalLimit:integer(body.goalLimit??0,'Limite de gols',0,20),halftime:body.halftime===true,sk0:auth.profile(user.id).kit,sk1:1}};
  if(body.stadium!==undefined&&!require('../../src/data/stadiums.js').valid(body.stadium))fail('STADIUM','Estádio inválido.');room.cfg.stadium=body.stadium||'max-arena';room.spectators=[];try{room.cfg.settings=settings(body.settings,!!room.cfg.gold);}catch(error){fail('RULES',error.message);}
  if(body.final!==undefined&&typeof body.final!=='boolean')fail('FINAL','Modo de Final inválido.');if(body.final){room.cfg.final=true;room.cfg.settings=settings({penalties:true});}
  room.cfg.teams=[clubs.catalog(user.id).find(t=>t.legacyKit===room.cfg.sk0)||teamData.teams[1],teamData.teams[0]];room.awayBase=room.cfg.teams[1];room.cfg.teams[1]=teamData.contrast(room.cfg.teams[0],room.cfg.teams[1]);
  if(room.cfg.sk0===1)room.cfg.sk1=0;
  const password=text(body.password||'','Senha',0,64);
  if(password){room.passwordSalt=randomBytes(16);room.passwordHash=await derive(password,room.passwordSalt,32);}
  if(membership.has(user.id)||ranked.queue.has(user.id))fail('ROOM','Você já entrou em uma sala ou fila.',409);
  if(rooms.size>=security.maxRooms)fail('CAPACITY','Servidor cheio. Tente novamente.',503);
  rooms.set(room.id,room);try{await join(user,room.id,{password});}catch(error){rooms.delete(room.id);throw error;}
  return visible(room);
 }
 function persistResult(room){
  const match=room.match;
  if(room.saved)return;
  db.transaction(()=>{
   const row=db.one('SELECT status FROM matches WHERE id=?',match.id);if(row.status!=='RUNNING')return;
   const abandoned=match.G.reason==='ABANDONED';
   db.run('UPDATE matches SET score=?,events=?,stats=?,duration=?,status=?,finished_at=? WHERE id=?',JSON.stringify(match.G.score),JSON.stringify(match.log),JSON.stringify(match.stats),match.G.elapsed,abandoned?'ABANDONED':'COMPLETED',Date.now(),match.id);
   if(room.ranked){ranked.complete(room);progression.complete(room);}
   if(abandoned)return;
   maxpass?.complete(room);
   if(room.kind==='CAREER')career.complete({id:match.id,career_id:room.career.career.id,season:room.career.career.season,fixture:room.career.index,score:match.G.score,winner:match.G.winner,penalties:match.G.penalties?.score,stats:match.stats,duration:match.G.elapsed});
   for(const player of room.originalPlayers||room.players){
    if(!['TIME','GOAL_LIMIT','GOLDEN_GOAL','PENALTIES'].includes(match.G.reason))continue;
    if(!match.stats[player.id]?.inputs)continue;
    const won=match.G.winner===player.team,xp=won?60:25;
    db.run('UPDATE profiles SET xp=xp+?,level=1+CAST((xp+?)/250 AS INTEGER) WHERE user_id=?',xp,xp,player.id);
    const profile=auth.profile(player.id);
    for(const [code,title,eligible] of [['FIRST_MATCH','Estreia MAX',true],['FIRST_WIN','Primeira vitória',won],['LEVEL_10','Veterano MAX',profile.level>=10]])if(eligible&&!db.one('SELECT id FROM accolades WHERE user_id=? AND code=?',player.id,code))db.run('INSERT INTO accolades VALUES(?,?,NULL,0,NULL,?,?,?,?,?)',id(),player.id,'ACHIEVEMENT',code,title,'{}',Date.now());
   }
  });
  for(const p of room.originalPlayers||room.players)party.state(p.id,'IDLE');
  audit(null,'MATCH_FINISHED',match.id,{score:match.G.score,reason:match.G.reason});room.saved=true;room.finishedAt=Date.now();room.results=new Map();championshipResult(room);
  const rankedResult=room.ranked?db.one('SELECT * FROM ranked_matches WHERE id=?',match.id):null;
  for(const player of [...new Map([...(room.originalPlayers||room.players),...all(room)].map(p=>[p.id,p])).values()]){
   const profile=auth.profile(player.id),personal=rankedResult&&db.one('SELECT * FROM ranked_participants WHERE match_id=? AND user_id=?',match.id,player.id),before=personal?.rating_before,after=personal?.rating_after;
   const result={type:'result',maxpass:maxpass?.result(match.id,player.id)||null,rankedProgress:room.ranked?db.one('SELECT * FROM ranked_progress WHERE match_id=? AND user_id=?',match.id,player.id):null,matchId:match.id,score:match.G.score,penalties:match.G.penalties?.score,winner:match.G.winner,reason:match.G.reason,stats:match.stats[player.id],goals:match.log.filter(e=>e.type==='GOAL_SCORED'),labels:room.cfg.labels||room.cfg.teams?.map(t=>t.name),players:match.performance.players,mvp:match.performance.mvp,progress:{level:profile.level,xp:profile.xp},rating:rankedResult?{before,after,delta:after-before}:null,career:room.kind==='CAREER'?career.view(player.id).career:null};
   room.results.set(player.id,result);send(connections.get(player.id)?.ws,result);
  }
 }
 function start(user,roomId,official=false){
  const room=rooms.get(roomId);if(!room||room.owner!==user.id&&room.referee?.id!==user.id)fail('OWNER','Somente o anfitrião ou árbitro do amistoso pode iniciar.',403);
  if(room.match?.G.phase==='halftime'&&room.cfg.intermissionLobby){if((room.referee?.id||room.owner)!==user.id)fail('REFEREE','Somente o árbitro designado pode antecipar o segundo tempo.',403);room.match.resumeHalf();finishIntermission(room);return visible(room);}
  if(room.cfg.championship&&!official)fail('CHAMP_START','O confronto começa no horário acordado, com os dois elencos presentes.',403);
  if(room.match)fail('MATCH','Partida já iniciada.',409);
  if(room.cfg.friendly&&(room.players.length!==8||room.players.some(p=>!connections.has(p.id))))fail('FRIENDLY_ROSTER','Os oito jogadores precisam estar presentes para iniciar o amistoso.',409);
  if(!room.players.length)fail('PLAYERS','Mantenha pelo menos um jogador em campo antes de iniciar.',409);
  room.locker?.players.clear();room.originalPlayers=room.players.map(p=>({...p}));room.cfg.intermissionLobby=!!room.cfg.halftime;room.cfg.presentation=true;room.cfg.coaches=(room.coaches||[]).map(member);room.cfg.referee=room.referee?member(room.referee):null;
  if(room.cfg.teams)room.cfg.labels=room.cfg.teams.map(t=>t.name);
  const matchId=id();
  room.match=new Match({id:matchId,players:room.players.map(p=>({...member(p),...(()=>{const q=auth.profile(p.id);return {ballSkin:q.ball_skin,trail:q.effect,celebration:q.celebration};})()})),cfg:room.cfg,seed:randomInt(0,0x7fffffff),botController:bots});
  db.run('INSERT INTO matches(id,kind,career_id,season,fixture,participants,score,events,stats,duration,status,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',matchId,room.kind,room.career?.career.id||null,room.career?.career.season||null,room.career?.index??null,JSON.stringify(room.players),'[0,0]','[]','{}',0,'RUNNING',Date.now());
  if(room.ranked)ranked.begin(room);
  room.match.events.on('GOAL_SCORED',event=>broadcast(room,{type:'event',event}));
  socialEvent(room.id,'A partida começou.');
  audit(user,'MATCH_STARTED',matchId,{roomId:room.id,kind:room.kind});notify(room);return visible(room);
 }
 function careerMatch(user){
  if(rooms.size>=security.maxRooms)fail('CAPACITY','Servidor cheio. Tente novamente.',503);
  if(ranked.queue.has(user.id)||friendlies.has(user.id))fail('QUEUE','Saia da fila antes de entrar na carreira.',409);
  if(membership.has(user.id))fail('ROOM','Saia da sala atual primeiro.',409);
  const fixture=career.nextMatch(user.id),profile=auth.profile(user.id);
  const room={id:id(),owner:user.id,name:'Carreira · '+fixture.fixture.stage,kind:'CAREER',createdAt:Date.now(),cfg:{...fixture.cfg,career:true},career:fixture,players:[{id:user.id,name:fixture.career.player_name,num:fixture.career.shirt_number,team:0,slot:0}]};
  rooms.set(room.id,room);membership.set(user.id,room.id);start(user,room.id);return visible(room);
 }
 function leave(userId){
  rooms.get(membership.get(userId))?.locker?.leave(userId);
  ranked.cancel(userId);friendlies.cancel(userId);party.state(userId,'IDLE');
  const room=rooms.get(membership.get(userId));membership.delete(userId);if(!room)return;audit({id:userId},'ROOM_LEAVE',room.id);socialEvent(room.id,auth.profile(userId).display_name+' saiu da sala.');
  if(room.match&&room.match.G.phase!=='end'){
   if(room.ranked){room.left??=new Set();room.left.add(userId);forfeit(room,userId,'LEFT');persistResult(room);return;}
   // Preserve original participants for official results; bot substitutes after leaving.
   const player=room.match.P.find(p=>p.id===userId);if(player)player.ctrl='ai';
   room.left=room.left||new Set();room.left.add(userId);
   if(room.players.every(p=>room.left.has(p.id))){room.match.finish('ABANDONED');persistResult(room);}
  }else room.players=room.players.filter(p=>p.id!==userId);
  room.players=room.players.filter(p=>p.id!==userId);room.spectators=(room.spectators||[]).filter(p=>p.id!==userId);room.coaches=(room.coaches||[]).filter(p=>p.id!==userId);if(room.referee?.id===userId){room.referee=null;if(room.match){room.match.cfg.referee=null;if(room.match.G.pauseState)room.match.resume();}}
  if(room.match){room.match.cfg.coaches=(room.coaches||[]).map(member);room.sentBaseline=false;}
  if(room.owner===userId)room.owner=all(room)[0]?.id;
  if(!all(room).length){if(!room.match)rooms.delete(room.id);}else notify(room);
 }
 function assignReferee(user,roomId,body){
  object(body,['playerId']);const room=rooms.get(roomId);if(!room||room.owner!==user.id||room.kind!=='ONLINE'||room.ranked||membership.get(user.id)!==roomId)fail('OWNER','Somente o dono da sala pode designar o árbitro.',403);
  const candidate=body.playerId===null?null:all(room).find(p=>p.id===body.playerId);if(body.playerId!==null&&!candidate)fail('PLAYER','Jogador não está na sala.',404);if(candidate?.id===room.referee?.id)return visible(room);
  if(room.match&&candidate&&room.players.some(p=>p.id===candidate.id)){if(room.match.G.pauseState!=='PAUSED'||room.match.G.phase!=='play'||room.match.G.substitution)fail('REFEREE_PLAYER','Pause a partida para designar um jogador em campo.',409);}
  const old=room.referee;if(old&&old.id!==candidate?.id&&(room.spectators||[]).filter(p=>p.id!==candidate?.id).length>=12)fail('FULL','Espectadores lotados.',409);if(candidate){if(room.match&&room.players.some(p=>p.id===candidate.id)){const replacement=room.match.substitute(candidate.id,{id:'bot-ref-'+id(),name:'BOT substituto',num:candidate.num});replacement.ctrl='ai';room.players=room.players.filter(p=>p.id!==candidate.id);room.sentBaseline=false;}else room.players=room.players.filter(p=>p.id!==candidate.id);room.spectators=room.spectators.filter(p=>p.id!==candidate.id);room.coaches=(room.coaches||[]).filter(p=>p.id!==candidate.id);room.locker?.leave(candidate.id);candidate.team=candidate.slot=null;}
  if(old&&old.id!==candidate?.id)room.spectators.push({...old,team:null,slot:null});room.referee=candidate;room.cfg.referee=candidate?member(candidate):null;room.cfg.coaches=(room.coaches||[]).map(member);if(room.match){room.match.cfg.coaches=room.cfg.coaches;room.match.cfg.referee=room.cfg.referee;room.match.inputs.delete(candidate?.id);broadcast(room,{type:'snapshot',state:protocol.snapshot(room.match,ticks)});}audit(user,'ROOM_REFEREE',room.id,{before:old?.id||null,after:candidate?.id||null});notify(room);return visible(room);
 }
 function edit(user,roomId,body){
  const room=rooms.get(roomId);if(!room||room.owner!==user.id&&room.referee?.id!==user.id)fail('OWNER','Somente o anfitrião ou o árbitro designado pode alterar a sala.',403);
  if(room.cfg.championship)fail('CHAMP_RULES','As equipes e regras do campeonato estão fixadas.',409);
  if(room.match||room.ranked)fail('STARTED','A sala já iniciou.',409);
  object(body,['settings','homeTeamId','awayTeamId','playerId','destination','n','time','fs','ball','goalLimit','halftime','diff','stadium']);
  if(room.cfg.friendly&&Object.keys(body).some(k=>!['playerId','destination'].includes(k)))fail('FRIENDLY_RULES','As regras do amistoso foram confirmadas pelos dois clubes.',409);
  const beforeCfg=structuredClone(room.cfg),nextCfg={...room.cfg};for(const [key,min,max] of [['n',1,5],['time',60,1200],['fs',0,2],['ball',0,2],['goalLimit',0,20],['diff',0,2]])if(body[key]!==undefined)nextCfg[key]=integer(body[key],key,min,max);
  nextCfg.fs=0;nextCfg.ball=1;if(body.stadium!==undefined){if(!require('../../src/data/stadiums.js').valid(body.stadium))fail('STADIUM','Estádio inválido.');nextCfg.stadium=body.stadium;}
  if(body.halftime!==undefined){if(typeof body.halftime!=='boolean')fail('RULES','Intervalo inválido.');nextCfg.halftime=body.halftime;}
  if(room.players.some(p=>p.slot>=nextCfg.n))fail('FULL','Mova os jogadores das vagas removidas antes de diminuir o formato.',409);
  // Validate the complete request before changing any room state.
  let nextSettings=room.cfg.settings;
  if(body.settings!==undefined)try{nextSettings=settings(body.settings);}catch(error){fail('RULES',error.message);}
  let nextTeams=room.cfg.teams;
  if(body.homeTeamId!==undefined||body.awayTeamId!==undefined){
   const home=body.homeTeamId!==undefined?clubs.select(user.id,body.homeTeamId):room.cfg.teams[0];
   const away=body.awayTeamId!==undefined?clubs.select(user.id,body.awayTeamId):room.awayBase||room.cfg.teams[1];
   nextTeams=[home,teamData.contrast(home,away)];
  }
  if(body.playerId!==undefined){
   if(!['HOME','AWAY','SPECTATORS','HOME_COACH','AWAY_COACH','REFEREE'].includes(body.destination))fail('DESTINATION','Destino inválido.');
   const p=all(room).find(p=>p.id===body.playerId);if(!p)fail('PLAYER','Jogador saiu da sala.',404);if(room.owner!==user.id&&(body.destination==='REFEREE'||p.id===room.referee?.id))fail('OWNER','Somente o anfitrião pode alterar o posto do árbitro.',403);
   const coach=body.destination.endsWith('_COACH'),official=body.destination==='REFEREE',team=body.destination.startsWith('HOME')?0:body.destination.startsWith('AWAY')?1:null;
   if(room.cfg.friendly&&team!==null&&!coach&&!db.one("SELECT 1 FROM club_members WHERE club_id=? AND user_id=? AND status='APPROVED'",room.cfg.teams[team].id,p.id))fail('FRIENDLY_CLUB','O jogador precisa pertencer ao clube desse lado.',403);
   if(coach&&(room.coaches||[]).some(q=>q.team===team&&q.id!==p.id)||official&&room.referee&&room.referee.id!==p.id)fail('FULL','Esse posto já está ocupado.',409);
   if(!coach&&team!==null&&room.players.filter(q=>q.team===team&&q.id!==p.id).length>=room.cfg.n)fail('FULL','Time cheio.',409);
   if(!coach&&!official&&team===null&&(room.spectators||[]).filter(q=>q.id!==p.id).length>=12)fail('FULL','Espectadores lotados.',409);
   room.players=room.players.filter(q=>q.id!==p.id);room.spectators=(room.spectators||[]).filter(q=>q.id!==p.id);room.coaches=(room.coaches||[]).filter(q=>q.id!==p.id);if(room.referee?.id===p.id)room.referee=null;
   p.team=team;p.slot=coach||official||team===null?null:Array.from({length:room.cfg.n},(_,i)=>i).find(i=>!room.players.some(q=>q.team===team&&q.slot===i));if(official)room.referee=p;else if(coach)room.coaches.push(p);else (team===null?room.spectators:room.players).push(p);
  }
  room.cfg={...nextCfg,settings:nextSettings};
  if(body.awayTeamId!==undefined)room.awayBase=clubs.select(user.id,body.awayTeamId);
  room.cfg.teams=nextTeams;audit(user,'ROOM_EDIT',room.id,{before:beforeCfg,after:room.cfg,playerId:body.playerId||null,destination:body.destination||null});
  notify(room);return visible(room);
 }
 async function matchmaking(user){
  if(membership.has(user.id))return current(user.id);
  const open=[...rooms.values()].find(r=>r.quick&&!r.match&&r.players.length===1);
  if(open){await join(user,open.id);start({id:open.owner},open.id);return visible(open);}
  const result=await create(user,{name:'Partida rápida',n:1,time:180});rooms.get(result.id).quick=true;return result;
 }
 function locker(user,roomId,body){
  object(body,['entered','team']);const room=rooms.get(roomId),person=room&&all(room).find(p=>p.id===user.id);if(!room||room.ranked&&room.match?.G.phase!=='halftime'||room.kind!=='ONLINE'&&room.match?.G.phase!=='halftime'||!person||membership.get(user.id)!==roomId)fail('LOCKER','Vestiário indisponível.',403);
  if(typeof body.entered!=='boolean'||body.team!==undefined&&![0,1].includes(body.team))fail('LOCKER','Opção inválida.');
  if(body.entered&&room.match&&!['end','halftime'].includes(room.match.G.phase)&&room.players.some(p=>p.id===user.id))fail('LOCKER','A partida está em andamento.',409);
  room.locker??=new Locker();if(body.entered)room.locker.enter(member(person),body.team??0);else room.locker.leave(user.id);broadcast(room,room.locker.snapshot());return {room:visible(room),state:room.locker.snapshot()};
 }
 function lockerSkin(user,roomId,body){
  object(body,['itemId']);const room=rooms.get(roomId),entry=room?.locker?.players.get(user.id),player=room&&all(room).find(p=>p.id===user.id);
  if(!player||!entry||membership.get(user.id)!==roomId)fail('LOCKER','Entre no vestiário para trocar a skin.',403);
  if(room.match&&!['halftime','end'].includes(room.match.G.phase))fail('LOCKER','Troque a skin antes da partida ou no intervalo.',409);
  const itemId=text(body.itemId,'Skin',1,50),item=db.one('SELECT s.* FROM shop_items s JOIN inventory i ON i.item_id=s.id WHERE i.user_id=? AND s.id=?',user.id,itemId);
  if(item?.category!=='KIT')fail('SKIN','Escolha uma skin do seu inventário.',403);
  economy.equip(user.id,{itemId});player.kit=entry.kit=item.asset_index;const fieldPlayer=room.match?.P.find(p=>p.id===user.id);if(fieldPlayer)fieldPlayer.kit=item.asset_index;
  room.sentBaseline=false;notify(room);const state=room.locker.snapshot();broadcast(room,state);return {kit:item.asset_index,state};
 }
 function finishIntermission(room){room.halfNotified=false;room.locker?.players.clear();room.sentBaseline=false;notify(room);broadcast(room,room.locker?.snapshot()||{type:'locker',players:[]});}
 function handleIntermission(room,now=Date.now()){if(room.match.G.phase==='halftime'&&room.cfg.intermissionLobby){if(!room.halfNotified){room.halfNotified=true;room.match.G.intermissionEndsAt=now+300000;room.locker??=new Locker();for(const p of all(room))room.locker.enter(member(p),p.team??0);notify(room);broadcast(room,{type:'intermission',room:visible(room)});socialEvent(room.id,'Intervalo: até 5 minutos no vestiário. Chat e substituições disponíveis.');}room.match.G.breakRemaining=Math.max(0,(room.match.G.intermissionEndsAt-now)/1000);if(room.match.G.breakRemaining<=0){room.match.resumeHalf();finishIntermission(room);}}else if(room.halfNotified)finishIntermission(room);}
 function substitute(user,roomId,body){object(body,['outId','inId']);return substitutions(user,roomId,{changes:[body]});}
 function substitutions(user,roomId,body){
  object(body,['changes']);const room=rooms.get(roomId);if(!room||room.ranked||room.kind!=='ONLINE'||membership.get(user.id)!==roomId||room.owner!==user.id&&room.referee?.id!==user.id&&!room.cfg.captains?.includes(user.id))fail('SUBSTITUTE','Somente o anfitrião ou árbitro pode substituir.',403);
  if(!room.match||room.match.G.phase!=='halftime'&&(room.match.G.phase!=='play'||room.match.G.pauseState!=='PAUSED')||room.match.G.substitution)fail('SUBSTITUTE','Pause a partida e aguarde a animação antes de substituir.',409);
  let pairs;try{pairs=require('../../src/game/substitutionPlan.js').validate(room.match.P,room.spectators||[],body.changes);}catch(error){fail('SUBSTITUTE',error.message,409);}
  if(room.cfg.championship)for(const {out,incoming} of pairs){if(room.referee?.id!==user.id&&room.cfg.captains[out.team]!==user.id)fail('CHAMP_SUBSTITUTE','Cada capitão pode substituir apenas no próprio time.',403);if(!room.championshipRosters[out.team].includes(incoming.id))fail('CHAMP_ROSTER','O substituto deve estar inscrito no elenco deste clube.',403);}
  if(room.cfg.friendly)for(const {out,incoming} of pairs)if(!db.one("SELECT 1 FROM club_members WHERE club_id=? AND user_id=? AND status='APPROVED'",room.cfg.teams[out.team].id,incoming.id))fail('FRIENDLY_CLUB','O substituto precisa pertencer ao clube.',403);
  for(const {out,incoming} of pairs){const next=room.match.substitute(out.id,member(incoming));room.spectators=room.spectators.filter(p=>p.id!==incoming.id);const outgoingMember=room.players.find(p=>p.id===out.id);room.players=room.players.filter(p=>p.id!==out.id);if(outgoingMember)room.spectators.push({...outgoingMember,team:null,slot:null});room.players.push({...member(incoming),team:next.team,slot:next.slot});if(room.match.G.phase==='halftime'){room.locker?.leave(next.id);room.locker?.enter({...member(incoming),team:next.team},next.team);}else room.locker?.leave(next.id);const original=room.originalPlayers.find(p=>p.id===next.id);if(original){original.team=next.team;original.slot=next.slot;}else room.originalPlayers.push({id:next.id,name:next.name,num:next.num,team:next.team,slot:next.slot});socialEvent(room.id,next.name+' entra no lugar de '+(out.displayName||out.name));}
  db.run('UPDATE matches SET participants=? WHERE id=?',JSON.stringify(room.originalPlayers),room.match.id);room.sentBaseline=false;broadcast(room,{type:'snapshot',state:protocol.snapshot(room.match,ticks)});audit(user,'SUBSTITUTIONS',room.match.id,{changes:body.changes});notify(room);return visible(room);
 }
 function pause(user,roomId,body){
  object(body,['paused']);const room=rooms.get(roomId);if(!room||room.ranked||membership.get(user.id)!==room.id||!(room.kind==='CAREER'&&room.owner===user.id||room.kind==='ONLINE'&&(room.referee?room.referee.id===user.id:room.owner===user.id)))fail('REFEREE','Somente o árbitro designado pode controlar a pausa.',403);
  if(typeof body.paused!=='boolean'||!room.match||room.match.G.phase==='end'||room.match.G.phase==='starting')fail('PAUSE','Pausa indisponível neste momento.',409);
  if(!body.paused&&room.match.G.substitution)fail('SUBSTITUTE','Aguarde a animação de substituição.',409);if(body.paused)room.match.pause(user.id);else room.match.resume();audit(user,body.paused?'REFEREE_PAUSE':'REFEREE_RESUME',room.match.id);notify(room);return visible(room);
 }
 function forfeit(room,userId,reason){
  if(room.match.G.phase==='end')return;const loser=room.players.find(p=>p.id===userId).team;
  room.match.G.score[1-loser]=Math.max(room.match.G.score[1-loser],room.match.G.score[loser]+1);
  room.match.record('FORFEIT',{userId,reason});room.match.finish('FORFEIT');
 }
 function rankedStatus(user){return {...ranked.status(user.id),party:party.view(user.id),room:current(user.id),history:ranked.history(user.id)};}
 function rankedJoin(user,body={}){object(body,['n']);if(friendlies.has(user.id))fail('FRIENDLY_BUSY','Cancele a busca de amistoso primeiro.',409);if(membership.has(user.id))return rankedStatus(user);const n=integer(body.n??4,'Formato',1,4),g=party.current(user.id);if(g&&g.members.length>n)fail('PARTY_FORMAT','O formato precisa comportar todos os integrantes.');const group=party.search(user);ranked.join(user,group?{members:group.members.map(m=>({id:m.id})),partyId:group.id,n}:{n});return rankedStatus(user);}
 function rankedCancel(user){const g=party.current(user.id);if(g&&g.leader!==user.id)fail('PARTY_LEADER','Somente o líder cancela a busca.',403);ranked.cancel(user.id);party.state(user.id,'IDLE');return rankedStatus(user);}
 function pairRanked(){
  if(!canRank()||rooms.size>=security.maxRooms)return;
  const pair=ranked.pair();if(!pair){party.reconcile(uid=>ranked.queue.has(uid)||friendlies.has(uid));return;}
  const eligible=pair.filter(u=>{try{auth.allowed(db.one('SELECT * FROM users WHERE id=?',u.id));return !membership.has(u.id);}catch{return false;}});
  if(eligible.length!==pair.length){for(const u of pair)party.state(u.id,'IDLE');return;}
  const room={id:id(),owner:pair[0].id,name:'Ranqueado MAX',kind:'ONLINE',ranked:true,createdAt:Date.now(),cfg:{n:pair[0].rankedFormat,time:180,gold:0,fs:0,diff:2,sk0:0,sk1:1,ranked:true},players:pair.map(u=>{const p=auth.profile(u.id);return {id:u.id,name:p.shirt_name,num:p.shirt_number,team:u.team,slot:u.slot};})};
  rooms.set(room.id,room);for(const u of pair){membership.set(u.id,room.id);party.state(u.id,'IN_MATCH');}start(pair[0],room.id);
 }
 function connect(ws,user,token){
  const prior=connections.get(user.id);if(seenConnections.has(user.id))metrics.reconnects++;seenConnections.add(user.id);if(seenConnections.size>10000)seenConnections.delete(seenConnections.values().next().value);if(prior)prior.ws.close(4000,'Outra conexão aberta');
  const connection={ws,token,lastInput:0,sequence:-1,rate:0,rateAt:Date.now(),joinedAt:Date.now(),alive:true,nextAuth:Date.now()+1000};connections.set(user.id,connection);
  ws.on('message',(bytes,isBinary)=>{
   try{
    if(connections.get(user.id)!==connection||connection.revoked||ws.readyState!==1)return;
    if(isBinary)fail('PROTOCOL','Use mensagens de texto JSON.');
    if(Date.now()-connection.rateAt>1000){connection.rate=0;connection.rateAt=Date.now();}
    if(++connection.rate>security.wsMessages){securityEvent('WS_RATE_LIMIT');return ws.close(1008,'Muitas mensagens');}
    const data=JSON.parse(bytes.toString());object(data);
    const fields={ping:['type','sentAt'],subscribe:['type'],lockerInput:['type','x','y'],input:['type','seq','x','y','shoot','pass','requestPass','requestShot','shootSeq','passSeq']};
    if(!Object.hasOwn(fields,data.type))fail('PROTOCOL','Comando desconhecido.');object(data,fields[data.type]);
    if(data.type==='ping'){if(Number.isFinite(data.sentAt))send(ws,{type:'pong',sentAt:data.sentAt});return;}
    const room=rooms.get(membership.get(user.id));if(!room)return;
    if(data.type==='subscribe'){notify(room);if(room.locker)send(ws,room.locker.snapshot());if(room.match){send(ws,{type:'snapshot',state:protocol.snapshot(room.match,ticks)});room.sentBaseline=false;}if(room.results?.has(user.id))send(ws,room.results.get(user.id));return;}
    if(data.type==='lockerInput'){if(!Number.isFinite(data.x)||!Number.isFinite(data.y)||Math.abs(data.x)>1||Math.abs(data.y)>1)fail('INPUT','Comando inválido.');room.locker?.input(user.id,data.x,data.y);return;}if(data.type!=='input'||!room.match)return;
    if(!Number.isSafeInteger(data.seq)||data.seq<=connection.sequence||data.seq>Number.MAX_SAFE_INTEGER)fail('INPUT','Sequência inválida.');
    if(!Number.isFinite(data.x)||!Number.isFinite(data.y)||Math.abs(data.x)>1||Math.abs(data.y)>1||typeof data.shoot!=='boolean'||typeof data.pass!=='boolean')fail('INPUT','Comando inválido.');
    if(['requestPass','requestShot'].some(k=>data[k]!==undefined&&typeof data[k]!=='boolean'))fail('INPUT','Comando inválido.');
    if(['shootSeq','passSeq'].some(k=>data[k]!==undefined&&(!Number.isSafeInteger(data[k])||data[k]<0)))fail('INPUT','Ação inválida.');
    connection.sequence=data.seq;connection.lastInput=Date.now();
    const player=room.match.P.find(p=>p.id===user.id);if(player)player.ctrl='remote';
    room.match.setInput(user.id,{x:data.x,y:data.y,shoot:data.shoot,pass:data.pass,shootSeq:data.shootSeq,passSeq:data.passSeq,requestPass:data.requestPass,requestShot:data.requestShot});
   }catch{securityEvent('WS_INVALID_MESSAGE');ws.close(1008,'Mensagem inválida');}
  });
  ws.on('pong',()=>{connection.alive=true;connection.ping=Date.now()-(connection.pingAt||Date.now());});
  ws.on('error',()=>{});
  ws.on('close',()=>{if(connections.get(user.id)===connection){connections.delete(user.id);const r=rooms.get(membership.get(user.id));if(r){r.match?.inputs.delete(user.id);r.locker?.input(user.id,0,0);r.disconnected??={};r.disconnected[user.id]=Date.now();notify(r);}}});
  const room=rooms.get(membership.get(user.id));if(room){if(room.disconnected)delete room.disconnected[user.id];const player=room.match?.P.find(p=>p.id===user.id);if(player){player.shootSeq=player.passSeq=0;player.shootHeld=player.passHeld=false;}notify(room);}
  send(ws,{type:'connected',room:current(user.id)});
  // The simulation may tick before the client's subscribe reaches us. Give the
  // new socket a baseline now and restart the shared delta chain for all peers.
  if(room?.match){send(ws,{type:'snapshot',state:protocol.snapshot(room.match,ticks)});room.sentBaseline=false;}
 }
 let heartbeat=Date.now(),nextPair=0,meterAt=Date.now(),lastPackets=0,lastBytes=0;
 let ticks=0,last=performance.now(),accumulator=0,botPhase=0;
 const timer=setInterval(()=>{
  const processingStart=performance.now();
  if(Date.now()-heartbeat>10000){heartbeat=Date.now();for(const c of connections.values()){if(!c.alive)c.ws.terminate();else{c.alive=false;c.pingAt=Date.now();c.ws.ping();}}}
  if(Date.now()>=nextPair){nextPair=Date.now()+1000;try{party.tick();friendlies.tick();pairRanked();}catch(error){logger.error(error.message);}}
  const now=performance.now();accumulator+=Math.min(.25,(now-last)/1000);last=now;
  for(const [userId,connection] of connections){
   if(Date.now()>=connection.nextAuth){connection.nextAuth=Date.now()+1000;try{auth.authenticate(connection.token)}catch{connection.revoked=true;const r=rooms.get(membership.get(userId));r?.match?.inputs.delete(userId);r?.locker?.input(userId,0,0);connection.ws.close(1008,'Sessão encerrada');}}
   if(Date.now()-connection.lastInput>300)rooms.get(membership.get(userId))?.match?.inputs.delete(userId);
  }
  while(accumulator>=1/60){
   accumulator-=1/60;ticks++;
   for(const room of rooms.values())try{
    if(!room.ranked)for(const p of all(room))if(room.disconnected?.[p.id]&&Date.now()-room.disconnected[p.id]>20000&&!connections.has(p.id)){delete room.disconnected[p.id];leave(p.id);}
    if(room.locker?.players.size){room.locker.update(1/60);if(ticks%6===0)broadcast(room,room.locker.snapshot());}
    if(!room.match||room.match.G.phase==='end'&&room.finalSent&&room.saved)continue;
    if(room.ranked&&room.match.G.phase!=='end'){
     room.absent??={};for(const p of room.players){if(connections.has(p.id)&&membership.get(p.id)===room.id)delete room.absent[p.id];else{room.absent[p.id]??=Date.now();if(Date.now()-room.absent[p.id]>20000)forfeit(room,p.id,'DISCONNECTED');}}
    }
    room.lastPresent=all(room).some(p=>connections.has(p.id)&&membership.get(p.id)===room.id)?Date.now():(room.lastPresent||Date.now());
    if(Date.now()-room.lastPresent>30000&&room.match.G.phase!=='end')room.match.finish('ABANDONED');
    room.match.update(1/60);handleIntermission(room);room.botPhase??=botPhase++%6;if((ticks+room.botPhase)%6===0)bots.submit(room.match);
    if(room.match.G.phase==='end'){bots.remove(room.match.id);persistResult(room);}
    if(ticks>=(room.nextFrameTick||0)&&accumulator<1/60&&!room.finalSent){const acks=Object.fromEntries(room.players.map(p=>[p.id,connections.get(p.id)?.sequence??-1]));
     if(!room.sentBaseline||room.match.G.phase==='end'){const state=protocol.snapshot(room.match,ticks);state.acks=acks;broadcast(room,{type:'snapshot',state});}
     else broadcast(room,room.encoder.encode(room.match,ticks,acks));
     room.nextFrameTick=ticks+3;room.sentBaseline=true;if(room.match.G.phase==='end')room.finalSent=true;}
   }catch(error){logger.error(JSON.stringify({level:'ERROR',event:'match_tick',roomId:room.id,message:error.message}));room.match?.finish('ABANDONED');}
  }
  if(ticks%60===0)for(const room of rooms.values())if((room.match?.G.phase==='end'&&room.saved&&Date.now()-room.finishedAt>15*60000)||(!room.match&&!room.cfg.championship&&Date.now()-room.createdAt>15*60000)){
   for(const p of all(room))if(membership.get(p.id)===room.id)membership.delete(p.id);rooms.delete(room.id);
  }
  metrics.ticks=ticks;metrics.processingMs=performance.now()-processingStart;metrics.peakProcessingMs=Math.max(metrics.peakProcessingMs,metrics.processingMs);processingSamples.push(metrics.processingMs);if(processingSamples.length>180)processingSamples.shift();
  if(Date.now()-meterAt>=1000){const seconds=(Date.now()-meterAt)/1000;metrics.packetsPerSecond=Math.round((metrics.packets-lastPackets)/seconds);metrics.bytesPerSecond=Math.round((metrics.bytes-lastBytes)/seconds);lastPackets=metrics.packets;lastBytes=metrics.bytes;meterAt=Date.now();}
 },1000/60);
 timer.unref();
 function upgrade(request,socket,head){
  try{
   upgradeLimit('ip:'+request.socket.remoteAddress,security.wsIpHandshakes,60000);
   if(request.url!=='/ws'||request.headers.origin!==origin)throw new Error('Origin');
   const token=(request.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('maxball_session='))?.slice(16);
   const {user}=auth.authenticate(token);
   upgradeLimit('account:'+user.id,security.wsAccountHandshakes,60000);
   if(wss.clients.size>=security.maxConnections)fail('CAPACITY','Servidor cheio.',503);
   wss.handleUpgrade(request,socket,head,ws=>connect(ws,user,token));
  }catch(error){const status=[429,503].includes(error.status)?error.status:401;securityEvent(status===429?'WS_UPGRADE_RATE':status===503?'WS_CAPACITY':'WS_UNAUTHORIZED');socket.end('HTTP/1.1 '+status+' '+({401:'Unauthorized',429:'Too Many Requests',503:'Service Unavailable'})[status]+'\r\nConnection: close\r\nContent-Length: 0\r\n\r\n',()=>socket.destroy());}
 }
 function socialBroadcast(scope,data,allow=()=>true){const payload=JSON.stringify(data);for(const [uid,c] of connections)if((membership.get(uid)||'lobby')===scope&&allow(uid))send(c.ws,payload);}
 const features=require('./roomFeatures.cjs').createRoomFeatures({db,auth,economy,rooms,membership,connections,all,member,visible,notify,broadcast,send,bots,audit,join});
 return {features,friendlies,progression,championshipCheckin,closeChampionshipWaiting,isConnected:uid=>connections.has(uid),startChampionship:rid=>{const room=rooms.get(rid);if(!room?.cfg.championship)fail('CHAMP_ROOM','Sala do confronto indisponível.',409);return start({id:room.owner},rid,true);},setChampionshipResult:callback=>{championshipResult=callback;},setSocial:callback=>{socialEvent=callback;},socialBroadcast,pause,assignReferee,substitute,substitutions,locker,lockerSkin,edit,clubs,ranked,rankedStatus,rankedJoin,rankedCancel,pairRanked,forfeit,create,join,start,leave,current,careerMatch,matchmaking,upgrade,
  list:()=>[...rooms.values()].filter(r=>r.kind==='ONLINE'&&!r.ranked&&r.match?.G.phase!=='end').map(visible),online:()=>connections.size,
  close(){bots.close();clearInterval(timer);for(const ws of wss.clients)ws.terminate();connections.clear();wss.close();},
  // Server-side state only, useful to deterministic integration tests.
  rooms,bots,party,persistResult,handleIntermission,disconnect:userId=>connections.get(userId)?.ws.close(1008,'Sessão encerrada pela moderação'),metrics:()=>({...metrics,botDecisionMeanMs:bots.metrics.totalMs/Math.max(1,bots.metrics.jobs),botDecisionPeakMs:bots.metrics.peakMs,p95ProcessingMs:processingSamples.slice().sort((a,b)=>a-b)[Math.floor(processingSamples.length*.95)]||0,ping:Math.round([...connections.values()].reduce((sum,c)=>sum+(c.ping||0),0)/Math.max(1,connections.size)),queued:ranked.queue.size,queueWait:Math.floor(Math.max(0,...[...ranked.queue.values()].map(q=>(Date.now()-q.since)/1000))),tickRate:60,updateRate:20,connections:connections.size,rooms:rooms.size,players:[...rooms.values()].reduce((sum,r)=>sum+(r.match?.G.phase!=='end'?r.match?.P.length||0:0),0)})};
}
module.exports={createRooms};
