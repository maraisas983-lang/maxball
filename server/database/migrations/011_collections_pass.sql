ALTER TABLE profiles ADD COLUMN nickname_changes INTEGER NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN ball_skin INTEGER NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN celebration INTEGER NOT NULL DEFAULT 0;
CREATE TABLE collection_settings(id INTEGER PRIMARY KEY CHECK(id=1),pack_price INTEGER NOT NULL DEFAULT 30,max_price INTEGER NOT NULL DEFAULT 150);
INSERT INTO collection_settings(id) VALUES(1);
CREATE TABLE pack_openings(user_id TEXT NOT NULL REFERENCES users(id),request_id TEXT NOT NULL,category TEXT NOT NULL,item_id TEXT NOT NULL REFERENCES shop_items(id),price INTEGER NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(user_id,request_id));
CREATE TABLE season_passes(user_id TEXT NOT NULL REFERENCES users(id),season TEXT NOT NULL,max_unlocked INTEGER NOT NULL DEFAULT 0,progress_start INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(user_id,season));
CREATE TABLE pass_claims(user_id TEXT NOT NULL REFERENCES users(id),season TEXT NOT NULL,track TEXT NOT NULL,tier INTEGER NOT NULL,item_id TEXT NOT NULL REFERENCES shop_items(id),PRIMARY KEY(user_id,season,track,tier));
