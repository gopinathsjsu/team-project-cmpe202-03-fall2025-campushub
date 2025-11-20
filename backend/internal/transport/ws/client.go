package ws

import (
	"encoding/json"
	"strings"
	"time"

	"github.com/gorilla/websocket"
	"go.uber.org/zap"
)

const (
	// Time allowed to write a message to the peer
	writeWait = 10 * time.Second

	// Time allowed to read the next pong message from the peer
	pongWait = 60 * time.Second

	// Send pings to peer with this period (must be less than pongWait)
	pingPeriod = (pongWait * 9) / 10

	// Maximum message size allowed from peer
	maxMessageSize = 512 * 1024 // 512KB
)

// Client represents a single websocket connection
type Client struct {
	hub    *Hub
	conn   *websocket.Conn
	send   chan []byte
	userID string
	role   string
	logger *zap.Logger
}

// NewClient creates a new websocket client
func NewClient(hub *Hub, conn *websocket.Conn, userID, role string, logger *zap.Logger) *Client {
	return &Client{
		hub:    hub,
		conn:   conn,
		send:   make(chan []byte, 256),
		userID: userID,
		role:   role,
		logger: logger,
	}
}

// ReadPump reads messages from the websocket connection
func (c *Client) ReadPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		var event Event
		err := c.conn.ReadJSON(&event)
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				c.logger.Error("websocket read error", zap.Error(err))
			}
			break
		}

		c.handleEvent(event)
	}
}

// WritePump writes messages to the websocket connection
func (c *Client) WritePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// Hub closed the channel
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			err := c.conn.WriteMessage(websocket.TextMessage, message)
			if err != nil {
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// handleChatMessage handles free-form chat requests (small talk + product search)
func (c *Client) handleChatMessage(event Event) {
	var payload ChatMessagePayload
	if err := json.Unmarshal(event.Payload, &payload); err != nil {
		c.sendError(event.RequestID, "invalid payload", "INVALID_PAYLOAD")
		return
	}
	if strings.TrimSpace(payload.Text) == "" {
		c.sendError(event.RequestID, "text is required", "MISSING_TEXT")
		return
	}

	// Publish to pubsub bus for chat worker to process
	c.hub.publishChatRequest(c.userID, event.RequestID, payload.Text)
}

func (c *Client) handleEvent(event Event) {
	c.logger.Debug("received event",
		zap.String("type", event.Type),
		zap.String("requestId", event.RequestID),
		zap.String("userId", c.userID),
	)

	switch event.Type {
	case EventTypeAgentSearch:
		c.handleAgentSearch(event)

	// ✅ NEW: free-form chat message
	case EventTypeChatMessage:
		c.handleChatMessage(event)

	default:
		c.sendError(event.RequestID, "unknown event type", "UNKNOWN_EVENT")
	}
}

// handleAgentSearch handles agent search requests
func (c *Client) handleAgentSearch(event Event) {
	var payload AgentSearchPayload
	if err := json.Unmarshal(event.Payload, &payload); err != nil {
		c.sendError(event.RequestID, "invalid payload", "INVALID_PAYLOAD")
		return
	}

	if payload.Query == "" {
		c.sendError(event.RequestID, "query is required", "MISSING_QUERY")
		return
	}

	// Publish to pubsub bus for worker to process
	c.hub.publishAgentRequest(c.userID, event.RequestID, payload.Query)
}

// sendError sends an error message to the client
func (c *Client) sendError(requestID, message, code string) {
	errorEvent, err := NewErrorEvent(requestID, message, code)
	if err != nil {
		c.logger.Error("failed to create error event", zap.Error(err))
		return
	}

	select {
	case c.send <- errorEvent:
	default:
		c.logger.Warn("client send buffer full, dropping error message")
	}
}
