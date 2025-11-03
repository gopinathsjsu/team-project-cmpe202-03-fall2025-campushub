// cmd/api/main.go
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

	// internal
	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/config"
	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/platform/clock"
	jwt "github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/platform/jwt" // NOTE: lowercase 'jwt'
	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/platform/s3client"
	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/repository/postgres"
	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/service"
	httpx "github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/transport/http"
)

func main() {
	log, _ := zap.NewProduction()
	defer log.Sync()

	// 1) Config
	cfg, err := config.Load()
	if err != nil {
		log.Fatal("config load failed", zap.Error(err))
	}

	if cfg.Env == "prod" {
		gin.SetMode(gin.ReleaseMode)
	}

	ctx := context.Background()

	// 2) Postgres connection pool
	pool, err := postgres.NewPool(ctx, cfg.DBDSN)
	if err != nil {
		log.Fatal("db connect failed", zap.Error(err))
	}
	defer pool.Close()

	// 3) Infra clients
	s3c, err := s3client.New(ctx, s3client.Opts{
		Region:         cfg.S3Region,
		Bucket:         cfg.S3Bucket,
		Endpoint:       cfg.S3Endpoint,
		ForcePathStyle: cfg.S3PathStyle,
	})
	if err != nil {
		log.Fatal("s3 init failed", zap.Error(err))
	}
	jwtSigner := jwt.New([]byte(cfg.JWTSecret))
	clk := clock.Real{}
	v := validator.New()

	// 4) Repositories
	listingsRepo := postgres.NewListingRepo(pool)
	imagesRepo := postgres.NewImageRepo(pool)
	reportRepo := postgres.NewReportRepo(pool)
	adminRepo := postgres.NewAdminRepo(pool)
	authRepo := postgres.NewAuthRepo(pool)
	// chatRepo := postgres.NewChatRepo(pool)

	// 5) Services (business)
	authSvc := service.NewAuthService(authRepo, jwtSigner, clk, time.Duration(cfg.PresignExpiry)*time.Minute)
	reportSvc := service.NewReportService(reportRepo)
	adminSvc := service.NewAdminService(adminRepo)
	// chatSvc := service.NewChatService(chatRepo)

	// 6) Router with full deps
	r := httpx.NewRouter(httpx.Deps{
		// repos
		Listings: listingsRepo,
		Images:   imagesRepo,
		AuthRepo: authRepo,
		Reports:  reportRepo,
		Admin:    adminRepo,
		// Chat:     chatRepo,

		// services
		AuthSvc:   authSvc,
		ReportSvc: reportSvc,
		AdminSvc:  adminSvc,
		// ChatSvc:   chatSvc,

		// infra
		Validate:  v,
		S3:        s3c,
		ExpiryMin: cfg.PresignExpiry,

		// auth config for middleware
		JWTSecret: []byte(cfg.JWTSecret),
		Env:       cfg.Env,
	})

	// 7) HTTP server + graceful shutdown
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
