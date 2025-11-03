package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/domain"
)

type AuthRepo interface {
	CreateUser(ctx context.Context, name, email, role, passwordHash string) (domain.User, error)
	GetByEmail(ctx context.Context, email string) (domain.User, string /*hash*/, error)
	GetByID(ctx context.Context, id uuid.UUID) (domain.User, error)
}
