const {fail}=require('../lib/validation.cjs');
const BASE='https://api.cakto.com.br/public_api/';
function caktoConfig(env=process.env){return {clientId:env.CAKTO_CLIENT_ID?.trim()||'',clientSecret:env.CAKTO_CLIENT_SECRET?.trim()||''};}
function createCakto({clientId='',clientSecret='',fetch:transport=globalThis.fetch,now=Date.now}={}){
 let cached=null,pending=null;
 const configured=!!clientId&&!!clientSecret;
 async function request(path,options){
  let response;
  try{response=await transport(BASE+path,{...options,redirect:'error',signal:AbortSignal.timeout(10000)});}
  catch{fail('CAKTO_UNAVAILABLE','Não foi possível conectar à Cakto. Tente novamente.',502);}
  if(!response.ok){await response.body?.cancel();if(response.status===401)fail('CAKTO_AUTH','A Cakto recusou as credenciais ou o token.',502);if(response.status===403)fail('CAKTO_SCOPE','A chave Cakto não tem permissão para esta consulta.',502);if(response.status===429)fail('CAKTO_RATE','Limite da Cakto atingido. Aguarde antes de tentar novamente.',503);fail('CAKTO_UNAVAILABLE','A Cakto não concluiu a consulta.',502);}
  try{const chunks=[];let size=0;for await(const chunk of response.body){size+=chunk.length;if(size>1024*1024)throw Error('size');chunks.push(Buffer.from(chunk));}return JSON.parse(Buffer.concat(chunks).toString('utf8'));}
  catch{fail('CAKTO_RESPONSE','Resposta inválida da Cakto.',502);}
 }
 async function token(){
  if(!configured)fail('CAKTO_CONFIG','Configure CAKTO_CLIENT_ID e CAKTO_CLIENT_SECRET no servidor.',503);
  if(cached&&cached.expiresAt>now())return cached;
  if(!pending)pending=(async()=>{const data=await request('token/',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:clientId,client_secret:clientSecret})});
   const seconds=Number(data.expires_in);if(typeof data.access_token!=='string'||!data.access_token||data.token_type?.toLowerCase()!=='bearer'||!Number.isFinite(seconds)||seconds<=0)fail('CAKTO_RESPONSE','Resposta de autenticação inválida da Cakto.',502);
   cached={value:data.access_token,expiresAt:now()+Math.max(1,seconds-Math.min(60,seconds*.1))*1000};return cached;
  })().finally(()=>{pending=null;});
  return pending;
 }
 async function offers(page=1){
  if(!Number.isInteger(page)||page<1||page>1000)fail('CAKTO_PAGE','Página de ofertas inválida.');
  let data;
  for(let attempt=0;attempt<2;attempt++){const access=await token();try{data=await request('offers/?limit=50&page='+page,{method:'GET',headers:{Authorization:'Bearer '+access.value}});break;}catch(error){if(error.code!=='CAKTO_AUTH'||attempt)throw error;if(cached===access)cached=null;}}
  if(!Array.isArray(data?.results)||!Number.isInteger(data.count)||data.count<0)fail('CAKTO_RESPONSE','Lista de ofertas inválida da Cakto.',502);
  // Return only catalog fields. Tokens and full provider responses never reach the client.
  return {count:data.count,page,hasMore:!!data.next,offers:data.results.slice(0,50).map(p=>({id:String(p.id||'').slice(0,100),name:String(p.name||'').slice(0,255),priceCents:Number.isFinite(Number(p.price))?Math.round(Number(p.price)*100):null,currency:String(p.currency||'BRL').slice(0,3),status:String(p.status||'').slice(0,30),product:String(p.product||'').slice(0,100)}))};
 }
 async function check(){await token();return {configured,authenticated:true};}
 return {configured,check,offers};
}
module.exports={caktoConfig,createCakto};
