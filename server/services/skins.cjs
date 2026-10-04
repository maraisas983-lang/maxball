const {id}=require('../database/index.cjs'),{object,text,fail}=require('../lib/validation.cjs'),designs=require('../../src/data/skinDesign.js');
function createSkins(db){
 const view=r=>({...r,design:JSON.parse(r.design)}),list=uid=>db.all('SELECT * FROM custom_skins WHERE owner_id=? ORDER BY created_at DESC',uid).map(view);
 function save(uid,body,sid){object(body,['name','design']);const name=text(body.name,'Nome da skin',3,30);let design;try{design=designs.validate(body.design);}catch(e){fail('DESIGN',e.message);}const now=Date.now();if(sid){if(!db.one('SELECT id FROM custom_skins WHERE id=? AND owner_id=?',sid,uid))fail('SKIN','Skin não encontrada.',404);db.run('UPDATE custom_skins SET name=?,design=?,updated_at=? WHERE id=?',name,JSON.stringify(design),now,sid);}else{if(list(uid).length>=50)fail('SKIN_LIMIT','Limite de 50 skins.',409);sid=id();db.run('INSERT INTO custom_skins VALUES(?,?,?,?,?,?)',sid,uid,name,JSON.stringify(design),now,now);}return view(db.one('SELECT * FROM custom_skins WHERE id=?',sid));}
 return {list,save};
}
module.exports={createSkins};
