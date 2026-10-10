CREATE TABLE maxpass_seasons (
 id TEXT PRIMARY KEY, number INTEGER NOT NULL UNIQUE, name TEXT NOT NULL,
 starts_at INTEGER NOT NULL, ends_at INTEGER NOT NULL, gem_price INTEGER NOT NULL,
 cash_price INTEGER NOT NULL, levels TEXT NOT NULL, rewards TEXT NOT NULL,
 offer_id TEXT UNIQUE, checkout_url TEXT, cash_enabled INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE maxpass_progress (
 user_id TEXT NOT NULL REFERENCES users(id), season_id TEXT NOT NULL REFERENCES maxpass_seasons(id),
 xp INTEGER NOT NULL DEFAULT 0 CHECK(xp>=0), level INTEGER NOT NULL DEFAULT 0,
 plus INTEGER NOT NULL DEFAULT 0, purchased_at INTEGER, method TEXT,
 streak INTEGER NOT NULL DEFAULT 0, last_match_at INTEGER, PRIMARY KEY(user_id,season_id)
);
CREATE TABLE maxpass_claims (
 user_id TEXT NOT NULL, season_id TEXT NOT NULL, track TEXT NOT NULL, level INTEGER NOT NULL,
 reward TEXT NOT NULL, created_at INTEGER NOT NULL, revoked INTEGER NOT NULL DEFAULT 0, generation INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(user_id,season_id,track,level),
 FOREIGN KEY(user_id,season_id) REFERENCES maxpass_progress(user_id,season_id)
);
CREATE TABLE maxpass_matches (
 match_id TEXT NOT NULL REFERENCES matches(id), user_id TEXT NOT NULL REFERENCES users(id),
 season_id TEXT NOT NULL REFERENCES maxpass_seasons(id), xp INTEGER NOT NULL,
 result TEXT NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY(match_id,user_id)
);
CREATE INDEX maxpass_match_daily ON maxpass_matches(user_id,created_at);
CREATE TABLE maxpass_objectives (
 user_id TEXT NOT NULL, season_id TEXT NOT NULL, period TEXT NOT NULL, code TEXT NOT NULL,
 progress INTEGER NOT NULL DEFAULT 0, awarded INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(user_id,season_id,period,code),
 FOREIGN KEY(user_id,season_id) REFERENCES maxpass_progress(user_id,season_id)
);
CREATE TABLE maxpass_cosmetics (
 user_id TEXT NOT NULL REFERENCES users(id), id TEXT NOT NULL, kind TEXT NOT NULL,
 name TEXT NOT NULL, color TEXT NOT NULL, season_id TEXT NOT NULL REFERENCES maxpass_seasons(id),
 acquired_at INTEGER NOT NULL, PRIMARY KEY(user_id,id)
);
CREATE TABLE maxpass_checkouts (
 user_id TEXT NOT NULL REFERENCES users(id), season_id TEXT NOT NULL REFERENCES maxpass_seasons(id),
 created_at INTEGER NOT NULL, PRIMARY KEY(user_id,season_id)
);
CREATE TABLE maxpass_orders (
 provider_id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
 season_id TEXT NOT NULL REFERENCES maxpass_seasons(id), amount_cents INTEGER NOT NULL,
 status TEXT NOT NULL, activated INTEGER NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
ALTER TABLE profiles ADD COLUMN pass_title TEXT;
ALTER TABLE profiles ADD COLUMN pass_frame TEXT;
