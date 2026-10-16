-- One row per answered chat request. question and answer are scrubbed of emails and phones before insert.
CREATE TABLE chats (
	id INTEGER PRIMARY KEY,
	session_id TEXT NOT NULL,
	created_at INTEGER NOT NULL,
	question TEXT NOT NULL,
	answer TEXT NOT NULL,
	citations TEXT NOT NULL
);
CREATE INDEX chats_created_at ON chats (created_at);
