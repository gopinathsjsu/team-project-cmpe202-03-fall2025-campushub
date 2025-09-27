package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/domain"
)

type ImageRepo interface {
	Add(ctx context.Context, in AddImage) (domain.ListingImage, error)
	ListByListing(ctx context.Context, listingID uuid.UUID) ([]domain.ListingImage, error)
	SetPrimary(ctx context.Context, listingID, imageID uuid.UUID) error
	Delete(ctx context.Context, imageID uuid.UUID) error
}

type AddImage struct {
	ListingID uuid.UUID
	S3Key     string
	IsPrimary bool
	Width     *int
	Height    *int
}
