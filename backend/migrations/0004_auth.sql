CREATE TABLE IF NOT EXISTS users (
  id         UUID PRIMARY KEY,
  name       TEXT NOT NULL,
  email      CITEXT UNIQUE NOT NULL,
  role       TEXT NOT NULL CHECK (role IN ('buyer','seller','admin')),
  password_hash TEXT NOT NULL, 
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
