package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/domain"
)

type ReportRepo interface {
	Create(ctx context.Context, listingID, reporterID uuid.UUID, reason string) (domain.Report, error)
	List(ctx context.Context, status string, limit, offset int) ([]domain.Report, int, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, status string) (domain.Report, error)
}
