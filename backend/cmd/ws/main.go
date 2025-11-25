package main

import (
	"context"
	"net/http"

	"github.com/gorilla/websocket"
	"go.uber.org/zap"

	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/config"
	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/platform/jwt" // <— NEW
	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/pubsub"
	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/repository/postgres"
	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/service"
	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/transport/ws"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// TODO: tighten this for prod
		return true
	},
}

func main() {
	log, _ := zap.NewProduction()
	defer log.Sync()

	cfg, err := config.Load()
	if err != nil {
		log.Fatal("config load failed", zap.Error(err))
	}

	// pub/sub
	bus := pubsub.New()

	// hub
	hub := ws.NewHub(bus, log)
	go hub.Run()
	log.Info("websocket hub started")

	// DB + agent service
	ctx := context.Background()

	pool, err := postgres.NewPool(ctx, cfg.DBDSN)
	if err != nil {
		log.Warn("db connection failed, agent/chat will not work", zap.Error(err))
	} else {
		defer pool.Close()

		// choose AI key
		apiKey := cfg.OpenAIKey
		if cfg.GeminiKey != "" {
			apiKey = cfg.GeminiKey
		}
		if apiKey == "" {
			log.Warn("No API key configured (OPENAI_API_KEY or GEMINI_API_KEY)")
		} else {
			masked := apiKey
			if len(apiKey) > 10 {
				masked = apiKey[:10] + "..." + apiKey[len(apiKey)-4:]
			}
			log.Info("API key loaded for Gemini", zap.String("key_preview", masked))
		}

		listingsRepo := postgres.NewListingRepo(pool)
		imagesRepo := postgres.NewImageRepo(pool)

		agentSvc := service.NewAgentServiceFull(
			apiKey,
			listingsRepo,
			imagesRepo,
			nil,
			cfg.PresignExpiry,
			log,
		)

		go startAgentWorker(bus, agentSvc, log)
		go startChatWorker(bus, agentSvc, log)

		log.Info("agent & chat workers started")
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		serveWs(hub, w, r, []byte(cfg.JWTSecret), log)
	})
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	addr := ":" + cfg.WSPort
	srv := &http.Server{Addr: addr, Handler: mux}

	log.Info("ws server listening", zap.String("addr", addr))
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatal("ws server error", zap.Error(err))
	}
}

// --- AUTHENTICATED WEBSOCKET UPGRADE ---

func serveWs(hub *ws.Hub, w http.ResponseWriter, r *http.Request, jwtSecret []byte, log *zap.Logger) {
	tokenStr := r.URL.Query().Get("token")
	if tokenStr == "" {
		http.Error(w, "missing token", http.StatusUnauthorized)
		return
	}

	// Validate JWT
	claims, err := jwt.ParseAndValidate(string(jwtSecret), tokenStr)
	if err != nil {
		log.Warn("WS auth failed", zap.Error(err))
		http.Error(w, "invalid token", http.StatusUnauthorized)
		return
	}

	userID := claims.Sub
	role := claims.Role

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Error("ws upgrade failed", zap.Error(err))
		return
	}

	client := ws.NewClient(hub, conn, userID, role, log)
	hub.RegisterClient(client)

	log.Info("client connected",
		zap.String("userId", userID),
		zap.String("role", role),
	)

	go client.WritePump()
	go client.ReadPump()
}

// --- WORKERS ---

func startAgentWorker(bus *pubsub.Bus, agentService *service.AgentService, log *zap.Logger) {
	ch := bus.Subscribe("agent.request")
	for msg := range ch {
		go handleAgentRequest(context.Background(), msg, agentService, bus, log)
	}
}

func startChatWorker(bus *pubsub.Bus, agentService *service.AgentService, log *zap.Logger) {
	ch := bus.Subscribe("chat.request")
	for msg := range ch {
		go handleChatRequest(context.Background(), msg, agentService, bus, log)
	}
}

func handleAgentRequest(ctx context.Context, msg pubsub.Message, agentService *service.AgentService, bus *pubsub.Bus, log *zap.Logger) {
	req, ok := msg.Payload.(pubsub.AgentRequest)
	if !ok {
		log.Error("invalid agent request payload")
		return
	}

	log.Info("processing agent request",
		zap.String("userId", req.UserID),
		zap.String("requestId", req.RequestID),
		zap.String("query", req.Query),
	)

	answer, results, err := agentService.ProcessQuery(ctx, req.Query)
	if err != nil {
		log.Error("failed to process query", zap.Error(err), zap.String("requestId", req.RequestID))
		answer = "Sorry, I encountered an error processing your request. Please try again."
		results = []pubsub.ListingInfo{}
	}

	bus.Publish("agent.response", pubsub.AgentResponse{
		UserID:    req.UserID,
		RequestID: req.RequestID,
		Answer:    answer,
		Results:   results,
	})
}

func handleChatRequest(ctx context.Context, msg pubsub.Message, agent *service.AgentService, bus *pubsub.Bus, log *zap.Logger) {
	req, ok := msg.Payload.(pubsub.ChatRequest)
	if !ok {
		log.Error("invalid chat request payload")
		return
	}

	log.Info("processing chat request",
		zap.String("userId", req.UserID),
		zap.String("requestId", req.RequestID),
		zap.String("text", req.Text),
	)

	answer, results, err := agent.ProcessChat(ctx, req.Text)
	if err != nil {
		log.Error("chat processing failed", zap.Error(err), zap.String("requestId", req.RequestID))
		answer = "Sorry, I had trouble with that. Try rephrasing?"
		results = nil
	}

	bus.Publish("chat.response", pubsub.ChatResponse{
		UserID:    req.UserID,
		RequestID: req.RequestID,
		Answer:    answer,
		Results:   results,
	})
}
