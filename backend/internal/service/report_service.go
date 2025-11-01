package service

import (
	"context"

	"github.com/google/uuid"
	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/domain"
	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/repository"
)

type ReportService struct{ repo repository.ReportRepo }

func NewReportService(r repository.ReportRepo) *ReportService { return &ReportService{repo: r} }

type CreateReportCmd struct {
	ListingID  uuid.UUID
	ReporterID uuid.UUID
	Reason     string
}
type ListReportsQuery struct {
	Status        string
	Limit, Offset int
}

func (s *ReportService) Create(ctx context.Context, cmd CreateReportCmd) (domain.Report, error) {
	return s.repo.Create(ctx, cmd.ListingID, cmd.ReporterID, cmd.Reason)
}
func (s *ReportService) List(ctx context.Context, q ListReportsQuery) ([]domain.Report, int, error) {
	return s.repo.List(ctx, q.Status, q.Limit, q.Offset)
}
func (s *ReportService) UpdateStatus(ctx context.Context, id uuid.UUID, status string) (domain.Report, error) {
	return s.repo.UpdateStatus(ctx, id, status)
}
