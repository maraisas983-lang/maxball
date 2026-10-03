const rosters=require('../../src/data/rosters2026.js');
const teamData=require('../../src/data/teams.js');
const {id}=require('../database/index.cjs');
const {fail,object,text,name,integer}=require('../lib/validation.cjs');
const {seeded}=require('../online/match.cjs');
const emptyStats=()=>({matches:0,starts:0,minutesPlayed:0,goals:0,assists:0,wins:0,draws:0,losses:0,ratingTotal:0,averageRating:0,titles:0});
function performance(stats,prestige=1){
 const average=stats.matches?stats.ratingTotal/stats.matches:0;
 return (stats.goals*4+stats.assists*3+stats.wins*2+average*stats.matches+stats.titles*20)*prestige;
}
function roundRobin(clubs){
 const rotation=clubs.slice(),rounds=[];if(rotation.length%2)rotation.push(null);const count=rotation.length;
 for(let r=0;r<count-1;r++){
  rounds.push(Array.from({length:count/2},(_,i)=>[rotation[i],rotation[count-1-i]]));
  rotation.splice(1,0,rotation.pop());
 }
 return rounds;
}
function createCareer(db,economy){
 const clubs=()=>db.all('SELECT * FROM clubs ORDER BY prestige,id').map(c=>({...c,category:teamData.fromClub(c).category,crest:teamData.fromClub(c).crest}));
 const playable=()=>clubs().filter(c=>c.id.startsWith('br-')||c.id.startsWith('mamo-'));
 const opponentsFor=career=>career.club_id.startsWith('club-')?clubs().filter(c=>c.id.startsWith('club-')):playable();
 const leagueClubs=career=>{const category=teamData.fromClub(db.one('SELECT * FROM clubs WHERE id=?',career.club_id)).category;return clubs().filter(c=>c.category===category);};
 const get=userId=>db.one('SELECT c.* FROM careers c JOIN active_career a ON a.career_id=c.id WHERE a.user_id=? AND c.user_id=?',userId,userId);
 const saves=userId=>db.all('SELECT id,save_name,player_name,shirt_number,club_id,season,reputation,stats,last_access FROM careers WHERE user_id=? ORDER BY last_access DESC,id',userId).map(c=>({...c,stats:JSON.parse(c.stats)}));
 function selectSave(userId,saveId){const career=db.one('SELECT * FROM careers WHERE id=? AND user_id=?',saveId,userId);if(!career)fail('CAREER','Carreira não encontrada.',404);if(db.one("SELECT id FROM matches WHERE career_id IN(SELECT id FROM careers WHERE user_id=?) AND status='RUNNING'",userId))fail('CAREER_BUSY','Termine ou saia da partida antes de trocar de carreira.',409);db.run('INSERT INTO active_career VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET career_id=excluded.career_id',userId,saveId);db.run('UPDATE careers SET last_access=? WHERE id=?',Date.now(),saveId);return view(userId);}
 function removeSave(userId,saveId,body){object(body,['confirm']);if(body.confirm!==true)fail('CONFIRM','Confirme a exclusão da carreira.',409);const c=db.one('SELECT id FROM careers WHERE id=? AND user_id=?',saveId,userId);if(!c)fail('CAREER','Carreira não encontrada.',404);if(db.one("SELECT id FROM matches WHERE career_id=? AND status='RUNNING'",saveId))fail('CAREER_BUSY','Saia da partida antes de excluir.',409);db.transaction(()=>{db.run('DELETE FROM active_career WHERE career_id=?',saveId);db.run('DELETE FROM transfer_offers WHERE career_id=?',saveId);db.run('DELETE FROM transfer_history WHERE career_id=?',saveId);db.run('DELETE FROM accolades WHERE career_id=?',saveId);db.run('DELETE FROM career_seasons WHERE career_id=?',saveId);db.run('UPDATE matches SET career_id=NULL WHERE career_id=?',saveId);db.run('DELETE FROM careers WHERE id=?',saveId);});return {saves:saves(userId)};}
 function renameSave(userId,saveId,body){object(body,['name']);const value=text(body.name,'Nome do save',1,40);if(!db.one('SELECT id FROM careers WHERE id=? AND user_id=?',saveId,userId))fail('CAREER','Carreira não encontrada.',404);db.run('UPDATE careers SET save_name=? WHERE id=?',value,saveId);return {saves:saves(userId)};}
 const season=career=>db.one('SELECT * FROM career_seasons WHERE career_id=? AND season=?',career.id,career.season);
 function newSeason(career){
  const all=leagueClubs(career),rounds=roundRobin(all.map(c=>c.id));
  const schedule=rounds.map((pairs,round)=>({competition:'league',stage:'Rodada '+(round+1),pairs,opponent:pairs.find(p=>p.includes(career.club_id)).find(c=>c!==career.club_id),status:pairs.find(p=>p.includes(career.club_id)).includes(null)?'BYE':'PENDING'}));
  const opponents=all.filter(c=>c.id!==career.club_id);
  ['Quartas','Semifinal','Final'].forEach((stage,i)=>schedule.push({competition:'cup',stage,opponent:opponents[(i+career.season)%opponents.length].id,status:'PENDING'}));
  const table=all.map(c=>({clubId:c.id,points:0,played:0,gf:0,ga:0,wins:0}));
  for(const f of schedule)if(f.status==='BYE')for(const [a,b] of f.pairs)if(a&&b){const x=table.find(t=>t.clubId===a),y=table.find(t=>t.clubId===b);x.played++;y.played++;x.points++;y.points++;}
  db.run('INSERT INTO career_seasons(id,career_id,season,club_id,status,schedule,table_data,stats,created_at) VALUES(?,?,?,?,?,?,?,?,?)',id(),career.id,career.season,career.club_id,'ACTIVE',JSON.stringify(schedule),JSON.stringify(table),JSON.stringify(emptyStats()),Date.now());
 }
 function create(userId,body){
  object(body,['name','shirtNumber','clubId','saveName']);const display=name(body.name),num=integer(body.shirtNumber,'Número',1,99),club=text(body.clubId,'Clube',1,40),saveName=text(body.saveName||display,'Nome do save',1,40);
  const team=db.one('SELECT * FROM clubs WHERE id=?',club);if(!team)fail('CLUB','Escolha um clube disponível.');
  return db.transaction(()=>{
   if(saves(userId).length>=12)fail('SAVE_LIMIT','Limite de 12 carreiras atingido.',409);
   if(db.one("SELECT id FROM matches WHERE career_id IN(SELECT id FROM careers WHERE user_id=?) AND status='RUNNING'",userId))fail('CAREER_BUSY','Saia da partida antes de criar uma carreira.',409);
   const profile=db.one('SELECT id FROM profiles WHERE user_id=?',userId),career={id:id(),user_id:userId,player_id:profile.id,club_id:club,season:1};
   db.run('INSERT INTO careers(id,user_id,player_id,club_id,stats,created_at,save_name,player_name,shirt_number,last_access) VALUES(?,?,?,?,?,?,?,?,?,?)',career.id,userId,profile.id,club,JSON.stringify(emptyStats()),Date.now(),saveName,display,num,Date.now());
   db.run('UPDATE careers SET roster=?,config=?,progression=? WHERE id=?',JSON.stringify(rosters.forTeam(club)?.players||Array.from({length:5},(_,i)=>({id:club+'-player-'+i,name:team.name+' '+(i+1),role:['Goleiro','Defensor','Volante','Meia','Atacante'][i],rating:70,ratingKind:'GAME_BALANCE'}))),JSON.stringify({format:5,league:teamData.fromClub(team).category}),JSON.stringify({level:1,xp:0}),career.id);
   db.run('INSERT INTO active_career VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET career_id=excluded.career_id',userId,career.id);
   newSeason(career);return view(userId);
  });
 }
 function view(userId){
  const career=get(userId);if(!career)return {career:null,clubs:playable()};
  const current=season(career);
  db.run("UPDATE transfer_offers SET status='EXPIRED' WHERE career_id=? AND status='PENDING' AND expires_at<?",career.id,Date.now());
  return {career:{...career,stats:JSON.parse(career.stats),roster:JSON.parse(career.roster),progression:JSON.parse(career.progression),config:JSON.parse(career.config)},current:{...current,schedule:JSON.parse(current.schedule),table:JSON.parse(current.table_data),stats:JSON.parse(current.stats),awards:JSON.parse(current.awards)},
   clubs:[...playable(),...clubs().filter(c=>c.category==='CARREIRA')],rosterInfo:rosters.forTeam(career.club_id)||null,ratingMethodology:rosters.methodology,history:db.all('SELECT season,club_id,stats,awards,status FROM career_seasons WHERE career_id=? ORDER BY season DESC',career.id).map(s=>({...s,stats:JSON.parse(s.stats),awards:JSON.parse(s.awards)})),
   offers:db.all('SELECT * FROM transfer_offers WHERE career_id=? ORDER BY created_at DESC LIMIT 30',career.id),transfers:db.all('SELECT * FROM transfer_history WHERE career_id=? ORDER BY created_at',career.id),
   trophies:db.all('SELECT * FROM accolades WHERE user_id=? AND career_id=? ORDER BY created_at DESC',userId,career.id),saves:saves(userId)};
 }
 function settings(userId,body){
  object(body,['time','diff']);const career=get(userId);if(!career)fail('CAREER','Crie sua carreira primeiro.',404);
  const time=integer(body.time,'Tempo',60,600),diff=integer(body.diff,'Dificuldade',0,2);if(![60,120,180,300,600].includes(time))fail('TIME','Escolha um tempo disponível.');
  if(db.one("SELECT id FROM matches WHERE career_id=? AND status='RUNNING'",career.id))fail('CAREER_BUSY','Termine a partida antes de alterar as opções.',409);
  db.run('UPDATE careers SET config=? WHERE id=?',JSON.stringify({...JSON.parse(career.config),time,diff}),career.id);return view(userId);
 }
 function nextMatch(userId){
  const career=get(userId);if(!career)fail('CAREER','Crie sua carreira primeiro.',404);
  const current=season(career);if(current.status!=='ACTIVE')fail('SEASON','Inicie a próxima temporada.',409);
  const schedule=JSON.parse(current.schedule),index=schedule.findIndex(f=>f.status==='PENDING');
  if(index<0)fail('FIXTURE','Temporada concluída.',409);
  const config=JSON.parse(career.config);
  const fixture=schedule[index],home=db.one('SELECT * FROM clubs WHERE id=?',career.club_id),away=db.one('SELECT * FROM clubs WHERE id=?',fixture.opponent);
  return {career,current,fixture,index,cfg:{n:5,halftime:true,time:config.time??120,gold:fixture.competition==='league'?0:1,diff:config.diff??1,sk0:home.kit,sk1:away.kit,teams:[{...teamData.fromClub(home),squad:JSON.parse(career.roster)},{...teamData.contrast(teamData.fromClub(home),teamData.fromClub(away)),squad:rosters.forTeam(away.id)?.players}],labels:[home.name,away.name]}};
 }
 function accolade(career,code,title,kind,details){
  db.run('INSERT OR IGNORE INTO accolades VALUES(?,?,?,?,?,?,?,?,?,?)',id(),career.user_id,career.id,career.season,career.club_id,kind,code,title,JSON.stringify(details),Date.now());
  return {code,name:title,kind};
 }
 function complete(match){
  const career=db.one('SELECT * FROM careers WHERE id=?',match.career_id),current=season(career);
  if(career.season!==match.season)fail('SEASON','Partida de outra temporada.',409);
  const schedule=JSON.parse(current.schedule),fixture=schedule[match.fixture];
  if(!fixture||fixture.status!=='PENDING')fail('FIXTURE','Partida já registrada.',409);
  const score=match.score,won=match.winner===0||score[0]>score[1],draw=match.winner==null&&score[0]===score[1],player=match.stats[career.user_id]||{};
  const rating=player.grade??require('../../src/game/performance.js').grade(player,won,draw);
  const stats=JSON.parse(current.stats),total=JSON.parse(career.stats),awards=JSON.parse(current.awards);
  for(const target of [stats,total]){target.matches++;target.starts++;target.minutesPlayed+=match.duration/60;target.goals+=player.goals||0;target.assists+=player.assists||0;target.wins+=won?1:0;target.draws+=draw?1:0;target.losses+=!won&&!draw?1:0;target.ratingTotal+=rating;target.averageRating=+(target.ratingTotal/target.matches).toFixed(2);}
  fixture.status='COMPLETED';fixture.score=score;fixture.winner=match.winner??(draw?null:won?0:1);fixture.penalties=match.penalties||null;fixture.rating=+rating.toFixed(1);fixture.matchId=match.id;
  const table=JSON.parse(current.table_data),random=seeded(match.id.split('').reduce((n,c)=>n+c.charCodeAt(0),0));
  const apply=(a,b,ga,gb)=>{const x=table.find(t=>t.clubId===a),y=table.find(t=>t.clubId===b);x.played++;y.played++;x.gf+=ga;x.ga+=gb;y.gf+=gb;y.ga+=ga;x.points+=ga>gb?3:ga===gb?1:0;y.points+=gb>ga?3:ga===gb?1:0;if(ga>gb)x.wins++;if(gb>ga)y.wins++;};
  if(fixture.competition==='league')for(const pair of fixture.pairs){if(pair.includes(null))continue;if(pair.includes(career.club_id))apply(career.club_id,fixture.opponent,...score);else apply(pair[0],pair[1],Math.floor(random()*4),Math.floor(random()*4));}
  if(fixture.competition!=='league'&&!won)for(const f of schedule)if(f.competition===fixture.competition&&f.status==='PENDING')f.status='ELIMINATED';
  if(fixture.competition!=='league'&&fixture.stage==='Final'&&won){
   const competition=db.one('SELECT * FROM competitions WHERE id=?',fixture.competition);
   awards.push(accolade(career,fixture.competition.toUpperCase(),competition.name,'TROPHY',{score}));stats.titles++;total.titles++;
   if(fixture.competition==='continental')schedule.push({competition:'world',stage:'Final',opponent:opponentsFor(career).find(c=>c.prestige===4&&c.id!==career.club_id).id,status:'PENDING'});
  }
  let finished=!schedule.some(f=>f.status==='PENDING');
  table.sort((a,b)=>b.points-a.points||(b.gf-b.ga)-(a.gf-a.ga)||b.gf-a.gf||a.clubId.localeCompare(b.clubId));
  if(finished&&!schedule.some(f=>f.competition==='continental')&&table.slice(0,2).some(t=>t.clubId===career.club_id)){
   const opponents=opponentsFor(career).filter(c=>c.prestige>=3&&c.id!==career.club_id);
   ['Semifinal','Final'].forEach((stage,i)=>schedule.push({competition:'continental',stage,opponent:opponents[i].id,status:'PENDING'}));finished=false;
  }
  const club=db.one('SELECT * FROM clubs WHERE id=?',career.club_id);
  const reputation=Math.min(100,career.reputation+Math.max(0,rating-5)*.7+(won?.8:0));
  if(finished){
   if(table[0].clubId===career.club_id){awards.push(accolade(career,'LEAGUE','Liga MAX','TROPHY',{table}));stats.titles++;total.titles++;}
   const merit=performance(stats,1+club.prestige*.2);
   // Fixed competitors plus seeded variation give a reproducible season contest.
   const rivalGoals=10+Math.floor(random()*10),rivalMerit=190+random()*100;
   if(stats.goals>rivalGoals)awards.push(accolade(career,'TOP_SCORER','Artilheiro da temporada','AWARD',{goals:stats.goals,rivalGoals}));
   if(stats.averageRating>=8&&stats.matches>=8)awards.push(accolade(career,'PLAYER_OF_SEASON','Jogador da temporada','AWARD',{rating:stats.averageRating}));
   if(career.season<=2&&stats.averageRating>=7.5)awards.push(accolade(career,'YOUNG_PLAYER','Revelação MAX','AWARD',{rating:stats.averageRating}));
   if(club.prestige>=3&&stats.titles>=2&&stats.matches>=10&&stats.averageRating>=8&&merit>rivalMerit)awards.push(accolade(career,'BALLON_DOR','Bola de Ouro','AWARD',{merit,rivalMerit,stats}));
   for(const candidate of opponentsFor(career).filter(c=>c.id!==club.id&&c.prestige<=Math.min(4,1+Math.floor(reputation/20)))){
    db.run('INSERT INTO transfer_offers VALUES(?,?,?,?,?,?,?,?,?)',id(),career.id,club.id,candidate.id,career.season,'PENDING','Interesse pelo desempenho e reputação na temporada.',Date.now()+7*86400000,Date.now());
   }
  }
  db.run('UPDATE career_seasons SET schedule=?,table_data=?,stats=?,awards=?,status=? WHERE id=?',JSON.stringify(schedule),JSON.stringify(table),JSON.stringify(stats),JSON.stringify(awards),finished?'COMPLETED':'ACTIVE',current.id);
  const progression=JSON.parse(career.progression);progression.xp=(progression.xp||0)+(won?60:25);progression.level=1+Math.floor(progression.xp/250);db.run('UPDATE careers SET stats=?,reputation=?,money=money+?,last_access=?,progression=? WHERE id=?',JSON.stringify(total),reputation,won?100:draw?40:20,Date.now(),JSON.stringify(progression),career.id);
  return {rating,awards,seasonEnded:finished};
 }
 function transfer(userId,offerId,body){
  object(body,['accept']);if(typeof body.accept!=='boolean')fail('INPUT','Decisão inválida.');
  return db.transaction(()=>{
   const career=get(userId),offer=career&&db.one('SELECT * FROM transfer_offers WHERE id=? AND career_id=?',offerId,career.id);
   if(!offer)fail('OFFER','Proposta não encontrada.',404);
   if(offer.status!=='PENDING'||offer.expires_at<Date.now()||offer.season!==career.season)fail('OFFER_EXPIRED','Proposta indisponível ou expirada.',409);
   if(season(career).status!=='COMPLETED')fail('TRANSFER_WINDOW','Transferências somente entre temporadas.',409);
   db.run('UPDATE transfer_offers SET status=? WHERE id=?',body.accept?'ACCEPTED':'REJECTED',offer.id);
   if(body.accept){db.run('INSERT INTO transfer_history VALUES(?,?,?,?,?,?)',id(),career.id,career.club_id,offer.to_club,career.season+1,Date.now());const team=db.one('SELECT * FROM clubs WHERE id=?',offer.to_club),roster=rosters.forTeam(offer.to_club)?.players||Array.from({length:5},(_,i)=>({id:offer.to_club+'-player-'+i,name:team.name+' '+(i+1),role:['Goleiro','Defensor','Volante','Meia','Atacante'][i],rating:70,ratingKind:'GAME_BALANCE'}));db.run('UPDATE careers SET club_id=?,roster=?,config=? WHERE id=?',offer.to_club,JSON.stringify(roster),JSON.stringify({...JSON.parse(career.config),format:5,league:teamData.fromClub(team).category}),career.id);db.run("UPDATE transfer_offers SET status='EXPIRED' WHERE career_id=? AND status='PENDING'",career.id);}
   return view(userId);
  });
 }
 function advance(userId){return db.transaction(()=>{
  const career=get(userId);if(!career||season(career).status!=='COMPLETED')fail('SEASON','Conclua a temporada atual.',409);
  db.run("UPDATE transfer_offers SET status='EXPIRED' WHERE career_id=? AND status='PENDING'",career.id);
  db.run('UPDATE careers SET season=season+1 WHERE id=?',career.id);career.season++;newSeason(career);return view(userId);
 });}
 return {create,view,nextMatch,complete,transfer,advance,saves,selectSave,removeSave,renameSave,settings};
}
module.exports={createCareer,emptyStats,performance,roundRobin};
