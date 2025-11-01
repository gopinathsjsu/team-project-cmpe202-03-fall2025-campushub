ALTER TABLE users
  ADD COLUMN password_hash TEXT NOT NULL,
  ADD CONSTRAINT users_password_hash_len
    CHECK (char_length(password_hash) BETWEEN 30 AND 200);
