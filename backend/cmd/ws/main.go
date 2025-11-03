package main

import (
	"net/http"

	"github.com/gorilla/websocket"
	"go.uber.org/zap"

	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/config"
	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/pubsub"
	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/transport/ws"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// TODO: Configure proper origin validation for production
		return true // Allow all origins in dev
	},
}

func main() {
	log, _ := zap.NewProduction()
	defer log.Sync()

	cfg, err := config.Load()
	if err != nil {
		log.Fatal("config load failed", zap.Error(err))
	}

	// Initialize pub/sub bus
	bus := pubsub.New()

	// Initialize WebSocket hub
	hub := ws.NewHub(bus, log)
	go hub.Run()

	log.Info("websocket hub started")

	// HTTP handler
	mux := http.NewServeMux()
	mux.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		serveWs(hub, w, r, []byte(cfg.JWTSecret), log)
	})

	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	})

	addr := ":" + cfg.WSPort
	srv := &http.Server{Addr: addr, Handler: mux}

	log.Info("ws server listening", zap.String("addr", addr))
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatal("ws server error", zap.Error(err))
	}
}

func serveWs(hub *ws.Hub, w http.ResponseWriter, r *http.Request, jwtSecret []byte, log *zap.Logger) {
	// Extract JWT token from query parameter or Authorization header
	token := r.URL.Query().Get("token")
	if token == "" {
		authHeader := r.Header.Get("Authorization")
		if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
			token = authHeader[7:]
		}
	}

	if token == "" {
		log.Warn("websocket connection rejected: missing token")
		http.Error(w, "Unauthorized: missing token", http.StatusUnauthorized)
		return
	}

	// Validate JWT
	claims, err := ws.ValidateToken(token, jwtSecret)
	if err != nil {
		log.Warn("websocket connection rejected: invalid token", zap.Error(err))
		http.Error(w, "Unauthorized: invalid token", http.StatusUnauthorized)
		return
	}

	// Upgrade connection
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Error("websocket upgrade failed", zap.Error(err))
		return
	}

	// Create client
	client := ws.NewClient(hub, conn, claims.UserID, claims.Role, log)

	// Register client and start pumps
	hub.Register(client)

	log.Info("client connected",
		zap.String("userId", claims.UserID),
		zap.String("role", claims.Role),
	)

	// Start read and write pumps
	go client.WritePump()
	go client.ReadPump()
}
