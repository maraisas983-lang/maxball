const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
let count=0;
for(const root of ['src','server','scripts','tests']){
 for(const entry of fs.readdirSync(root,{recursive:true,withFileTypes:true})){
  if(!entry.isFile()||! /\.(c?js)$/.test(entry.name))continue;
  const file=path.join(entry.parentPath,entry.name),result=spawnSync(process.execPath,['--check',file],{encoding:'utf8',windowsHide:true});
  if(result.status!==0){console.error(result.stderr);process.exitCode=1;}count++;
 }
}
console.log(`Sintaxe verificada: ${count} arquivos.`);
