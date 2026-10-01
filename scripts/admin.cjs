const fs=require('node:fs');
if(fs.existsSync('.env'))process.loadEnvFile('.env');
const {openDatabase,id}=require('../server/database/index.cjs');
const username=process.argv[2];
if(!username){console.error('Uso: npm run admin -- nome_da_conta_existente');process.exit(1);}
const db=openDatabase(process.env.DATABASE_PATH||'var/maxball.sqlite');
try{
 const user=db.one('SELECT * FROM users WHERE username=? OR id=?',username,username);
 if(!user)throw new Error('Crie a conta pelo jogo antes de promover.');
 if(db.one("SELECT id FROM users WHERE role='SUPER_ADMIN'"))throw new Error('Já existe SUPER_ADMIN. Use o painel para gerenciar os demais administradores.');
 db.transaction(()=>{
  db.run("UPDATE users SET role='SUPER_ADMIN',updated_at=? WHERE id=?",Date.now(),user.id);
  db.run('DELETE FROM sessions WHERE user_id=?',user.id);
  db.run('INSERT INTO admin_audit VALUES(?,?,?,?,?,?,?,?)',id(),user.id,'BOOTSTRAP_SUPER_ADMIN',user.id,JSON.stringify({role:user.role}),JSON.stringify({role:'SUPER_ADMIN'}),'Bootstrap local pelo operador',Date.now());
 });
 console.log('Conta promovida. Faça login novamente.');
}catch(error){console.error(error.message);process.exitCode=1;}finally{db.close();}
