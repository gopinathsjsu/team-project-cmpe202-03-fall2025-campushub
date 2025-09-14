package http

import (
	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"

	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/repository"
	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/transport/http/handlers"
)

type Deps struct {
	Listings repository.ListingRepo
	Validate *validator.Validate
}

func NewRouter(d Deps) *gin.Engine {
	r := gin.New()
	r.Use(gin.Recovery(), gin.Logger())

	r.GET("/healthz", func(c *gin.Context) { c.String(200, "ok") })

	h := handlers.NewListingsHandler(d.Listings, d.Validate)

	v1 := r.Group("/v1")
	{
		v1.GET("/listings", h.List)
		v1.GET("/listings/:id", h.Get)
		v1.POST("/listings", h.Create)
		v1.PATCH("/listings/:id", h.Update)
		v1.POST("/listings/:id/mark-sold", h.MarkSold)
		v1.DELETE("/listings/:id", h.Delete)
	}

	return r
}
