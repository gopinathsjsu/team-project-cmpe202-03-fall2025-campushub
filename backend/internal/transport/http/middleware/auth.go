package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

// JWT middleware validates token and (optionally) allowed roles.
func JWT(secret []byte, roles ...string) gin.HandlerFunc {
	allowed := map[string]bool{}
	for _, r := range roles {
		allowed[r] = true
	}

	return func(c *gin.Context) {
		h := c.GetHeader("Authorization")
		if !strings.HasPrefix(h, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing bearer"})
			return
		}
		raw := strings.TrimPrefix(h, "Bearer ")
		tok, err := jwt.Parse(raw, func(t *jwt.Token) (interface{}, error) { return secret, nil })
		if err != nil || !tok.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			return
		}
		claims, _ := tok.Claims.(jwt.MapClaims)
		role, _ := claims["role"].(string)
		if len(allowed) > 0 && !allowed[role] {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "forbidden"})
			return
		}
		c.Set("userID", claims["sub"])
		c.Set("role", role)
		c.Next()
	}
}
