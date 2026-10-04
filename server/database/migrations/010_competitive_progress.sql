ALTER TABLE profiles ADD COLUMN trophies INTEGER NOT NULL DEFAULT 0 CHECK(trophies>=0);
ALTER TABLE profiles ADD COLUMN ranked_reward_matches INTEGER NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN positions TEXT NOT NULL DEFAULT '[]';
CREATE TABLE ranked_progress (
 match_id TEXT NOT NULL REFERENCES ranked_matches(id),
 user_id TEXT NOT NULL REFERENCES users(id),
 trophies_before INTEGER NOT NULL,trophies_after INTEGER NOT NULL,
 gems INTEGER NOT NULL DEFAULT 0,mvp INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(match_id,user_id)
);
CREATE INDEX profiles_trophy_ranking ON profiles(trophies DESC,user_id);
