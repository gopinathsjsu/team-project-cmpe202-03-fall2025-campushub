package http

import (
	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/platform/s3client"
	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/resp"

	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/repository"
	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/transport/http/handlers"
)

type Deps struct {
	Listings repository.ListingRepo
	Images   repository.ImageRepo
	Validate *validator.Validate

	S3        *s3client.Client
	ExpiryMin int
}

func NewRouter(d Deps) *gin.Engine {
	r := gin.New()
	r.Use(gin.Recovery(), gin.Logger())

	r.GET("/healthz", func(c *gin.Context) { c.String(200, "ok") })

	h := handlers.NewListingsHandler(d.Listings, d.Validate)
	uh := handlers.NewUploadsHandler(d.Validate, d.S3, d.Images, d.ExpiryMin)

	v1 := r.Group("/v1")
	{
		v1.GET("/listings", h.List)
		v1.GET("/listings/:id", h.Get)
		v1.POST("/listings", h.Create)
		v1.PATCH("/listings/:id", h.Update)
		v1.POST("/listings/:id/mark-sold", h.MarkSold)
		v1.DELETE("/listings/:id", h.Delete)
		v1.POST("/uploads/presign", uh.Presign)
		v1.POST("/uploads/complete", uh.Complete)
		v1.GET("/listings/:id/images", func(c *gin.Context) {
			id, err := uuid.Parse(c.Param("id"))
			if err != nil {
				c.JSON(400, resp.Err("BAD_REQUEST", "bad id", nil))
				return
			}
			imgs, err := d.Images.ListByListing(c, id)
			if err != nil {
				c.JSON(500, resp.Err("INTERNAL", "list failed", err.Error()))
				return
			}
			c.JSON(200, resp.Data(imgs))
		})
	}

	return r
}
