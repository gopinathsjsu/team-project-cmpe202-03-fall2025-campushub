package handlers

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/resp"
	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/service"
)

type AdminHandler struct{ s *service.AdminService }

func NewAdminHandler(s *service.AdminService) *AdminHandler { return &AdminHandler{s: s} }

func (h *AdminHandler) Metrics(c *gin.Context) {
	m, err := h.s.Metrics(c.Request.Context())
	if err != nil {
		c.JSON(500, resp.Err("INTERNAL", "metrics failed", err.Error()))
		return
	}
	c.JSON(200, resp.Data(m))
}
func (h *AdminHandler) Users(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	items, total, err := h.s.Users(c.Request.Context(), limit, offset)
	if err != nil {
		c.JSON(500, resp.Err("INTERNAL", "list users failed", err.Error()))
		return
	}
	c.JSON(200, resp.Data(gin.H{"items": items, "total": total, "limit": limit, "offset": offset}))
}
func (h *AdminHandler) ForceRemoveListing(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(400, resp.Err("BAD_REQUEST", "bad id", nil))
		return
	}
	if err := h.s.ForceRemoveListing(c.Request.Context(), id); err != nil {
		c.JSON(500, resp.Err("INTERNAL", "remove failed", err.Error()))
		return
	}
	c.JSON(200, resp.Data(gin.H{"ok": true}))
}
