CREATE TABLE external_sessions(token_hash TEXT PRIMARY KEY REFERENCES sessions(token_hash) ON DELETE CASCADE,access_token TEXT NOT NULL,refresh_token TEXT NOT NULL);
