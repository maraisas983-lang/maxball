ALTER TABLE users ADD COLUMN staff_role TEXT CHECK(staff_role IN ('OWNER','ADMIN','MODERATOR','SUPPORT'));
CREATE TABLE legal_consents (
 user_id TEXT NOT NULL REFERENCES users(id),terms_version TEXT NOT NULL,privacy_version TEXT NOT NULL,
 accepted_at INTEGER NOT NULL,PRIMARY KEY(user_id,terms_version,privacy_version)
);
CREATE TABLE pending_legal_consents (
 identity_hash TEXT NOT NULL,terms_version TEXT NOT NULL,privacy_version TEXT NOT NULL,accepted_at INTEGER NOT NULL,
 PRIMARY KEY(identity_hash,terms_version,privacy_version)
);
CREATE TABLE support_tickets (
 id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),category TEXT NOT NULL,
 subject TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'OPEN',priority TEXT NOT NULL DEFAULT 'NORMAL',
 assignee TEXT REFERENCES users(id),created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL
);
CREATE INDEX support_owner ON support_tickets(user_id,updated_at);
CREATE TABLE support_messages (
 id TEXT PRIMARY KEY,ticket_id TEXT NOT NULL REFERENCES support_tickets(id),actor_id TEXT NOT NULL REFERENCES users(id),
 body TEXT NOT NULL,created_at INTEGER NOT NULL
);
CREATE INDEX support_thread ON support_messages(ticket_id,created_at);
CREATE TABLE operations_log (
 id TEXT PRIMARY KEY,actor_id TEXT REFERENCES users(id),action TEXT NOT NULL,resource TEXT NOT NULL,
 result TEXT NOT NULL,metadata TEXT NOT NULL DEFAULT '{}',created_at INTEGER NOT NULL
);
CREATE INDEX operations_time ON operations_log(created_at);
CREATE TABLE server_settings (key TEXT PRIMARY KEY,value TEXT NOT NULL,updated_at INTEGER NOT NULL);
INSERT INTO server_settings VALUES('maintenance','false',0),('ranked_enabled','true',0),('announcement','""',0);
