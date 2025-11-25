package jwt

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/domain"
)

type Signer struct {
	Secret []byte
}

func (s *Signer) Verify(tokenStr string) (any, any) {
	panic("unimplemented")
}

type Claims struct {
	Sub   string `json:"sub"`   // user ID
	Email string `json:"email"` // email
	Role  string `json:"role"`  // buyer/seller/admin
	jwt.RegisteredClaims
}

// ParseAndValidate validates a JWT and returns Claims.
func ParseAndValidate(secret string, tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(t *jwt.Token) (interface{}, error) {
		// Ensure HMAC SHA256
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(secret), nil
	})
	if err != nil {
		return nil, err
	}

	// Cast claims
	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token")
	}

	// Verify exp explicitly
	if claims.ExpiresAt != nil {
		if time.Now().After(claims.ExpiresAt.Time) {
			return nil, errors.New("token expired")
		}
	}

	// Ensure required fields
	if claims.Sub == "" {
		return nil, errors.New("missing sub")
	}
	if claims.Role == "" {
		return nil, errors.New("missing role")
	}

	return claims, nil
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
