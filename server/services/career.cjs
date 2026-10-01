const {id}=require('../database/index.cjs');
const {fail,object,text,name,integer}=require('../lib/validation.cjs');
const {seeded}=require('../online/match.cjs');
const emptyStats=()=>({matches:0,starts:0,minutesPlayed:0,goals:0,assists:0,wins:0,draws:0,losses:0,ratingTotal:0,averageRating:0,titles:0});
function performance(stats,prestige=1){
 const average=stats.matches?stats.ratingTotal/stats.matches:0;
 return (stats.goals*4+stats.assists*3+stats.wins*2+average*stats.matches+stats.titles*20)*prestige;
}
function roundRobin(clubs){
 const rotation=clubs.slice(),rounds=[];
 for(let r=0;r<clubs.length-1;r++){
  rounds.push(Array.from({length:clubs.length/2},(_,i)=>[rotation[i],rotation[clubs.length-1-i]]));
  rotation.splice(1,0,rotation.pop());
 }
 return rounds;
}
function createCareer(db,economy){
 const clubs=()=>db.all('SELECT * FROM clubs ORDER BY prestige,id');
 const get=userId=>db.one('SELECT * FROM careers WHERE user_id=?',userId);
 const season=career=>db.one('SELECT * FROM career_seasons WHERE career_id=? AND season=?',career.id,career.season);
 function newSeason(career){
  const all=clubs(),rounds=roundRobin(all.map(c=>c.id));
  const schedule=rounds.map((pairs,round)=>({competition:'league',stage:'Rodada '+(round+1),pairs,opponent:pairs.find(p=>p.includes(career.club_id)).find(c=>c!==career.club_id),status:'PENDING'}));
  const opponents=all.filter(c=>c.id!==career.club_id);
  ['Quartas','Semifinal','Final'].forEach((stage,i)=>schedule.push({competition:'cup',stage,opponent:opponents[(i+career.season)%opponents.length].id,status:'PENDING'}));
  const table=all.map(c=>({clubId:c.id,points:0,played:0,gf:0,ga:0,wins:0}));
  db.run('INSERT INTO career_seasons(id,career_id,season,club_id,status,schedule,table_data,stats,created_at) VALUES(?,?,?,?,?,?,?,?,?)',id(),career.id,career.season,career.club_id,'ACTIVE',JSON.stringify(schedule),JSON.stringify(table),JSON.stringify(emptyStats()),Date.now());
 }
 function create(userId,body){
  object(body,['name','shirtNumber','clubId']);const display=name(body.name),num=integer(body.shirtNumber,'Número',1,99),club=text(body.clubId,'Clube',1,40);
  const team=db.one('SELECT * FROM clubs WHERE id=?',club);if(!team||team.prestige>2)fail('CLUB','Escolha um clube inicial de prestígio 1 ou 2.');
  return db.transaction(()=>{
   if(get(userId))fail('CAREER_EXISTS','Você já possui uma carreira.',409);
   const profile=db.one('SELECT id FROM profiles WHERE user_id=?',userId),career={id:id(),user_id:userId,player_id:profile.id,club_id:club,season:1};
   db.run('UPDATE profiles SET display_name=?,shirt_name=?,shirt_number=? WHERE user_id=?',display,display,num,userId);
   db.run('INSERT INTO careers(id,user_id,player_id,club_id,stats,created_at) VALUES(?,?,?,?,?,?)',career.id,userId,profile.id,club,JSON.stringify(emptyStats()),Date.now());
   newSeason(career);return view(userId);
  });
 }
 function view(userId){
  const career=get(userId);if(!career)return {career:null,clubs:clubs()};
  const current=season(career);
  db.run("UPDATE transfer_offers SET status='EXPIRED' WHERE career_id=? AND status='PENDING' AND expires_at<?",career.id,Date.now());
  return {career:{...career,stats:JSON.parse(career.stats)},current:{...current,schedule:JSON.parse(current.schedule),table:JSON.parse(current.table_data),stats:JSON.parse(current.stats),awards:JSON.parse(current.awards)},
   clubs:clubs(),history:db.all('SELECT season,club_id,stats,awards,status FROM career_seasons WHERE career_id=? ORDER BY season DESC',career.id).map(s=>({...s,stats:JSON.parse(s.stats),awards:JSON.parse(s.awards)})),
   offers:db.all('SELECT * FROM transfer_offers WHERE career_id=? ORDER BY created_at DESC LIMIT 30',career.id),transfers:db.all('SELECT * FROM transfer_history WHERE career_id=? ORDER BY created_at',career.id),
   trophies:db.all('SELECT * FROM accolades WHERE user_id=? ORDER BY created_at DESC',userId)};
 }
 function nextMatch(userId){
  const career=get(userId);if(!career)fail('CAREER','Crie sua carreira primeiro.',404);
  const current=season(career);if(current.status!=='ACTIVE')fail('SEASON','Inicie a próxima temporada.',409);
  const schedule=JSON.parse(current.schedule),index=schedule.findIndex(f=>f.status==='PENDING');
  if(index<0)fail('FIXTURE','Temporada concluída.',409);
  const fixture=schedule[index],home=db.one('SELECT * FROM clubs WHERE id=?',career.club_id),away=db.one('SELECT * FROM clubs WHERE id=?',fixture.opponent);
  return {career,current,fixture,index,cfg:{n:2,time:120,gold:fixture.competition==='league'?0:1,diff:Math.min(2,Math.floor(away.prestige/2)),sk0:home.kit,sk1:away.kit,labels:[home.name,away.name]}};
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
  const score=match.score,won=score[0]>score[1],draw=score[0]===score[1],player=match.stats[career.user_id]||{};
  const rating=Math.min(10,Math.max(3,6+(player.goals||0)*.65+(player.assists||0)*.45+(won?.7:draw?.1:-.4)+Math.min(.6,(player.passes||0)*.05)-score[1]*.08));
  const stats=JSON.parse(current.stats),total=JSON.parse(career.stats),awards=JSON.parse(current.awards);
  for(const target of [stats,total]){target.matches++;target.starts++;target.minutesPlayed+=match.duration/60;target.goals+=player.goals||0;target.assists+=player.assists||0;target.wins+=won?1:0;target.draws+=draw?1:0;target.losses+=!won&&!draw?1:0;target.ratingTotal+=rating;target.averageRating=+(target.ratingTotal/target.matches).toFixed(2);}
  fixture.status='COMPLETED';fixture.score=score;fixture.rating=+rating.toFixed(1);fixture.matchId=match.id;
  const table=JSON.parse(current.table_data),random=seeded(match.id.split('').reduce((n,c)=>n+c.charCodeAt(0),0));
  const apply=(a,b,ga,gb)=>{const x=table.find(t=>t.clubId===a),y=table.find(t=>t.clubId===b);x.played++;y.played++;x.gf+=ga;x.ga+=gb;y.gf+=gb;y.ga+=ga;x.points+=ga>gb?3:ga===gb?1:0;y.points+=gb>ga?3:ga===gb?1:0;if(ga>gb)x.wins++;if(gb>ga)y.wins++;};
  if(fixture.competition==='league')for(const pair of fixture.pairs){if(pair.includes(career.club_id))apply(career.club_id,fixture.opponent,...score);else apply(pair[0],pair[1],Math.floor(random()*4),Math.floor(random()*4));}
  if(fixture.competition!=='league'&&!won)for(const f of schedule)if(f.competition===fixture.competition&&f.status==='PENDING')f.status='ELIMINATED';
  if(fixture.competition!=='league'&&fixture.stage==='Final'&&won){
   const competition=db.one('SELECT * FROM competitions WHERE id=?',fixture.competition);
   awards.push(accolade(career,fixture.competition.toUpperCase(),competition.name,'TROPHY',{score}));stats.titles++;total.titles++;
   if(fixture.competition==='continental')schedule.push({competition:'world',stage:'Final',opponent:clubs().find(c=>c.prestige===4&&c.id!==career.club_id).id,status:'PENDING'});
  }
  let finished=!schedule.some(f=>f.status==='PENDING');
  table.sort((a,b)=>b.points-a.points||(b.gf-b.ga)-(a.gf-a.ga)||b.gf-a.gf||a.clubId.localeCompare(b.clubId));
  if(finished&&!schedule.some(f=>f.competition==='continental')&&table.slice(0,2).some(t=>t.clubId===career.club_id)){
   const opponents=clubs().filter(c=>c.prestige>=3&&c.id!==career.club_id);
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
   for(const candidate of clubs().filter(c=>c.id!==club.id&&c.prestige<=Math.min(4,1+Math.floor(reputation/20)))){
    db.run('INSERT INTO transfer_offers VALUES(?,?,?,?,?,?,?,?,?)',id(),career.id,club.id,candidate.id,career.season,'PENDING','Interesse pelo desempenho e reputação na temporada.',Date.now()+7*86400000,Date.now());
   }
  }
  db.run('UPDATE career_seasons SET schedule=?,table_data=?,stats=?,awards=?,status=? WHERE id=?',JSON.stringify(schedule),JSON.stringify(table),JSON.stringify(stats),JSON.stringify(awards),finished?'COMPLETED':'ACTIVE',current.id);
  db.run('UPDATE careers SET stats=?,reputation=? WHERE id=?',JSON.stringify(total),reputation,career.id);
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
   if(body.accept){db.run('INSERT INTO transfer_history VALUES(?,?,?,?,?,?)',id(),career.id,career.club_id,offer.to_club,career.season+1,Date.now());db.run('UPDATE careers SET club_id=? WHERE id=?',offer.to_club,career.id);db.run("UPDATE transfer_offers SET status='EXPIRED' WHERE career_id=? AND status='PENDING'",career.id);}
   return view(userId);
  });
 }
 function advance(userId){return db.transaction(()=>{
  const career=get(userId);if(!career||season(career).status!=='COMPLETED')fail('SEASON','Conclua a temporada atual.',409);
  db.run("UPDATE transfer_offers SET status='EXPIRED' WHERE career_id=? AND status='PENDING'",career.id);
  db.run('UPDATE careers SET season=season+1 WHERE id=?',career.id);career.season++;newSeason(career);return view(userId);
 });}
 return {create,view,nextMatch,complete,transfer,advance};
}
module.exports={createCareer,emptyStats,performance,roundRobin};
