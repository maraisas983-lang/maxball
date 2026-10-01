function supabaseConfig(env=process.env){
 if(env.AUTH_PROVIDER!=='supabase')return undefined;
 return {url:env.SUPABASE_URL?.replace(/\/$/,''),anonKey:env.SUPABASE_PUBLISHABLE_KEY||env.SUPABASE_ANON_KEY,serviceKey:env.SUPABASE_SECRET_KEY||env.SUPABASE_SERVICE_ROLE_KEY};
}
module.exports={supabaseConfig};
