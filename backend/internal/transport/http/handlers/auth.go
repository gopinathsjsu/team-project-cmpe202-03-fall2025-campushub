package handlers

import (
	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"

	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/resp"
	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/service"
)

type AuthHandler struct {
	s *service.AuthService
	v *validator.Validate
}

func NewAuthHandler(s *service.AuthService, v *validator.Validate) *AuthHandler {
	return &AuthHandler{s: s, v: v}
}

type signUpReq struct {
	Name     string `json:"name" validate:"required,min=2,max=80"`
	Email    string `json:"email" validate:"required,email"`
	Role     string `json:"role" validate:"required,oneof=buyer seller admin"`
	Password string `json:"password" validate:"required,min=8,max=72"`
}

func (h *AuthHandler) SignUp(c *gin.Context) {
	var req signUpReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, resp.Err("VALIDATION_ERROR", "invalid json", err.Error()))
		return
	}
	if err := h.v.Struct(req); err != nil {
		c.JSON(400, resp.Err("VALIDATION_ERROR", "invalid fields", err.Error()))
		return
	}
	u, err := h.s.SignUp(c.Request.Context(), service.SignUpCmd{
		Name: req.Name, Email: req.Email, Role: req.Role, Password: req.Password,
	})
	if err != nil {
		c.JSON(409, resp.Err("CONFLICT", "email exists?", err.Error()))
		return
	}
	c.JSON(201, resp.Data(u))
}

type signInReq struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

func (h *AuthHandler) SignIn(c *gin.Context) {
	var req signInReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, resp.Err("VALIDATION_ERROR", "invalid json", err.Error()))
		return
	}
	if err := h.v.Struct(req); err != nil {
		c.JSON(400, resp.Err("VALIDATION_ERROR", "invalid fields", err.Error()))
		return
	}
	out, err := h.s.SignIn(c.Request.Context(), service.SignInCmd{Email: req.Email, Password: req.Password})
	if err != nil {
		c.JSON(401, resp.Err("UNAUTHORIZED", "bad credentials", nil))
		return
	}
	c.JSON(200, resp.Data(gin.H{"token": out.Token, "user": out.User}))
}
