const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),out=path.join(root,'android/app/src/main/assets/game');
function buildAssets(){
 fs.mkdirSync(out,{recursive:true});
 // Explicit public files only: never copy .env, var, server, node_modules or account databases.
 fs.copyFileSync(path.join(root,'index.html'),path.join(out,'index.html'));
 for(const dir of ['src','styles','assets'])fs.cpSync(path.join(root,dir),path.join(out,dir),{recursive:true,filter:source=>!fs.statSync(source).isFile()||/\.(js|css|svg|png|jpe?g|webp|ogg|mp3|wav|woff2?)$/i.test(source)});
 console.log('Assets públicos preparados para Android.');return out;
}
if(require.main===module)buildAssets();module.exports={buildAssets};
