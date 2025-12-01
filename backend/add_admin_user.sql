-- Quick script to add admin user: devenjaimin.desai@sjsu.edu
-- Password: Deven@12345
-- Run this with: psql -U postgres -d campus -f add_admin_user.sql
-- Or via docker: docker compose -f build/docker-compose.dev.yml exec -T db psql -U postgres -d campus -f /path/to/add_admin_user.sql

INSERT INTO users (id, name, email, role, password_hash) VALUES
('99999999-9999-9999-9999-999999999999', 'Deven Desai', 'devenjaimin.desai@sjsu.edu', 'admin', '$2a$10$QtPsExmjn3F81w9mgjNPI./g/gB0g7W.aKReT21eBsUL8T09OoxIC')
ON CONFLICT (email) DO UPDATE
SET password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role;

