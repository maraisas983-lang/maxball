const {id}=require('../database/index.cjs');
const {fail,object,text,integer}=require('../lib/validation.cjs');
const ranks={PLAYER:0,MODERATOR:1,ADMIN:2,SUPER_ADMIN:3,OWNER:3};
function createAdmin(db,economy){
 function requireRole(user,role='MODERATOR'){if(!Object.hasOwn(ranks,user?.staff_role||user?.role)||!Object.hasOwn(ranks,role)||ranks[user.staff_role||user.role]<ranks[role])fail('FORBIDDEN','Acesso não autorizado.',403);}
 function dashboard(user,online){requireRole(user);return {users:db.one('SELECT count(*) n FROM users').n,online,matches:db.one("SELECT count(*) n FROM matches WHERE status='COMPLETED'").n,gems:db.one('SELECT coalesce(sum(balance),0) n FROM wallets').n,purchases:db.one('SELECT count(*) n FROM purchases').n,bans:db.one('SELECT count(*) n FROM bans WHERE active=1 AND (expires_at IS NULL OR expires_at>?)',Date.now()).n,recent:db.all('SELECT * FROM admin_audit ORDER BY created_at DESC LIMIT 30')};}
 function users(actor,query=''){requireRole(actor);return db.all('SELECT u.id,u.username,coalesce(u.staff_role,u.role) role,u.status,u.created_at,p.display_name,p.level,w.balance FROM users u JOIN profiles p ON p.user_id=u.id JOIN wallets w ON w.user_id=u.id WHERE u.username LIKE ? OR u.id=? OR p.display_name LIKE ? ORDER BY u.created_at DESC LIMIT 50','%'+query.slice(0,40)+'%',query,'%'+query.slice(0,40)+'%');}
 function detail(actor,userId){requireRole(actor);const user=db.one('SELECT id,username,coalesce(staff_role,role) role,status,created_at,last_login_at FROM users WHERE id=?',userId);if(!user)fail('USER','Conta não encontrada.',404);return {user,sessions:db.all('SELECT created_at,expires_at FROM sessions WHERE user_id=?',userId),career:db.one('SELECT season,reputation,stats FROM careers WHERE user_id=?',userId),tickets:db.all('SELECT id,subject,status,category FROM support_tickets WHERE user_id=? ORDER BY updated_at DESC LIMIT 30',userId),matches:db.all("SELECT id,score,status,kind FROM matches WHERE EXISTS(SELECT 1 FROM json_each(matches.participants) WHERE json_extract(value,'$.id')=?) ORDER BY created_at DESC LIMIT 30",userId),profile:db.one('SELECT * FROM profiles WHERE user_id=?',userId),wallet:economy.wallet(userId),inventory:economy.inventory(userId),bans:db.all('SELECT * FROM bans WHERE user_id=?',userId),audit:db.all('SELECT * FROM admin_audit WHERE target_user_id=? ORDER BY created_at DESC LIMIT 50',userId)};}
 function action(actor,userId,body){
  requireRole(actor);object(body,['action','reason','amount','itemId','expiresAt','role','status']);
  const action=text(body.action,'Ação',1,30),reason=text(body.reason,'Motivo',5,300);
  return db.transaction(()=>{
   const target=db.one('SELECT * FROM users WHERE id=?',userId);
   if(!target)fail('USER','Conta não encontrada.',404);
   if(target.id===actor.id||(ranks[target.staff_role||target.role]??0)>=ranks[actor.staff_role||actor.role])fail('FORBIDDEN','Esta conta não pode ser alterada por você.',403);
   const previous=detail(actor,userId);
   if(['BAN','UNBAN','STATUS'].includes(action)){
    if(action==='BAN'){
     const expiry=body.expiresAt==null?null:integer(body.expiresAt,'Validade',Date.now()+60000,Date.now()+365*86400000);
     db.run('INSERT INTO bans VALUES(?,?,?,?,?,?,1)',id(),userId,reason,actor.id,Date.now(),expiry);
    }else if(action==='UNBAN')db.run('UPDATE bans SET active=0 WHERE user_id=?',userId);
    else{if(!['ACTIVE','SUSPENDED'].includes(body.status))fail('STATUS','Status inválido.');db.run('UPDATE users SET status=?,updated_at=? WHERE id=?',body.status,Date.now(),userId);}
    db.run('DELETE FROM sessions WHERE user_id=?',userId);
   }else{
    requireRole(actor,'ADMIN');
    if(action==='GEMS')economy.change(userId,integer(body.amount,'Quantidade',-1000000,1000000),'ADMIN_GRANT',reason,'admin:'+id());
    else if(action==='GRANT_ITEM'||action==='REMOVE_ITEM'){
     const item=db.one('SELECT * FROM shop_items WHERE id=?',text(body.itemId,'Item',1,50));if(!item)fail('ITEM','Item não encontrado.',404);
     if(action==='GRANT_ITEM')db.run('INSERT OR IGNORE INTO inventory VALUES(?,?,?)',userId,item.id,Date.now());
     else{
      if(item.price===0)fail('ITEM','Itens básicos não podem ser removidos.');
      db.run('DELETE FROM inventory WHERE user_id=? AND item_id=?',userId,item.id);
      db.run(item.category==='KIT'?'UPDATE profiles SET kit=0 WHERE user_id=? AND kit=?':'UPDATE profiles SET effect=0 WHERE user_id=? AND effect=?',userId,item.asset_index);
     }
    }else if(action==='ROLE'){
     requireRole(actor,'SUPER_ADMIN');if(!['PLAYER','SUPPORT','MODERATOR','ADMIN'].includes(body.role))fail('ROLE','Permissão inválida.');
     db.run('UPDATE users SET role=?,staff_role=?,updated_at=? WHERE id=?',body.role==='SUPPORT'?'PLAYER':body.role,body.role==='SUPPORT'?'SUPPORT':null,Date.now(),userId);db.run('DELETE FROM sessions WHERE user_id=?',userId);
    }else fail('ACTION','Ação desconhecida.');
   }
   const next=detail(actor,userId);
   // Exclude audit/ledger recursion from each snapshot.
   const snapshot=x=>JSON.stringify({user:x.user,profile:x.profile,balance:x.wallet.balance,inventory:x.inventory.map(i=>i.id),bans:x.bans});
   db.run('INSERT INTO admin_audit VALUES(?,?,?,?,?,?,?,?)',id(),actor.id,action,userId,snapshot(previous),snapshot(next),reason,Date.now());
   return next;
  });
 }
 return {dashboard,users,detail,action,requireRole};
}
module.exports={createAdmin};
