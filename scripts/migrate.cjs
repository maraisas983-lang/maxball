const fs=require('node:fs');
if(fs.existsSync('.env'))process.loadEnvFile('.env');
const {openDatabase}=require('../server/database/index.cjs');
const db=openDatabase(process.env.DATABASE_PATH||'var/maxball.sqlite');
console.log(db.all('SELECT * FROM schema_migrations ORDER BY version'));db.close();
