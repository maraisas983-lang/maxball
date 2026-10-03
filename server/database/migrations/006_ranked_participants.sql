CREATE TABLE ranked_participants (
 match_id TEXT NOT NULL REFERENCES ranked_matches(id),user_id TEXT NOT NULL REFERENCES users(id),
 team INTEGER NOT NULL CHECK(team IN(0,1)),rating_before INTEGER NOT NULL,rating_after INTEGER,
 PRIMARY KEY(match_id,user_id)
);
INSERT INTO ranked_participants SELECT id,home_id,0,home_before,home_after FROM ranked_matches;
INSERT INTO ranked_participants SELECT id,away_id,1,away_before,away_after FROM ranked_matches;
