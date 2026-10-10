const fs=require('node:fs'),path=require('node:path');
const {DatabaseSync,backup}=require('node:sqlite');

function verify(filename){
 const db=new DatabaseSync(filename,{readOnly:true});
 try{
  if(db.prepare('PRAGMA integrity_check').all().some(row=>row.integrity_check!=='ok'))throw new Error('Backup integrity check failed');
  if(db.prepare('PRAGMA foreign_key_check').all().length)throw new Error('Backup foreign key check failed');
  const mismatches=db.prepare(`SELECT count(*) n FROM wallets w WHERE w.balance<>coalesce((SELECT balance_after FROM gem_transactions t WHERE t.user_id=w.user_id ORDER BY t.created_at DESC,t.rowid DESC LIMIT 1),0)`).get().n;
  if(mismatches)throw new Error('Wallet reconciliation failed; investigate before using this backup');
  return {integrity:'ok',foreignKeys:'ok',walletReconciliation:'ok',users:db.prepare('SELECT count(*) n FROM users').get().n,matches:db.prepare('SELECT count(*) n FROM matches').get().n,transactions:db.prepare('SELECT count(*) n FROM gem_transactions').get().n};
 }finally{db.close();}
}
async function snapshot(source,destination){
 const input=fs.realpathSync(source),output=path.resolve(destination);
 if(path.extname(output)!=='.sqlite')throw new Error('Destination must end in .sqlite');
 if(fs.existsSync(output))throw new Error('Destination already exists; use a new backup filename');
 // Temporary sibling and hard link publish a complete, checked file without
 // overwriting an existing destination, even if another backup runs concurrently.
 const directory=fs.mkdtempSync(path.join(path.dirname(output),'.maxball-backup-'));
 const temporary=path.join(directory,'snapshot.sqlite');let db;
 try{
  db=new DatabaseSync(input,{readOnly:true});await backup(db,temporary);db.close();db=null;
  fs.chmodSync(temporary,0o600);const result=verify(temporary);fs.linkSync(temporary,output);return result;
 }finally{
  db?.close();
  for(const suffix of ['','-wal','-shm']){const file=temporary+suffix;if(fs.existsSync(file))fs.unlinkSync(file);}
  fs.rmdirSync(directory);
 }
}
if(require.main===module){
 const [source,destination]=process.argv.slice(2);
 if(!source||!destination){console.error('Usage: node scripts/security-backup.cjs SOURCE.sqlite NEW-BACKUP.sqlite');process.exitCode=1;}
 else snapshot(source,destination).then(result=>console.log(JSON.stringify(result))).catch(()=>{console.error('Backup failed. Check source, destination permissions, integrity and wallet reconciliation; no existing destination is overwritten.');process.exitCode=1;});
}
module.exports={snapshot,verify};
