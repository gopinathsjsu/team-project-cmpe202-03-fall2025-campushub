package main

import (
	"context"
	"net/http"

	"github.com/gorilla/websocket"
	"go.uber.org/zap"

	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/config"
	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/pubsub"
	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/repository/postgres"
	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/service"
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

	// Initialize DB and agent service for worker functionality
	ctx := context.Background()

	pool, err := postgres.NewPool(ctx, cfg.DBDSN)
	if err != nil {
		log.Warn("db connection failed, agent/chat workers will not run", zap.Error(err))
	} else {
		defer pool.Close()

		// Determine API key (prefer GeminiKey if present)
		apiKey := cfg.OpenAIKey
		if cfg.GeminiKey != "" {
			apiKey = cfg.GeminiKey
		}

		if apiKey == "" {
			log.Warn("No API key configured (OPENAI_API_KEY or GEMINI_API_KEY)")
		} else {
			// Only show first 10 chars for security
			maskedKey := apiKey
			if len(apiKey) > 10 {
				maskedKey = apiKey[:10] + "..." + apiKey[len(apiKey)-4:]
			}
			log.Info("API key loaded for LLM", zap.String("key_preview", maskedKey))
		}

		// Repositories
		listingsRepo := postgres.NewListingRepo(pool)
		imagesRepo := postgres.NewImageRepo(pool) // ensure this exists in your repo layer

		// Agent service: use the "Full" constructor so results can include primaryImage (S3 can be nil)
		// Pass nil for S3 for now; presigned URLs appear once you wire an s3client.Client.
		const presignExpiryMin = 15
		agentService := service.NewAgentServiceFull(apiKey, listingsRepo, imagesRepo, nil /* s3 */, presignExpiryMin, log)

		// Start workers (in-proc, same bus)
		go startAgentWorker(bus, agentService, log)
		go startChatWorker(bus, agentService, log)

		log.Info("agent and chat workers started")
	}

	// HTTP handler
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

func serveWs(hub *ws.Hub, w http.ResponseWriter, r *http.Request, jwtSecret []byte, log *zap.Logger) {
	// TEMPORARY: Skip JWT validation for testing
	// TODO: Re-enable authentication before production (parse ?token=, verify, set userID/role from claims)

	// Upgrade connection without auth
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Error("websocket upgrade failed", zap.Error(err))
		return
	}

	// Create client with test user
	testUserID := "test-user-" + r.RemoteAddr
	testRole := "buyer"
	client := ws.NewClient(hub, conn, testUserID, testRole, log)

	// Register client and start pumps
	hub.RegisterClient(client)

	log.Info("client connected (no auth)",
		zap.String("userId", testUserID),
		zap.String("role", testRole),
	)

	// Start read and write pumps
	go client.WritePump()
	go client.ReadPump()
}

// ===== Workers =====

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

	// Process query with LLM (if configured) + DB search
	answer, results, err := agentService.ProcessQuery(ctx, req.Query)
	if err != nil {
		log.Error("failed to process agent query",
			zap.Error(err),
			zap.String("requestId", req.RequestID),
		)
		answer = "Sorry, I encountered an error processing your request. Please try again."
		results = []pubsub.ListingInfo{}
	}

	// Publish response
	response := pubsub.AgentResponse{
		UserID:    req.UserID,
		RequestID: req.RequestID,
		Answer:    answer,
		Results:   results,
	}
	bus.Publish("agent.response", response)

	log.Info("agent response published",
		zap.String("userId", req.UserID),
		zap.String("requestId", req.RequestID),
		zap.Int("resultCount", len(results)),
	)
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
	)

	answer, results, err := agent.ProcessChat(ctx, req.Text)
	if err != nil {
		log.Error("chat processing failed", zap.Error(err), zap.String("requestId", req.RequestID))
		answer = "Sorry, I had trouble with that. Try rephrasing?"
		results = nil
	}

	resp := pubsub.ChatResponse{
		UserID:    req.UserID,
		RequestID: req.RequestID,
		Answer:    answer,
		Results:   results,
	}
	bus.Publish("chat.response", resp)

	log.Info("chat response published",
		zap.String("userId", req.UserID),
		zap.String("requestId", req.RequestID),
		zap.Int("resultCount", len(results)),
	)
}
