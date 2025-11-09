package pubsub

// AgentRequest represents a request to the AI agent
type AgentRequest struct {
	UserID    string `json:"userId"`
	RequestID string `json:"requestId"`
	Query     string `json:"query"`
}

// AgentResponse represents a response from the AI agent
type AgentResponse struct {
	UserID    string        `json:"userId"`
	RequestID string        `json:"requestId"`
	Answer    string        `json:"answer"`
	Results   []ListingInfo `json:"results"`
}

// ListingInfo contains minimal listing data for agent responses
type ListingInfo struct {
	ID       string  `json:"id"`
	Title    string  `json:"title"`
	Category string  `json:"category"`
	Price    float64 `json:"price"`
}
