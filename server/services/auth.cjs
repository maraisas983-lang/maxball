const crypto=require('node:crypto');
const {promisify}=require('node:util');
const {id}=require('../database/index.cjs');
const {fail,object,text,name,integer}=require('../lib/validation.cjs');
const scrypt=promisify(crypto.scrypt),hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const SCRYPT={N:131072,r:8,p:1,maxmem:256*1024*1024};
let hashing=0;
async function derive(password,salt){
 if(hashing>=2)fail('BUSY','Aguarde um instante e tente novamente.',503);
 hashing++;try{return await scrypt(password,salt,64,SCRYPT)}finally{hashing--;}
}
async function passwordHash(password){const salt=crypto.randomBytes(16).toString('hex');return 'scrypt$'+salt+'$'+(await derive(password,salt)).toString('hex');}
async function verify(password,stored){
 const [,salt,expected]=stored.split('$'),actual=await derive(password,salt);
 return crypto.timingSafeEqual(actual,Buffer.from(expected,'hex'));
}
function createAuth(db,economy,{sessionMs=7*86400000}={}){
 const dummy='scrypt$00000000000000000000000000000000$'+'0'.repeat(128);
 function allowed(user){
  if(!user||user.status!=='ACTIVE'||db.one('SELECT id FROM bans WHERE user_id=? AND active=1 AND (expires_at IS NULL OR expires_at>?)',user?.id||'',Date.now()))fail('ACCOUNT','Conta indisponível.',403);
  return user.staff_role?{...user,role:user.staff_role}:user;
 }
 function publicUser(user){return {id:user.id,username:user.username,role:user.staff_role||user.role,createdAt:user.created_at};}
 function session(userId,absolute=Date.now()+30*86400000){
  const token=crypto.randomBytes(32).toString('hex'),csrf=crypto.randomBytes(24).toString('hex'),now=Date.now();
  db.run('DELETE FROM sessions WHERE expires_at<?',now);
  db.run('INSERT INTO sessions VALUES(?,?,?,?,?,?)',hash(token),userId,csrf,now,Math.min(now+sessionMs,absolute),absolute);
  return {token,csrf};
 }
 async function register(body){
  object(body,['username','password']);const username=text(body.username,'Usuário',3,24,/^[a-zA-Z0-9_]+$/).toLowerCase();
  const password=text(body.password,'Senha',12,128);
  if(db.one('SELECT id FROM users WHERE username=?',username))fail('REGISTER','Não foi possível criar esta conta.',409);
  const encoded=await passwordHash(password),userId=id(),now=Date.now();
  return db.transaction(()=>{
   if(db.one('SELECT id FROM users WHERE username=?',username))fail('REGISTER','Não foi possível criar esta conta.',409);
   db.run('INSERT INTO users(id,username,password_hash,created_at,updated_at,last_login_at) VALUES(?,?,?,?,?,?)',userId,username,encoded,now,now,now);
   db.run('INSERT INTO profiles(id,user_id,display_name,shirt_name,shirt_number,created_at) VALUES(?,?,?,?,?,?)',id(),userId,username.slice(0,14),username.slice(0,14),10,now);
   db.run('INSERT INTO wallets VALUES(?,?,?)',userId,0,now);
   for(const item of ['kit-0','kit-1','effect-0'])db.run('INSERT INTO inventory VALUES(?,?,?)',userId,item,now);
   economy.change(userId,200,'REWARD','WELCOME','welcome');
   return {...session(userId),user:publicUser(db.one('SELECT * FROM users WHERE id=?',userId))};
  });
 }
 async function login(body){
  object(body,['username','password']);const username=text(body.username,'Usuário',3,24,/^[a-zA-Z0-9_]+$/).toLowerCase(),password=text(body.password,'Senha',1,128);
  const user=db.one('SELECT * FROM users WHERE username=?',username);
  if(!await verify(password,user?.password_hash||dummy)||!user)fail('LOGIN','Usuário ou senha inválidos.',401);
  allowed(user);db.run('UPDATE users SET last_login_at=? WHERE id=?',Date.now(),user.id);
  return {...session(user.id),user:publicUser(user)};
 }
 function authenticate(token){
  if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))fail('SESSION','Entre na sua conta.',401);
  const row=db.one('SELECT * FROM sessions WHERE token_hash=? AND expires_at>? AND absolute_expires_at>?',hash(token),Date.now(),Date.now());
  if(!row)fail('SESSION','Sessão expirada. Entre novamente.',401);
  return {user:allowed(db.one('SELECT * FROM users WHERE id=?',row.user_id)),session:row};
 }
 function profile(userId){return db.one('SELECT * FROM profiles WHERE user_id=?',userId);}
 function updateProfile(userId,body){
  object(body,['displayName','shirtName','shirtNumber','avatar']);
  const display=name(body.displayName),shirt=name(body.shirtName),num=integer(body.shirtNumber,'Número',1,99),avatar=text(body.avatar||'ball','Avatar',1,20,/^(ball|star|bolt)$/);
  db.run('UPDATE profiles SET display_name=?,shirt_name=?,shirt_number=?,avatar=? WHERE user_id=?',display,shirt,num,avatar,userId);
  return profile(userId);
 }
 return {session,provider:"local",register,login,authenticate,publicUser,profile,updateProfile,allowed,
  logout:token=>db.run('DELETE FROM sessions WHERE token_hash=?',hash(token)),
  refresh:token=>db.transaction(()=>{const current=authenticate(token);db.run('DELETE FROM sessions WHERE token_hash=?',hash(token));return {...session(current.user.id,current.session.absolute_expires_at),user:publicUser(current.user)};})};
}
module.exports={createAuth,passwordHash,hash};
