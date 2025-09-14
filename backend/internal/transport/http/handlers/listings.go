package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"

	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/domain"
	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/repository"
	resp "github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/resp"
)

type ListingsHandler struct {
	repo repository.ListingRepo
	v    *validator.Validate
}

func NewListingsHandler(repo repository.ListingRepo, v *validator.Validate) *ListingsHandler {
	return &ListingsHandler{repo: repo, v: v}
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
	c.JSON(http.StatusOK, resp.Data(l))
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
		Q: q, Category: category, PriceMin: pminPtr, PriceMax: pmaxPtr,
		Status: status, Limit: limit, Offset: offset, Sort: sort,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, resp.Err("INTERNAL", "list failed", err.Error()))
		return
	}

	c.JSON(http.StatusOK, resp.Data(gin.H{
		"items":  items,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	}))
}

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
