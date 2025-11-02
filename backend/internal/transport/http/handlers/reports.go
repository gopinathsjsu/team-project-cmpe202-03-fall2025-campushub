package handlers

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"

	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/resp"
	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/service"
)

type ReportsHandler struct {
	s *service.ReportService
	v *validator.Validate
}

func NewReportsHandler(s *service.ReportService, v *validator.Validate) *ReportsHandler {
	return &ReportsHandler{s: s, v: v}
}

type createReportReq struct {
	ListingID  uuid.UUID `json:"listingId" validate:"required"`
	ReporterID uuid.UUID `json:"reporterId" validate:"required"`
	Reason     string    `json:"reason" validate:"required,min=3,max=500"`
}

func (h *ReportsHandler) Create(c *gin.Context) {
	var req createReportReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, resp.Err("VALIDATION_ERROR", "invalid json", err.Error()))
		return
	}
	if err := h.v.Struct(req); err != nil {
		c.JSON(400, resp.Err("VALIDATION_ERROR", "invalid fields", err.Error()))
		return
	}
	rp, err := h.s.Create(c.Request.Context(), service.CreateReportCmd{
		ListingID: req.ListingID, ReporterID: req.ReporterID, Reason: req.Reason,
	})
	if err != nil {
		c.JSON(500, resp.Err("INTERNAL", "create failed", err.Error()))
		return
	}
	c.JSON(201, resp.Data(rp))
}

func (h *ReportsHandler) List(c *gin.Context) {
	status := c.DefaultQuery("status", "")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	items, total, err := h.s.List(c.Request.Context(), service.ListReportsQuery{
		Status: status, Limit: limit, Offset: offset,
	})
	if err != nil {
		c.JSON(500, resp.Err("INTERNAL", "list failed", err.Error()))
		return
	}
	c.JSON(200, resp.Data(gin.H{"items": items, "total": total, "limit": limit, "offset": offset}))
}

type updateStatusReq struct {
	Status string `json:"status" validate:"required,oneof=open reviewing resolved dismissed"`
}

func (h *ReportsHandler) UpdateStatus(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(400, resp.Err("BAD_REQUEST", "bad id", nil))
		return
	}
	var req updateStatusReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, resp.Err("VALIDATION_ERROR", "invalid json", err.Error()))
		return
	}
	if err := h.v.Struct(req); err != nil {
		c.JSON(400, resp.Err("VALIDATION_ERROR", "invalid fields", err.Error()))
		return
	}
	rp, err := h.s.UpdateStatus(c.Request.Context(), id, req.Status)
	if err != nil {
		c.JSON(500, resp.Err("INTERNAL", "update failed", err.Error()))
		return
	}
	c.JSON(200, resp.Data(rp))
}
