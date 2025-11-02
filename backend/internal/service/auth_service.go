package service

import (
	"context"
	"errors"
	"time"

	"golang.org/x/crypto/bcrypt"

	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/domain"
	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/repository"
)

var ErrUnauthorized = errors.New("unauthorized")

type Clock interface{ Now() time.Time }
type JWTSigner interface {
	SignJWT(user domain.User, exp time.Time) (string, error)
}

type AuthService struct {
	repo repository.AuthRepo
	jwt  JWTSigner
	clk  Clock
	ttl  time.Duration
}

func NewAuthService(r repository.AuthRepo, jwt JWTSigner, clk Clock, ttl time.Duration) *AuthService {
	return &AuthService{repo: r, jwt: jwt, clk: clk, ttl: ttl}
}

type SignUpCmd struct{ Name, Email, Role, Password string }
type SignInCmd struct{ Email, Password string }
type SignInResult struct {
	User  domain.User
	Token string
}

func (s *AuthService) SignUp(ctx context.Context, cmd SignUpCmd) (domain.User, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(cmd.Password), bcrypt.DefaultCost)
	if err != nil {
		return domain.User{}, err
	}
	return s.repo.CreateUser(ctx, cmd.Name, cmd.Email, cmd.Role, string(hash))
}

func (s *AuthService) SignIn(ctx context.Context, cmd SignInCmd) (SignInResult, error) {
	u, hash, err := s.repo.GetByEmail(ctx, cmd.Email)
	if err != nil {
		return SignInResult{}, ErrUnauthorized
	}
	if bcrypt.CompareHashAndPassword([]byte(hash), []byte(cmd.Password)) != nil {
		return SignInResult{}, ErrUnauthorized
	}
	exp := s.clk.Now().Add(s.ttl)
	tok, err := s.jwt.SignJWT(u, exp)
	if err != nil {
		return SignInResult{}, err
	}
	return SignInResult{User: u, Token: tok}, nil
}
