package pubsub

type AgentRequest struct {
	UserID    string `json:"userId"`
	RequestID string `json:"requestId"`
	Query     string `json:"query"`
}

type AgentResponse struct {
	UserID    string        `json:"userId"`
	RequestID string        `json:"requestId"`
	Answer    string        `json:"answer"`
	Results   []ListingInfo `json:"results"`
}

type ChatRequest struct {
	UserID    string `json:"userId"`
	RequestID string `json:"requestId"`
	Text      string `json:"text"`
}

type ChatResponse struct {
	UserID    string        `json:"userId"`
	RequestID string        `json:"requestId"`
	Answer    string        `json:"answer"`
	Results   []ListingInfo `json:"results,omitempty"`
}

type PrimaryImage struct {
	Key string `json:"key"`
	URL string `json:"url"`
}

type ListingInfo struct {
	ID           string        `json:"id"`
	SellerID     string        `json:"sellerId"`
	Title        string        `json:"title"`
	Description  string        `json:"description"`
	Category     string        `json:"category"`
	Price        float64       `json:"price"`
	Condition    string        `json:"condition"`
	Status       string        `json:"status"`
	CreatedAt    string        `json:"createdAt"`
	UpdatedAt    string        `json:"updatedAt"`
	PrimaryImage *PrimaryImage `json:"primaryImage,omitempty"`
}
