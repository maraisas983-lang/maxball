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
function createRooms({db,auth,economy,career,origin,logger=console,syncResults=false,canRank=()=>true,audit=()=>{}}){
 const ranked=createRanked(db,{syncResults}),clubs=createClubs(db);
 const rooms=new Map(),membership=new Map(),connections=new Map(),seenConnections=new Set();
 const wss=new WebSocketServer({noServer:true,maxPayload:4096,perMessageDeflate:false});
 const all=room=>[...room.players,...(room.spectators||[])];
 const member=p=>({id:p.id,name:p.name,num:p.num,team:p.team,slot:p.slot,connected:connections.has(p.id)});
 const visible=room=>({id:room.id,name:room.name,owner:room.owner,hostId:room.owner,kind:room.kind,hasPassword:!!room.passwordHash,cfg:room.cfg,settings:room.cfg.settings||settings(),homeTeam:room.cfg.teams?.[0],awayTeam:room.cfg.teams?.[1],status:room.match?.G.phase||'waiting',roomStatus:!room.match?'LOBBY':({starting:'STARTING',end:'FINISHED',penalties:'PENALTIES'})[room.match.G.phase]||(room.match.G.ot?'EXTRA_TIME':'PLAYING'),players:room.players.map(member),homePlayers:room.players.filter(p=>p.team===0).map(member),awayPlayers:room.players.filter(p=>p.team===1).map(member),spectators:(room.spectators||[]).map(member),matchId:room.match?.id||null});
 const processingSamples=[],metrics={packets:0,bytes:0,dropped:0,reconnects:0,ticks:0,processingMs:0,peakProcessingMs:0,packetsPerSecond:0,bytesPerSecond:0};
 const send=(ws,data)=>{if(ws?.readyState!==1)return;if(ws.bufferedAmount>=256000){metrics.dropped++;ws.close(1013,'Reconecte para atualizar o estado');return;}const payload=typeof data==='string'?data:JSON.stringify(data);ws.send(payload);metrics.packets++;metrics.bytes+=Buffer.byteLength(payload);};
 const broadcast=(room,data)=>{const payload=JSON.stringify(data);for(const p of all(room))if(membership.get(p.id)===room.id)send(connections.get(p.id)?.ws,payload);};
 const notify=room=>broadcast(room,{type:'room',room:visible(room)});
 const party=createParty({lookup:uid=>db.one('SELECT u.id,p.display_name name FROM users u JOIN profiles p ON p.user_id=u.id WHERE u.id=? OR u.username=?',uid,uid),connected:uid=>connections.has(uid),available:uid=>!membership.has(uid)&&!ranked.queue.has(uid),cancel:uid=>ranked.cancel(uid),notify:(uid,data)=>send(connections.get(uid)?.ws,data)});
 function current(userId){const room=rooms.get(membership.get(userId));return room?visible(room):null;}
 async function join(user,roomId,body={}){
  object(body,['password','spectator']);
  if(body.spectator!==undefined&&typeof body.spectator!=='boolean')fail('SPECTATOR','Opção de espectador inválida.');
  if(ranked.queue.has(user.id))fail('QUEUE','Cancele a busca ranqueada primeiro.',409);
  const existing=rooms.get(membership.get(user.id));if(existing&&existing.id!==roomId)fail('ROOM','Saia da sala atual primeiro.',409);
  const room=rooms.get(roomId);if(!room)fail('ROOM','Sala não encontrada.',404);
  if(all(room).some(p=>p.id===user.id)){if(room.left?.has(user.id))fail('ROOM','Você saiu desta partida.',409);membership.set(user.id,room.id);return visible(room);}
  if(room.kind!=='ONLINE'||room.ranked||room.match&&!body.spectator)fail('ROOM','Partida já iniciada. Entre como espectador.',409);
  if(room.passwordHash){
   room.attempts??=new Map();const recent=(room.attempts.get(user.id)||[]).filter(t=>Date.now()-t<60000);if(recent.length>=5)fail('PASSWORD_RATE','Aguarde um minuto para tentar novamente.',429);recent.push(Date.now());room.attempts.set(user.id,recent);
   const password=text(body.password||'','Senha',0,64),actual=await derive(password,room.passwordSalt,32);
   if(!timingSafeEqual(actual,room.passwordHash))fail('PASSWORD','Senha da sala incorreta.',403);
   if(rooms.get(roomId)!==room||room.match&&!body.spectator||membership.has(user.id)&&membership.get(user.id)!==roomId||ranked.queue.has(user.id))fail('ROOM','A sala mudou. Tente novamente.',409);
   if(all(room).some(p=>p.id===user.id))return visible(room);
  }
  const spectator=!!body.spectator||room.players.length>=room.cfg.n*2;
  room.spectators??=[];if(spectator&&room.spectators.length>=12)fail('FULL','Espectadores lotados.',409);
  const profile=auth.profile(user.id);let team=0,slot=0;
  for(let i=0;i<room.cfg.n*2;i++){team=i%2;slot=Math.floor(i/2);if(!room.players.some(p=>p.team===team&&p.slot===slot))break;}
  (spectator?room.spectators:room.players).push({id:user.id,name:profile.shirt_name,num:profile.shirt_number,team:spectator?null:team,slot:spectator?null:slot});room.disconnected??={};room.disconnected[user.id]=Date.now();membership.set(user.id,room.id);audit(user,'ROOM_JOIN',room.id,{spectator});notify(room);return visible(room);
 }
 async function create(user,body){
  object(body,['name','password','n','time','gold','fs','diff','settings','ball','goalLimit','halftime']);
  if(ranked.queue.has(user.id))fail('QUEUE','Cancele a busca ranqueada primeiro.',409);
  if(membership.has(user.id))fail('ROOM','Saia da sala atual primeiro.',409);
  if(rooms.size>=100)fail('CAPACITY','Servidor cheio. Tente novamente.',503);
  const room={id:id(),owner:user.id,name:text(body.name||'Sala MAXBALL','Nome da sala',3,40),kind:'ONLINE',players:[],createdAt:Date.now(),cfg:{n:integer(body.n??2,'Formato',1,5),time:integer(body.time??180,'Tempo',60,600),gold:integer(body.gold??0,'Gol de ouro',0,1),fs:integer(body.fs??0,'Campo',0,2),diff:integer(body.diff??1,'Dificuldade',0,2),ball:integer(body.ball??1,'Bola',0,2),goalLimit:integer(body.goalLimit??0,'Limite de gols',0,20),halftime:body.halftime===true,sk0:auth.profile(user.id).kit,sk1:1}};
  room.spectators=[];try{room.cfg.settings=settings(body.settings,!!room.cfg.gold);}catch(error){fail('RULES',error.message);}
  room.cfg.teams=[clubs.catalog(user.id).find(t=>t.legacyKit===room.cfg.sk0)||teamData.teams[1],teamData.teams[0]];room.awayBase=room.cfg.teams[1];room.cfg.teams[1]=teamData.contrast(room.cfg.teams[0],room.cfg.teams[1]);
  if(room.cfg.sk0===1)room.cfg.sk1=0;
  const password=text(body.password||'','Senha',0,64);
  if(password){room.passwordSalt=randomBytes(16);room.passwordHash=await derive(password,room.passwordSalt,32);}
  if(membership.has(user.id)||ranked.queue.has(user.id))fail('ROOM','Você já entrou em uma sala ou fila.',409);
  if(rooms.size>=100)fail('CAPACITY','Servidor cheio. Tente novamente.',503);
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
   if(room.ranked)ranked.complete(room);
   if(abandoned)return;
   if(room.kind==='CAREER')career.complete({id:match.id,career_id:room.career.career.id,season:room.career.career.season,fixture:room.career.index,score:match.G.score,winner:match.G.winner,penalties:match.G.penalties?.score,stats:match.stats,duration:match.G.elapsed});
   for(const player of room.originalPlayers||room.players){
    if(!match.stats[player.id]?.inputs)continue;
    const won=match.G.winner===player.team,reward=won?30:10,xp=won?60:25;
    economy.change(player.id,reward,'REWARD',match.id,'match:'+match.id);
    db.run('UPDATE profiles SET xp=xp+?,level=1+CAST((xp+?)/250 AS INTEGER) WHERE user_id=?',xp,xp,player.id);
    const profile=auth.profile(player.id);
    for(const [code,title,eligible] of [['FIRST_MATCH','Estreia MAX',true],['FIRST_WIN','Primeira vitória',won],['LEVEL_10','Veterano MAX',profile.level>=10]])if(eligible&&!db.one('SELECT id FROM accolades WHERE user_id=? AND code=?',player.id,code))db.run('INSERT INTO accolades VALUES(?,?,NULL,0,NULL,?,?,?,?,?)',id(),player.id,'ACHIEVEMENT',code,title,'{}',Date.now());
   }
  });
  for(const p of room.originalPlayers||room.players)party.state(p.id,'IDLE');
  audit(null,'MATCH_FINISHED',match.id,{score:match.G.score,reason:match.G.reason});room.saved=true;room.results=new Map();
  const rankedResult=room.ranked?db.one('SELECT * FROM ranked_matches WHERE id=?',match.id):null;
  for(const player of room.originalPlayers||room.players){
   const profile=auth.profile(player.id),personal=rankedResult&&db.one('SELECT * FROM ranked_participants WHERE match_id=? AND user_id=?',match.id,player.id),before=personal?.rating_before,after=personal?.rating_after;
   const result={type:'result',matchId:match.id,score:match.G.score,penalties:match.G.penalties?.score,winner:match.G.winner,reason:match.G.reason,stats:match.stats[player.id],players:match.performance.players,mvp:match.performance.mvp,progress:{level:profile.level,xp:profile.xp},rating:rankedResult?{before,after,delta:after-before}:null,career:room.kind==='CAREER'?career.view(player.id).career:null};
   room.results.set(player.id,result);send(connections.get(player.id)?.ws,result);
  }
 }
 function start(user,roomId){
  const room=rooms.get(roomId);if(!room||room.owner!==user.id)fail('OWNER','Somente o anfitrião pode iniciar.',403);
  if(room.match)fail('MATCH','Partida já iniciada.',409);
  room.originalPlayers=room.players.map(p=>({...p}));room.cfg.presentation=true;
  if(room.cfg.teams)room.cfg.labels=room.cfg.teams.map(t=>t.name);
  const matchId=id();
  room.match=new Match({id:matchId,players:room.players,cfg:room.cfg,seed:randomInt(0,0x7fffffff)});
  db.run('INSERT INTO matches(id,kind,career_id,season,fixture,participants,score,events,stats,duration,status,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',matchId,room.kind,room.career?.career.id||null,room.career?.career.season||null,room.career?.index??null,JSON.stringify(room.players),'[0,0]','[]','{}',0,'RUNNING',Date.now());
  if(room.ranked)ranked.begin(room);
  room.match.events.on('GOAL_SCORED',event=>broadcast(room,{type:'event',event}));
  audit(user,'MATCH_STARTED',matchId,{roomId:room.id,kind:room.kind});notify(room);return visible(room);
 }
 function careerMatch(user){
  if(membership.has(user.id))fail('ROOM','Saia da sala atual primeiro.',409);
  const fixture=career.nextMatch(user.id),profile=auth.profile(user.id);
  const room={id:id(),owner:user.id,name:'Carreira · '+fixture.fixture.stage,kind:'CAREER',createdAt:Date.now(),cfg:{...fixture.cfg,career:true},career:fixture,players:[{id:user.id,name:fixture.career.player_name,num:fixture.career.shirt_number,team:0,slot:0}]};
  rooms.set(room.id,room);membership.set(user.id,room.id);start(user,room.id);return visible(room);
 }
 function leave(userId){
  ranked.cancel(userId);party.state(userId,'IDLE');
  const room=rooms.get(membership.get(userId));membership.delete(userId);if(!room)return;audit({id:userId},'ROOM_LEAVE',room.id);
  if(room.match&&room.match.G.phase!=='end'){
   if(room.ranked){room.left??=new Set();room.left.add(userId);forfeit(room,userId,'LEFT');persistResult(room);return;}
   // Preserve original participants for official results; bot substitutes after leaving.
   const player=room.match.P.find(p=>p.id===userId);if(player)player.ctrl='ai';
   room.left=room.left||new Set();room.left.add(userId);
   if(room.players.every(p=>room.left.has(p.id))){room.match.finish('ABANDONED');persistResult(room);}
  }else room.players=room.players.filter(p=>p.id!==userId);
  room.players=room.players.filter(p=>p.id!==userId);room.spectators=(room.spectators||[]).filter(p=>p.id!==userId);
  if(room.owner===userId)room.owner=all(room)[0]?.id;
  if(!all(room).length){if(!room.match)rooms.delete(room.id);}else notify(room);
 }
 function edit(user,roomId,body){
  const room=rooms.get(roomId);if(!room||room.owner!==user.id)fail('OWNER','Somente o anfitrião pode alterar a sala.',403);
  if(room.match||room.ranked)fail('STARTED','A sala já iniciou.',409);
  object(body,['settings','homeTeamId','awayTeamId','playerId','destination','n','time','fs','ball','goalLimit','halftime','diff']);
  const beforeCfg=structuredClone(room.cfg),nextCfg={...room.cfg};for(const [key,min,max] of [['n',1,5],['time',60,600],['fs',0,2],['ball',0,2],['goalLimit',0,20],['diff',0,2]])if(body[key]!==undefined)nextCfg[key]=integer(body[key],key,min,max);
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
   if(!['HOME','AWAY','SPECTATORS'].includes(body.destination))fail('DESTINATION','Destino inválido.');
   const p=all(room).find(p=>p.id===body.playerId);if(!p)fail('PLAYER','Jogador saiu da sala.',404);
   const team=body.destination==='HOME'?0:body.destination==='AWAY'?1:null;
   if(team!==null&&room.players.filter(q=>q.team===team&&q.id!==p.id).length>=room.cfg.n)fail('FULL','Time cheio.',409);
   if(team===null&&(room.spectators||[]).filter(q=>q.id!==p.id).length>=12)fail('FULL','Espectadores lotados.',409);
   room.players=room.players.filter(q=>q.id!==p.id);room.spectators=(room.spectators||[]).filter(q=>q.id!==p.id);
   p.team=team;p.slot=team===null?null:Array.from({length:room.cfg.n},(_,i)=>i).find(i=>!room.players.some(q=>q.team===team&&q.slot===i));(team===null?room.spectators:room.players).push(p);
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
 function forfeit(room,userId,reason){
  if(room.match.G.phase==='end')return;const loser=room.players.find(p=>p.id===userId).team;
  room.match.G.score[1-loser]=Math.max(room.match.G.score[1-loser],room.match.G.score[loser]+1);
  room.match.record('FORFEIT',{userId,reason});room.match.finish('FORFEIT');
 }
 function rankedStatus(user){return {...ranked.status(user.id),party:party.view(user.id),room:current(user.id),history:ranked.history(user.id)};}
 function rankedJoin(user,body={}){object(body,['n']);if(membership.has(user.id))return rankedStatus(user);const n=integer(body.n??4,'Formato',1,4),g=party.current(user.id);if(g&&g.members.length>n)fail('PARTY_FORMAT','O formato precisa comportar todos os integrantes.');const group=party.search(user);ranked.join(user,group?{members:group.members.map(m=>({id:m.id})),partyId:group.id,n}:{n});return rankedStatus(user);}
 function rankedCancel(user){const g=party.current(user.id);if(g&&g.leader!==user.id)fail('PARTY_LEADER','Somente o líder cancela a busca.',403);ranked.cancel(user.id);party.state(user.id,'IDLE');return rankedStatus(user);}
 function pairRanked(){
  if(!canRank())return;
  const pair=ranked.pair();if(!pair)return;
  const eligible=pair.filter(u=>{try{auth.allowed(db.one('SELECT * FROM users WHERE id=?',u.id));return !membership.has(u.id);}catch{return false;}});
  if(eligible.length!==pair.length){for(const u of pair)party.state(u.id,'IDLE');return;}
  const room={id:id(),owner:pair[0].id,name:'Ranqueado MAX',kind:'ONLINE',ranked:true,createdAt:Date.now(),cfg:{n:pair[0].rankedFormat,time:180,gold:0,fs:0,diff:2,sk0:0,sk1:1,ranked:true},players:pair.map(u=>{const p=auth.profile(u.id);return {id:u.id,name:p.shirt_name,num:p.shirt_number,team:u.team,slot:u.slot};})};
  rooms.set(room.id,room);for(const u of pair){membership.set(u.id,room.id);party.state(u.id,'IN_MATCH');}start(pair[0],room.id);
 }
 function connect(ws,user,token){
  const prior=connections.get(user.id);if(seenConnections.has(user.id))metrics.reconnects++;seenConnections.add(user.id);if(seenConnections.size>10000)seenConnections.delete(seenConnections.values().next().value);if(prior)prior.ws.close(4000,'Outra conexão aberta');
  const connection={ws,token,lastInput:0,sequence:-1,rate:0,rateAt:Date.now(),joinedAt:Date.now(),alive:true,nextAuth:Date.now()+1000};connections.set(user.id,connection);
  ws.on('message',bytes=>{
   try{
    if(Date.now()-connection.rateAt>1000){connection.rate=0;connection.rateAt=Date.now();}
    if(++connection.rate>90)return ws.close(1008,'Muitas mensagens');
    const data=JSON.parse(bytes.toString());object(data,['type','seq','x','y','shoot','pass','requestPass','requestShot','shootSeq','passSeq','sentAt']);
    if(data.type==='ping'){if(Number.isFinite(data.sentAt))send(ws,{type:'pong',sentAt:data.sentAt});return;}
    const room=rooms.get(membership.get(user.id));if(!room)return;
    if(data.type==='subscribe'){notify(room);if(room.match)send(ws,{type:'snapshot',state:protocol.snapshot(room.match,ticks)});if(room.results?.has(user.id))send(ws,room.results.get(user.id));return;}
    if(data.type!=='input'||!room.match)return;
    if(!Number.isSafeInteger(data.seq)||data.seq<=connection.sequence||data.seq>Number.MAX_SAFE_INTEGER)fail('INPUT','Sequência inválida.');
    if(!Number.isFinite(data.x)||!Number.isFinite(data.y)||Math.abs(data.x)>1||Math.abs(data.y)>1||typeof data.shoot!=='boolean'||typeof data.pass!=='boolean')fail('INPUT','Comando inválido.');
    if(['requestPass','requestShot'].some(k=>data[k]!==undefined&&typeof data[k]!=='boolean'))fail('INPUT','Comando inválido.');
    if(['shootSeq','passSeq'].some(k=>data[k]!==undefined&&(!Number.isSafeInteger(data[k])||data[k]<0)))fail('INPUT','Ação inválida.');
    connection.sequence=data.seq;connection.lastInput=Date.now();
    const player=room.match.P.find(p=>p.id===user.id);if(player)player.ctrl='remote';
    room.match.setInput(user.id,{x:data.x,y:data.y,shoot:data.shoot,pass:data.pass,shootSeq:data.shootSeq,passSeq:data.passSeq,requestPass:data.requestPass,requestShot:data.requestShot});
   }catch{ws.close(1008,'Mensagem inválida');}
  });
  ws.on('pong',()=>{connection.alive=true;connection.ping=Date.now()-(connection.pingAt||Date.now());});
  ws.on('error',()=>{});
  ws.on('close',()=>{if(connections.get(user.id)===connection){connections.delete(user.id);const r=rooms.get(membership.get(user.id));if(r){r.disconnected??={};r.disconnected[user.id]=Date.now();notify(r);}}});
  const room=rooms.get(membership.get(user.id));if(room){if(room.disconnected)delete room.disconnected[user.id];const player=room.match?.P.find(p=>p.id===user.id);if(player){player.shootSeq=player.passSeq=0;player.shootHeld=player.passHeld=false;}notify(room);}
  send(ws,{type:'connected',room:current(user.id)});
 }
 let heartbeat=Date.now(),nextPair=0,meterAt=Date.now(),lastPackets=0,lastBytes=0;
 let ticks=0,last=performance.now(),accumulator=0;
 const timer=setInterval(()=>{
  const processingStart=performance.now();
  if(Date.now()-heartbeat>10000){heartbeat=Date.now();for(const c of connections.values()){if(!c.alive)c.ws.terminate();else{c.alive=false;c.pingAt=Date.now();c.ws.ping();}}}
  if(Date.now()>=nextPair){nextPair=Date.now()+1000;try{party.tick();pairRanked();}catch(error){logger.error(error.message);}}
  const now=performance.now();accumulator+=Math.min(.25,(now-last)/1000);last=now;
  for(const [userId,connection] of connections){
   if(Date.now()>=connection.nextAuth){connection.nextAuth=Date.now()+1000;try{auth.authenticate(connection.token)}catch{connection.ws.close(1008,'Sessão encerrada');}}
   if(Date.now()-connection.lastInput>300)rooms.get(membership.get(userId))?.match?.inputs.delete(userId);
  }
  while(accumulator>=1/60){
   accumulator-=1/60;ticks++;
   for(const room of rooms.values())try{
    if(!room.ranked)for(const p of all(room))if(room.disconnected?.[p.id]&&Date.now()-room.disconnected[p.id]>20000&&!connections.has(p.id)){delete room.disconnected[p.id];leave(p.id);}
    if(!room.match)continue;
    if(room.ranked&&room.match.G.phase!=='end'){
     room.absent??={};for(const p of room.players){if(connections.has(p.id)&&membership.get(p.id)===room.id)delete room.absent[p.id];else{room.absent[p.id]??=Date.now();if(Date.now()-room.absent[p.id]>20000)forfeit(room,p.id,'DISCONNECTED');}}
    }
    room.lastPresent=all(room).some(p=>connections.has(p.id)&&membership.get(p.id)===room.id)?Date.now():(room.lastPresent||Date.now());
    if(Date.now()-room.lastPresent>30000&&room.match.G.phase!=='end')room.match.finish('ABANDONED');
    room.match.update(1/60);
    if(room.match.G.phase==='end')persistResult(room);
    if(ticks%3===0&&!room.finalSent){const state=protocol.snapshot(room.match,ticks);state.acks=Object.fromEntries(room.players.map(p=>[p.id,connections.get(p.id)?.sequence??-1]));
     broadcast(room,!room.sentBaseline||room.match.G.phase==='end'?{type:'snapshot',state}:protocol.frame(state));room.sentBaseline=true;if(room.match.G.phase==='end')room.finalSent=true;}
   }catch(error){logger.error(JSON.stringify({level:'ERROR',event:'match_tick',roomId:room.id,message:error.message}));room.match?.finish('ABANDONED');}
  }
  if(ticks%60===0)for(const room of rooms.values())if((room.match?.G.phase==='end'&&room.saved&&Date.now()-room.createdAt>15*60000)||(!room.match&&Date.now()-room.createdAt>15*60000)){
   for(const p of all(room))if(membership.get(p.id)===room.id)membership.delete(p.id);rooms.delete(room.id);
  }
  metrics.ticks=ticks;metrics.processingMs=performance.now()-processingStart;metrics.peakProcessingMs=Math.max(metrics.peakProcessingMs,metrics.processingMs);processingSamples.push(metrics.processingMs);if(processingSamples.length>180)processingSamples.shift();
  if(Date.now()-meterAt>=1000){const seconds=(Date.now()-meterAt)/1000;metrics.packetsPerSecond=Math.round((metrics.packets-lastPackets)/seconds);metrics.bytesPerSecond=Math.round((metrics.bytes-lastBytes)/seconds);lastPackets=metrics.packets;lastBytes=metrics.bytes;meterAt=Date.now();}
 },1000/60);
 timer.unref();
 function upgrade(request,socket,head){
  try{
   if(request.url!=='/ws'||request.headers.origin!==origin)throw new Error('Origin');
   const token=(request.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('maxball_session='))?.slice(16);
   const {user}=auth.authenticate(token);wss.handleUpgrade(request,socket,head,ws=>connect(ws,user,token));
  }catch{socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');socket.destroy();}
 }
 return {edit,clubs,ranked,rankedStatus,rankedJoin,rankedCancel,pairRanked,forfeit,create,join,start,leave,current,careerMatch,matchmaking,upgrade,
  list:()=>[...rooms.values()].filter(r=>r.kind==='ONLINE'&&!r.ranked&&r.match?.G.phase!=='end').map(visible),online:()=>connections.size,
  close(){clearInterval(timer);for(const c of connections.values())c.ws.terminate();wss.close();},
  // Server-side state only, useful to deterministic integration tests.
  rooms,party,persistResult,disconnect:userId=>connections.get(userId)?.ws.close(1008,'Sessão encerrada pela moderação'),metrics:()=>({...metrics,p95ProcessingMs:processingSamples.slice().sort((a,b)=>a-b)[Math.floor(processingSamples.length*.95)]||0,ping:Math.round([...connections.values()].reduce((sum,c)=>sum+(c.ping||0),0)/Math.max(1,connections.size)),queued:ranked.queue.size,queueWait:Math.floor(Math.max(0,...[...ranked.queue.values()].map(q=>(Date.now()-q.since)/1000))),tickRate:60,updateRate:20,connections:connections.size,rooms:rooms.size,players:[...rooms.values()].reduce((sum,r)=>sum+(r.match?.G.phase!=='end'?r.match?.P.length||0:0),0)})};
}
module.exports={createRooms};
