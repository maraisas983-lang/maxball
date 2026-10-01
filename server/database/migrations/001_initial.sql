CREATE TABLE users (
 id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE COLLATE NOCASE,
 password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'PLAYER' CHECK(role IN ('PLAYER','MODERATOR','ADMIN','SUPER_ADMIN')),
 status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','SUSPENDED')),
 created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, last_login_at INTEGER
);
CREATE TABLE profiles (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL UNIQUE REFERENCES users(id),
 display_name TEXT NOT NULL, shirt_name TEXT NOT NULL, shirt_number INTEGER NOT NULL CHECK(shirt_number BETWEEN 1 AND 99),
 avatar TEXT NOT NULL DEFAULT 'ball', xp INTEGER NOT NULL DEFAULT 0 CHECK(xp>=0),
 level INTEGER NOT NULL DEFAULT 1 CHECK(level>=1), kit INTEGER NOT NULL DEFAULT 0, effect INTEGER NOT NULL DEFAULT 0,
 created_at INTEGER NOT NULL
);
CREATE TABLE sessions (
 token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), csrf TEXT NOT NULL,
 created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, absolute_expires_at INTEGER NOT NULL
);
CREATE INDEX sessions_user ON sessions(user_id);
CREATE TABLE wallets (user_id TEXT PRIMARY KEY REFERENCES users(id), balance INTEGER NOT NULL DEFAULT 0 CHECK(balance>=0), updated_at INTEGER NOT NULL);
CREATE TABLE gem_transactions (
 id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),type TEXT NOT NULL,amount INTEGER NOT NULL,
 balance_before INTEGER NOT NULL,balance_after INTEGER NOT NULL CHECK(balance_after>=0),source TEXT NOT NULL,
 idempotency_key TEXT NOT NULL,created_at INTEGER NOT NULL,UNIQUE(user_id,idempotency_key)
);
CREATE TABLE shop_items (
 id TEXT PRIMARY KEY,name TEXT NOT NULL,category TEXT NOT NULL,rarity TEXT NOT NULL,price INTEGER NOT NULL CHECK(price>=0),
 asset_index INTEGER NOT NULL,enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN(0,1))
);
CREATE TABLE inventory (user_id TEXT NOT NULL REFERENCES users(id),item_id TEXT NOT NULL REFERENCES shop_items(id),acquired_at INTEGER NOT NULL,PRIMARY KEY(user_id,item_id));
CREATE TABLE purchases (id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),item_id TEXT NOT NULL REFERENCES shop_items(id),price INTEGER NOT NULL,idempotency_key TEXT NOT NULL,created_at INTEGER NOT NULL,UNIQUE(user_id,idempotency_key));
CREATE TABLE clubs (id TEXT PRIMARY KEY,name TEXT NOT NULL,prestige INTEGER NOT NULL,kit INTEGER NOT NULL);
CREATE TABLE competitions (id TEXT PRIMARY KEY,name TEXT NOT NULL,format TEXT NOT NULL,prestige REAL NOT NULL);
CREATE TABLE careers (
 id TEXT PRIMARY KEY,user_id TEXT NOT NULL UNIQUE REFERENCES users(id),player_id TEXT NOT NULL REFERENCES profiles(id),
 club_id TEXT NOT NULL REFERENCES clubs(id),season INTEGER NOT NULL DEFAULT 1,reputation REAL NOT NULL DEFAULT 0,
 stats TEXT NOT NULL,created_at INTEGER NOT NULL
);
CREATE TABLE career_seasons (
 id TEXT PRIMARY KEY,career_id TEXT NOT NULL REFERENCES careers(id),season INTEGER NOT NULL,club_id TEXT NOT NULL REFERENCES clubs(id),
 status TEXT NOT NULL CHECK(status IN('ACTIVE','COMPLETED')),schedule TEXT NOT NULL,table_data TEXT NOT NULL,
 stats TEXT NOT NULL,awards TEXT NOT NULL DEFAULT '[]',created_at INTEGER NOT NULL,UNIQUE(career_id,season)
);
CREATE TABLE matches (
 id TEXT PRIMARY KEY,kind TEXT NOT NULL CHECK(kind IN('ONLINE','CAREER')),career_id TEXT REFERENCES careers(id),
 season INTEGER,fixture INTEGER,participants TEXT NOT NULL,score TEXT NOT NULL,events TEXT NOT NULL,stats TEXT NOT NULL,
 duration REAL NOT NULL,status TEXT NOT NULL CHECK(status IN('RUNNING','COMPLETED','ABANDONED')),created_at INTEGER NOT NULL,finished_at INTEGER
);
CREATE UNIQUE INDEX unique_career_fixture ON matches(career_id,season,fixture) WHERE status='COMPLETED';
CREATE TABLE accolades (
 id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),career_id TEXT REFERENCES careers(id),season INTEGER NOT NULL,
 club_id TEXT REFERENCES clubs(id),kind TEXT NOT NULL,code TEXT NOT NULL,name TEXT NOT NULL,details TEXT NOT NULL,created_at INTEGER NOT NULL,
 UNIQUE(user_id,career_id,season,code)
);
CREATE TABLE transfer_offers (
 id TEXT PRIMARY KEY,career_id TEXT NOT NULL REFERENCES careers(id),from_club TEXT NOT NULL REFERENCES clubs(id),
 to_club TEXT NOT NULL REFERENCES clubs(id),season INTEGER NOT NULL,status TEXT NOT NULL CHECK(status IN('PENDING','ACCEPTED','REJECTED','EXPIRED')),
 reason TEXT NOT NULL,expires_at INTEGER NOT NULL,created_at INTEGER NOT NULL
);
CREATE TABLE transfer_history (
 id TEXT PRIMARY KEY,career_id TEXT NOT NULL REFERENCES careers(id),from_club TEXT NOT NULL,to_club TEXT NOT NULL,season INTEGER NOT NULL,created_at INTEGER NOT NULL
);
CREATE TABLE admin_audit (
 id TEXT PRIMARY KEY,admin_id TEXT NOT NULL REFERENCES users(id),action TEXT NOT NULL,target_user_id TEXT NOT NULL REFERENCES users(id),
 previous_value TEXT NOT NULL,new_value TEXT NOT NULL,reason TEXT NOT NULL,created_at INTEGER NOT NULL
);
CREATE TABLE bans (
 id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),reason TEXT NOT NULL,created_by TEXT NOT NULL REFERENCES users(id),
 created_at INTEGER NOT NULL,expires_at INTEGER,active INTEGER NOT NULL DEFAULT 1 CHECK(active IN(0,1))
);
CREATE INDEX bans_user ON bans(user_id,active);
CREATE INDEX matches_career ON matches(career_id,season);
CREATE INDEX ledger_user ON gem_transactions(user_id,created_at);
