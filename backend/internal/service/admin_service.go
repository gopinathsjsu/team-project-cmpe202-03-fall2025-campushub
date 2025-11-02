package service

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type AdminRepo interface {
	CountListings(ctx context.Context) (int, error)
	CountUsers(ctx context.Context) (int, error)
	CountReportsByStatus(ctx context.Context) (open, reviewing, resolved, dismissed int, err error)
	ListUsers(ctx context.Context, limit, offset int) ([]AdminUserRow, int, error)
	ForceRemoveListing(ctx context.Context, listingID uuid.UUID) error
}

type AdminUserRow struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	Role      string    `json:"role"`
	CreatedAt time.Time `json:"createdAt"`
}

type AdminService struct{ repo AdminRepo }

func NewAdminService(r AdminRepo) *AdminService { return &AdminService{repo: r} }

type Metrics struct {
	Listings int `json:"listings"`
	Users    int `json:"users"`
	Reports  struct {
		Open      int `json:"open"`
		Reviewing int `json:"reviewing"`
		Resolved  int `json:"resolved"`
		Dismissed int `json:"dismissed"`
	} `json:"reports"`
}

func (s *AdminService) Metrics(ctx context.Context) (Metrics, error) {
	var m Metrics
	var err error
	if m.Listings, err = s.repo.CountListings(ctx); err != nil {
		return m, err
	}
	if m.Users, err = s.repo.CountUsers(ctx); err != nil {
		return m, err
	}
	m.Reports.Open, m.Reports.Reviewing, m.Reports.Resolved, m.Reports.Dismissed, err = s.repo.CountReportsByStatus(ctx)
	return m, err
}

func (s *AdminService) Users(ctx context.Context, limit, offset int) ([]AdminUserRow, int, error) {
	return s.repo.ListUsers(ctx, limit, offset)
}

func (s *AdminService) ForceRemoveListing(ctx context.Context, id uuid.UUID) error {
	return s.repo.ForceRemoveListing(ctx, id)
}
