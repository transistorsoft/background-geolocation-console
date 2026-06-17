//go:build admin || heroku || heroku_admin

package handlers

import (
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/resistorsoftware/api-service/pkg/api/middleware"
	"github.com/resistorsoftware/api-service/pkg/api/services"
)

// AdminCreateCompany provisions a company token (allowing the reserved _transistor
// prefix, which external registration rejects) via the JSON API.
func AdminCreateCompany(c *gin.Context) {
	org := strings.TrimSpace(firstNonEmptyForm(c, "org"))
	if org == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org is required"})
		return
	}
	if _, err := services.AdminCreateCompany(org); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	log.Printf("admin create company (api): user=%s org=%s", middleware.CurrentAdmin(c).Username, org)
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// AdminBanCompany bans a company via the JSON API (used by the dashboard container).
func AdminBanCompany(c *gin.Context) {
	org := strings.TrimSpace(firstNonEmptyForm(c, "org"))
	if org == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org is required"})
		return
	}
	if err := services.BanCompany(org, strings.TrimSpace(c.PostForm("reason"))); err != nil {
		status := http.StatusInternalServerError
		if errors.Is(err, services.ErrNotFound) {
			status = http.StatusNotFound
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}
	log.Printf("admin ban company (api): user=%s org=%s", middleware.CurrentAdmin(c).Username, org)
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// AdminUnbanCompany clears a company ban via the JSON API.
func AdminUnbanCompany(c *gin.Context) {
	org := strings.TrimSpace(firstNonEmptyForm(c, "org"))
	if org == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org is required"})
		return
	}
	if err := services.UnbanCompany(org); err != nil {
		status := http.StatusInternalServerError
		if errors.Is(err, services.ErrNotFound) {
			status = http.StatusNotFound
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// AdminDeleteCompany deletes a company and its data via the JSON API.
func AdminDeleteCompany(c *gin.Context) {
	org := strings.TrimSpace(firstNonEmptyForm(c, "org"))
	if org == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org is required"})
		return
	}
	if err := services.DeleteCompanyAndData(org); err != nil {
		status := http.StatusInternalServerError
		if errors.Is(err, services.ErrNotFound) {
			status = http.StatusNotFound
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}
	log.Printf("admin delete company (api): user=%s org=%s", middleware.CurrentAdmin(c).Username, org)
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// AdminDeleteDeviceAndData deletes a device and its location data via the JSON API.
func AdminDeleteDeviceAndData(c *gin.Context) {
	deviceID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || deviceID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid device id"})
		return
	}
	if err := services.DeleteDeviceAndData(deviceID); err != nil {
		status := http.StatusInternalServerError
		if errors.Is(err, services.ErrNotFound) {
			status = http.StatusNotFound
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}
	log.Printf("admin delete device (api): user=%s device_id=%d", middleware.CurrentAdmin(c).Username, deviceID)
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// AdminBulkBanCompanies bans the selected companies via the JSON API.
func AdminBulkBanCompanies(c *gin.Context) {
	orgs := dedupeNonEmpty(c.PostFormArray("orgs"))
	if len(orgs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "select at least one company"})
		return
	}
	reason := strings.TrimSpace(c.PostForm("reason"))
	banned := 0
	for _, org := range orgs {
		if err := services.BanCompany(org, reason); err == nil {
			banned++
		}
	}
	log.Printf("admin bulk ban (api): user=%s count=%d", middleware.CurrentAdmin(c).Username, banned)
	c.JSON(http.StatusOK, gin.H{"success": true, "banned": banned})
}

// AdminBulkDeleteCompanies deletes the selected companies and their data via the JSON API.
func AdminBulkDeleteCompanies(c *gin.Context) {
	orgs := dedupeNonEmpty(c.PostFormArray("orgs"))
	if len(orgs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "select at least one company"})
		return
	}
	deleted := 0
	for _, org := range orgs {
		if err := services.DeleteCompanyAndData(org); err == nil {
			deleted++
		}
	}
	log.Printf("admin bulk delete (api): user=%s count=%d", middleware.CurrentAdmin(c).Username, deleted)
	c.JSON(http.StatusOK, gin.H{"success": true, "deleted": deleted})
}

// AdminMaintenanceCleanup runs the retention purge on demand and returns the count.
func AdminMaintenanceCleanup(c *gin.Context) {
	deleted, err := services.RunCleanup()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	log.Printf("admin maintenance cleanup: deleted=%d", deleted)
	c.JSON(http.StatusOK, gin.H{"success": true, "deleted": deleted})
}

// AdminMaintenanceCheckThresholds evaluates thresholds (and alerts/auto-bans) on demand.
func AdminMaintenanceCheckThresholds(c *gin.Context) {
	violations, err := services.RunThresholdCheck()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "violations": violations})
}

func firstNonEmptyForm(c *gin.Context, key string) string {
	if v := strings.TrimSpace(c.PostForm(key)); v != "" {
		return v
	}
	return strings.TrimSpace(c.Query(key))
}

func dedupeNonEmpty(values []string) []string {
	seen := make(map[string]struct{}, len(values))
	out := make([]string, 0, len(values))
	for _, v := range values {
		trimmed := strings.TrimSpace(v)
		if trimmed == "" {
			continue
		}
		if _, ok := seen[trimmed]; ok {
			continue
		}
		seen[trimmed] = struct{}{}
		out = append(out, trimmed)
	}
	return out
}
