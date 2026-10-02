const {id}=require('../database/index.cjs');
const {fail,object,text}=require('../lib/validation.cjs');
const teams=require('../../src/data/teams.js');
function createClubs(db){
 const view=row=>({id:row.id,ownerId:row.owner_id,name:row.name,category:'MEUS CLUBES',primaryColor:row.primary_color,secondaryColor:row.secondary_color,accentColor:row.accent_color,kitStyle:row.kit_style,createdAt:row.created_at,updatedAt:row.updated_at});
 const list=uid=>db.all('SELECT * FROM custom_clubs WHERE owner_id=? ORDER BY created_at',uid).map(view);
 function create(uid,body){
  object(body,['name','primaryColor','secondaryColor','accentColor','kitStyle']);
  const name=text(body.name,'Nome do clube',3,30,/^[\p{L}\p{N} ._\-]+$/u),color=k=>text(body[k],'Cor',7,7,/^#[0-9a-fA-F]{6}$/).toLowerCase();
  if(!teams.styles.includes(body.kitStyle))fail('KIT','Estilo inválido.');
  if(list(uid).length>=30)fail('CLUB_LIMIT','Limite de 30 clubes por conta.',409);
  const cid=id(),now=Date.now();db.run('INSERT INTO custom_clubs VALUES(?,?,?,?,?,?,?,?,?)',cid,uid,name,color('primaryColor'),color('secondaryColor'),color('accentColor'),body.kitStyle,now,now);return view(db.one('SELECT * FROM custom_clubs WHERE id=?',cid));
 }
 function select(uid,teamId){const standard=teams.teams.find(t=>t.id===teamId);if(standard)return {...standard};const row=db.one('SELECT * FROM custom_clubs WHERE id=? AND owner_id=?',teamId,uid);if(!row)fail('TEAM','Equipe não disponível para esta conta.',404);return view(row);}
 return {list,create,select,catalog:uid=>[...teams.teams,...list(uid)]};
}
module.exports={createClubs};
