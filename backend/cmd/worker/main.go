package main

import (
	"context"

	"go.uber.org/zap"

	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/config"
	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/pubsub"
	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/repository/postgres"
	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/service"
)

func main() {
	log, _ := zap.NewProduction()
	defer log.Sync()

	cfg, err := config.Load()
	if err != nil {
		log.Fatal("config load failed", zap.Error(err))
	}

	apiKey := cfg.OpenAIKey
	if cfg.GeminiKey != "" {
		apiKey = cfg.GeminiKey
	}

	if apiKey == "" {
		log.Fatal("GEMINI_API_KEY or OPENAI_API_KEY is required")
	}

	// Only show first 10 chars for security
	maskedKey := apiKey
	if len(apiKey) > 10 {
		maskedKey = apiKey[:10] + "..." + apiKey[len(apiKey)-4:]
	}
	log.Info("API key loaded for Gemini", zap.String("key_preview", maskedKey))

	ctx := context.Background()

	pool, err := postgres.NewPool(ctx, cfg.DBDSN)
	if err != nil {
		log.Fatal("db connect failed", zap.Error(err))
	}
	defer pool.Close()

	// Initialize repositories
	listingsRepo := postgres.NewListingRepo(pool)

	// Initialize agent service
	agentService := service.NewAgentService(apiKey, listingsRepo, log)

	// Initialize pub/sub bus (shared with WS server via external broker in production)
	// For now, this is a separate in-memory bus - in production, use Redis/NATS
	bus := pubsub.New()

	log.Info("agent worker started, waiting for requests...")

	// Subscribe to agent requests
	requestChan := bus.Subscribe("agent.request")

	// Process requests
	for msg := range requestChan {
		go handleAgentRequest(ctx, msg, agentService, bus, log)
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

	// Process query with ChatGPT and DB search
	answer, results, err := agentService.ProcessQuery(ctx, req.Query)
	if err != nil {
		log.Error("failed to process query",
			zap.Error(err),
			zap.String("requestId", req.RequestID),
		)
		// Send error response
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
