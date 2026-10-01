const {createRanked}=require('../services/ranked.cjs');
const {randomInt}=require('node:crypto');
const {WebSocketServer}=require('ws');
const {id}=require('../database/index.cjs');
const {fail,object,text,integer}=require('../lib/validation.cjs');
const {Match}=require('./match.cjs');
function createRooms({db,auth,economy,career,origin,logger=console,syncResults=false}){
 const ranked=createRanked(db,{syncResults});
 const rooms=new Map(),membership=new Map(),connections=new Map();
 const wss=new WebSocketServer({noServer:true,maxPayload:4096,perMessageDeflate:false});
 const visible=room=>({id:room.id,name:room.name,owner:room.owner,kind:room.kind,cfg:room.cfg,status:room.match?.G.phase||'waiting',players:room.players.map(p=>({id:p.id,name:p.name,num:p.num,team:p.team,slot:p.slot,connected:connections.has(p.id)})),matchId:room.match?.id||null});
 const send=(ws,data)=>{if(ws?.readyState===1&&ws.bufferedAmount<256000)ws.send(JSON.stringify(data));};
 const broadcast=(room,data)=>room.players.forEach(p=>{if(membership.get(p.id)===room.id)send(connections.get(p.id)?.ws,data);});
 const notify=room=>broadcast(room,{type:'room',room:visible(room)});
 function current(userId){const room=rooms.get(membership.get(userId));return room?visible(room):null;}
 function join(user,roomId){
  if(ranked.queue.has(user.id))fail('QUEUE','Cancele a busca ranqueada primeiro.',409);
  const existing=rooms.get(membership.get(user.id));if(existing&&existing.id!==roomId)fail('ROOM','Saia da sala atual primeiro.',409);
  const room=rooms.get(roomId);if(!room)fail('ROOM','Sala não encontrada.',404);
  if(room.players.some(p=>p.id===user.id)){if(room.left?.has(user.id))fail('ROOM','Você saiu desta partida.',409);membership.set(user.id,room.id);return visible(room);}
  if(room.kind!=='ONLINE'||room.match)fail('ROOM','Partida já iniciada.',409);
  if(room.players.length>=room.cfg.n*2)fail('FULL','Sala cheia.',409);
  const profile=auth.profile(user.id);let team=0,slot=0;
  for(let i=0;i<room.cfg.n*2;i++){team=i%2;slot=Math.floor(i/2);if(!room.players.some(p=>p.team===team&&p.slot===slot))break;}
  room.players.push({id:user.id,name:profile.shirt_name,num:profile.shirt_number,team,slot});membership.set(user.id,room.id);notify(room);return visible(room);
 }
 function create(user,body){
  object(body,['name','n','time','gold','fs','diff']);
  if(ranked.queue.has(user.id))fail('QUEUE','Cancele a busca ranqueada primeiro.',409);
  if(membership.has(user.id))fail('ROOM','Saia da sala atual primeiro.',409);
  if(rooms.size>=100)fail('CAPACITY','Servidor cheio. Tente novamente.',503);
  const room={id:id(),owner:user.id,name:text(body.name||'Sala MAXBALL','Nome da sala',3,40),kind:'ONLINE',players:[],createdAt:Date.now(),cfg:{n:integer(body.n??2,'Formato',1,4),time:integer(body.time??180,'Tempo',60,600),gold:integer(body.gold??0,'Gol de ouro',0,1),fs:integer(body.fs??0,'Campo',0,2),diff:integer(body.diff??1,'Dificuldade',0,2),sk0:auth.profile(user.id).kit,sk1:1}};
  if(room.cfg.sk0===1)room.cfg.sk1=0;
  rooms.set(room.id,room);return join(user,room.id);
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
   if(room.kind==='CAREER')career.complete({id:match.id,career_id:room.career.career.id,season:room.career.career.season,fixture:room.career.index,score:match.G.score,stats:match.stats,duration:match.G.elapsed});
   for(const player of room.players){
    if(!match.stats[player.id]?.inputs)continue;
    const won=match.G.score[player.team]>match.G.score[1-player.team],reward=won?30:10,xp=won?60:25;
    economy.change(player.id,reward,'REWARD',match.id,'match:'+match.id);
    db.run('UPDATE profiles SET xp=xp+?,level=1+CAST((xp+?)/250 AS INTEGER) WHERE user_id=?',xp,xp,player.id);
    const profile=auth.profile(player.id);
    for(const [code,title,eligible] of [['FIRST_MATCH','Estreia MAX',true],['FIRST_WIN','Primeira vitória',won],['LEVEL_10','Veterano MAX',profile.level>=10]])if(eligible&&!db.one('SELECT id FROM accolades WHERE user_id=? AND code=?',player.id,code))db.run('INSERT INTO accolades VALUES(?,?,NULL,0,NULL,?,?,?,?,?)',id(),player.id,'ACHIEVEMENT',code,title,'{}',Date.now());
   }
  });
  room.saved=true;broadcast(room,{type:'result',matchId:match.id,score:match.G.score,reason:match.G.reason});
 }
 function start(user,roomId){
  const room=rooms.get(roomId);if(!room||room.owner!==user.id)fail('OWNER','Somente o anfitrião pode iniciar.',403);
  if(room.match)fail('MATCH','Partida já iniciada.',409);
  const matchId=id();
  room.match=new Match({id:matchId,players:room.players,cfg:room.cfg,seed:randomInt(0,0x7fffffff)});
  db.run('INSERT INTO matches(id,kind,career_id,season,fixture,participants,score,events,stats,duration,status,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',matchId,room.kind,room.career?.career.id||null,room.career?.career.season||null,room.career?.index??null,JSON.stringify(room.players),'[0,0]','[]','{}',0,'RUNNING',Date.now());
  if(room.ranked)ranked.begin(room);
  room.match.events.on('GOAL_SCORED',event=>broadcast(room,{type:'event',event}));
  notify(room);return visible(room);
 }
 function careerMatch(user){
  if(membership.has(user.id))fail('ROOM','Saia da sala atual primeiro.',409);
  const fixture=career.nextMatch(user.id),profile=auth.profile(user.id);
  const room={id:id(),owner:user.id,name:'Carreira · '+fixture.fixture.stage,kind:'CAREER',createdAt:Date.now(),cfg:{...fixture.cfg,career:true},career:fixture,players:[{id:user.id,name:profile.shirt_name,num:profile.shirt_number,team:0,slot:0}]};
  rooms.set(room.id,room);membership.set(user.id,room.id);start(user,room.id);return visible(room);
 }
 function leave(userId){
  ranked.cancel(userId);
  const room=rooms.get(membership.get(userId));membership.delete(userId);if(!room)return;
  if(room.match&&room.match.G.phase!=='end'){
   if(room.ranked){room.left??=new Set();room.left.add(userId);forfeit(room,userId,'LEFT');persistResult(room);return;}
   // Preserve original participants for official results; bot substitutes after leaving.
   const player=room.match.P.find(p=>p.id===userId);if(player)player.ctrl='ai';
   room.left=room.left||new Set();room.left.add(userId);
   if(room.players.every(p=>room.left.has(p.id))){room.match.finish('ABANDONED');persistResult(room);}
  }else room.players=room.players.filter(p=>p.id!==userId);
  if(!room.match){room.owner=room.players[0]?.id;if(!room.owner)rooms.delete(room.id);else notify(room);}
 }
 function matchmaking(user){
  if(membership.has(user.id))return current(user.id);
  const open=[...rooms.values()].find(r=>r.quick&&!r.match&&r.players.length===1);
  if(open){join(user,open.id);start({id:open.owner},open.id);return visible(open);}
  const result=create(user,{name:'Partida rápida',n:1,time:180});rooms.get(result.id).quick=true;return result;
 }
 function forfeit(room,userId,reason){
  if(room.match.G.phase==='end')return;const loser=room.players.find(p=>p.id===userId).team;
  room.match.G.score[1-loser]=Math.max(room.match.G.score[1-loser],room.match.G.score[loser]+1);
  room.match.record('FORFEIT',{userId,reason});room.match.finish('FORFEIT');
 }
 function rankedStatus(user){return {...ranked.status(user.id),room:current(user.id),history:ranked.history(user.id)};}
 function rankedJoin(user){if(membership.has(user.id))return rankedStatus(user);ranked.join(user);return rankedStatus(user);}
 function rankedCancel(user){ranked.cancel(user.id);return rankedStatus(user);}
 function pairRanked(){
  const pair=ranked.pair();if(!pair)return;
  const eligible=pair.filter(u=>{try{auth.allowed(db.one('SELECT * FROM users WHERE id=?',u.id));return !membership.has(u.id);}catch{return false;}});
  if(eligible.length!==2){for(const u of eligible)ranked.join(u);return;}
  const room={id:id(),owner:pair[0].id,name:'Ranqueado MAX',kind:'ONLINE',ranked:true,createdAt:Date.now(),cfg:{n:4,time:180,gold:0,fs:0,diff:2,sk0:0,sk1:1,ranked:true},players:pair.map((u,team)=>{const p=auth.profile(u.id);return {id:u.id,name:p.shirt_name,num:p.shirt_number,team,slot:0};})};
  rooms.set(room.id,room);for(const u of pair)membership.set(u.id,room.id);start(pair[0],room.id);
 }
 function connect(ws,user,token){
  const prior=connections.get(user.id);if(prior)prior.ws.close(4000,'Outra conexão aberta');
  const connection={ws,token,lastInput:0,sequence:-1,rate:0,rateAt:Date.now(),joinedAt:Date.now(),alive:true};connections.set(user.id,connection);
  ws.on('message',bytes=>{
   try{
    if(Date.now()-connection.rateAt>1000){connection.rate=0;connection.rateAt=Date.now();}
    if(++connection.rate>90)return ws.close(1008,'Muitas mensagens');
    const data=JSON.parse(bytes.toString());object(data,['type','seq','x','y','shoot','pass','requestPass','requestShot']);
    const room=rooms.get(membership.get(user.id));if(!room)return;
    if(data.type==='subscribe'){notify(room);if(room.match)send(ws,{type:'snapshot',state:room.match.snapshot()});return;}
    if(data.type!=='input'||!room.match)return;
    if(!Number.isSafeInteger(data.seq)||data.seq<=connection.sequence||data.seq>Number.MAX_SAFE_INTEGER)fail('INPUT','Sequência inválida.');
    if(!Number.isFinite(data.x)||!Number.isFinite(data.y)||Math.abs(data.x)>1||Math.abs(data.y)>1||typeof data.shoot!=='boolean'||typeof data.pass!=='boolean')fail('INPUT','Comando inválido.');
    if(['requestPass','requestShot'].some(k=>data[k]!==undefined&&typeof data[k]!=='boolean'))fail('INPUT','Comando inválido.');
    connection.sequence=data.seq;connection.lastInput=Date.now();
    const player=room.match.P.find(p=>p.id===user.id);if(player)player.ctrl='remote';
    room.match.setInput(user.id,{x:data.x,y:data.y,shoot:data.shoot,pass:data.pass,requestPass:data.requestPass,requestShot:data.requestShot});
   }catch{ws.close(1008,'Mensagem inválida');}
  });
  ws.on('pong',()=>connection.alive=true);
  ws.on('error',()=>{});
  ws.on('close',()=>{if(connections.get(user.id)===connection)connections.delete(user.id);});
  const room=rooms.get(membership.get(user.id));if(room)notify(room);
  send(ws,{type:'connected',room:current(user.id)});
 }
 let heartbeat=Date.now();
 let ticks=0,last=performance.now(),accumulator=0;
 const timer=setInterval(()=>{
  if(Date.now()-heartbeat>10000){heartbeat=Date.now();for(const c of connections.values()){if(!c.alive)c.ws.terminate();else{c.alive=false;c.ws.ping();}}}
  if(ticks%60===0)try{pairRanked();}catch(error){logger.error(error.message);}
  const now=performance.now();accumulator+=Math.min(.25,(now-last)/1000);last=now;
  for(const [userId,connection] of connections){
   if(ticks%60===0)try{auth.authenticate(connection.token)}catch{connection.ws.close(1008,'Sessão encerrada');}
   if(Date.now()-connection.lastInput>300)rooms.get(membership.get(userId))?.match?.inputs.delete(userId);
  }
  while(accumulator>=1/60){
   accumulator-=1/60;ticks++;
   for(const room of rooms.values())try{
    if(!room.match)continue;
    if(room.ranked&&room.match.G.phase!=='end'){
     room.absent??={};for(const p of room.players){if(connections.has(p.id)&&membership.get(p.id)===room.id)delete room.absent[p.id];else{room.absent[p.id]??=Date.now();if(Date.now()-room.absent[p.id]>20000)forfeit(room,p.id,'DISCONNECTED');}}
    }
    room.lastPresent=room.players.some(p=>connections.has(p.id)&&membership.get(p.id)===room.id)?Date.now():(room.lastPresent||Date.now());
    if(Date.now()-room.lastPresent>30000&&room.match.G.phase!=='end')room.match.finish('ABANDONED');
    room.match.update(1/60);
    if(room.match.G.phase==='end')persistResult(room);
    if(ticks%3===0)broadcast(room,{type:'snapshot',state:room.match.snapshot()});
   }catch(error){logger.error(JSON.stringify({level:'ERROR',event:'match_tick',roomId:room.id,message:error.message}));room.match?.finish('ABANDONED');}
  }
  if(ticks%60===0)for(const room of rooms.values())if((room.match?.G.phase==='end'&&room.saved&&Date.now()-room.createdAt>15*60000)||(!room.match&&Date.now()-room.createdAt>15*60000)){
   for(const p of room.players)if(membership.get(p.id)===room.id)membership.delete(p.id);rooms.delete(room.id);
  }
 },1000/60);
 timer.unref();
 function upgrade(request,socket,head){
  try{
   if(request.url!=='/ws'||request.headers.origin!==origin)throw new Error('Origin');
   const token=(request.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('maxball_session='))?.slice(16);
   const {user}=auth.authenticate(token);wss.handleUpgrade(request,socket,head,ws=>connect(ws,user,token));
  }catch{socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');socket.destroy();}
 }
 return {ranked,rankedStatus,rankedJoin,rankedCancel,pairRanked,forfeit,create,join,start,leave,current,careerMatch,matchmaking,upgrade,
  list:()=>[...rooms.values()].filter(r=>r.kind==='ONLINE'&&!r.ranked&&!r.match).map(visible),online:()=>connections.size,
  close(){clearInterval(timer);for(const c of connections.values())c.ws.terminate();wss.close();},
  // Server-side state only, useful to deterministic integration tests.
  rooms,persistResult};
}
module.exports={createRooms};
