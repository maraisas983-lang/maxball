const {fail}=require('../lib/validation.cjs');
const {id}=require('../database/index.cjs');
const {hash}=require('./auth.cjs');
function createSupabase({url,anonKey,serviceKey,fetchImpl=fetch}){
 if(!url||!anonKey||!serviceKey)throw new Error('Configure SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY e SUPABASE_SECRET_KEY no servidor (nomes legados também são aceitos).');
 if(!/^https:\/\/[a-z0-9.-]+$/i.test(url))throw new Error('SUPABASE_URL deve usar HTTPS.');
 async function request(path,{body,token,key=anonKey,method=body?'POST':'GET'}={}){
  // Publishable/secret keys belong in apikey; only JWTs go in Authorization.
  const bearer=token||(!key.startsWith('sb_')?key:null);
  let response;try{response=await fetchImpl(url+path,{method,headers:{apikey:key,...(bearer?{Authorization:'Bearer '+bearer}:{}),'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(10000)});}catch{fail('CLOUD','Serviço de contas indisponível. Tente novamente.',503);}
  const data=await response.json().catch(()=>({}));
  if(!response.ok){
   if(data.error_code==='email_not_confirmed')fail('EMAIL_UNCONFIRMED','Confirme seu e-mail pelo link enviado pelo Supabase antes de entrar.',403);
   if(response.status===429)fail('AUTH_RATE_LIMIT','Muitas tentativas. Aguarde alguns minutos e tente novamente.',429);
   if(path.includes('grant_type=password')&&(response.status===400||response.status===401))fail('LOGIN','E-mail ou senha inválidos.',401);
   if(data.error_code==='signup_disabled')fail('SIGNUP_DISABLED','O cadastro está desativado neste servidor.',403);
   fail('CLOUD',response.status===400||response.status===401?'Confira os dados informados.':'Serviço de contas indisponível.',response.status>=500?503:400);
  }
  return data;
 }
 return {
  register:(email,password)=>request('/auth/v1/signup',{body:{email,password}}),
  login:(email,password)=>request('/auth/v1/token?grant_type=password',{body:{email,password}}),
  refresh:refresh_token=>request('/auth/v1/token?grant_type=refresh_token',{body:{refresh_token}}),
  user:token=>request('/auth/v1/user',{token}),
  logout:token=>request('/auth/v1/logout',{token,body:{}}),
  profile:uid=>request('/rest/v1/profiles?id=eq.'+encodeURIComponent(uid)+'&select=*',{key:serviceKey}),
  partyVersion:()=>request('/rest/v1/rpc/maxball_ranked_version',{key:serviceKey}),
  complete:payload=>request('/rest/v1/rpc/record_ranked_match',{key:serviceKey,body:{result:payload}}),
  updateProfile:(uid,display_name)=>request('/rest/v1/profiles?id=eq.'+encodeURIComponent(uid),{key:serviceKey,method:'PATCH',body:{display_name}})
 };
}
function useSupabaseAuth(local,db,economy,cloud,{adminEmails=[]}={}){
 const {session,allowed,publicUser}=local;
 const administrators=new Set(adminEmails.map(email=>email.trim().toLowerCase()).filter(Boolean));
 async function establish(tokens,isLogin=true){
  if(!tokens.access_token){return {confirmationRequired:true};}
  const identity=await cloud.user(tokens.access_token);
  if(!identity.id||!identity.email)fail('IDENTITY','Identidade inválida.',401);
  const remote=(await cloud.profile(identity.id))[0];if(!remote)fail('MIGRATION','Execute a migração do Supabase antes de entrar.',503);
  return db.transaction(()=>{
   const now=Date.now();let user=db.one('SELECT * FROM users WHERE id=?',identity.id);
   if(!user){
    const name=(remote.display_name||identity.email.split('@')[0]).slice(0,14);
    db.run('INSERT INTO users(id,username,password_hash,created_at,updated_at,last_login_at) VALUES(?,?,?,?,?,?)',identity.id,'sb_'+identity.id,'EXTERNAL',now,now,now);
    db.run('INSERT INTO profiles(id,user_id,display_name,shirt_name,shirt_number,created_at,rating,ranked_wins,ranked_draws,ranked_losses,ranked_goals,ranked_assists) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',id(),identity.id,name,name,10,now,remote.rating,remote.wins,remote.draws,remote.losses,remote.goals,remote.assists);
    db.run('INSERT INTO wallets VALUES(?,?,?)',identity.id,0,now);for(const item of ['kit-0','kit-1','effect-0','emote-0'])db.run('INSERT INTO inventory VALUES(?,?,?)',identity.id,item,now);db.run("INSERT OR IGNORE INTO emote_slots VALUES(?,0,'emote-0')",identity.id);user=db.one('SELECT * FROM users WHERE id=?',identity.id);
   }
   allowed(user);
   if(identity.email_confirmed_at)db.run('INSERT INTO verified_emails VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET email=excluded.email',identity.id,identity.email.trim().toLowerCase());
   // Trust only the confirmed email returned by Supabase Auth, never form data or user metadata.
   if(identity.email_confirmed_at&&administrators.has(identity.email.trim().toLowerCase())&&!['OWNER','SUPER_ADMIN','ADMIN'].includes(user.staff_role||user.role)){
    db.run("UPDATE users SET role='ADMIN',staff_role='ADMIN',updated_at=? WHERE id=?",now,identity.id);
    db.run('INSERT INTO admin_audit VALUES(?,?,?,?,?,?,?,?)',id(),identity.id,'CONFIGURED_ADMIN',identity.id,JSON.stringify({role:user.staff_role||user.role}),JSON.stringify({role:'ADMIN'}),'E-mail confirmado na lista administrativa do servidor',now);
    user=db.one('SELECT * FROM users WHERE id=?',identity.id);
   }
   if(isLogin)db.run('UPDATE users SET last_login_at=? WHERE id=?',now,identity.id);const result=session(identity.id,now+Math.min(tokens.expires_in||3600,3600)*1000);
   db.run('INSERT INTO external_sessions VALUES(?,?,?)',hash(result.token),tokens.access_token,tokens.refresh_token);
   return {...result,user:publicUser(user)};
  });
 }
 function credentials(body,register=false){
  const email=typeof body.username==='string'?body.username.trim():'';
  if(Object.keys(body).some(k=>!['username','password'].includes(k))||!/^\S+@\S+\.\S+$/.test(email)||email.length>254||typeof body.password!=='string'||body.password.length<(register?12:1)||body.password.length>128)fail('CREDENTIALS',register?'Informe um e-mail válido e senha de 12 a 128 caracteres.':'Informe seu e-mail e sua senha.');
  return [email,body.password];
 }
 return {...local,provider:'supabase',
  authenticate(token){const result=local.authenticate(token);if(!db.one('SELECT token_hash FROM external_sessions WHERE token_hash=?',hash(token)))fail('SESSION','Entre com sua conta Supabase.',401);return result;},
  register:async body=>establish(await cloud.register(...credentials(body,true))),login:async body=>establish(await cloud.login(...credentials(body))),
  async refresh(token){local.authenticate(token);const row=db.one('SELECT * FROM external_sessions WHERE token_hash=?',hash(token));if(!row)fail('SESSION','Entre novamente.',401);const result=await establish(await cloud.refresh(row.refresh_token),false);local.logout(token);return result;},
  async logout(token){const row=db.one('SELECT * FROM external_sessions WHERE token_hash=?',hash(token));local.logout(token);if(row)await cloud.logout(row.access_token).catch(()=>{});},
  async updateProfile(uid,body){const before=local.profile(uid),after=local.updateProfile(uid,body);try{await cloud.updateProfile(uid,after.display_name);}catch(error){db.run('UPDATE profiles SET display_name=?,shirt_name=?,shirt_number=?,avatar=? WHERE user_id=?',before.display_name,before.shirt_name,before.shirt_number,before.avatar,uid);db.run('UPDATE profiles SET positions=? WHERE user_id=?',JSON.stringify(before.positions),uid);throw error;}return after;}
 };
}
function createCloudSync(db,cloud,logger){
 let busy=false,closed=false,lastError=null;
 async function flush(){if(busy||closed)return;busy=true;try{for(const row of db.all('SELECT * FROM cloud_outbox ORDER BY created_at LIMIT 10')){await cloud.complete(JSON.parse(row.payload));db.run('DELETE FROM cloud_outbox WHERE id=?',row.id);}lastError=null;}catch(error){lastError=error.message;logger.error(JSON.stringify({event:'cloud_sync_failed',message:error.message}));}finally{busy=false;}}
 const timer=setInterval(flush,5000);timer.unref();
 return {flush,assertReady(){if(lastError||db.one('SELECT id FROM cloud_outbox LIMIT 1'))fail('SYNC','Sincronizando o último resultado. Tente novamente em instantes.',503);},async close(){closed=true;clearInterval(timer);while(busy)await new Promise(resolve=>setTimeout(resolve,20));}};
}
module.exports={createSupabase,useSupabaseAuth,createCloudSync};
