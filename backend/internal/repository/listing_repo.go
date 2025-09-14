package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/domain"
)

type ListParams struct {
	Q        string
	Category string
	PriceMin *float64
	PriceMax *float64
	Status   string // default "active"
	Limit    int    // default 20
	Offset   int
	Sort     string // created_desc | price_asc | price_desc
}

type ListingRepo interface {
	Create(ctx context.Context, in CreateListing) (domain.Listing, error)
	Get(ctx context.Context, id uuid.UUID) (domain.Listing, error)
	List(ctx context.Context, p ListParams) ([]domain.Listing, int, error)
	UpdatePartial(ctx context.Context, id uuid.UUID, patch UpdateListing) (domain.Listing, error)
	MarkSold(ctx context.Context, id uuid.UUID) error
	SoftDelete(ctx context.Context, id uuid.UUID) error
}

type CreateListing struct {
	SellerID    uuid.UUID
	Title       string
	Description string
	Category    string
	Price       float64
	Condition   domain.Condition
}

type UpdateListing struct {
	Title       *string
	Description *string
	Category    *string
	Price       *float64
	Condition   *domain.Condition
	Status      *domain.ListingStatus
}
