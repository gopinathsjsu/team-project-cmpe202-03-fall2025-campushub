package domain

import (
	"github.com/google/uuid"
	"time"
)

type Report struct {
	ID         uuid.UUID `json:"id"`
	ListingID  uuid.UUID `json:"listingId"`
	ReporterID uuid.UUID `json:"reporterId"`
	Reason     string    `json:"reason"`
	Status     string    `json:"status"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
}
