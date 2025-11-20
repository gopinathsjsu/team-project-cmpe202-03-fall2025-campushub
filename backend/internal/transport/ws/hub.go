package ws

import (
	"fmt"

	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/pubsub"
	"go.uber.org/zap"
)

type Hub struct {
	clients    map[string]*Client
	register   chan *Client
	unregister chan *Client
	bus        *pubsub.Bus
	logger     *zap.Logger
}

func NewHub(bus *pubsub.Bus, logger *zap.Logger) *Hub {
	return &Hub{
		clients:    make(map[string]*Client),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		bus:        bus,
		logger:     logger,
	}
}

func (h *Hub) RegisterClient(client *Client) { h.register <- client }

func (h *Hub) Run() {
	agentRespChan := h.bus.Subscribe("agent.response")
	chatRespChan := h.bus.Subscribe("chat.response") // NEW

	for {
		select {
		case c := <-h.register:
			h.clients[c.userID] = c
			h.logger.Info("client registered", zap.String("userId", c.userID), zap.Int("totalClients", len(h.clients)))

		case c := <-h.unregister:
			if _, ok := h.clients[c.userID]; ok {
				delete(h.clients, c.userID)
				close(c.send)
				h.logger.Info("client unregistered", zap.String("userId", c.userID), zap.Int("totalClients", len(h.clients)))
			}

		case msg := <-agentRespChan:
			h.handleAgentResponse(msg)

		case msg := <-chatRespChan:
			h.handleChatResponse(msg) // NEW
		}
	}
}

func (h *Hub) handleAgentResponse(msg pubsub.Message) {
	res, ok := msg.Payload.(pubsub.AgentResponse)
	if !ok {
		h.logger.Error("invalid agent response payload")
		return
	}
	client, ok := h.clients[res.UserID]
	if !ok {
		h.logger.Warn("client not found for agent response", zap.String("userId", res.UserID))
		return
	}
	wsResults := make([]ListingInfo, len(res.Results))
	for i, r := range res.Results {
		wsResults[i] = convertListing(r)
	}
	payload := AgentResponsePayload{Answer: res.Answer, Results: wsResults}
	ev, err := NewEvent(EventTypeAgentResponse, res.RequestID, payload)
	if err != nil {
		h.logger.Error("marshal agent response failed", zap.Error(err))
		return
	}
	select {
	case client.send <- ev:
	default:
		h.logger.Warn("client send buffer full, dropping agent response", zap.String("userId", res.UserID))
	}
}

// NEW
func (h *Hub) handleChatResponse(msg pubsub.Message) {
	res, ok := msg.Payload.(pubsub.ChatResponse)
	if !ok {
		h.logger.Error("invalid chat response payload")
		return
	}
	client, ok := h.clients[res.UserID]
	if !ok {
		h.logger.Warn("client not found for chat response", zap.String("userId", res.UserID))
		return
	}
	wsResults := make([]ListingInfo, len(res.Results))
	for i, r := range res.Results {
		wsResults[i] = convertListing(r)
	}
	payload := ChatResponsePayload{Answer: res.Answer, Results: wsResults}
	ev, err := NewEvent(EventTypeChatResponse, res.RequestID, payload)
	if err != nil {
		h.logger.Error("marshal chat response failed", zap.Error(err))
		return
	}
	select {
	case client.send <- ev:
	default:
		h.logger.Warn("client send buffer full, dropping chat response", zap.String("userId", res.UserID))
	}
}

func convertListing(r pubsub.ListingInfo) ListingInfo {
	var pi *PrimaryImage
	if r.PrimaryImage != nil {
		pi = &PrimaryImage{Key: r.PrimaryImage.Key, URL: r.PrimaryImage.URL}
	}
	return ListingInfo{
		ID: r.ID, SellerID: r.SellerID, Title: r.Title, Description: r.Description,
		Category: r.Category, Price: r.Price, Condition: r.Condition, Status: r.Status,
		CreatedAt: r.CreatedAt, UpdatedAt: r.UpdatedAt, PrimaryImage: pi,
	}
}

// publishAgentRequest (existing)
func (h *Hub) publishAgentRequest(userID, requestID, query string) {
	req := pubsub.AgentRequest{UserID: userID, RequestID: requestID, Query: query}
	h.bus.Publish("agent.request", req)
	h.logger.Debug("published agent request", zap.String("userId", userID), zap.String("requestId", requestID), zap.String("query", query))
}

// NEW: publish chat message
func (h *Hub) publishChatRequest(userID, requestID, text string) {
	req := pubsub.ChatRequest{UserID: userID, RequestID: requestID, Text: text}
	h.bus.Publish("chat.request", req)
	h.logger.Debug("published chat request", zap.String("userId", userID), zap.String("requestId", requestID), zap.String("text", text))
}

func (h *Hub) GetClientCount() int { return len(h.clients) }

func (h *Hub) BroadcastToUser(userID string, message []byte) error {
	c, ok := h.clients[userID]
	if !ok {
		return fmt.Errorf("user not connected: %s", userID)
	}
	select {
	case c.send <- message:
		return nil
	default:
		return fmt.Errorf("client send buffer full for user: %s", userID)
	}
}
