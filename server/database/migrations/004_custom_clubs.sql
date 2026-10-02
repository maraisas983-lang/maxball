CREATE TABLE custom_clubs (
 id TEXT PRIMARY KEY,owner_id TEXT NOT NULL REFERENCES users(id),name TEXT NOT NULL,
 primary_color TEXT NOT NULL,secondary_color TEXT NOT NULL,accent_color TEXT NOT NULL,
 kit_style TEXT NOT NULL,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL
);
CREATE INDEX custom_clubs_owner ON custom_clubs(owner_id);
