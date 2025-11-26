package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"

	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/domain"
	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/platform/s3client"
	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/repository"
	resp "github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/resp"
)

type ListingsHandler struct {
	repo   repository.ListingRepo
	images repository.ImageRepo
	s3     *s3client.Client
	v      *validator.Validate
	expiry time.Duration
}

type listingWithImage struct {
	domain.Listing `json:",inline"`
	Images         []struct {
		Key string `json:"key"`
		URL string `json:"url"`
	} `json:"images"`
}

func NewListingsHandler(
	repo repository.ListingRepo,
	images repository.ImageRepo,
	s3 *s3client.Client,
	v *validator.Validate,
	expiryMinutes int,
) *ListingsHandler {
	if expiryMinutes <= 0 {
		expiryMinutes = 15
	}
	return &ListingsHandler{
		repo:   repo,
		images: images,
		s3:     s3,
		v:      v,
		expiry: time.Duration(expiryMinutes) * time.Minute,
	}
}

type createListingReq struct {
	SellerID    uuid.UUID        `json:"sellerId" validate:"required"`
	Title       string           `json:"title" validate:"required,min=3,max=120"`
	Description string           `json:"description" validate:"required,min=5"`
	Category    string           `json:"category" validate:"required,min=2,max=60"`
	Price       float64          `json:"price" validate:"required,gte=0"`
	Condition   domain.Condition `json:"condition" validate:"required,oneof=New LikeNew Good Fair"`
}

func (h *ListingsHandler) Create(c *gin.Context) {
	var req createListingReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, resp.Err("VALIDATION_ERROR", "invalid json", err.Error()))
		return
	}
	if err := h.v.Struct(req); err != nil {
		c.JSON(http.StatusBadRequest, resp.Err("VALIDATION_ERROR", "invalid fields", err.Error()))
		return
	}
	l, err := h.repo.Create(c.Request.Context(), repository.CreateListing{
		SellerID:    req.SellerID,
		Title:       req.Title,
		Description: req.Description,
		Category:    req.Category,
		Price:       req.Price,
		Condition:   req.Condition,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, resp.Err("INTERNAL", "create failed", err.Error()))
		return
	}
	c.JSON(http.StatusCreated, resp.Data(l))
}

func (h *ListingsHandler) ListMine(c *gin.Context) {
	uidVal, ok := c.Get("userId")
	if !ok {
		c.JSON(http.StatusUnauthorized, resp.Err("UNAUTHORIZED", "missing user id in context", nil))
		return
	}

	uidStr, ok := uidVal.(string)
	if !ok {
		c.JSON(http.StatusUnauthorized, resp.Err("UNAUTHORIZED", "invalid user id type", nil))
		return
	}

	sellerID, err := uuid.Parse(uidStr)
	if err != nil {
		c.JSON(http.StatusUnauthorized, resp.Err("UNAUTHORIZED", "invalid user id", err.Error()))
		return
	}

	status := c.DefaultQuery("status", "active")
	fmt.Println("Status:", status)
	sort := c.DefaultQuery("sort", "created_desc")

	var pminPtr, pmaxPtr *float64
	if s := c.Query("priceMin"); s != "" {
		if v, err := strconv.ParseFloat(s, 64); err == nil {
			pminPtr = &v
		}
	}
	if s := c.Query("priceMax"); s != "" {
		if v, err := strconv.ParseFloat(s, 64); err == nil {
			pmaxPtr = &v
		}
	}
	limit := 20
	if s := c.Query("limit"); s != "" {
		if v, err := strconv.Atoi(s); err == nil && v > 0 && v <= 100 {
			limit = v
		}
	}
	offset := 0
	if s := c.Query("offset"); s != "" {
		if v, err := strconv.Atoi(s); err == nil && v >= 0 {
			offset = v
		}
	}

	items, total, err := h.repo.List(c.Request.Context(), repository.ListParams{
		Status:   "",
		PriceMin: pminPtr,
		PriceMax: pmaxPtr,
		Limit:    limit,
		Offset:   offset,
		Sort:     sort,
		SellerID: &sellerID,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, resp.Err("INTERNAL", "list failed", err.Error()))
		return
	}

	ctx := c.Request.Context()
	out := make([]listingWithImage, 0, len(items))
	for _, l := range items {
		lw := listingWithImage{Listing: l}

		if h.images != nil && h.s3 != nil {
			if imgs, err := h.images.ListByListing(ctx, l.ID); err == nil && len(imgs) > 0 {
				for _, img := range imgs {
					if url, err := h.s3.PresignGet(ctx, img.S3Key, h.expiry); err == nil {
						lw.Images = append(lw.Images, struct {
							Key string `json:"key"`
							URL string `json:"url"`
						}{
							Key: img.S3Key,
							URL: url,
						})
					}
				}
			}
		}

		out = append(out, lw)
	}

	c.JSON(http.StatusOK, resp.Data(gin.H{
		"items":  out,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	}))
}

func (h *ListingsHandler) Get(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, resp.Err("BAD_REQUEST", "bad id", nil))
		return
	}
	l, err := h.repo.Get(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, resp.Err("NOT_FOUND", "listing not found", nil))
		return
	}

	out := listingWithImage{Listing: l}

	if h.images != nil && h.s3 != nil {
		ctx := c.Request.Context()
		if imgs, err := h.images.ListByListing(ctx, id); err == nil && len(imgs) > 0 {
			for _, img := range imgs {
				if url, err := h.s3.PresignGet(ctx, img.S3Key, h.expiry); err == nil {
					out.Images = append(out.Images, struct {
						Key string `json:"key"`
						URL string `json:"url"`
					}{
						Key: img.S3Key,
						URL: url,
					})
				}
			}
		}
	}

	c.JSON(http.StatusOK, resp.Data(out))
}

func (h *ListingsHandler) List(c *gin.Context) {
	q := c.Query("q")
	category := c.Query("category")
	status := c.DefaultQuery("status", "active")
	sort := c.DefaultQuery("sort", "created_desc")

	var pminPtr, pmaxPtr *float64
	if s := c.Query("priceMin"); s != "" {
		if v, err := strconv.ParseFloat(s, 64); err == nil {
			pminPtr = &v
		}
	}
	if s := c.Query("priceMax"); s != "" {
		if v, err := strconv.ParseFloat(s, 64); err == nil {
			pmaxPtr = &v
		}
	}
	limit := 20
	if s := c.Query("limit"); s != "" {
		if v, err := strconv.Atoi(s); err == nil && v > 0 && v <= 100 {
			limit = v
		}
	}
	offset := 0
	if s := c.Query("offset"); s != "" {
		if v, err := strconv.Atoi(s); err == nil && v >= 0 {
			offset = v
		}
	}

	items, total, err := h.repo.List(c.Request.Context(), repository.ListParams{
		Q:        q,
		Category: category,
		PriceMin: pminPtr,
		PriceMax: pmaxPtr,
		Status:   status,
		Limit:    limit,
		Offset:   offset,
		Sort:     sort,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, resp.Err("INTERNAL", "list failed", err.Error()))
		return
	}

	ctx := c.Request.Context()
	out := make([]listingWithImage, 0, len(items))
	for _, l := range items {
		lw := listingWithImage{Listing: l}

		if h.images != nil && h.s3 != nil {
			if imgs, err := h.images.ListByListing(ctx, l.ID); err == nil && len(imgs) > 0 {
				for _, img := range imgs {
					if url, err := h.s3.PresignGet(ctx, img.S3Key, h.expiry); err == nil {
						lw.Images = append(lw.Images, struct {
							Key string `json:"key"`
							URL string `json:"url"`
						}{
							Key: img.S3Key,
							URL: url,
						})
					}
				}
			}
		}

		out = append(out, lw)
	}

	c.JSON(http.StatusOK, resp.Data(gin.H{
		"items":  out,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	}))
}

// ------------------------ Update / MarkSold / Delete ------------------------

type updateListingReq struct {
	Title       *string               `json:"title"`
	Description *string               `json:"description"`
	Category    *string               `json:"category"`
	Price       *float64              `json:"price" validate:"omitempty,gte=0"`
	Condition   *domain.Condition     `json:"condition" validate:"omitempty,oneof=New LikeNew Good Fair"`
	Status      *domain.ListingStatus `json:"status" validate:"omitempty,oneof=active sold removed"`
}

func (h *ListingsHandler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, resp.Err("BAD_REQUEST", "bad id", nil))
		return
	}
	var req updateListingReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, resp.Err("VALIDATION_ERROR", "invalid json", err.Error()))
		return
	}
	if err := h.v.Struct(req); err != nil {
		c.JSON(http.StatusBadRequest, resp.Err("VALIDATION_ERROR", "invalid fields", err.Error()))
		return
	}
	l, err := h.repo.UpdatePartial(c.Request.Context(), id, repository.UpdateListing{
		Title: req.Title, Description: req.Description, Category: req.Category,
		Price: req.Price, Condition: req.Condition, Status: req.Status,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, resp.Err("INTERNAL", "update failed", err.Error()))
		return
	}
	c.JSON(http.StatusOK, resp.Data(l))
}

func (h *ListingsHandler) MarkSold(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, resp.Err("BAD_REQUEST", "bad id", nil))
		return
	}
	if err := h.repo.MarkSold(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, resp.Err("INTERNAL", "mark sold failed", err.Error()))
		return
	}
	c.JSON(http.StatusOK, resp.Data(gin.H{"ok": true}))
}

func (h *ListingsHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, resp.Err("BAD_REQUEST", "bad id", nil))
		return
	}
	if err := h.repo.SoftDelete(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, resp.Err("INTERNAL", "delete failed", err.Error()))
		return
	}
	c.JSON(http.StatusOK, resp.Data(gin.H{"ok": true}))
}
