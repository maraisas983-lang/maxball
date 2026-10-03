const {id}=require('../database/index.cjs');
const {fail}=require('../lib/validation.cjs');
const config=require('../../src/core/config.js').ranked;
const range=seconds=>config.ranges.filter(r=>seconds>=r.seconds).at(-1).difference;
function elo(home,away,result){const change=Math.round(config.kFactor*(result-1/(1+10**((away-home)/400))));return [home+change,away-change];}
function createRanked(db,{syncResults=false}={}){
 const queue=new Map();
 function join(user,{members=[user],partyId=user.id,n=4}={}){if(!queue.has(user.id)){const ratings=members.map(u=>db.one('SELECT rating FROM profiles WHERE user_id=?',u.id).rating),q={user,members,n,partyId,rating:ratings.reduce((a,b)=>a+b,0)/ratings.length,since:Date.now(),seen:Date.now()};for(const u of members)queue.set(u.id,q);}return status(user.id);}
 function cancel(uid){const q=queue.get(uid);if(q)for(const u of q.members)queue.delete(u.id);}
 function status(uid){const q=queue.get(uid);if(q)q.seen=Date.now();return {queued:!!q,wait:q?Math.floor((Date.now()-q.since)/1000):0,range:q?range((Date.now()-q.since)/1000):100,rating:db.one('SELECT rating FROM profiles WHERE user_id=?',uid).rating};}
 function pair(now=Date.now()){
  for(const [uid,q] of queue)if(now-q.seen>15000)cancel(uid);
  const candidates=[...new Set(queue.values())].sort((a,b)=>a.since-b.since);
  for(const a of candidates){const b=candidates.filter(b=>a!==b&&a.n===b.n&&a.members.length===b.members.length&&Math.abs(a.rating-b.rating)<=Math.min(range((now-a.since)/1000),range((now-b.since)/1000))).sort((x,y)=>Math.abs(x.rating-a.rating)-Math.abs(y.rating-a.rating))[0];if(b){cancel(a.user.id);cancel(b.user.id);return [a,b].flatMap((q,team)=>q.members.map((u,slot)=>({...u,team,slot,rankedFormat:q.n,partyId:q.partyId})));}}
  return null;
 }
 function begin(room){const a=room.players.find(p=>p.team===0),b=room.players.find(p=>p.team===1),pa=db.one('SELECT rating FROM profiles WHERE user_id=?',a.id),pb=db.one('SELECT rating FROM profiles WHERE user_id=?',b.id);db.run('INSERT INTO ranked_matches(id,home_id,away_id,home_before,away_before,created_at) VALUES(?,?,?,?,?,?)',room.match.id,a.id,b.id,pa.rating,pb.rating,Date.now());for(const p of room.players)db.run('INSERT INTO ranked_participants VALUES(?,?,?,?,NULL)',room.match.id,p.id,p.team,db.one('SELECT rating FROM profiles WHERE user_id=?',p.id).rating);}
 function complete(room){
  const m=room.match,row=db.one('SELECT * FROM ranked_matches WHERE id=?',m.id);if(!row||row.finished_at)return;
  const result=m.G.score[0]===m.G.score[1]?.5:m.G.score[0]>m.G.score[1]?1:0,ratings=elo(row.home_before,row.away_before,result);
  const participants=db.all('SELECT * FROM ranked_participants WHERE match_id=?',m.id),averages=[0,1].map(team=>{const side=participants.filter(p=>p.team===team);return side.reduce((sum,p)=>sum+p.rating_before,0)/side.length;}),delta=elo(...averages,result)[0]-averages[0];
  for(const p of participants){const uid=p.user_id,won=result===(p.team?0:1),draw=result===.5,stats=m.stats[uid],after=p.rating_before+(p.team?-delta:delta);db.run('UPDATE ranked_participants SET rating_after=? WHERE match_id=? AND user_id=?',after,m.id,uid);db.run('UPDATE profiles SET rating=?,ranked_wins=ranked_wins+?,ranked_draws=ranked_draws+?,ranked_losses=ranked_losses+?,ranked_goals=ranked_goals+?,ranked_assists=ranked_assists+? WHERE user_id=?',after,+won,+draw,+(!won&&!draw),stats?.goals||0,stats?.assists||0,uid);}
  ratings[0]=db.one('SELECT rating_after FROM ranked_participants WHERE match_id=? AND user_id=?',m.id,row.home_id).rating_after;ratings[1]=db.one('SELECT rating_after FROM ranked_participants WHERE match_id=? AND user_id=?',m.id,row.away_id).rating_after;
  const finished=Date.now();db.run('UPDATE ranked_matches SET home_after=?,away_after=?,score=?,reason=?,finished_at=? WHERE id=?',...ratings,JSON.stringify(m.G.score),m.G.reason,finished,m.id);
  for(const event of m.log)db.run('INSERT INTO ranked_events VALUES(?,?,?,?,?)',id(),m.id,event.type,JSON.stringify(event),finished);
  const payload={...db.one('SELECT * FROM ranked_matches WHERE id=?',m.id),events:m.log,stats:m.stats,participants:db.all('SELECT * FROM ranked_participants WHERE match_id=?',m.id)};
  if(syncResults)db.run('INSERT OR IGNORE INTO cloud_outbox(id,kind,payload,created_at) VALUES(?,?,?,?)',m.id,'RANKED',JSON.stringify(payload),finished);
 }
 return {join,status,pair,begin,complete,cancel,queue,history:uid=>db.all('SELECT r.*,p.rating_before,p.rating_after FROM ranked_matches r JOIN ranked_participants p ON p.match_id=r.id WHERE p.user_id=? ORDER BY r.created_at DESC LIMIT 30',uid)};
}
module.exports={createRanked,elo,range};
