package main

import (
	"time"

	"go.uber.org/zap"

	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/config"
)

func main() {

	log, _ := zap.NewProduction()
	defer log.Sync()

	// Load config
	_, err := config.Load()
	if err != nil {
		log.Fatal("config load failed", zap.Error(err))
	}

	// Worker logic here (e.g., processing jobs from a queue)
	log.Info("worker started: idle (add thumbnail/cleanup jobs here)")
	for {
		time.Sleep(30 * time.Second)
		log.Info("worker heartbeat")
	}
}
