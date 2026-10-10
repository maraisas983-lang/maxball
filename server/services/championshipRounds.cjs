const {id}=require('../database/index.cjs');
const {object,integer,fail}=require('../lib/validation.cjs');
const WINDOW=48*60*60*1000,CHECKIN=15*60*1000,GRACE=5*60*1000;
function pairings(entries){
 const ring=entries.slice();if(ring.length%2)ring.push(null);const rounds=[];
 for(let round=0;round<ring.length-1;round++){
  const pairs=[];for(let i=0;i<ring.length/2;i++){const a=ring[i],b=ring[ring.length-1-i];if(a&&b)pairs.push((round+i)%2?[b,a]:[a,b]);}rounds.push(pairs);ring.splice(1,0,ring.pop());
 }return rounds;
}
function createChampionshipRounds(db,{permit,audit,rooms,now=Date.now}){
 const fixture=fid=>{const f=db.one('SELECT f.*,r.championship_id,r.number,r.released_at,r.deadline,c.n,c.status championship_status FROM championship_fixtures f JOIN championship_rounds r ON r.id=f.round_id JOIN championships c ON c.id=r.championship_id WHERE f.id=?',fid);if(!f)fail('FIXTURE','Confronto não encontrado.',404);return f;};
 const entry=eid=>{const e=db.one('SELECT e.*,c.name club_name FROM championship_entries e JOIN custom_clubs c ON c.id=e.club_id WHERE e.id=?',eid);return {...e,players:db.all('SELECT user_id FROM championship_players WHERE entry_id=?',eid).map(p=>p.user_id)};};
 const teams=f=>[entry(f.home_entry),entry(f.away_entry)];
 function present(f){const room=rooms.rooms.get(f.room_id);return teams(f).map((e,team)=>room?room.players.filter(p=>p.team===team&&e.players.includes(p.id)&&rooms.isConnected(p.id)&&rooms.current(p.id)?.id===room.id&&db.one('SELECT 1 FROM championship_checkins WHERE fixture_id=? AND user_id=?',f.id,p.id)).map(p=>p.id):[]);}
 function view(f,uid){const sides=teams(f),side=sides.findIndex(e=>e.players.includes(uid));return {...f,score:f.score?JSON.parse(f.score):null,home:sides[0].club_name,away:sides[1].club_name,captains:sides.map(e=>e.captain_id),side,isCaptain:side>=0&&sides[side].captain_id===uid,present:present(f).map(p=>p.length),checkedIn:!!db.one('SELECT 1 FROM championship_checkins WHERE fixture_id=? AND user_id=?',f.id,uid),checkinOpensAt:f.scheduled_at?f.scheduled_at-CHECKIN:null,attendanceDeadline:f.scheduled_at?Math.min(f.deadline,f.scheduled_at+GRACE):null};}
 function list(cid,uid){return db.all('SELECT * FROM championship_rounds WHERE championship_id=? ORDER BY number',cid).map(r=>({...r,fixtures:db.all('SELECT id FROM championship_fixtures WHERE round_id=? ORDER BY id',r.id).map(f=>view(fixture(f.id),uid))}));}
 function publish(actor,cid){
  permit(actor,'settings');const c=db.one('SELECT * FROM championships WHERE id=?',cid);if(!c||c.status!=='APPROVED')fail('CHAMP_CLOSED','Aprove o campeonato antes de lançar rodadas.',409);
  if(db.one("SELECT 1 FROM championship_fixtures f JOIN championship_rounds r ON r.id=f.round_id WHERE r.championship_id=? AND f.status IN('NEGOTIATING','SCHEDULED','RUNNING','INTERRUPTED')",cid))fail('ROUND_PENDING','Conclua a rodada anterior antes de lançar a próxima.',409);
  const entries=db.all("SELECT id FROM championship_entries WHERE championship_id=? AND status='APPROVED' ORDER BY created_at,id",cid).map(e=>e.id);
  if(entries.length<2)fail('ROUND_TEAMS','Aprove pelo menos dois clubes.',409);
  const number=db.one('SELECT count(*) n FROM championship_rounds WHERE championship_id=?',cid).n+1,pairs=pairings(entries)[number-1];if(!pairs)fail('ROUND_FINISHED','Todos os confrontos do turno já foram lançados.',409);
  return db.transaction(()=>{const rid=id(),time=now();db.run('INSERT INTO championship_rounds VALUES(?,?,?,?,?)',rid,cid,number,time,time+WINDOW);for(const [home,away] of pairs)db.run('INSERT INTO championship_fixtures(id,round_id,home_entry,away_entry,updated_at) VALUES(?,?,?,?,?)',id(),rid,home,away,time);audit(actor,'ROUND_PUBLISHED',rid,'OK',{number,deadline:time+WINDOW});return list(cid,actor.id);});
 }
 function actionable(f){if(f.championship_status!=='APPROVED'||now()>=f.deadline)fail('FIXTURE_CLOSED','Prazo do confronto encerrado.',409);}
 function propose(actor,fid,body){object(body,['startsAt']);const f=fixture(fid);actionable(f);if(teams(f)[0].captain_id!==actor.id)fail('HOME_CAPTAIN','Somente o capitão mandante propõe o horário.',403);if(f.status!=='NEGOTIATING')fail('FIXTURE_STATE','Este confronto já tem um acordo ou foi encerrado.',409);const time=integer(body.startsAt,'Dia e horário',now()+60000,f.deadline);db.run('UPDATE championship_fixtures SET proposed_at=?,proposal_version=proposal_version+1,updated_at=? WHERE id=?',time,now(),fid);audit(actor,'FIXTURE_PROPOSE',fid,'OK',{startsAt:time});return view(fixture(fid),actor.id);}
 function respond(actor,fid,body){
  object(body,['version','accepted']);const f=fixture(fid);actionable(f);if(teams(f)[1].captain_id!==actor.id)fail('AWAY_CAPTAIN','Somente o capitão visitante responde ao acordo.',403);if(typeof body.accepted!=='boolean')fail('AGREEMENT','Resposta inválida.');
  if(f.status!=='NEGOTIATING'||!f.proposed_at||body.version!==f.proposal_version||f.proposed_at<=now())fail('AGREEMENT_STALE','A proposta mudou ou venceu. Atualize os confrontos.',409);
  db.run('UPDATE championship_fixtures SET status=?,scheduled_at=?,proposed_at=?,updated_at=? WHERE id=?',body.accepted?'SCHEDULED':'NEGOTIATING',body.accepted?f.proposed_at:null,body.accepted?f.proposed_at:null,now(),fid);audit(actor,'FIXTURE_'+(body.accepted?'AGREED':'DECLINED'),fid,'OK',{startsAt:f.proposed_at});return view(fixture(fid),actor.id);
 }
 function checkin(actor,fid){
  const f=fixture(fid);if(f.championship_status!=='APPROVED'||f.status!=='SCHEDULED'||now()<f.scheduled_at-CHECKIN||now()>Math.min(f.deadline,f.scheduled_at+GRACE))fail('CHECKIN_WINDOW','Entre nos 15 minutos anteriores ao jogo ou até o limite de presença.',409);
  const sides=teams(f),team=sides.findIndex(e=>e.players.includes(actor.id));if(team<0)fail('ROSTER','Você não está inscrito neste confronto.',403);if(!rooms.isConnected(actor.id))fail('CONNECTION','Conecte-se ao jogo antes de confirmar presença.',409);
  const room=rooms.championshipCheckin(actor,{...f,teams:sides,team});db.run('UPDATE championship_fixtures SET room_id=?,updated_at=? WHERE id=?',room.id,now(),fid);db.run('INSERT INTO championship_checkins VALUES(?,?,?) ON CONFLICT(fixture_id,user_id) DO UPDATE SET checked_at=excluded.checked_at',fid,actor.id,now());return {fixture:view(fixture(fid),actor.id),room};
 }
 function settle(f,status,score,winner,reason){db.run('UPDATE championship_fixtures SET status=?,score=?,winner=?,reason=?,updated_at=? WHERE id=?',status,JSON.stringify(score),winner,reason,now(),f.id);if(status==='CANCELLED')rooms.rooms.get(f.room_id)?.match?.finish('ABANDONED');rooms.closeChampionshipWaiting(f.room_id);audit(null,'FIXTURE_'+status,f.id,'OK',{score,winner,reason});}
 function complete(room){if(!room.cfg.championshipFixture)return;const f=fixture(room.cfg.championshipFixture);if(f.status!=='RUNNING'||f.match_id!==room.match.id)return;const abandoned=room.match.G.reason==='ABANDONED';db.run('UPDATE championship_fixtures SET status=?,score=?,winner=?,reason=?,updated_at=? WHERE id=?',abandoned?'INTERRUPTED':'COMPLETED',JSON.stringify(room.match.G.score),room.match.G.winner??null,room.match.G.reason,now(),f.id);}
 function tick(){
  for(const row of db.all("SELECT id FROM championship_fixtures WHERE status IN('NEGOTIATING','SCHEDULED','RUNNING')")){
   const f=fixture(row.id),time=now();
   if(f.championship_status!=='APPROVED'){settle(f,'CANCELLED',[0,0],null,'CHAMPIONSHIP_CANCELLED');continue;}
   if(f.status==='RUNNING')continue;
   if(f.status==='NEGOTIATING'){if(time>=f.deadline)settle(f,'NO_AGREEMENT',[0,0],null,'NO_AGREEMENT');continue;}
   if(time<f.scheduled_at)continue;
   const sides=present(f),ready=sides.map(p=>p.length>=f.n);
   if(ready.every(Boolean)&&time<=Math.min(f.deadline,f.scheduled_at+GRACE)){
    const room=rooms.startChampionship(f.room_id);db.run("UPDATE championship_fixtures SET status='RUNNING',match_id=?,updated_at=? WHERE id=?",room.matchId,time,f.id);audit(null,'FIXTURE_STARTED',f.id,'OK',{matchId:room.matchId});
   }else if(time>=Math.min(f.deadline,f.scheduled_at+GRACE)){
    // Check-in alone never proves attendance: the roster must still be connected.
    const winner=ready[0]&&!ready[1]?0:ready[1]&&!ready[0]?1:null;settle(f,winner===null?'DOUBLE_WO':'WO',winner===0?[3,0]:winner===1?[0,3]:[0,0],winner,'ABSENCE');
   }
  }
 }
 function reopen(actor,fid){permit(actor,'settings');const f=fixture(fid);if(f.status!=='INTERRUPTED')fail('FIXTURE_STATE','Somente partidas interrompidas podem ser remarcadas.',409);if(f.championship_status!=='APPROVED')fail('CHAMP_CLOSED','Campeonato encerrado.',409);if(f.deadline<=now())db.run('UPDATE championship_rounds SET deadline=? WHERE id=?',now()+WINDOW,f.round_id);db.run("UPDATE championship_fixtures SET status='NEGOTIATING',room_id=NULL,match_id=NULL,scheduled_at=NULL,proposed_at=NULL,proposal_version=proposal_version+1,updated_at=? WHERE id=?",now(),fid);db.run('DELETE FROM championship_checkins WHERE fixture_id=?',fid);audit(actor,'FIXTURE_REOPENED',fid,'OK',{});return view(fixture(fid),actor.id);}
 // A server restart is an interruption, never evidence that a club failed to attend.
 db.run("UPDATE championship_fixtures SET status='INTERRUPTED',reason='SERVER_RESTART' WHERE status='RUNNING' OR (status='SCHEDULED' AND scheduled_at<=?)",now());
 return {list,publish,propose,respond,checkin,tick,complete,reopen};
}
module.exports={createChampionshipRounds,pairings,WINDOW,CHECKIN,GRACE};
