ALTER TABLE users
  ADD COLUMN password_hash TEXT NOT NULL,
  ADD CONSTRAINT users_password_hash_len
    CHECK (char_length(password_hash) BETWEEN 30 AND 200);

INSERT INTO users (id, name, email, role, password_hash) VALUES
('99999999-9999-9999-9999-999999999999', 'Deven Desai', 'devenjaimin.desai@sjsu.edu', 'admin', '$2a$10$QtPsExmjn3F81w9mgjNPI./g/gB0g7W.aKReT21eBsUL8T09OoxIC')
ON CONFLICT (email) DO UPDATE
SET password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role;
