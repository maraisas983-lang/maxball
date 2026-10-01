const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

function openDatabase(filename) {
  if (filename !== ':memory:') fs.mkdirSync(path.dirname(path.resolve(filename)), { recursive: true });
  const connection = new DatabaseSync(filename);
  connection.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
  const db = {
    run: (sql, ...args) => connection.prepare(sql).run(...args),
    one: (sql, ...args) => connection.prepare(sql).get(...args),
    all: (sql, ...args) => connection.prepare(sql).all(...args),
    transaction(fn) {
      connection.exec('BEGIN IMMEDIATE');
      try { const result = fn(); if (result?.then) throw new Error('Transactions must be synchronous'); connection.exec('COMMIT'); return result; }
      catch (error) { connection.exec('ROLLBACK'); throw error; }
    },
    close: () => connection.close()
  };
  connection.exec('CREATE TABLE IF NOT EXISTS schema_migrations(version TEXT PRIMARY KEY,applied_at INTEGER NOT NULL)');
  for (const file of fs.readdirSync(path.join(__dirname, 'migrations')).filter(f => f.endsWith('.sql')).sort()) {
    if (!db.one('SELECT version FROM schema_migrations WHERE version=?', file)) db.transaction(() => {
      connection.exec(fs.readFileSync(path.join(__dirname, 'migrations', file), 'utf8'));
      db.run('INSERT INTO schema_migrations VALUES(?,?)', file, Date.now());
    });
  }
  seed(db);
  return db;
}
function seed(db) {
  db.transaction(() => {
    const names = ['Aurora FC','Atlético Vale','Porto Azul','Estrela Norte','União Solar','Real Horizonte','Trovão FC','Capital SC'];
    names.forEach((name, i) => db.run('INSERT OR IGNORE INTO clubs VALUES(?,?,?,?)', 'club-'+i, name, 1+Math.floor(i/2), 2+i));
    for (const item of [['league','Liga MAX','LEAGUE',1],['cup','Copa MAX','CUP',1.3],['continental','Copa Continental','CUP',1.8],['world','Mundial MAX','FINAL',2.2]]) db.run('INSERT OR IGNORE INTO competitions VALUES(?,?,?,?)',...item);
    for (let i=0;i<22;i++) db.run('INSERT OR IGNORE INTO shop_items VALUES(?,?,?,?,?,?,1)', 'kit-'+i, i<2?['Limão','Ciano'][i]:'Uniforme '+(i+1), 'KIT',i<2?'COMMON':i<6?'EPIC':'RARE',i<2?0:i<6?90:60,i);
    ['Sem rastro','Neon','Fogo','Estrelas'].forEach((name,i)=>db.run('INSERT OR IGNORE INTO shop_items VALUES(?,?,?,?,?,?,1)','effect-'+i,name,'EFFECT',['COMMON','RARE','EPIC','LEGENDARY'][i],[0,50,100,150][i],i));
  });
}
module.exports = { openDatabase, id: randomUUID };
