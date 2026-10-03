const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {DatabaseSync}=require('node:sqlite'),{openDatabase}=require('../server/database/index.cjs');
test('career table migration preserves existing saves, completed matches, seasons and awards with valid foreign keys',t=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'maxball-migration-')),file=path.join(directory,'old.sqlite');t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));const old=new DatabaseSync(file);old.exec('PRAGMA foreign_keys=ON;CREATE TABLE schema_migrations(version TEXT PRIMARY KEY,applied_at INTEGER NOT NULL)');
 for(const name of fs.readdirSync('server/database/migrations').filter(n=>n.endsWith('.sql')&&n<'007').sort()){old.exec(fs.readFileSync(path.join('server/database/migrations',name),'utf8'));old.prepare('INSERT INTO schema_migrations VALUES(?,1)').run(name);}
 old.exec(`INSERT INTO users(id,username,password_hash,created_at,updated_at) VALUES('u','old_player','unused-test-hash',1,1);
 INSERT INTO profiles(id,user_id,display_name,shirt_name,shirt_number,created_at) VALUES('p','u','Antigo','ANTIGO',7,1);
 INSERT INTO clubs VALUES('club-0','Aurora FC',1,2);
 INSERT INTO careers(id,user_id,player_id,club_id,stats,created_at) VALUES('c','u','p','club-0','{"goals":9}',1);
 INSERT INTO career_seasons(id,career_id,season,club_id,status,schedule,table_data,stats,created_at) VALUES('s','c',1,'club-0','ACTIVE','[]','[]','{}',1);
 INSERT INTO matches(id,kind,career_id,season,fixture,participants,score,events,stats,duration,status,created_at) VALUES('m','CAREER','c',1,0,'[]','[1,0]','[]','{}',120,'COMPLETED',1);
 INSERT INTO accolades VALUES('a','u','c',1,'club-0','TROPHY','CUP','Copa MAX','{}',1);`);old.close();
 const db=openDatabase(file);try{assert.equal(db.one('SELECT player_name FROM careers WHERE id=?','c').player_name,'ANTIGO');assert.equal(db.one('SELECT career_id FROM active_career WHERE user_id=?','u').career_id,'c');assert.equal(db.one('SELECT stats FROM careers WHERE id=?','c').stats,'{"goals":9}');for(const table of ['matches','career_seasons','accolades'])assert.equal(db.one('SELECT career_id FROM '+table).career_id,'c');assert.deepEqual(db.all('PRAGMA foreign_key_check'),[]);}finally{db.close();}
});
