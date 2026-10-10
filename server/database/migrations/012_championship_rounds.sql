CREATE TABLE championship_rounds (
 id TEXT PRIMARY KEY,
 championship_id TEXT NOT NULL REFERENCES championships(id),
 number INTEGER NOT NULL CHECK(number>0),
 released_at INTEGER NOT NULL,
 deadline INTEGER NOT NULL,
 UNIQUE(championship_id,number)
);
CREATE TABLE championship_fixtures (
 id TEXT PRIMARY KEY,
 round_id TEXT NOT NULL REFERENCES championship_rounds(id),
 home_entry TEXT NOT NULL REFERENCES championship_entries(id),
 away_entry TEXT NOT NULL REFERENCES championship_entries(id),
 status TEXT NOT NULL DEFAULT 'NEGOTIATING' CHECK(status IN('NEGOTIATING','SCHEDULED','RUNNING','COMPLETED','WO','DOUBLE_WO','NO_AGREEMENT','INTERRUPTED','CANCELLED')),
 proposed_at INTEGER,
 proposal_version INTEGER NOT NULL DEFAULT 0,
 scheduled_at INTEGER,
 room_id TEXT,
 match_id TEXT REFERENCES matches(id),
 score TEXT,
 winner INTEGER CHECK(winner IN(0,1)),
 reason TEXT,
 updated_at INTEGER NOT NULL,
 CHECK(home_entry<>away_entry),
 UNIQUE(round_id,home_entry,away_entry)
);
CREATE INDEX championship_fixture_status ON championship_fixtures(status,scheduled_at);
CREATE TABLE championship_checkins (
 fixture_id TEXT NOT NULL REFERENCES championship_fixtures(id),
 user_id TEXT NOT NULL REFERENCES users(id),
 checked_at INTEGER NOT NULL,
 PRIMARY KEY(fixture_id,user_id)
);
