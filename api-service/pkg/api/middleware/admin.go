//go:build admin

package middleware

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"

	"github.com/resistorsoftware/api-service/pkg/api/config"
)

const (
	adminIssuer    = "background-geolocation-console-admin"
	ctxAdminClaims = "adminClaims"
)

// AdminClaims describes the short-lived admin browser session.
type AdminClaims struct {
	Username string `json:"username"`
	Admin    bool   `json:"admin"`
	Role     string `json:"role,omitempty"`
	jwt.RegisteredClaims
}

// NewAdminClaims builds a short-lived admin session payload.
func NewAdminClaims(username string, ttl time.Duration) AdminClaims {
	now := time.Now().UTC()
	return AdminClaims{
		Username: username,
		Admin:    true,
		Role:     "admin",
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    adminIssuer,
			Subject:   username,
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
		},
	}
}

// SignAdminToken signs an admin session token using the configured JWT key.
func SignAdminToken(claims AdminClaims) (string, error) {
	tk := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	key, err := SigningKey()
	if err != nil {
		return "", err
	}
	return tk.SignedString(key)
}

func parseAdminToken(tok string) (*AdminClaims, error) {
	key, err := SigningKey()
	if err != nil {
		return nil, err
	}
	t, err := jwt.ParseWithClaims(tok, &AdminClaims{}, func(token *jwt.Token) (any, error) {
		return key, nil
	})
	if err != nil {
		return nil, err
	}
	claims, ok := t.Claims.(*AdminClaims)
	if !ok || !t.Valid {
		return nil, jwt.ErrTokenInvalidClaims
	}
	if claims.Issuer != adminIssuer || !claims.Admin {
		return nil, jwt.ErrTokenInvalidClaims
	}
	return claims, nil
}

// AdminCookieName returns the configured cookie name with defaults applied.
func AdminCookieName() string {
	adminCfg, err := config.Admin()
	if err != nil || adminCfg == nil || adminCfg.CookieName == "" {
		return "bgc_admin"
	}
	return adminCfg.CookieName
}

// AdminCSRFCookieName returns the CSRF cookie name for the admin surface.
func AdminCSRFCookieName() string {
	return AdminCookieName() + "_csrf"
}

// SetAdminSessionCookie stores the signed admin token in the browser cookie jar.
func SetAdminSessionCookie(c *gin.Context, signedToken string, ttl time.Duration) {
	adminCfg, _ := config.Admin()
	secure := false
	if adminCfg != nil {
		secure = adminCfg.CookieSecure
	}
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     AdminCookieName(),
		Value:    signedToken,
		Path:     "/admin",
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   int(ttl.Seconds()),
	})
}

func setAdminCSRFCookie(c *gin.Context, token string, maxAge int) {
	adminCfg, _ := config.Admin()
	secure := false
	if adminCfg != nil {
		secure = adminCfg.CookieSecure
	}
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     AdminCSRFCookieName(),
		Value:    token,
		Path:     "/admin",
		HttpOnly: false,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   maxAge,
	})
}

// ClearAdminSessionCookie clears the admin session cookie.
func ClearAdminSessionCookie(c *gin.Context) {
	adminCfg, _ := config.Admin()
	secure := false
	if adminCfg != nil {
		secure = adminCfg.CookieSecure
	}
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     AdminCookieName(),
		Value:    "",
		Path:     "/admin",
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   -1,
		Expires:  time.Unix(0, 0),
	})
}

// ClearAdminCSRFCookie clears the admin CSRF cookie.
func ClearAdminCSRFCookie(c *gin.Context) {
	setAdminCSRFCookie(c, "", -1)
}

// IssueAdminCSRFCookie rotates the CSRF token and returns the new value.
func IssueAdminCSRFCookie(c *gin.Context) (string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	token := base64.RawURLEncoding.EncodeToString(buf)
	maxAge := int((8 * time.Hour).Seconds())
	if adminCfg, err := config.Admin(); err == nil && adminCfg != nil && adminCfg.SessionMaxHours > 0 {
		maxAge = int((time.Duration(adminCfg.SessionMaxHours) * time.Hour).Seconds())
	}
	setAdminCSRFCookie(c, token, maxAge)
	return token, nil
}

// EnsureAdminCSRFCookie returns the current CSRF token or creates one.
func EnsureAdminCSRFCookie(c *gin.Context) (string, error) {
	token, err := c.Cookie(AdminCSRFCookieName())
	if err == nil && strings.TrimSpace(token) != "" {
		return token, nil
	}
	return IssueAdminCSRFCookie(c)
}

// AdminSessionFromRequest extracts and verifies the current admin cookie.
func AdminSessionFromRequest(c *gin.Context) (*AdminClaims, error) {
	token, err := c.Cookie(AdminCookieName())
	if err != nil {
		return nil, err
	}
	return parseAdminToken(token)
}

// CheckAdminRequired enforces an admin cookie for HTML routes.
func CheckAdminRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		claims, err := AdminSessionFromRequest(c)
		if err != nil {
			c.Redirect(http.StatusFound, "/admin/login")
			c.Abort()
			return
		}
		c.Set(ctxAdminClaims, claims)
		c.Next()
	}
}

// CheckAdminAPIRequired enforces an admin cookie for JSON routes.
func CheckAdminAPIRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		claims, err := AdminSessionFromRequest(c)
		if err != nil {
			status := http.StatusUnauthorized
			if errors.Is(err, ErrSigningKeyUnavailable) {
				status = http.StatusInternalServerError
			}
			c.AbortWithStatusJSON(status, gin.H{"error": "admin authentication required"})
			return
		}
		c.Set(ctxAdminClaims, claims)
		c.Next()
	}
}

// CurrentAdmin returns the verified admin session claims from the request context.
func CurrentAdmin(c *gin.Context) *AdminClaims {
	if v, ok := c.Get(ctxAdminClaims); ok {
		return v.(*AdminClaims)
	}
	return &AdminClaims{}
}

// CheckAdminCSRFFromRequest enforces CSRF verification for cookie-backed admin mutations.
func CheckAdminCSRFFromRequest() gin.HandlerFunc {
	return func(c *gin.Context) {
		cookieToken, err := c.Cookie(AdminCSRFCookieName())
		if err != nil || strings.TrimSpace(cookieToken) == "" {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "invalid csrf token"})
			return
		}
		requestToken := strings.TrimSpace(c.GetHeader("X-CSRF-Token"))
		if requestToken == "" {
			requestToken = strings.TrimSpace(c.PostForm("csrf_token"))
		}
		if requestToken == "" || subtle.ConstantTimeCompare([]byte(cookieToken), []byte(requestToken)) != 1 {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "invalid csrf token"})
			return
		}
		c.Next()
	}
}
