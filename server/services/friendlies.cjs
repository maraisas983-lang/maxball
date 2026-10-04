const {id}=require('../database/index.cjs');
const {fail,object}=require('../lib/validation.cjs');
function createFriendlies({db,party,available,connected,createMatch}){
 const queue=new Map(),offers=new Map();
 const pending=uid=>[...offers.values()].find(o=>o.teams.some(t=>t.members.some(m=>m.id===uid)));
 const queued=uid=>[...queue.values()].find(t=>t.members.some(m=>m.id===uid));
 function has(uid){return !!queued(uid)||!!pending(uid);}
 function release(team){party.state(team.leader,'IDLE');}
 function cancel(uid){const q=queued(uid);if(q){queue.delete(q.leader);release(q);}const o=pending(uid);if(o){offers.delete(o.id);o.teams.forEach(release);}}
 function validate(team){
  const group=party.current(team.leader);
  if(!group||group.leader!==team.leader||group.members.length!==4||team.members.some(m=>!group.members.some(p=>p.id===m.id)||!connected(m.id)||!available(m.id)||!db.one("SELECT 1 FROM club_members WHERE club_id=? AND user_id=? AND status='APPROVED'",team.clubId,m.id)))fail('FRIENDLY_ROSTER','Os quatro jogadores precisam estar conectados, livres e aprovados no mesmo clube.',409);
 }
 function view(uid){const q=queued(uid),offer=pending(uid);return {queued:!!q,clubId:q?.clubId,party:party.view(uid),offer:offer?{id:offer.id,expiresAt:offer.expiresAt,penalties:offer.teams[0].penalties,teams:offer.teams.map(t=>({clubId:t.clubId,name:t.name,leader:t.leader,accepted:offer.accepted.has(t.leader),players:t.members.map(m=>({id:m.id,name:m.name}))}))}:null};}
 function search(user,body){
  object(body,['clubId','penalties']);if(typeof body.penalties!=='boolean')fail('RULES','Escolha se deseja disputa de pênaltis.');
  if(has(user.id))return view(user.id);
  const g=party.current(user.id);if(!g||g.leader!==user.id||g.members.length!==4)fail('FRIENDLY_GROUP','Monte um grupo de quatro jogadores; o líder inicia a busca.',409);
  const club=db.one('SELECT * FROM custom_clubs WHERE id=?',body.clubId);if(!club)fail('CLUB','Escolha um clube criado no MAXBALL.');
  const team={leader:user.id,clubId:club.id,name:club.name,members:g.members.map(m=>({...m})),penalties:body.penalties,since:Date.now()};validate(team);party.search(user);queue.set(user.id,team);tick();return view(user.id);
 }
 function tick(){
  for(const o of [...offers.values()]){try{if(Date.now()>o.expiresAt)throw Error('expired');o.teams.forEach(validate);}catch{offers.delete(o.id);o.teams.forEach(release);}}
  for(const t of [...queue.values()]){try{validate(t);}catch{cancel(t.leader);}}
  const teams=[...queue.values()].sort((a,b)=>a.since-b.since);for(const a of teams){const b=teams.find(b=>b!==a&&b.clubId!==a.clubId&&b.penalties===a.penalties&&queue.has(b.leader));if(!queue.has(a.leader)||!b)continue;queue.delete(a.leader);queue.delete(b.leader);const offer={id:id(),teams:[a,b],accepted:new Set(),expiresAt:Date.now()+45000};offers.set(offer.id,offer);}
 }
 function accept(user,body){object(body,['offerId','accepted']);if(typeof body.accepted!=='boolean')fail('ACCEPT','Confirmação inválida.');const o=pending(user.id);if(!o||o.id!==body.offerId||o.expiresAt<Date.now())fail('OFFER','Convite expirou. Busque novamente.',409);if(!o.teams.some(t=>t.leader===user.id))fail('CAPTAIN','Somente os capitães confirmam o amistoso.',403);if(!body.accepted){cancel(user.id);return view(user.id);}try{o.teams.forEach(validate);}catch(error){cancel(user.id);throw error;}o.accepted.add(user.id);if(o.accepted.size===2){let room;try{room=createMatch(o.teams);}catch(error){cancel(user.id);throw error;}offers.delete(o.id);for(const t of o.teams)party.state(t.leader,'IN_MATCH');return {...view(user.id),room};}return view(user.id);}
 return {search,view,accept,cancel,has,tick,queue,offers};
}
module.exports={createFriendlies};
