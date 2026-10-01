const fs=require('node:fs');
if(fs.existsSync('.env'))process.loadEnvFile('.env');
const {createApp}=require('./app.cjs');
const host=process.env.HOST||'127.0.0.1',port=Number(process.env.PORT||5173),origin=process.env.PUBLIC_ORIGIN||`http://127.0.0.1:${port}`;
const app=createApp({supabase:process.env.AUTH_PROVIDER==='supabase'?{url:process.env.SUPABASE_URL,anonKey:process.env.SUPABASE_ANON_KEY,serviceKey:process.env.SUPABASE_SERVICE_ROLE_KEY}:undefined,databasePath:process.env.DATABASE_PATH||'var/maxball.sqlite',origin,production:process.env.NODE_ENV==='production'});
app.server.listen(port,host,()=>console.log(JSON.stringify({level:'INFO',event:'listening',url:origin})));
app.server.on('error',error=>{console.error(JSON.stringify({level:'ERROR',event:'listen',message:error.message}));app.close().finally(()=>process.exit(1));});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>app.close().then(()=>process.exit(0)));
