package ws

import (
	"encoding/json"
	"time"
)

// EventType constants
const (
	EventTypeAgentSearch   = "agent.search"
	EventTypeAgentResponse = "agent.response"

	// Chat / AI chat
	EventTypeChatMessage  = "chat.message"  // client -> server (AI chat text)
	EventTypeChatResponse = "chat.response" // server -> client (AI answer + results)

	// Optional: for user-to-user chat delivery
	EventTypeChatDeliver = "chat.deliver"

	EventTypeError = "error"
)

// Event is the base structure for all WebSocket messages
type Event struct {
	Type      string          `json:"type"`
	RequestID string          `json:"requestId"`
	Payload   json.RawMessage `json:"payload"`
}

// ---------- Incoming payloads from client ----------

// AgentSearchPayload is sent by clients to search listings via AI (product-only search)
type AgentSearchPayload struct {
	Query string `json:"query"`
}

// ChatMessagePayload is sent by clients for conversational AI chat
// Example:
// { "type": "chat.message", "requestId": "...", "payload": { "text": "Do you have a used textbook for CMPE 202?" } }
type ChatMessagePayload struct {
	ToUserID string `json:"toUserId"`
	Text     string `json:"text"`
}

type AgentResponsePayload struct {
	Answer  string        `json:"answer"`
	Results []ListingInfo `json:"results"`
}

type ChatResponsePayload struct {
	Answer  string        `json:"answer"`
	Results []ListingInfo `json:"results"`
}
type ChatDeliverPayload struct {
	FromUserID string    `json:"fromUserId"`
	Text       string    `json:"text"`
	SentAt     time.Time `json:"sentAt"`
}

type PrimaryImage struct {
	Key string `json:"key"`
	URL string `json:"url"`
}

// ListingInfo contains minimal listing data for WS messages.
// This mirrors pubsub.ListingInfo so Hub.convertListing can map fields directly.
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

// ---------- Errors ----------

type ErrorPayload struct {
	Message string `json:"message"`
	Code    string `json:"code,omitempty"`
}

// NewEvent creates a new event with the given type and payload
func NewEvent(eventType, requestID string, payload interface{}) ([]byte, error) {
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	event := Event{
		Type:      eventType,
		RequestID: requestID,
		Payload:   payloadBytes,
	}

	return json.Marshal(event)
}

func NewErrorEvent(requestID, message, code string) ([]byte, error) {
	return NewEvent(EventTypeError, requestID, ErrorPayload{
		Message: message,
		Code:    code,
	})
}
