//go:build admin || heroku || heroku_admin

package handlers

import (
	"fmt"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/resistorsoftware/api-service/pkg/api/services"
)

var safeFilenameRe = regexp.MustCompile(`[^a-zA-Z0-9._-]+`)

// AdminLocationsCount reports how many locations match the supplied filters.
func AdminLocationsCount(c *gin.Context) {
	filters, ok := parseLocationFilters(c)
	if !ok {
		return
	}
	count, err := services.CountLocations(filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"count": count})
}

// AdminLocationsExport streams matching locations as a downloadable JSON file.
func AdminLocationsExport(c *gin.Context) {
	filters, ok := parseLocationFilters(c)
	if !ok {
		return
	}
	filename := buildExportFilename(filters)
	c.Header("Content-Type", "application/json")
	c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	c.Status(http.StatusOK)
	if _, err := services.StreamLocations(filters, c.Writer); err != nil {
		// Headers/body have already started — log and abort. Returning JSON would
		// produce malformed output, so the client will see a truncated download.
		c.AbortWithError(http.StatusInternalServerError, err) //nolint:errcheck
		return
	}
}

func parseLocationFilters(c *gin.Context) (services.LocationFilters, bool) {
	deviceID := parseIDPtr(c.Query("device_id"))
	companyID := parseIDPtr(c.Query("company_id"))
	org := strings.TrimSpace(c.Query("org"))
	if deviceID == nil && companyID == nil && org == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org, company_id, or device_id is required"})
		return services.LocationFilters{}, false
	}
	start, err := parseTimePtr(c.Query("start_date"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid start_date"})
		return services.LocationFilters{}, false
	}
	end, err := parseTimePtr(c.Query("end_date"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid end_date"})
		return services.LocationFilters{}, false
	}
	return services.LocationFilters{
		Org:       org,
		CompanyID: companyID,
		DeviceID:  deviceID,
		Start:     start,
		End:       end,
	}, true
}

func buildExportFilename(filters services.LocationFilters) string {
	parts := []string{"locations"}
	if filters.DeviceID != nil && *filters.DeviceID != 0 {
		parts = append(parts, fmt.Sprintf("device-%d", *filters.DeviceID))
	} else if filters.CompanyID != nil && *filters.CompanyID != 0 {
		parts = append(parts, fmt.Sprintf("company-%d", *filters.CompanyID))
	} else if filters.Org != "" {
		parts = append(parts, "org-"+safeFilenameRe.ReplaceAllString(filters.Org, "_"))
	}
	parts = append(parts, fmt.Sprintf("%d.json", time.Now().Unix()))
	return strings.Join(parts, "-")
}
