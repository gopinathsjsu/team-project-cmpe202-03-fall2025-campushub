package domain

import (
	"time"

	"github.com/google/uuid"
)

type ListingStatus string

const (
	ListingActive  ListingStatus = "active"
	ListingSold    ListingStatus = "sold"
	ListingRemoved ListingStatus = "removed"
)

type Condition string

const (
	CondNew     Condition = "New"
	CondLikeNew Condition = "LikeNew"
	CondGood    Condition = "Good"
	CondFair    Condition = "Fair"
)

type Listing struct {
	ID          uuid.UUID     `json:"id"`
	SellerID    uuid.UUID     `json:"sellerId"`
	Title       string        `json:"title"`
	Description string        `json:"description"`
	Category    string        `json:"category"`
	Price       float64       `json:"price"`
	Condition   Condition     `json:"condition"`
	Status      ListingStatus `json:"status"`
	CreatedAt   time.Time     `json:"createdAt"`
	UpdatedAt   time.Time     `json:"updatedAt"`
}
