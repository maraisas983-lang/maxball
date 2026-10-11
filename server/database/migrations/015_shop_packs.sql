UPDATE shop_items SET rarity='COMMON' WHERE id='kit-6';
UPDATE shop_items SET rarity='LEGENDARY' WHERE id='kit-19';
UPDATE shop_items SET rarity='MAX' WHERE id IN ('kit-20','kit-21','effect-9');
CREATE TABLE skin_save_requests (
 user_id TEXT NOT NULL REFERENCES users(id),
 request_id TEXT NOT NULL,
 skin_id TEXT NOT NULL REFERENCES custom_skins(id),
 payload TEXT NOT NULL,
 result TEXT NOT NULL,
 PRIMARY KEY(user_id,request_id)
);
