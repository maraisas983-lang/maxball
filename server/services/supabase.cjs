const {fail,AppError}=require('../lib/validation.cjs');
const {id}=require('../database/index.cjs');
const {hash}=require('./auth.cjs');
function createSupabase({url,anonKey,serviceKey,fetchImpl=fetch}){
 if(!url||!anonKey||!serviceKey)throw new Error('Configure SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY e SUPABASE_SECRET_KEY no servidor (nomes legados também são aceitos).');
 if(!/^https:\/\/[a-z0-9.-]+$/i.test(url))throw new Error('SUPABASE_URL deve usar HTTPS.');
 async function request(path,{body,token,key=anonKey,method=body?'POST':'GET'}={}){
  // Publishable/secret keys belong in apikey; only JWTs go in Authorization.
  const bearer=token||(!key.startsWith('sb_')?key:null);
  const retryable=method==='GET'||path.includes('grant_type=password');
  let response;
  for(let attempt=0;attempt<(retryable?2:1);attempt++){
   try{response=await fetchImpl(url+path,{method,headers:{apikey:key,...(bearer?{Authorization:'Bearer '+bearer}:{}),'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(8000)});}
   catch{if(retryable&&attempt===0)continue;fail('CLOUD','Não foi possível conectar ao serviço de contas. Seus dados foram mantidos; tente entrar novamente.',503);}
   if(response.status>=500&&retryable&&attempt===0){await response.arrayBuffer?.().catch(()=>{});continue;}break;
  }
  let data;try{data=await response.json();}catch{fail('CLOUD','O serviço de contas retornou uma resposta inválida. Tente novamente.',503);}
  if(!response.ok){
   if(data.error_code==='email_not_confirmed')fail('EMAIL_UNCONFIRMED','Confirme seu e-mail pelo link enviado pelo Supabase antes de entrar.',403);
   if(response.status===429){
    const emailLimit=(data.error_code||data.code)==='over_email_send_rate_limit';
    const error=new AppError(429,emailLimit?'AUTH_EMAIL_RATE_LIMIT':'AUTH_RATE_LIMIT',emailLimit?'O serviço de contas atingiu o limite de envio de e-mails de confirmação. Se já recebeu o link, confirme seu e-mail e entre; caso contrário, aguarde a liberação do serviço.':'O serviço de contas limitou as tentativas. Aguarde antes de tentar novamente.');
    const retry=Number(response.headers?.get('retry-after'));if(Number.isSafeInteger(retry)&&retry>0&&retry<=86400)error.retryAfter=retry;
    throw error;
   }
   if((response.status===401||response.status===403)&&(/api.?key/i.test(data.message||'')||data.error_code==='invalid_api_key'))fail('AUTH_CONFIGURATION','O serviço de contas rejeitou a configuração do servidor. Verifique as chaves do provedor.',503);
   if(path.includes('grant_type=password')&&(response.status===400||response.status===401))fail('LOGIN','E-mail ou senha inválidos.',401);
   if(data.error_code==='signup_disabled')fail('SIGNUP_DISABLED','O cadastro está desativado neste servidor.',403);
   if(response.status===401||response.status===403)fail('AUTH_CONFIGURATION','O serviço de contas rejeitou a configuração do servidor. Verifique as chaves do provedor.',503);
   fail('CLOUD',response.status===400?'Confira os dados informados.':'O serviço de contas está temporariamente indisponível. Seus dados foram mantidos.',response.status>=500?503:400);
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
 const profileUpdates=new Set(),refreshing=new Set(),restoring=new Map(),accessExpiry=new Map();
 function expiry(key,row){try{const jwt=JSON.parse(Buffer.from(row.access_token.split('.')[1],'base64url').toString());if(Number.isFinite(jwt.exp))return jwt.exp*1000;}catch{}return accessExpiry.get(key)||0;}
 const {session,allowed,publicUser}=local;
 const administrators=new Set([...adminEmails,require('../lib/commerceOwner.cjs').COMMERCE_OWNER].map(email=>email.trim().toLowerCase()).filter(Boolean));
 async function establish(tokens,isLogin=true,previousToken=null){
  if(!tokens.access_token){return {confirmationRequired:true};}
  const identity=await cloud.user(tokens.access_token);
  if(!identity.id||!identity.email)fail('IDENTITY','Identidade inválida.',401);
  const remote=(await cloud.profile(identity.id))[0];if(!remote)fail('MIGRATION','Execute a migração do Supabase antes de entrar.',503);
  return db.transaction(()=>{
   // Revalidate after the provider awaits: logout, expiry or moderation may have
   // revoked the old session while a refresh was in flight.
   const previous=previousToken?local.authenticate(previousToken):null;
   if(previous&&previous.user.id!==identity.id)fail('IDENTITY','Identidade inválida.',401);
   const now=Date.now();let user=db.one('SELECT * FROM users WHERE id=?',identity.id);
   if(!user){
    const name=(remote.display_name||identity.email.split('@')[0]).slice(0,14);
    db.run('INSERT INTO users(id,username,password_hash,created_at,updated_at,last_login_at) VALUES(?,?,?,?,?,?)',identity.id,'sb_'+identity.id,'EXTERNAL',now,now,now);
    db.run('INSERT INTO profiles(id,user_id,display_name,shirt_name,shirt_number,created_at,rating,ranked_wins,ranked_draws,ranked_losses,ranked_goals,ranked_assists) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',id(),identity.id,name,name,10,now,remote.rating,remote.wins,remote.draws,remote.losses,remote.goals,remote.assists);
    db.run('INSERT INTO wallets VALUES(?,?,?)',identity.id,0,now);for(const item of ['kit-0','kit-1','effect-0','emote-0','ball-0','celebration-0'])db.run('INSERT INTO inventory VALUES(?,?,?)',identity.id,item,now);db.run("INSERT OR IGNORE INTO emote_slots VALUES(?,0,'emote-0')",identity.id);user=db.one('SELECT * FROM users WHERE id=?',identity.id);
   }
   allowed(user);
   if(identity.email_confirmed_at)db.run('INSERT INTO verified_emails VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET email=excluded.email',identity.id,identity.email.trim().toLowerCase());else db.run('DELETE FROM verified_emails WHERE user_id=?',identity.id);
   // Trust only the confirmed email returned by Supabase Auth, never form data or user metadata.
   if(identity.email_confirmed_at&&administrators.has(identity.email.trim().toLowerCase())&&!['OWNER','SUPER_ADMIN','ADMIN'].includes(user.staff_role||user.role)){
    db.run("UPDATE users SET role='ADMIN',staff_role='ADMIN',updated_at=? WHERE id=?",now,identity.id);
    db.run('INSERT INTO admin_audit VALUES(?,?,?,?,?,?,?,?)',id(),identity.id,'CONFIGURED_ADMIN',identity.id,JSON.stringify({role:user.staff_role||user.role}),JSON.stringify({role:'ADMIN'}),'E-mail confirmado na lista administrativa do servidor',now);
    user=db.one('SELECT * FROM users WHERE id=?',identity.id);
   }
   if(isLogin)db.run('UPDATE users SET last_login_at=? WHERE id=?',now,identity.id);
   if(previousToken){local.logout(previousToken);accessExpiry.delete(hash(previousToken));}
   const result=session(identity.id,previous?.session.absolute_expires_at);
   const lifetime=Number.isFinite(tokens.expires_in)&&tokens.expires_in>0?Math.min(tokens.expires_in,3600):3600;
   if(accessExpiry.size>=10000)accessExpiry.delete(accessExpiry.keys().next().value);accessExpiry.set(hash(result.token),now+lifetime*1000);
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
  authenticate(token){const result=local.authenticate(token),key=hash(token),row=db.one('SELECT * FROM external_sessions WHERE token_hash=?',key);if(!row)fail('SESSION','Entre com sua conta Supabase.',401);if(expiry(key,row)<=Date.now())fail('SESSION_REFRESH_REQUIRED','Renove sua sessão.',401);return result;},
  async restore(token){
   const current=local.authenticate(token),key=hash(token),row=db.one('SELECT * FROM external_sessions WHERE token_hash=?',key);if(!row)fail('SESSION','Entre novamente.',401);
   if(expiry(key,row)>Date.now()+60000)return current;
   if(restoring.has(key))return restoring.get(key);if(refreshing.has(key))fail('REFRESH_BUSY','Aguarde a renovação em andamento.',409);
   const task=(async()=>{const tokens=await cloud.refresh(row.refresh_token),identity=await cloud.user(tokens.access_token);if(identity.id!==current.user.id)fail('IDENTITY','Identidade inválida.',401);
    const valid=local.authenticate(token);if(!db.one('SELECT 1 FROM external_sessions WHERE token_hash=?',key))fail('SESSION','Entre novamente.',401);
    db.run('UPDATE external_sessions SET access_token=?,refresh_token=? WHERE token_hash=?',tokens.access_token,tokens.refresh_token,key);accessExpiry.set(key,Date.now()+Math.min(tokens.expires_in||3600,3600)*1000);return valid;})();
   restoring.set(key,task);try{return await task;}finally{restoring.delete(key);}
  },
  register:async body=>establish(await cloud.register(...credentials(body,true))),login:async body=>establish(await cloud.login(...credentials(body))),
  async refresh(token){
   local.authenticate(token);const key=hash(token),row=db.one('SELECT * FROM external_sessions WHERE token_hash=?',key);
   if(!row)fail('SESSION','Entre novamente.',401);
   if(refreshing.has(key)||restoring.has(key))fail('REFRESH_BUSY','Aguarde a renovação em andamento.',409);
   refreshing.add(key);try{return await establish(await cloud.refresh(row.refresh_token),false,token);}finally{refreshing.delete(key);}
  },
  async logout(token){const row=db.one('SELECT * FROM external_sessions WHERE token_hash=?',hash(token));local.logout(token);accessExpiry.delete(hash(token));if(row)await cloud.logout(row.access_token).catch(()=>{});},
  async updateProfile(uid,body){if(profileUpdates.has(uid))fail('PROFILE_BUSY','Aguarde a atualização anterior.',409);profileUpdates.add(uid);const before=local.profile(uid);try{const after=local.updateProfile(uid,body,true);await cloud.updateProfile(uid,after.display_name);try{return local.updateProfile(uid,body);}catch(error){await cloud.updateProfile(uid,before.display_name).catch(()=>{});throw error;}}finally{profileUpdates.delete(uid);}}

 };
}
function createCloudSync(db,cloud,logger){
 let busy=false,closed=false,lastError=null;
 async function flush(){if(busy||closed)return;busy=true;try{for(const row of db.all('SELECT * FROM cloud_outbox ORDER BY created_at LIMIT 10')){await cloud.complete(JSON.parse(row.payload));db.run('DELETE FROM cloud_outbox WHERE id=?',row.id);}lastError=null;}catch(error){lastError=error.message;logger.error(JSON.stringify({event:'cloud_sync_failed',message:error.message}));}finally{busy=false;}}
 const timer=setInterval(flush,5000);timer.unref();
 return {flush,assertReady(){if(lastError||db.one('SELECT id FROM cloud_outbox LIMIT 1'))fail('SYNC','Sincronizando o último resultado. Tente novamente em instantes.',503);},async close(){closed=true;clearInterval(timer);while(busy)await new Promise(resolve=>setTimeout(resolve,20));}};
}
module.exports={createSupabase,useSupabaseAuth,createCloudSync};
