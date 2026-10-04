const {rank}=require('../../src/data/ranks.js');
function createProgression(db,economy){
 function complete(room){
  const m=room.match;if(!room.ranked||m.G.reason==='ABANDONED')return;
  const participants=db.all('SELECT * FROM ranked_participants WHERE match_id=?',m.id);
  for(const p of participants){
   if(db.one('SELECT 1 FROM ranked_progress WHERE match_id=? AND user_id=?',m.id,p.user_id))continue;
   const profile=db.one('SELECT trophies,ranked_reward_matches FROM profiles WHERE user_id=?',p.user_id),winner=m.G.winner,delta=winner==null?10:winner===p.team?30:-10,after=Math.max(0,profile.trophies+delta);
   const eligible=m.G.reason!=='FORFEIT'&&m.stats[p.user_id]?.inputs>0,mvp=eligible&&m.performance?.mvp?.id===p.user_id,count=profile.ranked_reward_matches+(eligible?1:0),gems=(eligible&&count%2===0?5:0)+(mvp?10:0);
   db.run('UPDATE profiles SET trophies=?,ranked_reward_matches=? WHERE user_id=?',after,count,p.user_id);
   db.run('INSERT INTO ranked_progress VALUES(?,?,?,?,?,?)',m.id,p.user_id,profile.trophies,after,gems,+mvp);
   if(gems)economy.change(p.user_id,gems,'REWARD',m.id,'ranked-progress:'+m.id);
  }
 }
 function leaderboard(uid){
  const ranking='WITH ranking AS (SELECT p.user_id,p.display_name,p.trophies,p.positions,ROW_NUMBER() OVER(ORDER BY p.trophies DESC,p.user_id) position FROM profiles p JOIN users u ON u.id=p.user_id WHERE u.status=\'ACTIVE\') ';
  const decorate=p=>p?{...p,positions:JSON.parse(p.positions),patent:rank(p.trophies).name}:null;
  return {top:db.all(ranking+'SELECT * FROM ranking ORDER BY position LIMIT 100').map(decorate),self:decorate(db.one(ranking+'SELECT * FROM ranking WHERE user_id=?',uid))};
 }
 return {complete,leaderboard};
}
module.exports={createProgression};
