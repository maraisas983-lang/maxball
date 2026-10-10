const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {openDatabase}=require('../server/database/index.cjs'),{createEconomy}=require('../server/services/economy.cjs'),{createAuth}=require('../server/services/auth.cjs');
const {snapshot,verify}=require('../scripts/security-backup.cjs');
test('a WAL backup restores account, inventory and transaction data and refuses overwrite or inconsistent balances',async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'maxball-backup-test-')),source=path.join(directory,'source.sqlite'),copy=path.join(directory,'copy.sqlite'),restore=path.join(directory,'restore.sqlite');
 const db=openDatabase(source);let restored;
 try{
  const economy=createEconomy(db),auth=createAuth(db,economy),account=await auth.register({username:'backup_player',password:'fixture-password-123'});
  db.transaction(()=>economy.change(account.user.id,100,'ADMIN_GRANT','fixture','fixture-grant'));
  economy.purchase(account.user.id,{itemId:'kit-2',requestId:'fixture-purchase'});
  const result=await snapshot(source,copy);assert.equal(result.integrity,'ok');assert.equal(result.transactions,2);
  fs.copyFileSync(copy,restore,fs.constants.COPYFILE_EXCL);restored=openDatabase(restore);
  assert.equal(restored.one('SELECT balance FROM wallets WHERE user_id=?',account.user.id).balance,10);
  assert.ok(restored.one('SELECT 1 FROM inventory WHERE user_id=? AND item_id=?',account.user.id,'kit-2'));
  assert.equal(restored.one('SELECT count(*) n FROM purchases').n,1);
  await assert.rejects(snapshot(source,copy),/already exists/);assert.deepEqual(verify(copy),result);
  db.run('UPDATE wallets SET balance=999 WHERE user_id=?',account.user.id);
  const invalid=path.join(directory,'invalid.sqlite');await assert.rejects(snapshot(source,invalid),/reconciliation/);assert.equal(fs.existsSync(invalid),false);
 }finally{
  restored?.close();db.close();
  // Only known files under the test-created temporary directory; no recursive removal.
  for(const file of fs.readdirSync(directory))fs.unlinkSync(path.join(directory,file));fs.rmdirSync(directory);
 }
});
