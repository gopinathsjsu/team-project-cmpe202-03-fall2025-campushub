package jwt

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/domain"
)

type Signer struct {
	Secret []byte
}

func New(secret []byte) *Signer { return &Signer{Secret: secret} }

func (s *Signer) SignJWT(user domain.User, exp time.Time) (string, error) {
	claims := jwt.MapClaims{
		"sub":   user.ID,
		"email": user.Email,
		"role":  user.Role,
		"exp":   exp.Unix(),
	}
	t := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return t.SignedString(s.Secret)
}
