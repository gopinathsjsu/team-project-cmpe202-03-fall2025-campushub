package main

import (
	"context"
	"net/http"
	"time"

	"go.uber.org/zap"
	"nhooyr.io/websocket"
	"nhooyr.io/websocket/wsjson"

	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/config"
)

func main() {
	log, _ := zap.NewProduction()
	defer log.Sync()

	cfg, err := config.Load()
	if err != nil {
		log.Fatal("config load failed", zap.Error(err))
	}

	mux := http.NewServeMux()

	// simple echo handler (placeholder for chat hub)
	mux.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		c, err := websocket.Accept(w, r, &websocket.AcceptOptions{InsecureSkipVerify: true})
		if err != nil {
			return
		}
		defer c.Close(websocket.StatusNormalClosure, "bye")

		ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
		defer cancel()

		var msg map[string]any
		if err := wsjson.Read(ctx, c, &msg); err == nil {
			_ = wsjson.Write(ctx, c, map[string]any{"type": "echo", "payload": msg})
		}
	})

	addr := ":" + cfg.WSPort
	srv := &http.Server{Addr: addr, Handler: mux}

	go func() {
		log.Info("ws listening", zap.String("addr", addr))
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal("ws server error", zap.Error(err))
		}
	}()

	// simple block (ctrl+c to stop)
	select {}
}
