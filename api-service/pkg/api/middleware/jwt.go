package middleware

import (
	"errors"
	"fmt"
	"net/http"
	"strings"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/resistorsoftware/api-service/pkg/api/config"
)

type JWTClaims struct {
	CompanyID int64  `json:"companyId"`
	DeviceID  int64  `json:"deviceId"`
	Model     string `json:"model"`
	Org       string `json:"org"`
	UUID      string `json:"uuid"`
	Admin     bool   `json:"admin"`
	jwt.RegisteredClaims
}

var (
	signingKey     []byte
	signingKeyErr  error
	signingKeyOnce sync.Once

	// ErrSigningKeyUnavailable signals configuration problems while loading the signing key.
	ErrSigningKeyUnavailable = errors.New("jwt signing key unavailable")
)

// SigningKey returns the configured JWT signing key, loading it on first use.
func SigningKey() ([]byte, error) {
	signingKeyOnce.Do(func() {
		key, err := config.JWTPrivateKey()
		if err != nil {
			signingKeyErr = fmt.Errorf("%w: %v", ErrSigningKeyUnavailable, err)
			return
		}
		signingKey = key
	})
	if signingKeyErr != nil {
		return nil, signingKeyErr
	}
	if len(signingKey) == 0 {
		return nil, ErrSigningKeyUnavailable
	}
	return signingKey, nil
}

func parseToken(tok string) (*JWTClaims, error) {
	key, err := SigningKey()
	if err != nil {
		return nil, err
	}
	t, err := jwt.ParseWithClaims(tok, &JWTClaims{}, func(token *jwt.Token) (any, error) {
		return key, nil
	})
	if err != nil {
		return nil, err
	}
	if c, ok := t.Claims.(*JWTClaims); ok && t.Valid {
		return c, nil
	}
	return nil, jwt.ErrTokenInvalidClaims
}

const ctxClaims = "jwtClaims"

// CheckAuthRequired enforces bearer token parsing.
func CheckAuthRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		auth := c.GetHeader("Authorization")
		if !strings.HasPrefix(strings.ToLower(auth), "bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing bearer token"})
			return
		}

		claims, err := parseToken(strings.TrimSpace(auth[len("Bearer "):]))
		if err != nil {
			status := http.StatusUnauthorized
			if errors.Is(err, ErrSigningKeyUnavailable) {
				status = http.StatusInternalServerError
			}
			c.AbortWithStatusJSON(status, gin.H{"error": err.Error()})
			return
		}

		c.Set(ctxClaims, claims)
		c.Next()
	}
}

// CheckAuthOptional parses JWT if supplied, otherwise continues.
func CheckAuthOptional() gin.HandlerFunc {
	return func(c *gin.Context) {
		auth := c.GetHeader("Authorization")
		if strings.HasPrefix(strings.ToLower(auth), "bearer ") {
			if claims, err := parseToken(strings.TrimSpace(auth[len("Bearer "):])); err == nil {
				c.Set(ctxClaims, claims)
			} else if errors.Is(err, ErrSigningKeyUnavailable) {
				c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
		}
		c.Next()
	}
}

// Claims retrieves JWT claims from context.
func Claims(c *gin.Context) *JWTClaims {
	if v, ok := c.Get(ctxClaims); ok {
		return v.(*JWTClaims)
	}
	return &JWTClaims{}
}

// IsAdmin convenience helper.
func IsAdmin(c *gin.Context) bool {
	return Claims(c).Admin
}
