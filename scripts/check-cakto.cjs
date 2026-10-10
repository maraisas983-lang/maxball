const fs=require('node:fs');
if(fs.existsSync('.env'))process.loadEnvFile('.env');
const {createCakto,caktoConfig}=require('../server/services/cakto.cjs');
(async()=>{const api=createCakto(caktoConfig());await api.check();console.log(JSON.stringify({ok:true,configured:api.configured,authenticated:true}));const catalog=await api.offers();console.log(JSON.stringify({ok:true,offers:catalog.count,firstPage:catalog.offers.length}));})().catch(error=>{console.error(JSON.stringify({ok:false,code:error.code||'CAKTO_UNAVAILABLE',message:error.code?error.message:'Falha ao verificar a conexão Cakto.'}));process.exitCode=1;});
