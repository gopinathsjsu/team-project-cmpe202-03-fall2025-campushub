package ws

import (
	"fmt"

	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/pubsub"
	"go.uber.org/zap"
)

// Hub maintains active websocket connections and routes messages
type Hub struct {
	// Registered clients (userID -> client)
	clients map[string]*Client

	// Register requests from clients
	register chan *Client

	// Unregister requests from clients
	unregister chan *Client

	// Pub/sub bus for inter-service communication
	bus *pubsub.Bus

	// Logger
	logger *zap.Logger
}

// NewHub creates a new Hub
func NewHub(bus *pubsub.Bus, logger *zap.Logger) *Hub {
	return &Hub{
		clients:    make(map[string]*Client),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		bus:        bus,
		logger:     logger,
	}
}

// Run starts the hub's main loop
func (h *Hub) Run() {
	// Subscribe to agent responses for all users
	// Workers publish to "agent.response" topic
	responseChan := h.bus.Subscribe("agent.response")

	for {
		select {
		case client := <-h.register:
			h.clients[client.userID] = client
			h.logger.Info("client registered",
				zap.String("userId", client.userID),
				zap.Int("totalClients", len(h.clients)),
			)

		case client := <-h.unregister:
			if _, ok := h.clients[client.userID]; ok {
				delete(h.clients, client.userID)
				close(client.send)
				h.logger.Info("client unregistered",
					zap.String("userId", client.userID),
					zap.Int("totalClients", len(h.clients)),
				)
			}

		case msg := <-responseChan:
			// Route agent responses to the appropriate client
			h.handleAgentResponse(msg)
		}
	}
}

// handleAgentResponse routes agent responses to the correct client
func (h *Hub) handleAgentResponse(msg pubsub.Message) {
	response, ok := msg.Payload.(pubsub.AgentResponse)
	if !ok {
		h.logger.Error("invalid agent response payload")
		return
	}

	client, exists := h.clients[response.UserID]
	if !exists {
		h.logger.Warn("client not found for agent response",
			zap.String("userId", response.UserID),
		)
		return
	}

	// Convert pubsub listing info to WS listing info
	wsResults := make([]ListingInfo, len(response.Results))
	for i, r := range response.Results {
		wsResults[i] = ListingInfo{
			ID:       r.ID,
			Title:    r.Title,
			Category: r.Category,
			Price:    r.Price,
		}
	}

	payload := AgentResponsePayload{
		Answer:  response.Answer,
		Results: wsResults,
	}

	eventBytes, err := NewEvent(EventTypeAgentResponse, response.RequestID, payload)
	if err != nil {
		h.logger.Error("failed to create agent response event", zap.Error(err))
		return
	}

	select {
	case client.send <- eventBytes:
		h.logger.Debug("sent agent response to client",
			zap.String("userId", response.UserID),
			zap.String("requestId", response.RequestID),
		)
	default:
		h.logger.Warn("client send buffer full, dropping message",
			zap.String("userId", response.UserID),
		)
	}
}

// publishAgentRequest publishes an agent request to the pubsub bus
func (h *Hub) publishAgentRequest(userID, requestID, query string) {
	req := pubsub.AgentRequest{
		UserID:    userID,
		RequestID: requestID,
		Query:     query,
	}

	h.bus.Publish("agent.request", req)
	h.logger.Debug("published agent request",
		zap.String("userId", userID),
		zap.String("requestId", requestID),
		zap.String("query", query),
	)
}

// GetClientCount returns the number of connected clients
func (h *Hub) GetClientCount() int {
	return len(h.clients)
}

// BroadcastToUser sends a message to a specific user (if connected)
func (h *Hub) BroadcastToUser(userID string, message []byte) error {
	client, exists := h.clients[userID]
	if !exists {
		return fmt.Errorf("user not connected: %s", userID)
	}

	select {
	case client.send <- message:
		return nil
	default:
		return fmt.Errorf("client send buffer full for user: %s", userID)
	}
}

func (h *Hub) Register(c *Client) {
	h.register <- c
}

// Unregister removes a client.
func (h *Hub) Unregister(c *Client) {
	h.unregister <- c
}

// PublishAgentRequest lets callers submit an agent query via the bus.
func (h *Hub) PublishAgentRequest(userID, requestID, query string) {
	h.publishAgentRequest(userID, requestID, query)
}
