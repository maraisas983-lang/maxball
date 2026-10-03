// Read-only diagnostics. Never print credentials, response bodies or user data.
const fs=require('node:fs');
if(fs.existsSync('.env'))process.loadEnvFile('.env');
const {supabaseConfig}=require('../server/lib/supabaseConfig.cjs');
async function main(){
 const config=supabaseConfig();
 if(!config?.url||!config.anonKey||!config.serviceKey)throw new Error('Configure AUTH_PROVIDER=supabase, URL e as duas chaves no .env.');
 if(!/^https:\/\/[a-z0-9.-]+$/i.test(config.url))throw new Error('URL inválida.');
 const checks=[
  ['Auth público','/auth/v1/settings',config.anonKey],
  ['JWKS','/auth/v1/.well-known/jwks.json',null],
  ['Perfis','/rest/v1/profiles?select=id,display_name,rating,wins,draws,losses,goals,assists&limit=0',config.serviceKey],
  ['Partidas','/rest/v1/ranked_matches?select=id,home_id,away_id,home_before,away_before,home_after,away_after,score,reason,created_at,finished_at&limit=0',config.serviceKey],
  ['Participantes de grupos','/rest/v1/ranked_participants?select=match_id,user_id,team,rating_before,rating_after&limit=0',config.serviceKey],
  ['Versão de grupos','/rest/v1/rpc/maxball_ranked_version',config.serviceKey],
  ['Eventos','/rest/v1/ranked_events?select=match_id,sequence,payload&limit=0',config.serviceKey],
  ['RPC de resultado','/rest/v1/',config.serviceKey]
 ];
 let failed=false;
 for(const [name,path,key] of checks){
  try{
   const response=await fetch(config.url+path,{headers:{...(key?{apikey:key,...(!key.startsWith('sb_')?{Authorization:'Bearer '+key}:{})}:{}),...(name==='RPC de resultado'?{Accept:'application/openapi+json'}:{})},signal:AbortSignal.timeout(12000)});
   const data=await response.json().catch(()=>({}));
   const ok=response.ok&&(name!=='Versão de grupos'||data===2)&&(name!=='RPC de resultado'||!!data.paths?.['/rpc/record_ranked_match']);
   failed||=!ok;
   const detail=ok?name==='JWKS'?`${data.keys?.length||0} chave(s) pública(s)`:'OK':response.ok?'função ausente':data.code==='PGRST205'?'tabela ausente':data.code==='42703'?'coluna ausente':'verifique configuração/migração';
   console.log(`${name}: HTTP ${response.status} · ${detail}`);
  }catch{failed=true;console.log(`${name}: conexão indisponível ou tempo esgotado`);}
 }
 if(failed){console.log('Se houver tabela/função ausente, execute server/database/supabase/001_ranked.sql e depois 002_ranked_parties.sql no SQL Editor do projeto.');process.exitCode=1;}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
