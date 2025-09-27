package handlers

import (
	"fmt"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"

	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/platform/s3client"
	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/repository"
	resp "github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/resp"
)

type UploadsHandler struct {
	v       *validator.Validate
	s3      *s3client.Client
	imgRepo repository.ImageRepo
	expiry  time.Duration
}

func NewUploadsHandler(v *validator.Validate, s3c *s3client.Client, ir repository.ImageRepo, expiryMin int) *UploadsHandler {
	return &UploadsHandler{v: v, s3: s3c, imgRepo: ir, expiry: time.Duration(expiryMin) * time.Minute}
}

type presignReq struct {
	FileName    string `json:"fileName" validate:"required"`
	ContentType string `json:"contentType" validate:"required"`
}

func (h *UploadsHandler) Presign(c *gin.Context) {
	var req presignReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, resp.Err("VALIDATION_ERROR", "invalid json", err.Error()))
		return
	}
	if err := h.v.Struct(req); err != nil {
		c.JSON(http.StatusBadRequest, resp.Err("VALIDATION_ERROR", "invalid fields", err.Error()))
		return
	}
	ext := strings.ToLower(filepath.Ext(req.FileName))
	uid := uuid.New().String()
	key := fmt.Sprintf("uploads/%s/%s%s", time.Now().Format("2006/01"), uid, ext)

	ps, err := h.s3.PresignPut(c.Request.Context(), key, req.ContentType, h.expiry)
	if err != nil {
		c.JSON(http.StatusInternalServerError, resp.Err("INTERNAL", "presign failed", err.Error()))
		return
	}
	c.JSON(http.StatusOK, resp.Data(ps))
}

type completeReq struct {
	ListingID uuid.UUID `json:"listingId" validate:"required"`
	Key       string    `json:"key" validate:"required"`
	IsPrimary bool      `json:"isPrimary"`
}

func (h *UploadsHandler) Complete(c *gin.Context) {
	var req completeReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, resp.Err("VALIDATION_ERROR", "invalid json", err.Error()))
		return
	}
	if err := h.v.Struct(req); err != nil {
		c.JSON(http.StatusBadRequest, resp.Err("VALIDATION_ERROR", "invalid fields", err.Error()))
		return
	}
	img, err := h.imgRepo.Add(c, repository.AddImage{
		ListingID: req.ListingID,
		S3Key:     req.Key,
		IsPrimary: req.IsPrimary,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, resp.Err("INTERNAL", "attach failed", err.Error()))
		return
	}
	c.JSON(http.StatusOK, resp.Data(img))
}
