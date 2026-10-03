const {id}=require('../database/index.cjs');
const {fail,object,text,integer}=require('../lib/validation.cjs');
const emotes=require('../../src/data/emotes.js');
function createSocial(db,rooms,auth){
 const buckets=new Map(),lastEmote=new Map(),scope=uid=>rooms.current(uid)?.id||'lobby';
 function slots(uid){return db.all('SELECT e.slot,s.id,s.asset_index,s.name FROM emote_slots e JOIN shop_items s ON s.id=e.item_id JOIN inventory i ON i.item_id=s.id AND i.user_id=e.user_id WHERE e.user_id=? ORDER BY slot',uid).map(p=>({...p,emoji:emotes[p.asset_index]?.emoji}));}
 function history(uid){const room=scope(uid);return {room,mutes:db.all('SELECT target_id FROM chat_mutes WHERE user_id=?',uid).map(m=>m.target_id),messages:db.all('SELECT * FROM (SELECT * FROM chat_messages WHERE room_id=? AND (user_id IS NULL OR user_id NOT IN(SELECT target_id FROM chat_mutes WHERE user_id=?)) ORDER BY created_at DESC,id DESC LIMIT 50) ORDER BY created_at,id',room,uid)};}
 function send(user,body){object(body,['message']);const message=text(body.message,'Mensagem',1,240),now=Date.now(),recent=(buckets.get(user.id)||[]).filter(t=>now-t<5000);if(recent.length>=3)fail('CHAT_RATE','Aguarde um instante para enviar outra mensagem.',429);recent.push(now);buckets.set(user.id,recent);if(buckets.size>5000)for(const [uid,ts] of buckets)if(now-ts.at(-1)>5000)buckets.delete(uid);
  const row={id:id(),room_id:scope(user.id),user_id:user.id,name:auth.profile(user.id).display_name,body:message,kind:'PLAYER',created_at:now};
  db.transaction(()=>{db.run('INSERT INTO chat_messages VALUES(?,?,?,?,?,?,?)',...Object.values(row));db.run('DELETE FROM chat_messages WHERE room_id=? AND id NOT IN(SELECT id FROM chat_messages WHERE room_id=? ORDER BY created_at DESC,id DESC LIMIT 200)',row.room_id,row.room_id);});
  rooms.socialBroadcast(row.room_id,{type:'chat',message:row},recipient=>!db.one('SELECT 1 FROM chat_mutes WHERE user_id=? AND target_id=?',recipient,user.id));return row;
 }
 function mute(user,body){object(body,['playerId','muted']);const target=text(body.playerId,'Jogador',1,100);if(typeof body.muted!=='boolean'||target===user.id||!db.one('SELECT 1 FROM users WHERE id=?',target))fail('MUTE','Jogador inválido.');if(body.muted)db.run('INSERT OR IGNORE INTO chat_mutes VALUES(?,?)',user.id,target);else db.run('DELETE FROM chat_mutes WHERE user_id=? AND target_id=?',user.id,target);return history(user.id);}
 function use(user,body){object(body,['slot']);const slot=integer(body.slot,'Slot',0,3),room=rooms.current(user.id);if(!room||!room.players.some(p=>p.id===user.id))fail('EMOTE_ROOM','Entre em uma equipe para usar emotes.',409);const item=slots(user.id).find(e=>e.slot===slot);if(!item)fail('EMOTE','Equipe um emote nesse slot.',409);const now=Date.now();if(now-(lastEmote.get(user.id)||0)<3000)fail('EMOTE_RATE','Aguarde para usar outro emote.',429);lastEmote.set(user.id,now);if(lastEmote.size>5000)for(const [uid,time] of lastEmote)if(now-time>60000)lastEmote.delete(uid);const event={type:'emote',room:room.id,playerId:user.id,emoji:item.emoji,expiresAt:now+2500};rooms.socialBroadcast(room.id,event);return {ok:true};}
 function system(room,message){const row={id:id(),room_id:room,user_id:null,name:'Sistema',body:message,kind:'SYSTEM',created_at:Date.now()};db.run('INSERT INTO chat_messages VALUES(?,?,?,?,?,?,?)',...Object.values(row));rooms.socialBroadcast(room,{type:'chat',message:row});}
 rooms.setSocial?.(system);
 return {history,send,mute,use,slots};
}
module.exports={createSocial};
