//go:build admin || heroku || heroku_admin

package middleware

import (
	"crypto/subtle"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/resistorsoftware/api-service/pkg/api/config"
)

// MaintenanceTokenHeader is the header an external scheduler (e.g. Heroku Scheduler)
// supplies to trigger maintenance endpoints without a browser session.
const MaintenanceTokenHeader = "X-Maintenance-Token"

// CheckMaintenanceOrAdmin authorizes a request if it carries EITHER a valid
// shared-secret maintenance token OR a valid admin session + CSRF token. This lets
// cron jobs trigger maintenance headlessly while still allowing the admin UI to use
// the same endpoints.
func CheckMaintenanceOrAdmin() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Shared-secret path for headless cron triggers.
		if provided := strings.TrimSpace(c.GetHeader(MaintenanceTokenHeader)); provided != "" {
			if abuse, err := config.Abuse(); err == nil && abuse != nil {
				expected := strings.TrimSpace(abuse.MaintenanceToken)
				if expected != "" && subtle.ConstantTimeCompare([]byte(provided), []byte(expected)) == 1 {
					c.Next()
					return
				}
			}
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "invalid maintenance token"})
			return
		}

		// Admin session + CSRF path for the dashboard UI.
		claims, err := AdminSessionFromRequest(c)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "admin authentication required"})
			return
		}
		c.Set(ctxAdminClaims, claims)

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
