package postgres

import (
	"context"

	"github.com/google/uuid"
	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/domain"
	"github.com/jackc/pgx/v5/pgxpool"
)

type AuthRepoPG struct{ db *pgxpool.Pool }

func NewAuthRepo(db *pgxpool.Pool) *AuthRepoPG { return &AuthRepoPG{db} }

func (r *AuthRepoPG) CreateUser(ctx context.Context, name, email, role, passwordHash string) (domain.User, error) {
	id := uuid.New()
	_, err := r.db.Exec(ctx, `
		INSERT INTO users (id, name, email, role, password_hash)
		VALUES ($1,$2,$3,$4,$5)`, id, name, email, role, passwordHash)
	if err != nil {
		return domain.User{}, err
	}
	return r.GetByID(ctx, id)
}

func (r *AuthRepoPG) GetByEmail(ctx context.Context, email string) (domain.User, string, error) {
	var u domain.User
	var hash string
	err := r.db.QueryRow(ctx, `
		SELECT id, name, email, role, created_at, password_hash
		FROM users WHERE email=$1`, email).
		Scan(&u.ID, &u.Name, &u.Email, &u.Role, &u.CreatedAt, &hash)
	return u, hash, err
}

func (r *AuthRepoPG) GetByID(ctx context.Context, id uuid.UUID) (domain.User, error) {
	var u domain.User
	err := r.db.QueryRow(ctx, `
		SELECT id, name, email, role, created_at
		FROM users WHERE id=$1`, id).
		Scan(&u.ID, &u.Name, &u.Email, &u.Role, &u.CreatedAt)
	return u, err
}
