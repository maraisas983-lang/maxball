const {id}=require('../database/index.cjs');
const {fail}=require('../lib/validation.cjs');
const config=require('../../src/core/config.js').ranked;
const range=seconds=>config.ranges.filter(r=>seconds>=r.seconds).at(-1).difference;
function elo(home,away,result){const change=Math.round(config.kFactor*(result-1/(1+10**((away-home)/400))));return [home+change,away-change];}
function createRanked(db,{syncResults=false}={}){
 const queue=new Map();
 function join(user){if(!queue.has(user.id)){const p=db.one('SELECT rating FROM profiles WHERE user_id=?',user.id);queue.set(user.id,{user,rating:p.rating,since:Date.now(),seen:Date.now()});}return status(user.id);}
 function status(uid){const q=queue.get(uid);if(q)q.seen=Date.now();return {queued:!!q,wait:q?Math.floor((Date.now()-q.since)/1000):0,range:q?range((Date.now()-q.since)/1000):100,rating:db.one('SELECT rating FROM profiles WHERE user_id=?',uid).rating};}
 function pair(now=Date.now()){
  for(const [uid,q] of queue)if(now-q.seen>15000)queue.delete(uid);
  const candidates=[...queue.values()].sort((a,b)=>a.since-b.since);
  for(const a of candidates){const b=candidates.filter(b=>a!==b&&Math.abs(a.rating-b.rating)<=Math.min(range((now-a.since)/1000),range((now-b.since)/1000))).sort((x,y)=>Math.abs(x.rating-a.rating)-Math.abs(y.rating-a.rating))[0];if(b){queue.delete(a.user.id);queue.delete(b.user.id);return [a.user,b.user];}}
  return null;
 }
 function begin(room){const [a,b]=room.players,pa=db.one('SELECT rating FROM profiles WHERE user_id=?',a.id),pb=db.one('SELECT rating FROM profiles WHERE user_id=?',b.id);db.run('INSERT INTO ranked_matches(id,home_id,away_id,home_before,away_before,created_at) VALUES(?,?,?,?,?,?)',room.match.id,a.id,b.id,pa.rating,pb.rating,Date.now());}
 function complete(room){
  const m=room.match,row=db.one('SELECT * FROM ranked_matches WHERE id=?',m.id);if(!row||row.finished_at)return;
  const result=m.G.score[0]===m.G.score[1]?.5:m.G.score[0]>m.G.score[1]?1:0,ratings=elo(row.home_before,row.away_before,result);
  for(let team=0;team<2;team++){const uid=team?row.away_id:row.home_id,won=result===(team?0:1),draw=result===.5,stats=m.stats[uid];db.run('UPDATE profiles SET rating=?,ranked_wins=ranked_wins+?,ranked_draws=ranked_draws+?,ranked_losses=ranked_losses+?,ranked_goals=ranked_goals+?,ranked_assists=ranked_assists+? WHERE user_id=?',ratings[team],+won,+draw,+(!won&&!draw),stats?.goals||0,stats?.assists||0,uid);}
  const finished=Date.now();db.run('UPDATE ranked_matches SET home_after=?,away_after=?,score=?,reason=?,finished_at=? WHERE id=?',...ratings,JSON.stringify(m.G.score),m.G.reason,finished,m.id);
  for(const event of m.log)db.run('INSERT INTO ranked_events VALUES(?,?,?,?,?)',id(),m.id,event.type,JSON.stringify(event),finished);
  const payload={...db.one('SELECT * FROM ranked_matches WHERE id=?',m.id),events:m.log,stats:m.stats};
  if(syncResults)db.run('INSERT OR IGNORE INTO cloud_outbox(id,kind,payload,created_at) VALUES(?,?,?,?)',m.id,'RANKED',JSON.stringify(payload),finished);
 }
 return {join,status,pair,begin,complete,cancel:uid=>queue.delete(uid),queue,history:uid=>db.all('SELECT * FROM ranked_matches WHERE home_id=? OR away_id=? ORDER BY created_at DESC LIMIT 30',uid,uid)};
}
module.exports={createRanked,elo,range};
