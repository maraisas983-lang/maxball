const referees=room=>room.players.filter(p=>p.referee);
const isReferee=(room,userId)=>referees(room).some(p=>p.id===userId);
function syncReferees(room,member=p=>p){const list=referees(room);room.referee=list[0]||null;room.cfg.referee=room.referee?member(room.referee):null;room.cfg.referees=list.map(member);if(room.match){room.match.cfg.referee=room.cfg.referee;room.match.cfg.referees=room.cfg.referees;}}
module.exports={referees,isReferee,syncReferees};
