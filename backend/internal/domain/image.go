package domain

import (
	"time"

	"github.com/google/uuid"
)

type ListingImage struct {
	ID        uuid.UUID `json:"id"`
	ListingID uuid.UUID `json:"listingId"`
	S3Key     string    `json:"s3Key"`
	IsPrimary bool      `json:"isPrimary"`
	Width     *int      `json:"width,omitempty"`
	Height    *int      `json:"height,omitempty"`
	CreatedAt time.Time `json:"createdAt"`
}
