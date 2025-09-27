package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"go.uber.org/zap"

	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/config"
	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/platform/s3client"
	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/repository/postgres"
	httpx "github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/transport/http"
)

func main() {
	log, _ := zap.NewProduction()
	defer log.Sync()

	cfg, err := config.Load()
	if err != nil {
		log.Fatal("config load failed", zap.Error(err))
	}

	ctx := context.Background()

	pool, err := postgres.NewPool(ctx, cfg.DBDSN)
	if err != nil {
		log.Fatal("db connect failed", zap.Error(err))
	}
	defer pool.Close()

	listingsRepo := postgres.NewListingRepo(pool)
	imagesRepo := postgres.NewImageRepo(pool)
	s3c, err := s3client.New(ctx, s3client.Opts{
		Region:         cfg.S3Region,
		Bucket:         cfg.S3Bucket,
		Endpoint:       cfg.S3Endpoint,
		ForcePathStyle: cfg.S3PathStyle,
	})
	if err != nil {
		log.Fatal("s3 init failed", zap.Error(err))
	}

	v := validator.New()
	r := httpx.NewRouter(httpx.Deps{
		Listings:  listingsRepo,
		Images:    imagesRepo,
		Validate:  v,
		S3:        s3c,
		ExpiryMin: cfg.PresignExpiry,
	})

	if cfg.Env == "prod" {
		gin.SetMode(gin.ReleaseMode)
	}

	srv := &http.Server{Addr: ":" + cfg.HTTPPort, Handler: r}

	go func() {
		log.Info("api listening", zap.String("addr", srv.Addr))
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal("server error", zap.Error(err))
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	ctxShut, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = srv.Shutdown(ctxShut)
	log.Info("api stopped")
}
