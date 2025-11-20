package ws

import "encoding/json"

// Event types
const (
	EventTypeAgentSearch   = "agent.search"   // existing structured search
	EventTypeAgentResponse = "agent.response" // existing structured response
	EventTypeChatMessage   = "chat.message"   // NEW: free-form chat input
	EventTypeChatResponse  = "chat.response"  // NEW: chat output (answer + optional results)
	EventTypeError         = "error"
)

type Event struct {
	Type      string          `json:"type"`
	RequestID string          `json:"requestId"`
	Payload   json.RawMessage `json:"payload"`
}

// -------- agent (unchanged) --------

type AgentSearchPayload struct {
	Query string `json:"query"`
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

type AgentResponsePayload struct {
	Answer  string        `json:"answer"`
	Results []ListingInfo `json:"results"`
}

// -------- chat (new) --------

type ChatMessagePayload struct {
	Text string `json:"text"`
}

type ChatResponsePayload struct {
	Answer  string        `json:"answer"`
	Results []ListingInfo `json:"results,omitempty"`
}

// -------- errors / helpers --------

type ErrorPayload struct {
	Message string `json:"message"`
	Code    string `json:"code,omitempty"`
}

func NewEvent(eventType, requestID string, payload interface{}) ([]byte, error) {
	b, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	ev := Event{Type: eventType, RequestID: requestID, Payload: b}
	return json.Marshal(ev)
}

func NewErrorEvent(requestID, message, code string) ([]byte, error) {
	return NewEvent(EventTypeError, requestID, ErrorPayload{Message: message, Code: code})
}
