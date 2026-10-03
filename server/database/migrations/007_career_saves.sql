-- migration: foreign_keys=off
CREATE TABLE careers_next (
 id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),player_id TEXT NOT NULL REFERENCES profiles(id),
 club_id TEXT NOT NULL REFERENCES clubs(id),season INTEGER NOT NULL DEFAULT 1,reputation REAL NOT NULL DEFAULT 0,
 stats TEXT NOT NULL,created_at INTEGER NOT NULL,save_name TEXT NOT NULL,player_name TEXT NOT NULL,
 shirt_number INTEGER NOT NULL,money INTEGER NOT NULL DEFAULT 0,roster TEXT NOT NULL DEFAULT '[]',
 progression TEXT NOT NULL DEFAULT '{}',config TEXT NOT NULL DEFAULT '{}',last_access INTEGER NOT NULL
);
INSERT INTO careers_next SELECT c.*,p.shirt_name,p.shirt_name,p.shirt_number,0,'[]','{}','{}',c.created_at FROM careers c JOIN profiles p ON p.id=c.player_id;
DROP TABLE careers;
ALTER TABLE careers_next RENAME TO careers;
CREATE INDEX careers_owner ON careers(user_id,last_access);
CREATE TABLE active_career(user_id TEXT PRIMARY KEY REFERENCES users(id),career_id TEXT NOT NULL REFERENCES careers(id));
INSERT INTO active_career SELECT user_id,id FROM careers;
