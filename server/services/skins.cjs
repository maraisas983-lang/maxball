const {id}=require('../database/index.cjs'),{object,text,fail}=require('../lib/validation.cjs'),designs=require('../../src/data/skinDesign.js');
function createSkins(db,economy){
 const view=r=>({...r,design:JSON.parse(r.design)}),list=uid=>db.all('SELECT * FROM custom_skins WHERE owner_id=? ORDER BY created_at DESC',uid).map(view);
 function save(uid,body,sid){
  object(body,['name','design','requestId']);const name=text(body.name,'Nome da skin',3,30),key=body.requestId===undefined?id():text(body.requestId,'Requisição',8,100,/^[\w-]+$/);let design;
  try{design=designs.validate(body.design);}catch(e){fail('DESIGN',e.message);}
  const payload=JSON.stringify({skinId:sid||null,name,design});
  return db.transaction(()=>{
   const replay=db.one('SELECT * FROM skin_save_requests WHERE user_id=? AND request_id=?',uid,key);
   if(replay){if(replay.payload!==payload)fail('IDEMPOTENCY','Requisição já utilizada.',409);return JSON.parse(replay.result);}
   const previous=sid?db.one('SELECT * FROM custom_skins WHERE id=? AND owner_id=?',sid,uid):null;
   if(sid&&!previous)fail('SKIN','Skin não encontrada.',404);
   if(!sid&&list(uid).length>=50)fail('SKIN_LIMIT','Limite de 50 skins.',409);
   const quote=designs.quote(previous?view(previous):null,{name,design});
   if(quote.price){if(db.one('SELECT 1 FROM gem_debts WHERE user_id=? AND amount>0',uid))fail('PAYMENT_DEBT','Regularize as gemas pendentes.',409);economy.change(uid,-quote.price,'SKIN_EDIT',sid||'new','skin-save:'+key);}
   const now=Math.max(Date.now(),(previous?.updated_at||0)+1);
   if(sid)db.run('UPDATE custom_skins SET name=?,design=?,updated_at=? WHERE id=?',name,JSON.stringify(design),now,sid);
   else{sid=id();db.run('INSERT INTO custom_skins VALUES(?,?,?,?,?,?)',sid,uid,name,JSON.stringify(design),now,now);}
   const result={...view(db.one('SELECT * FROM custom_skins WHERE id=?',sid)),charged:quote.price,changes:quote.changes};
   db.run('INSERT INTO skin_save_requests VALUES(?,?,?,?,?)',uid,key,sid,payload,JSON.stringify(result));return result;
  });
 }
 return {list,save};
}
module.exports={createSkins};
