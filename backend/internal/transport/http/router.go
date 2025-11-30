// internal/transport/http/router.go (excerpt)
package http

import (
	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"

	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/platform/s3client"
	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/repository"
	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/service"
	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/transport/http/handlers"
	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/transport/http/middleware"
)

type Deps struct {
	// repositories
	Listings repository.ListingRepo
	Images   repository.ImageRepo
	Reports  repository.ReportRepo
	Admin    service.AdminRepo // admin uses its own interface
	AuthRepo repository.AuthRepo
	// Chat     repository.ChatRepo

	// services
	AuthSvc   *service.AuthService
	ReportSvc *service.ReportService
	AdminSvc  *service.AdminService
	// ChatSvc   *service.ChatService

	// infra
	Validate  *validator.Validate
	S3        *s3client.Client
	ExpiryMin int

	// auth/mode
	JWTSecret []byte
	Env       string // "dev"/"prod"
}

func NewRouter(d Deps) *gin.Engine {
	r := gin.New()
	r.Use(gin.Recovery(), gin.Logger())

	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "http://localhost:5173")
		c.Header("Access-Control-Allow-Credentials", "true")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")
		c.Header("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	r.GET("/healthz", func(c *gin.Context) { c.String(200, "ok") })

	// Handlers
	lh := handlers.NewListingsHandler(d.Listings, d.Images, d.S3, d.Validate, d.ExpiryMin)
	uh := handlers.NewUploadsHandler(d.Validate, d.S3, d.Images, d.ExpiryMin)

	var ah *handlers.AuthHandler
	if d.AuthSvc != nil {
		ah = handlers.NewAuthHandler(d.AuthSvc, d.Validate)
	}
	var rh *handlers.ReportsHandler
	if d.ReportSvc != nil {
		rh = handlers.NewReportsHandler(d.ReportSvc, d.Validate)
	}
	var adm *handlers.AdminHandler
	if d.AdminSvc != nil {
		adm = handlers.NewAdminHandler(d.AdminSvc)
	}

	// Routes
	v1 := r.Group("/v1")
	{
		if ah != nil {
			v1.POST("/auth/sign-up", ah.SignUp)
			v1.POST("/auth/sign-in", ah.SignIn)
		}

		v1.GET("/listings", lh.List) // Public - anyone can browse listings
		v1.GET("/listings/:id", lh.Get) // Public - anyone can view listing details
		v1.POST("/listings", middleware.JWT(d.JWTSecret, "seller", "admin"), lh.Create)
		v1.PATCH("/listings/:id", middleware.JWT(d.JWTSecret, "seller", "admin"), lh.Update)
		v1.POST("/listings/:id/mark-sold", middleware.JWT(d.JWTSecret, "seller", "admin"), lh.MarkSold)
		v1.DELETE("/listings/:id", middleware.JWT(d.JWTSecret, "seller", "admin"), lh.Delete)
		v1.GET("/listings/mine", middleware.JWT(d.JWTSecret, "seller", "admin"), lh.ListMine)

		v1.POST("/uploads/presign", middleware.JWT(d.JWTSecret, "seller", "admin"), uh.Presign)
		v1.POST("/uploads/complete", middleware.JWT(d.JWTSecret, "seller", "admin"), uh.Complete)

		if rh != nil {
			v1.POST("/reports", middleware.JWT(d.JWTSecret, "buyer", "seller", "admin"), rh.Create) // Allow all authenticated users to report
			v1.GET("/reports", middleware.JWT(d.JWTSecret, "admin"), rh.List)
			v1.PATCH("/reports/:id/status", middleware.JWT(d.JWTSecret, "admin"), rh.UpdateStatus)
		}

		if adm != nil {
			v1.GET("/admin/metrics", middleware.JWT(d.JWTSecret, "admin"), adm.Metrics)
			v1.GET("/admin/users", middleware.JWT(d.JWTSecret, "admin"), adm.Users)
			v1.POST("/admin/listings/:id/remove", middleware.JWT(d.JWTSecret, "admin"), adm.ForceRemoveListing)
		}

	}

	return r
}
