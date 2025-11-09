package ws

import (
	"encoding/json"
)

// EventType constants
const (
	EventTypeAgentSearch   = "agent.search"
	EventTypeAgentResponse = "agent.response"
	EventTypeError         = "error"
)

// Event is the base structure for all WebSocket messages
type Event struct {
	Type      string          `json:"type"`
	RequestID string          `json:"requestId"`
	Payload   json.RawMessage `json:"payload"`
}

// AgentSearchPayload is sent by clients to search listings via AI
type AgentSearchPayload struct {
	Query string `json:"query"`
}

// AgentResponsePayload is sent to clients with search results
type AgentResponsePayload struct {
	Answer  string        `json:"answer"`
	Results []ListingInfo `json:"results"`
}

// ListingInfo contains minimal listing data
type ListingInfo struct {
	ID       string  `json:"id"`
	Title    string  `json:"title"`
	Category string  `json:"category"`
	Price    float64 `json:"price"`
}

// ErrorPayload is sent when an error occurs
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

// NewErrorEvent creates an error event
func NewErrorEvent(requestID, message, code string) ([]byte, error) {
	return NewEvent(EventTypeError, requestID, ErrorPayload{
		Message: message,
		Code:    code,
	})
}
