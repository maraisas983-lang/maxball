const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

function openDatabase(filename) {
  if (filename !== ':memory:') fs.mkdirSync(path.dirname(path.resolve(filename)), { recursive: true });
  const connection = new DatabaseSync(filename);
  connection.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
  const statements=new Map();
  const prepare=sql=>{if(!statements.has(sql)){if(statements.size>=256)statements.delete(statements.keys().next().value);statements.set(sql,connection.prepare(sql));}return statements.get(sql);};
  const db = {
    run: (sql, ...args) => prepare(sql).run(...args),
    one: (sql, ...args) => prepare(sql).get(...args),
    all: (sql, ...args) => prepare(sql).all(...args),
    transaction(fn) {
      connection.exec('BEGIN IMMEDIATE');
      try { const result = fn(); if (result?.then) throw new Error('Transactions must be synchronous'); connection.exec('COMMIT'); return result; }
      catch (error) { connection.exec('ROLLBACK'); throw error; }
    },
    close: () => connection.close()
  };
  connection.exec('CREATE TABLE IF NOT EXISTS schema_migrations(version TEXT PRIMARY KEY,applied_at INTEGER NOT NULL)');
  for (const file of fs.readdirSync(path.join(__dirname, 'migrations')).filter(f => f.endsWith('.sql')).sort()) {
    if (!db.one('SELECT version FROM schema_migrations WHERE version=?', file)) {
      const sql=fs.readFileSync(path.join(__dirname,'migrations',file),'utf8'),rebuild=sql.startsWith('-- migration: foreign_keys=off');
      if(rebuild)connection.exec('PRAGMA foreign_keys=OFF');
      try{db.transaction(()=>{connection.exec(sql);if(connection.prepare('PRAGMA foreign_key_check').all().length)throw new Error('Migration left invalid foreign keys: '+file);db.run('INSERT INTO schema_migrations VALUES(?,?)',file,Date.now());});}
      finally{if(rebuild)connection.exec('PRAGMA foreign_keys=ON');}
    }
  }
  seed(db);
  return db;
}
function seed(db) {
  db.transaction(() => {
    const names = ['Aurora FC','Atlético Vale','Porto Azul','Estrela Norte','União Solar','Real Horizonte','Trovão FC','Capital SC'];
    names.forEach((name, i) => db.run('INSERT OR IGNORE INTO clubs VALUES(?,?,?,?)', 'club-'+i, name, 1+Math.floor(i/2), 2+i));
    for(const team of require('../../src/data/teams.js').teams)db.run('INSERT OR IGNORE INTO clubs VALUES(?,?,?,?)',team.id,team.name,team.id.startsWith('br-')?([0,1,2,3,8,9].includes(Number(team.id.slice(3)))?4:3):2,team.legacyKit??0);
    for (const item of [['league','Liga MAX','LEAGUE',1],['cup','Copa MAX','CUP',1.3],['continental','Copa Continental','CUP',1.8],['world','Mundial MAX','FINAL',2.2]]) db.run('INSERT OR IGNORE INTO competitions VALUES(?,?,?,?)',...item);
    for (let i=0;i<22;i++) db.run('INSERT OR IGNORE INTO shop_items VALUES(?,?,?,?,?,?,1)', 'kit-'+i, i<2?['Limão','Ciano'][i]:'Uniforme '+(i+1), 'KIT',i<2?'COMMON':i<6?'EPIC':'RARE',i<2?0:i<6?90:60,i);
    const collection=require('../../src/data/collections.js');for(const item of [...collection.balls,...collection.celebrations,...collection.trails])db.run('INSERT OR IGNORE INTO shop_items VALUES(?,?,?,?,?,?,1)',item.id,item.name,item.category,item.rarity,item.asset_index===0?0:30,item.asset_index);for(const itemId of ['ball-0','celebration-0'])db.run('INSERT OR IGNORE INTO inventory SELECT id,?,? FROM users',itemId,Date.now());
    for(const e of require('../../src/data/emotes.js'))db.run('INSERT OR IGNORE INTO shop_items VALUES(?,?,?,?,?,?,1)',e.id,e.name,'EMOTE',e.price>=100?'EPIC':'COMMON',e.price,e.asset_index);
    // Existing accounts also receive the free starter emote.
    db.run("INSERT OR IGNORE INTO inventory SELECT id,'emote-0',? FROM users",Date.now());
    db.run("INSERT OR IGNORE INTO emote_slots SELECT id,0,'emote-0' FROM users WHERE NOT EXISTS(SELECT 1 FROM emote_slots e WHERE e.user_id=users.id AND e.slot=0)");
    ['Sem rastro','Neon','Fogo','Estrelas'].forEach((name,i)=>db.run('INSERT OR IGNORE INTO shop_items VALUES(?,?,?,?,?,?,1)','effect-'+i,name,'EFFECT',['COMMON','RARE','EPIC','LEGENDARY'][i],[0,50,100,150][i],i));
  });
}
module.exports = { openDatabase, id: randomUUID };
