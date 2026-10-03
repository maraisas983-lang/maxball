CREATE TABLE verified_emails(user_id TEXT PRIMARY KEY REFERENCES users(id),email TEXT NOT NULL UNIQUE);
CREATE TABLE payment_settings(id INTEGER PRIMARY KEY CHECK(id=1),config TEXT NOT NULL);
CREATE TABLE gem_orders(provider_id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),offer_id TEXT NOT NULL,gems INTEGER NOT NULL,amount_cents INTEGER NOT NULL,status TEXT NOT NULL CHECK(status IN('PAID','REFUNDED','CHARGEBACK')),created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL);
CREATE TABLE gem_debts(user_id TEXT PRIMARY KEY REFERENCES users(id),amount INTEGER NOT NULL CHECK(amount>=0));
CREATE TABLE emote_slots(user_id TEXT NOT NULL REFERENCES users(id),slot INTEGER NOT NULL CHECK(slot BETWEEN 0 AND 3),item_id TEXT NOT NULL REFERENCES shop_items(id),PRIMARY KEY(user_id,slot));
CREATE TABLE chat_messages(id TEXT PRIMARY KEY,room_id TEXT NOT NULL,user_id TEXT REFERENCES users(id),name TEXT NOT NULL,body TEXT NOT NULL,kind TEXT NOT NULL,created_at INTEGER NOT NULL);
CREATE INDEX chat_room_time ON chat_messages(room_id,created_at);
CREATE TABLE chat_mutes(user_id TEXT NOT NULL REFERENCES users(id),target_id TEXT NOT NULL REFERENCES users(id),PRIMARY KEY(user_id,target_id));
